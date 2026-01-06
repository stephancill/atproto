import { clsx } from 'clsx'
import { useMemo } from 'react'
import { usePasskeyAuthenticateMutation } from '../data/usePasskeyAuthenticateMutation'
import { Button } from './Button'

type PasskeyButtonProps = {
  username: string
  onSuccess?: () => void
  disabled?: boolean
}

export function PasskeyButton({ username, onSuccess, disabled }: PasskeyButtonProps) {
  const authenticateMutation = usePasskeyAuthenticateMutation()

  const handlePasskeyAuth = async () => {
    try {
      const options = await fetch('/api/passkey/authenticate-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      })

      if (!options.ok) {
        const error = await options.json()
        throw new Error(error.message || 'Failed to get authentication challenge')
      }

      const challengeData = await options.json()
      const result = await startAuthentication(challengeData.options)

      const res = await fetch('/api/passkey/authenticate-verify', {
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
        throw new Error(error.message || 'Authentication failed')
      }

      onSuccess?.()
    } catch (err) {
      console.error('Passkey authentication error:', err)
    }
  }

  return (
    <Button
      type="button"
      onClick={handlePasskeyAuth}
      disabled={disabled || authenticateMutation.isPending}
      color="secondary"
      size="lg"
    >
      {authenticateMutation.isPending ? 'Authenticating...' : 'Sign in with Passkey'}
    </Button>
  )
}
