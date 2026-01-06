import { useMutation } from '@tanstack/react-query'
import type {
  PasskeyAuthenticationOptions,
  PasskeyAuthenticationResponse,
} from '@atproto/oauth-provider-api'
import { useApi } from '#/api'

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

export type PasskeyAuthInput = {
  username?: string
  remember?: boolean
}

export function usePasskeyAuthMutation() {
  const api = useApi()

  return useMutation({
    mutationFn: async (input: PasskeyAuthInput) => {
      // Step 1: Get authentication options from server
      const { sessionKey, ...options } = await api.fetch(
        'POST',
        '/passkey/authenticate/options',
        input.username ? { username: input.username } : undefined,
      )

      // Step 2: Get credential using WebAuthn
      let credential: PublicKeyCredential | null = null
      try {
        credential = (await navigator.credentials.get({
          publicKey: toPublicKeyCredentialRequestOptions(options),
        })) as PublicKeyCredential | null
      } catch (err) {
        // Handle user cancellation
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          throw new Error('Passkey authentication was cancelled')
        }
        throw err
      }

      if (!credential) {
        throw new Error('Passkey authentication was cancelled')
      }

      // Step 3: Send response to server for verification
      const result = await api.fetch('POST', '/passkey/authenticate/verify', {
        sessionKey,
        response: credentialToAuthenticationResponse(credential),
        remember: input.remember,
      })

      return result
    },
  })
}

