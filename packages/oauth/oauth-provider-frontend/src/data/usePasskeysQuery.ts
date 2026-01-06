import { useQuery } from '@tanstack/react-query'
import type { PasskeyCredential } from '@atproto/oauth-provider-api'
import { useApi } from '#/api'

export type UsePasskeysQueryInput = {
  sub: string
}

export const passkeysQueryKey = ({ sub }: UsePasskeysQueryInput) =>
  ['passkeys', sub] as const

export function usePasskeysQuery(input: UsePasskeysQueryInput) {
  const api = useApi()

  return useQuery<PasskeyCredential[]>({
    refetchOnWindowFocus: 'always',
    staleTime: 15e3, // 15s
    queryKey: passkeysQueryKey(input),
    queryFn: async (options) => {
      const result = await api.fetch('GET', '/passkey/list', input, options)
      return result.passkeys
    },
  })
}

