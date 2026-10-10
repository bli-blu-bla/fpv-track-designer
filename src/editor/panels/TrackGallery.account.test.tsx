import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAppStore } from '@/editor/store'
import { defaultConfig } from '@/core/defaultConfig'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { serializeTrack } from '@/core/schemas/track.schema'
import type { Track } from '@/core/types'
import type { RemoteTrackSummary } from '@/editor/api/tracks'
import { listTracks, saveTrack } from '@/editor/storage'
import { setSyncMeta } from '@/editor/sync/syncMeta'
import { TrackGallery } from './TrackGallery'

const USER = { id: 'user1', email: 'pilot@example.test', name: 'Pilot' }

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const tracksApi = vi.hoisted(() => ({
  listRemoteTracks: vi.fn<() => Promise<RemoteTrackSummary[]>>(),
  findRemoteTrack: vi.fn(),
  createRemoteTrack: vi.fn(),
  updateRemoteTrack: vi.fn(),
  getRemoteTrack: vi.fn(),
  deleteRemoteTrack: vi.fn(async () => undefined),
  fetchThumbnailDataUrl: vi.fn(async () => null),
}))
vi.mock('@/editor/api/auth', async (importOriginal) => ({ ...await importOriginal<typeof import('@/editor/api/auth')>(), ...auth }))
vi.mock('@/editor/api/tracks', () => tracksApi)

const render = (ui: ReactElement) => rtlRender(<TooltipProvider>{ui}</TooltipProvider>)

const track = (id: string, name: string): Track => ({
  id,
  name,
  gates: [{ id: `${id}-gate`, type: 'standard', position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings('standard') }],
  gateSequence: [{ gateId: `${id}-gate`, openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
})

const remote = (clientId: string, name: string, id = `r-${clientId}`): RemoteTrackSummary => ({
  id,
  clientId,
  name,
  updated: '2026-10-01T10:00:05.000Z',
  thumbnailUrl: null,
})

describe('TrackGallery with an account', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    auth.getCurrentUser.mockReturnValue(USER)
    useAppStore.setState({
      config: defaultConfig,
      currentTrack: null,
      isTrackModified: false,
      accountStatus: 'signed-in',
      accountUser: USER,
      trackSyncStatus: null,
    })
  })

  it('merges local and account tracks with sync badges', async () => {
    saveTrack(track('synced', 'Synced Track'), defaultConfig)
    setSyncMeta('synced', { userId: USER.id, remoteId: 'r-synced', remoteUpdated: '2026-10-01T10:00:05.000Z', syncedAt: '2026-10-01T10:00:06.000Z' })
    saveTrack(track('local', 'Local Track'), defaultConfig)
    tracksApi.listRemoteTracks.mockResolvedValue([remote('synced', 'Synced Track'), remote('elsewhere', 'Other Device Track')])

    render(<TrackGallery />)

    expect(await screen.findByText('Other Device Track')).not.toBeNull()
    expect(screen.getByText('Synchronisiert')).not.toBeNull()
    expect(screen.getByText('Nur lokal')).not.toBeNull()
    expect(screen.getByText('Nur im Konto')).not.toBeNull()
    expect(screen.getAllByRole('button', { name: 'Hochladen' })).toHaveLength(1)
  })

  it('downloads an account-only track when loading it', async () => {
    const remoteTrack = track('elsewhere', 'Other Device Track')
    tracksApi.listRemoteTracks.mockResolvedValue([remote('elsewhere', 'Other Device Track')])
    tracksApi.getRemoteTrack.mockResolvedValue({ ...remote('elsewhere', 'Other Device Track'), data: JSON.parse(serializeTrack(remoteTrack, defaultConfig)) })

    render(<TrackGallery />)
    fireEvent.click(await screen.findByRole('button', { name: 'Other Device Track – Laden' }))

    await waitFor(() => expect(useAppStore.getState().currentTrack?.id).toBe('elsewhere'))
    expect(listTracks().map((info) => info.id)).toEqual(['elsewhere'])
  })

  it('uploads a local-only track', async () => {
    saveTrack(track('local', 'Local Track'), defaultConfig)
    tracksApi.listRemoteTracks.mockResolvedValue([])
    tracksApi.findRemoteTrack.mockResolvedValue(null)
    tracksApi.createRemoteTrack.mockResolvedValue(remote('local', 'Local Track'))

    render(<TrackGallery />)
    fireEvent.click(await screen.findByRole('button', { name: 'Hochladen' }))

    await waitFor(() => expect(tracksApi.createRemoteTrack).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'local', name: 'Local Track' })))
    await waitFor(() => expect(tracksApi.listRemoteTracks).toHaveBeenCalledTimes(2))
  })

  it('asks where to delete a synced track', async () => {
    saveTrack(track('synced', 'Synced Track'), defaultConfig)
    tracksApi.listRemoteTracks.mockResolvedValue([remote('synced', 'Synced Track')])

    render(<TrackGallery />)
    await screen.findByText('Nicht synchronisiert')
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(screen.getByText(/ist auf diesem Gerät und in deinem Konto gespeichert/)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Nur im Konto' }))

    await waitFor(() => expect(tracksApi.deleteRemoteTrack).toHaveBeenCalledWith('r-synced'))
    expect(listTracks().map((info) => info.id)).toEqual(['synced'])
  })
})
