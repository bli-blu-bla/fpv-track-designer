import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/core/api/http'
import { encodeCompactTrack } from '@/core/schemas/compactTrack.schema'
import { serializeTrack } from '@/core/schemas/track.schema'
import { encodeTrackSharePayload } from '@/core/share/shareTrack'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { Track } from '@/core/types'
import { loadViewerRoute } from './loadViewerRoute'
import { useViewerStore } from './store'

const mockGetShare = vi.fn()
const mockGetEntry = vi.fn()
const mockGetEntryByLabel = vi.fn()
const mockGetNamespace = vi.fn()
const mockListEntries = vi.fn()

vi.mock('@/core/api/shares', () => ({ getShare: (...args: unknown[]) => mockGetShare(...args) }))
vi.mock('@/core/api/collections', () => ({
  getEntry: (...args: unknown[]) => mockGetEntry(...args),
  getEntryByLabel: (...args: unknown[]) => mockGetEntryByLabel(...args),
  getNamespace: (...args: unknown[]) => mockGetNamespace(...args),
  listEntries: (...args: unknown[]) => mockListEntries(...args),
}))

const NAMESPACE = { id: 'ns0000000000001', slug: 'fpv-linz', name: 'FPV Linz' }

const track: Track = {
  id: 'track-1',
  name: 'Linz Training',
  gates: [{ id: 'gate-1', type: 'standard', position: { x: 1, y: 0, z: 2 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const entryDetail = (data: unknown) => ({
  id: 'entry0000000001',
  name: 'Training 10. Oktober',
  eventDate: '2026-10-10T00:00:00.000Z',
  labels: ['latest'],
  thumbnailUrl: null,
  updated: '2026-10-09T00:00:00.000Z',
  namespace: NAMESPACE,
  data,
})

describe('loadViewerRoute', () => {
  beforeEach(() => {
    useViewerStore.getState().reset()
    for (const mock of [mockGetShare, mockGetEntry, mockGetEntryByLabel, mockGetNamespace, mockListEntries]) mock.mockReset()
  })

  it('decodes inline hash payloads without the server', async () => {
    await loadViewerRoute({ kind: 'hash', payload: encodeTrackSharePayload(track, defaultConfig) })

    expect(useViewerStore.getState()).toMatchObject({ status: 'ready', error: null, entryContext: null })
    expect(useViewerStore.getState().track?.name).toBe('Linz Training')
    expect(mockGetShare).not.toHaveBeenCalled()
  })

  it('reports a missing payload for empty routes', async () => {
    await loadViewerRoute({ kind: 'empty' })

    expect(useViewerStore.getState()).toMatchObject({ status: 'error', error: 'Der Link enthält keine Track-Daten. Bitte prüfe den geteilten Link.' })
  })

  it('loads short links through the compact decoder', async () => {
    mockGetShare.mockResolvedValue({ payload: encodeCompactTrack(track, defaultConfig) })

    await loadViewerRoute({ kind: 'share', id: 'k7qx2ab9' })

    expect(mockGetShare).toHaveBeenCalledWith('k7qx2ab9')
    expect(useViewerStore.getState().status).toBe('ready')
    expect(useViewerStore.getState().track?.gates).toHaveLength(1)
  })

  it('reports expired short links and broken payloads', async () => {
    mockGetShare.mockRejectedValueOnce(new ApiError('not-found', 404, 'gone'))
    await loadViewerRoute({ kind: 'share', id: 'k7qx2ab9' })
    expect(useViewerStore.getState().error).toBe('Dieser Link ist abgelaufen oder existiert nicht.')

    mockGetShare.mockResolvedValueOnce({ payload: '[2,"broken"]' })
    await loadViewerRoute({ kind: 'share', id: 'k7qx2ab9' })
    expect(useViewerStore.getState().error).toBe('Der geteilte Track-Link ist ungültig oder beschädigt.')
  })

  it('loads a labelled entry with its collection context', async () => {
    mockGetEntryByLabel.mockResolvedValue(entryDetail(JSON.parse(serializeTrack(track, defaultConfig))))

    await loadViewerRoute({ kind: 'label', namespace: 'fpv-linz', label: 'latest' })

    expect(mockGetEntryByLabel).toHaveBeenCalledWith('fpv-linz', 'latest')
    expect(useViewerStore.getState()).toMatchObject({
      status: 'ready',
      entryContext: { namespace: NAMESPACE, entryName: 'Training 10. Oktober', labels: ['latest'] },
    })
  })

  it('validates entry data through the track schema', async () => {
    mockGetEntry.mockResolvedValue(entryDetail({ version: '2.1.0', track: { gates: 'nope' } }))

    await loadViewerRoute({ kind: 'entry', namespace: 'fpv-linz', entryId: 'entry0000000001' })

    expect(useViewerStore.getState()).toMatchObject({ status: 'error', track: null, error: 'Der geteilte Track-Link ist ungültig oder beschädigt.' })
  })

  it('distinguishes unknown labels, collections and unreachable servers', async () => {
    mockGetEntryByLabel.mockRejectedValueOnce(new ApiError('not-found', 404, 'label', 'label'))
    await loadViewerRoute({ kind: 'label', namespace: 'fpv-linz', label: 'next' })
    expect(useViewerStore.getState().error).toBe('Das Label „next“ gibt es in dieser Collection nicht.')

    mockGetEntryByLabel.mockRejectedValueOnce(new ApiError('not-found', 404, 'namespace', 'namespace'))
    await loadViewerRoute({ kind: 'label', namespace: 'nope', label: 'latest' })
    expect(useViewerStore.getState().error).toBe('Diese Collection existiert nicht.')

    mockGetEntry.mockRejectedValueOnce(new ApiError('not-found', 404, 'entry'))
    await loadViewerRoute({ kind: 'entry', namespace: 'fpv-linz', entryId: 'entry0000000001' })
    expect(useViewerStore.getState().error).toBe('Diesen Track gibt es in dieser Collection nicht (mehr).')

    mockGetNamespace.mockRejectedValueOnce(new ApiError('network', 0, 'offline'))
    await loadViewerRoute({ kind: 'collection', namespace: 'fpv-linz' })
    expect(useViewerStore.getState().error).toBe('Der Server ist gerade nicht erreichbar. Bitte versuche es später erneut.')
  })

  it('loads a collection overview', async () => {
    const entries = [entryDetail(null)]
    mockGetNamespace.mockResolvedValue(NAMESPACE)
    mockListEntries.mockResolvedValue(entries)

    await loadViewerRoute({ kind: 'collection', namespace: 'fpv-linz' })

    expect(mockListEntries).toHaveBeenCalledWith(NAMESPACE)
    expect(useViewerStore.getState()).toMatchObject({ status: 'ready', track: null, collection: { namespace: NAMESPACE, entries } })
  })
})
