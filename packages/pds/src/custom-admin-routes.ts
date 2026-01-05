import express, { Router } from 'express'
import { AppContext } from './context'

// Custom admin endpoints that aren't part of the standard atproto lexicon
// These are registered as Express routes, not XRPC methods
export const createRouter = (ctx: AppContext): Router => {
  const router = Router()

  router.use(express.json())

  // POST /xrpc/com.atproto.admin.confirmAccountEmail
  // Manually confirm an account's email address
  router.post(
    '/xrpc/com.atproto.admin.confirmAccountEmail',
    async (req, res) => {
      try {
        // Verify admin auth
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const credentials = Buffer.from(
          authHeader.slice('Basic '.length),
          'base64',
        ).toString()
        const [username, password] = credentials.split(':')

        if (!ctx.authVerifier.verifyAdminCredentials(username, password)) {
          return res.status(401).json({ error: 'Invalid admin credentials' })
        }

        const body = req.body as { account?: string } | undefined
        const accountId = body?.account

        if (!accountId) {
          return res.status(400).json({ error: 'account is required' })
        }

        const account = await ctx.accountManager.getAccount(accountId, {
          includeDeactivated: true,
          includeTakenDown: true,
        })

        if (!account) {
          return res
            .status(400)
            .json({ error: `Account does not exist: ${accountId}` })
        }

        if (ctx.entrywayAgent) {
          return res.status(400).json({
            error: 'Cannot confirm email on entryway-backed PDS',
          })
        }

        await ctx.accountManager.confirmEmailAdmin({ did: account.did })

        return res.json({ success: true })
      } catch (err) {
        console.error('confirmAccountEmail error:', err)
        return res.status(500).json({
          error: err instanceof Error ? err.message : 'Internal server error',
        })
      }
    },
  )

  return router
}

