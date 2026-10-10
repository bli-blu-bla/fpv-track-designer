import { isRecord, readString, requestJson, ApiError, type ApiOptions } from './http'

/** Short-link ids are 8 lowercase alphanumerics (see pocketbase/pb_migrations). */
export const SHARE_ID_PATTERN = /^[a-z0-9]{8}$/

/** Stores a compact track JSON string (`encodeCompactTrack()`) and returns its short-link id. Same payload, same id. */
export async function createShare(payload: string, options: ApiOptions = {}): Promise<{ id: string }> {
  const body = await requestJson('/api/shares', options, { method: 'POST', body: JSON.stringify({ payload }) })
  if (!isRecord(body)) throw new ApiError('server', 200, 'API response is not an object')

  const id = readString(body, 'id')
  if (!SHARE_ID_PATTERN.test(id)) throw new ApiError('server', 200, 'API returned an invalid share id')
  return { id }
}

/** Loads the raw compact payload; callers decode it with `decodeCompactTrack()`. */
export async function getShare(id: string, options: ApiOptions = {}): Promise<{ payload: string }> {
  if (!SHARE_ID_PATTERN.test(id)) throw new ApiError('not-found', 404, 'Unknown share id', 'share')

  const body = await requestJson(`/api/shares/${id}`, options)
  if (!isRecord(body)) throw new ApiError('server', 200, 'API response is not an object')
  return { payload: readString(body, 'payload') }
}
