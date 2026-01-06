import { useQuery } from '@tanstack/react-query'
import type { Passkey } from '@atproto/oauth-provider-api'

export function usePasskeysQuery(sub: string) {
  return useQuery({
    queryKey: ['passkeys', sub],
    queryFn: async (): Promise<Passkey[]> => {
      const res = await fetch(`/api/passkey/list?sub=${encodeURIComponent(sub)}`)

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Failed to load passkeys')
      }

      return await res.json()
    },
  })
}
