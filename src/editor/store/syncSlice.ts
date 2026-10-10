import type { StateCreator } from 'zustand'
import type { Config, Track } from '@/core/types'
import { saveTrack } from '@/editor/storage'
import { uploadTrack } from '@/editor/sync/trackSync'
import type { AppState } from './types'

export type TrackSyncState = 'syncing' | 'synced' | 'failed' | 'conflict'

/** A save whose upload hit a newer server copy; waits for the SyncConflictDialog. */
export interface PendingSyncConflict {
  track: Track
  config: Config
  thumbnail: string | null
}

export type SyncConflictChoice = 'overwrite' | 'copy' | 'cancel'

export interface SyncSlice {
  /** Last account sync of a saved track; the TopBar shows it for the current track. */
  trackSyncStatus: { trackId: string; state: TrackSyncState } | null
  syncConflict: PendingSyncConflict | null
  /** Uploads an already locally saved track when signed in. Never throws; local data is never touched. */
  syncTrack: (track: Track, config: Config, thumbnail?: string | null) => Promise<void>
  /** `copy` saves the track under a new id and `copyName` (the editor continues on the copy). */
  resolveSyncConflict: (choice: SyncConflictChoice, copyName?: string) => Promise<void>
}

export const createSyncSlice: StateCreator<AppState, [], [], SyncSlice> = (set, get) => {
  const upload = async (track: Track, config: Config, thumbnail: string | null, force: boolean) => {
    set({ trackSyncStatus: { trackId: track.id, state: 'syncing' } })
    const outcome = await uploadTrack(track, config, { thumbnail, force })

    if (outcome.status === 'skipped') {
      set({ trackSyncStatus: null })
    } else if (outcome.status === 'conflict') {
      set({ trackSyncStatus: { trackId: track.id, state: 'conflict' }, syncConflict: { track, config, thumbnail } })
    } else {
      set({ trackSyncStatus: { trackId: track.id, state: outcome.status } })
    }
  }

  return {
    trackSyncStatus: null,
    syncConflict: null,
    syncTrack: async (track, config, thumbnail = null) => {
      if (get().accountStatus !== 'signed-in') return
      await upload(track, config, thumbnail, false)
    },
    resolveSyncConflict: async (choice, copyName) => {
      const conflict = get().syncConflict
      if (!conflict) return
      set({ syncConflict: null })

      if (choice === 'cancel') {
        set({ trackSyncStatus: { trackId: conflict.track.id, state: 'failed' } })
        return
      }

      if (choice === 'overwrite') {
        await upload(conflict.track, conflict.config, conflict.thumbnail, true)
        return
      }

      const now = new Date().toISOString()
      const copy: Track = {
        ...conflict.track,
        id: crypto.randomUUID(),
        name: copyName?.trim() || conflict.track.name,
        createdAt: now,
        updatedAt: now,
      }
      saveTrack(copy, conflict.config, { thumbnail: conflict.thumbnail })
      if (get().currentTrack?.id === conflict.track.id) get().syncCurrentTrack(copy)
      await upload(copy, conflict.config, conflict.thumbnail, false)
    },
  }
}
