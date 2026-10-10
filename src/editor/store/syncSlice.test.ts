import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { Config, Track } from '@/core/types'
import { listTracks } from '@/editor/storage'
import type { TrackUploadOutcome } from '@/editor/sync/trackSync'
import { createEditorStore } from './index'

const uploadTrack = vi.hoisted(() => vi.fn<(track: Track, config: Config, options?: { thumbnail?: string | null; force?: boolean }) => Promise<TrackUploadOutcome>>())
vi.mock('@/editor/sync/trackSync', () => ({ uploadTrack }))

const track: Track = {
  id: 'local-1',
  name: 'Sync Track',
  gates: [{ id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
}

function signedInStore() {
  const store = createEditorStore()
  store.setState({ accountStatus: 'signed-in', accountUser: { id: 'user1', email: 'a@b.test', name: 'A' } })
  store.getState().setTrack(track)
  return store
}

describe('syncSlice', () => {
  beforeEach(() => {
    localStorage.clear()
    uploadTrack.mockReset()
  })

  it('does nothing while signed out', async () => {
    const store = createEditorStore()

    await store.getState().syncTrack(track, defaultConfig)

    expect(uploadTrack).not.toHaveBeenCalled()
    expect(store.getState().trackSyncStatus).toBeNull()
  })

  it('tracks syncing and synced states for the uploaded track', async () => {
    const store = signedInStore()
    uploadTrack.mockResolvedValue({ status: 'synced' })

    const pending = store.getState().syncTrack(track, defaultConfig, 'data:image/jpeg;base64,AA==')
    expect(store.getState().trackSyncStatus).toEqual({ trackId: 'local-1', state: 'syncing' })
    await pending

    expect(uploadTrack).toHaveBeenCalledWith(track, defaultConfig, { thumbnail: 'data:image/jpeg;base64,AA==', force: false })
    expect(store.getState().trackSyncStatus).toEqual({ trackId: 'local-1', state: 'synced' })
  })

  it('marks failed uploads as not synced', async () => {
    const store = signedInStore()
    uploadTrack.mockResolvedValue({ status: 'failed' })

    await store.getState().syncTrack(track, defaultConfig)

    expect(store.getState().trackSyncStatus?.state).toBe('failed')
  })

  it('opens a conflict and overwrites on request', async () => {
    const store = signedInStore()
    uploadTrack.mockResolvedValueOnce({ status: 'conflict' }).mockResolvedValueOnce({ status: 'synced' })

    await store.getState().syncTrack(track, defaultConfig)
    expect(store.getState().syncConflict?.track.id).toBe('local-1')

    await store.getState().resolveSyncConflict('overwrite')

    expect(uploadTrack).toHaveBeenLastCalledWith(track, defaultConfig, { thumbnail: null, force: true })
    expect(store.getState()).toMatchObject({ syncConflict: null, trackSyncStatus: { trackId: 'local-1', state: 'synced' } })
  })

  it('keeps the local save and shows "not synced" when the conflict is cancelled', async () => {
    const store = signedInStore()
    uploadTrack.mockResolvedValue({ status: 'conflict' })
    await store.getState().syncTrack(track, defaultConfig)

    await store.getState().resolveSyncConflict('cancel')

    expect(uploadTrack).toHaveBeenCalledTimes(1)
    expect(store.getState()).toMatchObject({ syncConflict: null, trackSyncStatus: { trackId: 'local-1', state: 'failed' } })
  })

  it('saves a copy under a new id, continues editing it and uploads it', async () => {
    const store = signedInStore()
    uploadTrack.mockResolvedValueOnce({ status: 'conflict' }).mockResolvedValueOnce({ status: 'synced' })
    await store.getState().syncTrack(track, defaultConfig)

    await store.getState().resolveSyncConflict('copy', 'Sync Track Kopie')

    const copy = store.getState().currentTrack
    expect(copy?.id).not.toBe('local-1')
    expect(copy?.name).toBe('Sync Track Kopie')
    expect(listTracks().map((info) => info.name)).toEqual(['Sync Track Kopie'])
    expect(uploadTrack).toHaveBeenLastCalledWith(expect.objectContaining({ id: copy?.id }), defaultConfig, { thumbnail: null, force: false })
    expect(store.getState().trackSyncStatus).toEqual({ trackId: copy?.id, state: 'synced' })
  })
})
