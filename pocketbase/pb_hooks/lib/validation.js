// Shared checks for pb_hooks. Hook handlers run in isolated VMs, so each handler `require`s this file.
// These are coarse plausibility checks only; the frontend validates fully via src/core/schemas.

const MAX_SHARE_PAYLOAD_LENGTH = 16384
const MAX_GATES = 300
const MAX_NAME_LENGTH = 120
const COMPACT_FORMAT_VERSIONS = [1, 2]
const COMPACT_GATES_INDEX = 6

/** Returns an error message for an invalid compact share payload, or null. */
function checkSharePayload(payload) {
  if (typeof payload !== 'string' || payload.length === 0) return 'payload must be a non-empty string'
  if (payload.length > MAX_SHARE_PAYLOAD_LENGTH) return 'payload is too large'

  let parsed
  try {
    parsed = JSON.parse(payload)
  } catch (_) {
    return 'payload is not valid JSON'
  }

  if (!Array.isArray(parsed)) return 'payload must be a JSON array'
  if (COMPACT_FORMAT_VERSIONS.indexOf(parsed[0]) < 0) return 'unknown payload format version'
  if (!Array.isArray(parsed[COMPACT_GATES_INDEX])) return 'payload has no gate list'
  if (parsed[COMPACT_GATES_INDEX].length > MAX_GATES) return 'too many gates'

  return null
}

/** Returns an error message for an invalid track export object (format 2.x), or null. */
function checkTrackData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'data must be an object'
  if (typeof data.version !== 'string') return 'data.version must be a string'
  if (!data.track || typeof data.track !== 'object') return 'data.track must be an object'
  if (!Array.isArray(data.track.gates)) return 'data.track.gates must be an array'
  if (data.track.gates.length > MAX_GATES) return 'too many gates'
  if (!data.config || typeof data.config !== 'object') return 'data.config must be an object'

  return null
}

/** Returns an error message for an invalid record name, or null. */
function checkName(name) {
  if (typeof name !== 'string' || name.trim().length === 0) return 'name is required'
  if (name.length > MAX_NAME_LENGTH) return 'name is too long'
  return null
}

module.exports = { checkSharePayload, checkTrackData, checkName }
