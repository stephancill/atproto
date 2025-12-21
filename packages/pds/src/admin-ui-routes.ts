import path from 'node:path'
import { Router } from 'express'
import express from 'express'

export const createRouter = (): Router => {
  const router = Router()

  // Try to find the admin UI dist folder
  // In production, it will be at /app/admin-ui
  // In development, you can set PDS_ADMIN_UI_PATH env var
  const adminUiPath =
    process.env.PDS_ADMIN_UI_PATH ||
    path.join(__dirname, '..', '..', '..', 'pds-ui', 'dist')

  try {
    // Serve static assets from /assets directory
    router.use(
      '/assets',
      express.static(path.join(adminUiPath, 'assets'), {
        fallthrough: true,
      }),
    )

    // Serve favicon
    router.get('/favicon.svg', (req, res, next) => {
      res.sendFile(path.join(adminUiPath, 'favicon.svg'), (err) => {
        if (err) next()
      })
    })

    // Admin UI - serve admin.html (built from index.html)
    router.get('/admin', (req, res, next) => {
      res.sendFile(path.join(adminUiPath, 'admin.html'), (err) => {
        if (err) {
          // Try index.html as fallback
          res.sendFile(path.join(adminUiPath, 'index.html'), (err2) => {
            if (err2) next()
          })
        }
      })
    })

    router.get('/admin/*', (req, res, next) => {
      res.sendFile(path.join(adminUiPath, 'admin.html'), (err) => {
        if (err) {
          res.sendFile(path.join(adminUiPath, 'index.html'), (err2) => {
            if (err2) next()
          })
        }
      })
    })

    // Join page - serve join.html
    router.get('/join', (req, res, next) => {
      res.sendFile(path.join(adminUiPath, 'join.html'), (err) => {
        if (err) next()
      })
    })

    router.get('/join/*', (req, res, next) => {
      res.sendFile(path.join(adminUiPath, 'join.html'), (err) => {
        if (err) next()
      })
    })
  } catch {
    // Admin UI not available - that's fine, it's optional
    router.get('/admin', (req, res) => {
      res.status(404).send('Admin UI not installed')
    })
    router.get('/join', (req, res) => {
      res.status(404).send('Join page not installed')
    })
  }

  return router
}
