import { startAuthentication } from '@simplewebauthn/browser'
import { useMutation } from '@tanstack/react-query'

export function usePasskeyAuthenticateMutation() {
  return useMutation({
    mutationFn: async ({
      username,
      options,
    }: {
      username: string
      options: AuthenticationResponseJSON
    }) => {
      const response = await startAuthentication(options)

      const res = await fetch('/api/passkey/authenticate-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          response,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Authentication failed')
      }

      return await res.json()
    },
  })
}
