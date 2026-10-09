import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const mockDecodeTrackSharePayload = vi.fn()
const mockRender = vi.fn()
const mockCreateRoot = vi.fn(() => ({ render: mockRender }))

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}))

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('./ViewerApp', () => ({
  ViewerApp: () => null,
}))

vi.mock('@/core/share/shareTrack', () => ({
  decodeTrackSharePayload: mockDecodeTrackSharePayload,
}))

describe('viewer-main', () => {
  beforeEach(async () => {
    vi.resetModules()
    window.location.hash = ''
    mockCreateRoot.mockClear()
    mockRender.mockClear()
    mockDecodeTrackSharePayload.mockReset()

    const { useViewerStore } = await import('./store')
    useViewerStore.getState().reset()
  })

  const loadViewerMain = async () => {
    await import('./main')
  }

  const getViewerStore = async () => {
    const { useViewerStore } = await import('./store')
    return useViewerStore
  }

  it('sets a missing-payload error when hash is empty', async () => {
    await loadViewerMain()

    const useViewerStore = await getViewerStore()

    const state = useViewerStore.getState()
    expect(state.error).toBe('Der Link enthält keine Track-Daten. Bitte prüfe den geteilten Link.')
    expect(state.track).toBeNull()
    expect(state.config).toBeNull()
    expect(mockDecodeTrackSharePayload).not.toHaveBeenCalled()
  })

  it('sets an invalid-link error when decoding fails', async () => {
    window.location.hash = '#invalid'
    mockDecodeTrackSharePayload.mockReturnValue({
      error: 'Invalid share payload',
      errors: [{ field: 'root', message: 'Failed to decode shared track data' }],
    })

    await loadViewerMain()

    const useViewerStore = await getViewerStore()

    const state = useViewerStore.getState()
    expect(mockDecodeTrackSharePayload).toHaveBeenCalledWith('invalid')
    expect(state.error).toBe('Der geteilte Track-Link ist ungültig oder beschädigt.')
    expect(state.track).toBeNull()
    expect(state.config).toBeNull()
  })

  it('loads track and config when decoding succeeds', async () => {
    window.location.hash = '#z.payload'
    const track = {
      id: 'track-id',
      name: 'Track from hash',
      gates: [{
        id: 'gate-1',
        type: 'standard',
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        openings: {
          main: { width: 1, height: 1, radius: 1, count: 2, spacing: 0, orientation: 'outwards' as const },
        },
      }],
      gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
      fieldSize: { width: 30, height: 15 },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }
    const config = {
      fieldSize: { width: 30, height: 15 },
      gateHeight: 4,
      gateSpacing: 5,
      poleHeight: 2,
      gateLength: 4,
      showFlightPath: true,
      gateType: 'standard',
      gateOpacity: 1,
      trackName: '',
      gridSize: 10,
      gateSize: 'medium',
      sky: 'day',
      ground: 'grass',
      quality: 'simple',
    }

    mockDecodeTrackSharePayload.mockReturnValue({ track, config })

    await loadViewerMain()

    const useViewerStore = await getViewerStore()

    const state = useViewerStore.getState()
    expect(mockDecodeTrackSharePayload).toHaveBeenCalledWith('z.payload')
    expect(state.track).toEqual(track)
    expect(state.config).toEqual(config)
    expect(state.error).toBeNull()
  })
})
