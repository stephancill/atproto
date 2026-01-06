import { startRegistration } from '@simplewebauthn/browser'
import { useMutation } from '@tanstack/react-query'

export function usePasskeyRegisterMutation() {
  return useMutation({
    mutationFn: async ({
      username,
      options,
      deviceName,
    }: {
      username: string
      options: RegistrationResponseJSON
      deviceName?: string
    }) => {
      const response = await startRegistration(options)

      const res = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          response,
          deviceName,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Registration failed')
      }

      return await res.json()
    },
  })
}
