import { clsx } from 'clsx'
import { useMutation } from '@tanstack/react-query'
import { startRegistration } from '@simplewebauthn/browser'
import { usePasskeyRegisterMutation } from '../data/usePasskeyRegisterMutation'
import { Button } from './Button'

type PasskeyRegisterButtonProps = {
  username: string
  onSuccess?: () => void
  disabled?: boolean
}

export function PasskeyRegisterButton({ username, onSuccess, disabled }: PasskeyRegisterButtonProps) {
  const registerMutation = usePasskeyRegisterMutation()

  const handlePasskeyRegister = async () => {
    try {
      const options = await fetch('/api/passkey/register-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      })

      if (!options.ok) {
        const error = await options.json()
        throw new Error(error.message || 'Failed to get registration challenge')
      }

      const challengeData = await options.json()
      const result = await startRegistration(challengeData.options)

      const res = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          response: result,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Passkey registration failed')
      }

      onSuccess?.()
    } catch (err) {
      console.error('Passkey registration error:', err)
    }
  }

  return (
    <Button
      type="button"
      onClick={handlePasskeyRegister}
      disabled={disabled || registerMutation.isPending}
      color="primary"
      size="lg"
    >
      {registerMutation.isPending ? 'Registering Passkey...' : 'Register Passkey'}
    </Button>
  )
}
