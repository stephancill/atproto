import { useMutation } from '@tanstack/react-query'

export function useDeletePasskeyMutation() {
  return useMutation({
    mutationFn: async ({ sub, credentialId }: { sub: string; credentialId: string }) => {
      const res = await fetch('/api/passkey/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sub, credentialId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to delete passkey')
      }

      return await res.json()
    },
  })
}
