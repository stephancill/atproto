import { InvalidRequestError } from '@atproto/xrpc-server'
import { AppContext } from '../../../../context'
import { Server } from '../../../../lexicon'

export default function (server: Server, ctx: AppContext) {
  // Custom admin endpoint to confirm an account's email without requiring the user to click a link
  // This is not a standard atproto lexicon endpoint - it's a PDS extension for admin use
  server.xrpc.method('com.atproto.admin.confirmAccountEmail', {
    auth: ctx.authVerifier.adminToken,
    handler: async ({ input }) => {
      const body = input?.body as { account?: string } | undefined
      const accountId = body?.account

      if (!accountId) {
        throw new InvalidRequestError('account is required')
      }

      const account = await ctx.accountManager.getAccount(accountId, {
        includeDeactivated: true,
        includeTakenDown: true,
      })

      if (!account) {
        throw new InvalidRequestError(`Account does not exist: ${accountId}`)
      }

      if (ctx.entrywayAgent) {
        throw new InvalidRequestError(
          'Cannot confirm email on entryway-backed PDS',
        )
      }

      await ctx.accountManager.confirmEmailAdmin({ did: account.did })

      return {
        encoding: 'application/json' as const,
        body: { success: true },
      }
    },
  })
}
