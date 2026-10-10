import type { Config, Track } from '@/core/types'
import { parseTrackExport, serializeTrack } from '@/core/schemas/track.schema'
import { getCurrentUser } from '@/editor/api/auth'
import {
  createRemoteTrack,
  deleteRemoteTrack,
  fetchThumbnailDataUrl,
  findRemoteTrack,
  getRemoteTrack,
  updateRemoteTrack,
  type RemoteTrackSummary,
} from '@/editor/api/tracks'
import { saveTrack, type SavedTrackInfo } from '@/editor/storage'
import { clearSyncMeta, getSyncMeta, setSyncMeta } from './syncMeta'

export type TrackUploadOutcome =
  | { status: 'synced' }
  /** The server copy changed on another device since this device last synced it. */
  | { status: 'conflict' }
  | { status: 'failed' }
  /** Not signed in. */
  | { status: 'skipped' }

interface UploadOptions {
  thumbnail?: string | null
  /** Overwrite the server copy even if it changed elsewhere. */
  force?: boolean
}

/** Upserts a locally saved track into the account (`tracks` by `(owner, clientId)`), with conflict detection. */
export async function uploadTrack(track: Track, config: Config, { thumbnail, force = false }: UploadOptions = {}): Promise<TrackUploadOutcome> {
  const user = getCurrentUser()
  if (!user) return { status: 'skipped' }

  try {
    const meta = getSyncMeta(track.id, user.id)
    const remote = await findRemoteTrack(track.id)
    const changedElsewhere = remote !== null && (!meta || meta.remoteId !== remote.id || remote.updated > meta.remoteUpdated)
    if (changedElsewhere && !force) return { status: 'conflict' }

    const input = { clientId: track.id, name: track.name, data: JSON.parse(serializeTrack(track, config)), thumbnail }
    const saved = remote ? await updateRemoteTrack(remote.id, input) : await createRemoteTrack(input)
    setSyncMeta(track.id, { userId: user.id, remoteId: saved.id, remoteUpdated: saved.updated, syncedAt: new Date().toISOString() })
    return { status: 'synced' }
  } catch {
    return { status: 'failed' }
  }
}

/** Fetches an account track, validates it and stores it locally. Returns null if it is missing or invalid. */
export async function downloadTrack(remoteId: string): Promise<{ track: Track; config: Config } | null> {
  const user = getCurrentUser()
  if (!user) return null

  const remote = await getRemoteTrack(remoteId)
  const result = parseTrackExport(remote.data)
  if ('error' in result) return null

  const track = { ...result.track, id: remote.clientId }
  const thumbnail = remote.thumbnailUrl ? await fetchThumbnailDataUrl(remote.thumbnailUrl) : null
  saveTrack(track, result.config, { thumbnail })
  setSyncMeta(track.id, { userId: user.id, remoteId: remote.id, remoteUpdated: remote.updated, syncedAt: new Date().toISOString() })
  return { track, config: result.config }
}

export async function deleteAccountTrack(trackId: string, remoteId: string): Promise<void> {
  await deleteRemoteTrack(remoteId)
  clearSyncMeta(trackId)
}

/** `null`: no account data available (signed out or list failed), the gallery shows plain local entries. */
export type GallerySyncState = 'synced' | 'unsynced' | 'local' | 'remote' | null

export interface GalleryEntry {
  id: string
  name: string
  updatedAt: string
  gateCount?: number
  poleCount?: number
  local: SavedTrackInfo | null
  remote: RemoteTrackSummary | null
  syncState: GallerySyncState
}

function syncStateOf(local: SavedTrackInfo, remote: RemoteTrackSummary, userId: string): GallerySyncState {
  const meta = getSyncMeta(local.id, userId)
  const inSync = meta !== null
    && meta.remoteId === remote.id
    && remote.updated <= meta.remoteUpdated
    && local.updatedAt <= meta.syncedAt
  return inSync ? 'synced' : 'unsynced'
}

/** Local entries in gallery order, then account-only tracks (newest first), matched by `clientId`. */
export function mergeGalleryEntries(local: SavedTrackInfo[], remote: RemoteTrackSummary[] | null, userId: string | null): GalleryEntry[] {
  const localEntries = [...local].reverse()
  if (!remote || !userId) {
    return localEntries.map((info) => ({ ...info, local: info, remote: null, syncState: null }))
  }

  const remoteByClientId = new Map(remote.map((track) => [track.clientId, track]))
  const localIds = new Set(local.map((info) => info.id))

  return [
    ...localEntries.map((info): GalleryEntry => {
      const match = remoteByClientId.get(info.id) ?? null
      return { ...info, local: info, remote: match, syncState: match ? syncStateOf(info, match, userId) : 'local' }
    }),
    ...remote
      .filter((track) => !localIds.has(track.clientId))
      .sort((a, b) => b.updated.localeCompare(a.updated))
      .map((track): GalleryEntry => ({
        id: track.clientId,
        name: track.name,
        updatedAt: track.updated,
        local: null,
        remote: track,
        syncState: 'remote',
      })),
  ]
}
