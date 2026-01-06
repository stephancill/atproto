import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '#/api'
import { passkeysQueryKey } from './usePasskeysQuery.ts'

export type DeletePasskeyInput = {
  sub: string
  credentialId: string
}

export function useDeletePasskeyMutation() {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DeletePasskeyInput) => {
      return api.fetch('POST', '/passkey/delete', {
        sub: input.sub,
        credentialId: input.credentialId,
      })
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({
        queryKey: passkeysQueryKey({ sub: input.sub }),
      })
    },
  })
}

