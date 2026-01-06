import { useQuery } from '@tanstack/react-query'
import { useApi } from '#/api'

export const passkeyAvailableQueryKey = () => ['passkey-available'] as const

export function usePasskeyAvailableQuery() {
  const api = useApi()

  return useQuery<boolean>({
    staleTime: Infinity, // Don't refetch - availability won't change during session
    queryKey: passkeyAvailableQueryKey(),
    queryFn: async () => {
      // Check if WebAuthn is supported in the browser
      if (
        typeof window === 'undefined' ||
        typeof window.PublicKeyCredential === 'undefined'
      ) {
        return false
      }

      // Check if platform authenticator is available
      try {
        const platformAvailable =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        if (!platformAvailable) {
          return false
        }
      } catch {
        return false
      }

      // Check if server supports passkeys
      try {
        const result = await api.fetch('GET', '/passkey/available')
        return result.available
      } catch {
        return false
      }
    },
  })
}

