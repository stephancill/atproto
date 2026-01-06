import { Server } from '../../../../lexicon'
import { resultPassthru } from '../../../proxy'
import { AuthScope } from '../../../auth-scope'
import { AppContext } from '../../../../context'
import { ids } from '../../../../lexicon/lexicons'

export default function (server: Server, ctx: AppContext) {
  server.com.atproto.server.deletePasskey({
    auth: ctx.authVerifier.authorization({
      checkTakedown: true,
      scopes: AuthScope.Full,
    }),
  })
}
