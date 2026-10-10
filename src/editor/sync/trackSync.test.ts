import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { serializeTrack } from '@/core/schemas/track.schema'
import type { Track } from '@/core/types'
import type { RemoteTrackSummary } from '@/editor/api/tracks'
import { listTracks, loadTrack, saveTrack, type SavedTrackInfo } from '@/editor/storage'
import { getSyncMeta, setSyncMeta } from './syncMeta'
import { downloadTrack, mergeGalleryEntries, uploadTrack } from './trackSync'

const USER = { id: 'user1', email: 'pilot@example.test', name: 'Pilot' }

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const tracksApi = vi.hoisted(() => ({
  findRemoteTrack: vi.fn(),
  createRemoteTrack: vi.fn(),
  updateRemoteTrack: vi.fn(),
  getRemoteTrack: vi.fn(),
  deleteRemoteTrack: vi.fn(),
  fetchThumbnailDataUrl: vi.fn(async () => null),
}))
vi.mock('@/editor/api/auth', () => auth)
vi.mock('@/editor/api/tracks', () => tracksApi)

const track: Track = {
  id: 'local-1',
  name: 'Sync Track',
  gates: [{ id: 'gate-1', type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
}

const remote = (overrides: Partial<RemoteTrackSummary> = {}): RemoteTrackSummary => ({
  id: 'remote000000001',
  clientId: 'local-1',
  name: 'Sync Track',
  updated: '2026-10-01T10:00:05.000Z',
  thumbnailUrl: null,
  ...overrides,
})

describe('uploadTrack', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    auth.getCurrentUser.mockReturnValue(USER)
  })

  it('skips when signed out', async () => {
    auth.getCurrentUser.mockReturnValue(null)

    await expect(uploadTrack(track, defaultConfig)).resolves.toEqual({ status: 'skipped' })
    expect(tracksApi.findRemoteTrack).not.toHaveBeenCalled()
  })

  it('creates a new account track and remembers the server state', async () => {
    tracksApi.findRemoteTrack.mockResolvedValue(null)
    tracksApi.createRemoteTrack.mockResolvedValue(remote())

    await expect(uploadTrack(track, defaultConfig, { thumbnail: 'data:image/jpeg;base64,AA==' })).resolves.toEqual({ status: 'synced' })

    expect(tracksApi.createRemoteTrack).toHaveBeenCalledWith({
      clientId: 'local-1',
      name: 'Sync Track',
      data: JSON.parse(serializeTrack(track, defaultConfig)),
      thumbnail: 'data:image/jpeg;base64,AA==',
    })
    expect(getSyncMeta('local-1', USER.id)).toMatchObject({ remoteId: 'remote000000001', remoteUpdated: '2026-10-01T10:00:05.000Z' })
  })

  it('updates when the server copy is unchanged since the last sync', async () => {
    setSyncMeta('local-1', { userId: USER.id, remoteId: 'remote000000001', remoteUpdated: '2026-10-01T10:00:05.000Z', syncedAt: '2026-10-01T10:00:06.000Z' })
    tracksApi.findRemoteTrack.mockResolvedValue(remote())
    tracksApi.updateRemoteTrack.mockResolvedValue(remote({ updated: '2026-10-02T08:00:00.000Z' }))

    await expect(uploadTrack(track, defaultConfig)).resolves.toEqual({ status: 'synced' })
    expect(tracksApi.updateRemoteTrack).toHaveBeenCalledWith('remote000000001', expect.objectContaining({ clientId: 'local-1' }))
    expect(getSyncMeta('local-1', USER.id)?.remoteUpdated).toBe('2026-10-02T08:00:00.000Z')
  })

  it('reports a conflict when another device changed the server copy', async () => {
    setSyncMeta('local-1', { userId: USER.id, remoteId: 'remote000000001', remoteUpdated: '2026-10-01T10:00:05.000Z', syncedAt: '2026-10-01T10:00:06.000Z' })
    tracksApi.findRemoteTrack.mockResolvedValue(remote({ updated: '2026-10-03T09:00:00.000Z' }))

    await expect(uploadTrack(track, defaultConfig)).resolves.toEqual({ status: 'conflict' })
    expect(tracksApi.updateRemoteTrack).not.toHaveBeenCalled()

    tracksApi.updateRemoteTrack.mockResolvedValue(remote({ updated: '2026-10-03T09:30:00.000Z' }))
    await expect(uploadTrack(track, defaultConfig, { force: true })).resolves.toEqual({ status: 'synced' })
  })

  it('treats an unknown server copy (no sync state on this device) as a conflict', async () => {
    tracksApi.findRemoteTrack.mockResolvedValue(remote())

    await expect(uploadTrack(track, defaultConfig)).resolves.toEqual({ status: 'conflict' })
  })

  it('reports failures without throwing (offline)', async () => {
    tracksApi.findRemoteTrack.mockRejectedValue(new Error('offline'))

    await expect(uploadTrack(track, defaultConfig)).resolves.toEqual({ status: 'failed' })
  })
})

describe('downloadTrack', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    auth.getCurrentUser.mockReturnValue(USER)
  })

  it('validates, stores locally and marks the track as synced', async () => {
    tracksApi.getRemoteTrack.mockResolvedValue({ ...remote(), data: JSON.parse(serializeTrack(track, defaultConfig)) })

    const result = await downloadTrack('remote000000001')

    expect(result?.track.id).toBe('local-1')
    expect(loadTrack('local-1')?.track.name).toBe('Sync Track')
    expect(getSyncMeta('local-1', USER.id)?.remoteId).toBe('remote000000001')
  })

  it('rejects invalid account data', async () => {
    tracksApi.getRemoteTrack.mockResolvedValue({ ...remote(), data: { version: '2.1.0', track: { gates: 'x' } } })

    await expect(downloadTrack('remote000000001')).resolves.toBeNull()
    expect(listTracks()).toEqual([])
  })
})

describe('mergeGalleryEntries', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const local = (id: string, updatedAt = '2026-10-01T10:00:00.000Z'): SavedTrackInfo => ({ id, name: id, updatedAt })

  it('lists plain local entries when no account data is available', () => {
    expect(mergeGalleryEntries([local('a'), local('b')], null, null).map((entry) => [entry.id, entry.syncState])).toEqual([['b', null], ['a', null]])
  })

  it('marks synced, unsynced, local-only and account-only tracks', () => {
    saveTrack({ ...track, id: 'synced' }, defaultConfig)
    setSyncMeta('synced', { userId: USER.id, remoteId: 'r-synced', remoteUpdated: '2026-10-01T10:00:05.000Z', syncedAt: '2026-10-01T10:00:06.000Z' })
    setSyncMeta('changed', { userId: USER.id, remoteId: 'r-changed', remoteUpdated: '2026-10-01T10:00:05.000Z', syncedAt: '2026-10-01T10:00:06.000Z' })

    const entries = mergeGalleryEntries(
      [local('synced'), local('changed', '2026-10-05T00:00:00.000Z'), local('local-only')],
      [
        remote({ id: 'r-synced', clientId: 'synced' }),
        remote({ id: 'r-changed', clientId: 'changed' }),
        remote({ id: 'r-old', clientId: 'remote-old', updated: '2026-09-01T00:00:00.000Z' }),
        remote({ id: 'r-new', clientId: 'remote-new', updated: '2026-10-09T00:00:00.000Z' }),
      ],
      USER.id,
    )

    expect(entries.map((entry) => [entry.id, entry.syncState])).toEqual([
      ['local-only', 'local'],
      ['changed', 'unsynced'],
      ['synced', 'synced'],
      ['remote-new', 'remote'],
      ['remote-old', 'remote'],
    ])
  })

  it('ignores sync state recorded for another account', () => {
    setSyncMeta('a', { userId: 'someone-else', remoteId: 'r-a', remoteUpdated: '2026-10-01T10:00:05.000Z', syncedAt: '2026-10-01T10:00:06.000Z' })

    const [entry] = mergeGalleryEntries([local('a')], [remote({ id: 'r-a', clientId: 'a' })], USER.id)

    expect(entry.syncState).toBe('unsynced')
  })
})
