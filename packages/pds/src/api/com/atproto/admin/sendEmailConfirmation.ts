import { InvalidRequestError } from '@atproto/xrpc-server'
import { AppContext } from '../../../../context'
import { Server } from '../../../../lexicon'

export default function (server: Server, ctx: AppContext) {
  server.com.atproto.admin.sendEmailConfirmation({
    auth: ctx.authVerifier.moderator,
    handler: async ({ input }) => {
      const { did } = input.body

      const account = await ctx.accountManager.getAccount(did, {
        includeDeactivated: true,
        includeTakenDown: true,
      })

      if (!account) {
        throw new InvalidRequestError('Account not found', 'AccountNotFound')
      }

      if (!account.email) {
        throw new InvalidRequestError(
          'Account does not have an email address',
          'NoEmail',
        )
      }

      if (account.emailConfirmedAt) {
        throw new InvalidRequestError(
          'Email is already confirmed',
          'AlreadyConfirmed',
        )
      }

      if (ctx.entrywayAgent) {
        throw new InvalidRequestError(
          'Email confirmation is managed by the entryway service',
        )
      }

      const token = await ctx.accountManager.createEmailToken(
        did,
        'confirm_email',
      )
      await ctx.mailer.sendConfirmEmail({ token }, { to: account.email })

      return {
        encoding: 'application/json' as const,
        body: { sent: true },
      }
    },
  })
}

