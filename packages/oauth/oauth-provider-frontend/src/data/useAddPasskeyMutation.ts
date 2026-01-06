import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PasskeyRegistrationOptions,
  PasskeyRegistrationResponse,
} from '@atproto/oauth-provider-api'
import { useApi } from '#/api'
import { passkeysQueryKey } from './usePasskeysQuery.ts'

export type AddPasskeyInput = {
  sub: string
  name: string
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

export function useAddPasskeyMutation() {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddPasskeyInput) => {
      // Step 1: Get registration options from server
      const options = await api.fetch('POST', '/passkey/register/options', {
        sub: input.sub,
      })

      // Step 2: Create credential using WebAuthn
      const credential = (await navigator.credentials.create({
        publicKey: toPublicKeyCredentialCreationOptions(options),
      })) as PublicKeyCredential | null

      if (!credential) {
        throw new Error('Passkey registration was cancelled')
      }

      // Step 3: Send response to server for verification
      const result = await api.fetch('POST', '/passkey/register/verify', {
        sub: input.sub,
        response: credentialToRegistrationResponse(credential),
        name: input.name,
      })

      return result.passkey
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: passkeysQueryKey({ sub: input.sub }),
      })
    },
  })
}

