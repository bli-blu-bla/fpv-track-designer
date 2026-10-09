import type { Track, Config } from '@/core/types'
import { serializeTrack, deserializeTrack } from '@/core/schemas/track.schema'
import { calculatePoleBreakdown } from '@/core/gates/poleCount'

const STORAGE_KEY_PREFIX = 'fpv-track-'
const TRACK_LIST_KEY = 'fpv-track-list'
// Thumbnails live under their own keys so the gallery list stays small to parse.
const THUMBNAIL_KEY_PREFIX = 'fpv-track-thumb-'
const THUMBNAIL_DATA_URL_PREFIX = 'data:image/jpeg;base64,'

export interface SavedTrackInfo {
  id: string
  name: string
  updatedAt: string
  /** Missing on tracks saved before these stats existed. */
  gateCount?: number
  poleCount?: number
}

interface SaveTrackOptions {
  /** JPEG data URL; omit to keep an existing thumbnail. */
  thumbnail?: string | null
}

export function saveTrack(track: Track, config: Config, { thumbnail }: SaveTrackOptions = {}): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + track.id, serializeTrack(track, config))

    const list = listTracks()
    const existing = list.findIndex(t => t.id === track.id)
    const info: SavedTrackInfo = {
      id: track.id,
      name: track.name,
      updatedAt: track.updatedAt,
      gateCount: track.gates.length,
      poleCount: calculatePoleBreakdown(track.gates).total,
    }
    if (existing >= 0) {
      list[existing] = info
    } else {
      list.push(info)
    }
    localStorage.setItem(TRACK_LIST_KEY, JSON.stringify(list))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded')
    }
    throw e
  }

  if (thumbnail) saveTrackThumbnail(track.id, thumbnail)
}

/** Stores a preview image; a full storage only loses the preview, never the track. */
export function saveTrackThumbnail(id: string, thumbnail: string): void {
  if (!thumbnail.startsWith(THUMBNAIL_DATA_URL_PREFIX)) return

  try {
    localStorage.setItem(THUMBNAIL_KEY_PREFIX + id, thumbnail)
  } catch (e) {
    console.error('Saving track thumbnail failed:', e)
  }
}

export function loadTrackThumbnail(id: string): string | null {
  const thumbnail = localStorage.getItem(THUMBNAIL_KEY_PREFIX + id)
  return thumbnail?.startsWith(THUMBNAIL_DATA_URL_PREFIX) ? thumbnail : null
}

export function loadTrack(id: string): { track: Track; config: Config } | null {
  const json = localStorage.getItem(STORAGE_KEY_PREFIX + id)
  if (!json) return null

  const result = deserializeTrack(json)
  return 'error' in result ? null : result
}

export function listTracks(): SavedTrackInfo[] {
  const json = localStorage.getItem(TRACK_LIST_KEY)
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

export function deleteTrack(id: string): void {
  localStorage.removeItem(STORAGE_KEY_PREFIX + id)
  localStorage.removeItem(THUMBNAIL_KEY_PREFIX + id)
  const list = listTracks().filter(t => t.id !== id)
  localStorage.setItem(TRACK_LIST_KEY, JSON.stringify(list))
}

export function autoSave(track: Track, config: Config): void {
  try {
    saveTrack({ ...track, updatedAt: new Date().toISOString() }, config)
  } catch (e) {
    console.error('Auto-save failed:', e)
  }
}
