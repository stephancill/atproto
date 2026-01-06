import { useCallback, useEffect, useState } from 'react'
import type {
  PasskeyAuthenticationOptions,
  PasskeyAuthenticationResponse,
  PasskeyCredential,
  PasskeyRegistrationOptions,
  PasskeyRegistrationResponse,
  PasskeySignInOutput,
} from '@atproto/oauth-provider-api'
import { Api } from '#/lib/api.ts'

export type { PasskeyCredential, PasskeySignInOutput }

const api = new Api()

// Check if WebAuthn is supported in the browser
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined'
  )
}

// Check if platform authenticator is available (Touch ID, Face ID, Windows Hello)
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

// Check if passkey feature is available on this server
export async function isPasskeyAvailable(): Promise<boolean> {
  try {
    const result = await api.fetch('GET', '/passkey/available', undefined)
    return result.available
  } catch {
    return false
  }
}

// Convert base64url to ArrayBuffer
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Convert server options to WebAuthn options
function toPublicKeyCredentialCreationOptions(
  options: PasskeyRegistrationOptions,
): PublicKeyCredentialCreationOptions {
  return {
    challenge: base64urlToArrayBuffer(options.challenge),
    rp: options.rp,
    user: {
      id: base64urlToArrayBuffer(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    excludeCredentials: options.excludeCredentials?.map((cred) => ({
      id: base64urlToArrayBuffer(cred.id),
      type: cred.type,
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    })),
    authenticatorSelection: options.authenticatorSelection,
    attestation: options.attestation,
  }
}

function toPublicKeyCredentialRequestOptions(
  options: PasskeyAuthenticationOptions,
): PublicKeyCredentialRequestOptions {
  return {
    challenge: base64urlToArrayBuffer(options.challenge),
    timeout: options.timeout,
    rpId: options.rpId,
    allowCredentials: options.allowCredentials?.map((cred) => ({
      id: base64urlToArrayBuffer(cred.id),
      type: cred.type,
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    })),
    userVerification: options.userVerification,
  }
}

// Convert credential to server response format
function credentialToRegistrationResponse(
  credential: PublicKeyCredential,
): PasskeyRegistrationResponse {
  const response = credential.response as AuthenticatorAttestationResponse
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      transports: response.getTransports?.() as string[] | undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    type: 'public-key',
  }
}

function credentialToAuthenticationResponse(
  credential: PublicKeyCredential,
): PasskeyAuthenticationResponse {
  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      signature: arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle
        ? arrayBufferToBase64url(response.userHandle)
        : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    type: 'public-key',
  }
}

// Register a new passkey
export async function registerPasskey(
  sub: string,
  name: string,
  bearer?: string,
): Promise<PasskeyCredential> {
  // Get registration options from server
  const options = await api.fetch(
    'POST',
    '/passkey/register/options',
    { sub },
    { bearer },
  )

  // Create credential using WebAuthn
  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.create({
      publicKey: toPublicKeyCredentialCreationOptions(options),
    })) as PublicKeyCredential | null
  } catch (err) {
    // User cancelled the WebAuthn prompt (e.g., clicked Cancel on Touch ID)
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      throw new Error('Passkey registration was cancelled')
    }
    throw err
  }

  if (!credential) {
    throw new Error('Passkey registration was cancelled')
  }

  // Send response to server for verification
  const result = await api.fetch(
    'POST',
    '/passkey/register/verify',
    {
      sub,
      response: credentialToRegistrationResponse(credential),
      name,
    },
    { bearer },
  )

  return result.passkey
}

// Authenticate with a passkey
export async function authenticateWithPasskey(
  username?: string,
  remember?: boolean,
): Promise<PasskeySignInOutput> {
  // Get authentication options from server
  const { sessionKey, ...options } = await api.fetch(
    'POST',
    '/passkey/authenticate/options',
    { username },
  )

  // Get credential using WebAuthn
  let credential: PublicKeyCredential | null
  try {
    credential = (await navigator.credentials.get({
      publicKey: toPublicKeyCredentialRequestOptions(options),
    })) as PublicKeyCredential | null
  } catch (err) {
    // User cancelled the WebAuthn prompt (e.g., clicked Cancel on Touch ID)
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      throw new Error('Passkey authentication was cancelled')
    }
    throw err
  }

  if (!credential) {
    throw new Error('Passkey authentication was cancelled')
  }

  // Send response to server for verification
  const result = await api.fetch('POST', '/passkey/authenticate/verify', {
    sessionKey,
    response: credentialToAuthenticationResponse(credential),
    remember,
  })

  return result
}

// React hook for passkey availability
export function usePasskeyAvailable(): {
  available: boolean | null
  loading: boolean
} {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const webAuthnSupported = isWebAuthnSupported()
      if (!webAuthnSupported) {
        if (!cancelled) {
          setAvailable(false)
          setLoading(false)
        }
        return
      }

      const [platformAvailable, serverAvailable] = await Promise.all([
        isPlatformAuthenticatorAvailable(),
        isPasskeyAvailable(),
      ])

      if (!cancelled) {
        setAvailable(platformAvailable && serverAvailable)
        setLoading(false)
      }
    }

    check()

    return () => {
      cancelled = true
    }
  }, [])

  return { available, loading }
}

// React hook for passkey authentication
export function usePasskeyAuth(): {
  authenticate: (
    username?: string,
    remember?: boolean,
  ) => Promise<PasskeySignInOutput>
  isAuthenticating: boolean
  error: Error | null
  reset: () => void
} {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const authenticate = useCallback(
    async (
      username?: string,
      remember?: boolean,
    ): Promise<PasskeySignInOutput> => {
      setIsAuthenticating(true)
      setError(null)
      try {
        const result = await authenticateWithPasskey(username, remember)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      } finally {
        setIsAuthenticating(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { authenticate, isAuthenticating, error, reset }
}

// React hook for passkey registration
export function usePasskeyRegister(): {
  register: (
    sub: string,
    name: string,
    bearer?: string,
  ) => Promise<PasskeyCredential>
  isRegistering: boolean
  error: Error | null
  reset: () => void
} {
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const register = useCallback(
    async (
      sub: string,
      name: string,
      bearer?: string,
    ): Promise<PasskeyCredential> => {
      setIsRegistering(true)
      setError(null)
      try {
        const result = await registerPasskey(sub, name, bearer)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      } finally {
        setIsRegistering(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return { register, isRegistering, error, reset }
}
