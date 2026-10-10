/// <reference path="../pb_data/types.d.ts" />

// Instance settings that belong to the deploy, not to the dashboard:
// rate limits (incl. anonymous short links), client IP behind the reverse proxy, daily backups.

const SHARE_RATE_LIMIT = { label: 'POST /api/shares', audience: '', duration: 3600, maxRequests: 30 }

migrate((app) => {
  const settings = app.settings()

  settings.rateLimits.enabled = true
  settings.rateLimits.rules = [
    SHARE_RATE_LIMIT,
    ...settings.rateLimits.rules.filter((rule) => rule.label !== SHARE_RATE_LIMIT.label),
  ]

  // Coolify/Traefik appends the client IP to X-Forwarded-For; the rightmost value is the trusted one.
  settings.trustedProxy.headers = ['X-Forwarded-For']
  settings.trustedProxy.useLeftmostIP = false

  settings.backups.cron = '0 2 * * *'
  settings.backups.cronMaxKeep = 14

  app.save(settings)
}, (app) => {
  const settings = app.settings()
  settings.rateLimits.rules = settings.rateLimits.rules.filter((rule) => rule.label !== SHARE_RATE_LIMIT.label)
  settings.trustedProxy.headers = []
  settings.backups.cron = ''
  app.save(settings)
})
