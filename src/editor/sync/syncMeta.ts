/**
 * Per-device bookkeeping for account sync, keyed by local track id (= remote `clientId`).
 * Local storage stays the main source; this only remembers what the server had when we last synced.
 */

const SYNC_META_KEY = 'fpv-track-sync'

export interface TrackSyncMeta {
  /** Account the entry belongs to; entries of other accounts are ignored. */
  userId: string
  remoteId: string
  /** Server `updated` after our last upload/download. A newer server value means another device changed it. */
  remoteUpdated: string
  /** When this device last synced the track (ISO). */
  syncedAt: string
}

type SyncMetaMap = Record<string, TrackSyncMeta>

function isSyncMeta(value: unknown): value is TrackSyncMeta {
  if (typeof value !== 'object' || value === null) return false
  return ['userId', 'remoteId', 'remoteUpdated', 'syncedAt'].every((key) => typeof Reflect.get(value, key) === 'string')
}

function readAll(): SyncMetaMap {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SYNC_META_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, TrackSyncMeta] => isSyncMeta(entry[1])))
  } catch {
    return {}
  }
}

function writeAll(map: SyncMetaMap) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(map))
  } catch (error) {
    console.error('Saving sync state failed:', error)
  }
}

export function getSyncMeta(trackId: string, userId: string): TrackSyncMeta | null {
  const meta = readAll()[trackId]
  return meta?.userId === userId ? meta : null
}

export function setSyncMeta(trackId: string, meta: TrackSyncMeta) {
  writeAll({ ...readAll(), [trackId]: meta })
}

export function clearSyncMeta(trackId: string) {
  const map = readAll()
  delete map[trackId]
  writeAll(map)
}
