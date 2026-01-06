import { Server } from '../../../../lexicon'
import { resultPassthru } from '../../../proxy'
import { AuthScope } from '../../../auth-scope'
import { AppContext } from '../../../../context'

export default function (server: Server, ctx: AppContext) {
  server.com.atproto.server.registerPasskey({
    auth: ctx.authVerifier.authorization({
      checkTakedown: true,
      scopes: AuthScope.Full,
      authorize: () => {
        throw new Error('Passkey registration must be done through OAuth, not XRPC')
      },
    }),
    handler: async ({ auth, input }) => {
      if (ctx.entrywayAgent) {
        return resultPassthru(
          await ctx.entrywayAgent.com.atproto.server.registerPasskey(
            input,
            await ctx.entrywayAuthHeaders(
              req,
              auth.credentials.did,
              'com.atproto.server.registerPasskey',
            ),
          ),
        )
      }

      const passkey = await ctx.accountManager.registerPasskey(
        auth.credentials.did,
        input.response,
        input.challenge,
        input.deviceName,
      )

      return {
        encoding: 'application/json',
        body: {
          credentialId: passkey.credentialId,
          deviceName: passkey.deviceName,
          createdAt: passkey.createdAt,
        },
      }
    },
  })
}
