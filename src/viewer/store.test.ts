import { beforeEach, describe, expect, it } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import type { Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { useViewerStore } from './store'

const createTestTrack = (): Track => ({
  id: 'viewer-track',
  name: 'Viewer Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: createDefaultGateOpenings('standard'),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
})

describe('useViewerStore', () => {
  beforeEach(() => {
    useViewerStore.getState().reset()
  })

  it('starts loading without track data or errors', () => {
    expect(useViewerStore.getState().status).toBe('loading')
    expect(useViewerStore.getState().collection).toBeNull()
    expect(useViewerStore.getState().track).toBeNull()
    expect(useViewerStore.getState().config).toBeNull()
    expect(useViewerStore.getState().error).toBeNull()
  })

  it('stores read-only track data', () => {
    const track = createTestTrack()

    useViewerStore.getState().setTrackData(track, defaultConfig)

    expect(useViewerStore.getState().status).toBe('ready')
    expect(useViewerStore.getState().track?.id).toBe('viewer-track')
    expect(useViewerStore.getState().config?.fieldSize).toEqual(defaultConfig.fieldSize)
    expect(useViewerStore.getState().error).toBeNull()
  })

  it('stores an error and clears track data', () => {
    useViewerStore.getState().setTrackData(createTestTrack(), defaultConfig)

    useViewerStore.getState().setError('Ungültiger Link')

    expect(useViewerStore.getState().track).toBeNull()
    expect(useViewerStore.getState().config).toBeNull()
    expect(useViewerStore.getState().error).toBe('Ungültiger Link')
    expect(useViewerStore.getState().status).toBe('error')
  })

  it('does not expose editor mutation actions', () => {
    const keys = Object.keys(useViewerStore.getState())

    expect(keys).not.toContain('moveGate')
    expect(keys).not.toContain('rotateGate')
    expect(keys).not.toContain('deleteSelectedGates')
    expect(keys).not.toContain('insertGateAtIndex')
  })
})
