/// <reference path="../pb_data/types.d.ts" />

// Anonymous, immutable short links. The `shares` collection has all standard API actions locked;
// these routes are the only way in. Same payload -> same id. Unused links expire after 4 months.

const SHARE_BODY_LIMIT_BYTES = 32 * 1024

routerAdd('POST', '/api/shares', (e) => {
  const { checkSharePayload } = require(`${__hooks}/lib/validation.js`)
  const payload = e.requestInfo().body.payload
  const problem = checkSharePayload(payload)
  if (problem) throw new BadRequestError(problem)

  const hash = $security.sha256(payload)
  const now = new DateTime()
  const findExisting = () => {
    try {
      return $app.findFirstRecordByData('shares', 'hash', hash)
    } catch (_) {
      return null
    }
  }

  const existing = findExisting()
  if (existing) {
    existing.set('lastAccessedAt', now)
    $app.save(existing)
    return e.json(200, { id: existing.id })
  }

  const record = new Record($app.findCollectionByNameOrId('shares'))
  record.set('payload', payload)
  record.set('hash', hash)
  record.set('lastAccessedAt', now)

  try {
    $app.save(record)
  } catch (err) {
    // A parallel request with the same payload won the unique hash index.
    const winner = findExisting()
    if (winner) return e.json(200, { id: winner.id })
    throw err
  }

  return e.json(201, { id: record.id })
}, $apis.bodyLimit(SHARE_BODY_LIMIT_BYTES))

routerAdd('GET', '/api/shares/{id}', (e) => {
  const ACCESS_TOUCH_INTERVAL_HOURS = 24
  const id = e.request.pathValue('id')
  if (!/^[a-z0-9]{8}$/.test(id)) throw new NotFoundError('Share not found.')

  let record
  try {
    record = $app.findRecordById('shares', id)
  } catch (_) {
    throw new NotFoundError('Share not found.')
  }

  const now = new DateTime()
  const touchThreshold = now.add(-ACCESS_TOUCH_INTERVAL_HOURS * 60 * 60 * 1000 * 1000 * 1000)
  if (record.getDateTime('lastAccessedAt').before(touchThreshold)) {
    record.set('lastAccessedAt', now)
    $app.save(record)
  }

  return e.json(200, { payload: record.getString('payload') })
})

cronAdd('cleanupExpiredShares', '0 3 * * *', () => {
  const EXPIRY_MONTHS = 4
  const cutoff = new DateTime().addDate(0, -EXPIRY_MONTHS, 0)
  const result = $app.db()
    .newQuery('DELETE FROM shares WHERE lastAccessedAt < {:cutoff}')
    .bind({ cutoff: cutoff.string() })
    .execute()

  $app.logger().info('Expired shares deleted', 'count', result.rowsAffected())
})
