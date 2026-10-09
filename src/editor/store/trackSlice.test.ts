import { describe, it, expect, beforeEach } from 'vitest'
import { createEditorStore } from './index'
import { defaultConfig } from '@/core/defaultConfig'
import type { Config, Track, Gate } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import type { GenerationConfig } from '@/core/track/generationConfig'

const createTestTrack = (gates: Gate[] = []): Track => ({
  id: 'test-track',
  name: 'Test Track',
  gates,
  gateSequence: gates.map((gate) => ({ gateId: gate.id, openingId: gate.openings[0]?.id ?? 'main', reverse: false })),
  fieldSize: { width: 100, height: 100 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const createTestGate = (id: string, overrides: Partial<Gate> = {}): Gate => ({
  id,
  type: 'standard',
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  openings: createDefaultGateOpenings('standard'),
  ...overrides,
})

const createTestStore = () => {
  const store = createEditorStore()
  store.getState().setConfig({ ...defaultConfig, fieldSize: { width: 100, height: 100 } })
  return store
}

const createSnapTestStore = (config: Pick<Config, 'snapGatesToGrid'> & Partial<Pick<Config, 'snapGridSize'>>) => {
  const store = createTestStore()
  store.getState().setConfig({ ...store.getState().config, snapGridSize: 0.3, ...config })
  return store
}

describe('TrackSlice - Undo/Redo', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  it('should set track and clear selection', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)

    expect(store.getState().currentTrack).toEqual(track)
    expect(store.getState().selectedGateId).toBeNull()
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should replace track without preserving undo history', () => {
    const originalTrack = createTestTrack([
      createTestGate('gate-1'),
    ])
    const loadedTrack = createTestTrack([
      createTestGate('gate-2', { position: { x: 5, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(originalTrack)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().past.length).toBe(1)

    store.getState().replaceTrack(loadedTrack)
    store.getState().undo()

    expect(store.getState().currentTrack?.gates[0]?.id).toBe('gate-2')
    expect(store.getState().past).toEqual([])
    expect(store.getState().future).toEqual([])
  })

  it('should sync current track without adding undo history', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().syncCurrentTrack({ ...track, name: 'Saved Name' })

    expect(store.getState().currentTrack?.name).toBe('Saved Name')
    expect(store.getState().past).toEqual([])
    expect(store.getState().future).toEqual([])
  })

  it('should move gate and record history', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().moveGate('gate-1', 'N', 1)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.z).toBe(-1)
    expect(store.getState().past.length).toBe(1)
  })

  it('should clamp store gate movement to the field bounds', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 49.5, y: 0, z: -49.5 } }),
    ])
    store.getState().setTrack(track)

    expect(store.getState().currentTrack?.fieldSize).toEqual({ width: 100, height: 100 })
    expect(store.getState().currentTrack?.gates[0]?.position).toEqual({ x: 49.5, y: 0, z: -49.5 })

    store.getState().moveGate('gate-1', 'E', 10)
    store.getState().moveGate('gate-1', 'N', 10)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position).toEqual({ x: 50, y: 0, z: -50 })
  })

  it('should clamp selected gate movement to the field bounds', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: -49.5, y: 0, z: 49.5 } }),
      createTestGate('gate-2', { position: { x: -48, y: 0, z: 48 } }),
    ])
    store.getState().setTrack(track)
    expect(store.getState().currentTrack?.fieldSize).toEqual({ width: 100, height: 100 })
    store.getState().setSelectedGates(['gate-1', 'gate-2'])

    store.getState().moveSelectedGates('W', 10)
    store.getState().moveSelectedGates('S', 10)

    expect(store.getState().currentTrack?.gates.map((gate) => gate.position)).toEqual([
      { x: -50, y: 0, z: 50 },
      { x: -50, y: 0, z: 50 },
    ])
  })

  it('should not position dragged gates below the playing field', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().setGatePosition('gate-1', { x: 0, y: -2, z: 0 })

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(0)
  })

  it('should undo a committed drag to the pre-drag position', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().selectGate('gate-1')
    store.getState().setGatePosition('gate-1', { x: 3, y: 2, z: 4 })
    store.getState().setGatePosition('gate-1', { x: 4, y: 3, z: 5 })
    store.getState().commitGateDrag()
    store.getState().undo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(store.getState().selectedGateId).toBe('gate-1')
  })

  it('should snap so adjacent gates can touch edge-to-edge without overlap', () => {
    // Snap step is 1/4 of the 1.2m gate footprint (0.3m) so gates can be placed edge-to-edge
    // (every 4 steps) while still allowing finer in-between placement.
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 0, y: 0, z: 0 } }),
      createTestGate('gate-2'),
    ])

    snapStore.getState().setTrack(track)
    // User drags gate-2 close to the right edge of gate-1; centre distance must be a multiple of 0.3.
    snapStore.getState().setGatePosition('gate-2', { x: 1.1, y: 0, z: 0 })

    const gate2 = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-2')
    // 1.1 rounds to nearest 0.3 step → 1.2 (which also equals one full gate width).
    expect(gate2?.position.x).toBeCloseTo(1.2, 9)
  })

  it('should snap to quarter-gate sub-steps for fine adjustments', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 0, y: 0, z: 0 } }),
    ])

    snapStore.getState().setTrack(track)
    // 0.4 rounds to nearest 0.3 step → 0.3 (one quarter of a gate width).
    snapStore.getState().setGatePosition('gate-1', { x: 0.4, y: 0, z: 0.7 })

    const gate = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.x).toBeCloseTo(0.3, 9)
    expect(gate?.position.z).toBeCloseTo(0.6, 9)
  })

  it('should use the configured half-field snap size for position and height', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true, snapGridSize: 0.5 })
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().setGatePosition('gate-1', { x: 0.76, y: 1.24, z: -0.26 })

    const gate = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position).toEqual({ x: 1, y: 1, z: -0.5 })
  })

  it('should use the configured full-field snap size for all-gate alignment', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true, snapGridSize: 1 })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 1.4, y: 0.6, z: -1.6 } }),
      createTestGate('gate-2', { position: { x: 2.49, y: 2.51, z: 2.49 } }),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().snapAllGatesToGrid()

    const positions = snapStore.getState().currentTrack?.gates.map((gate) => gate.position) ?? []
    expect(positions).toEqual([
      { x: 1, y: 1, z: -2 },
      { x: 2, y: 3, z: 2 },
    ])
  })

  it('should clamp vertical drag positions before snapping them to the active grid', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().setGatePosition('gate-1', { x: 0, y: -0.8, z: 0 })

    const gate = snapStore.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.y).toBe(0)
  })

  it('should align all gates when grid snapping is enabled', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([
      createTestGate('gate-1', { position: { x: 1.1, y: 0.8, z: -1.1 } }),
      createTestGate('gate-2', { position: { x: 2.4, y: 2.2, z: 2.4 } }),
    ])

    snapStore.getState().setTrack(track)
    snapStore.getState().snapAllGatesToGrid()

    const positions = snapStore.getState().currentTrack?.gates.map((gate) => gate.position) ?? []
    expect(positions[0].x).toBeCloseTo(1.2, 9)
    expect(positions[0].y).toBeCloseTo(0.9, 9)
    expect(positions[0].z).toBeCloseTo(-1.2, 9)
    expect(positions[1].x).toBeCloseTo(2.4, 9)
    expect(positions[1].y).toBeCloseTo(2.1, 9)
    expect(positions[1].z).toBeCloseTo(2.4, 9)
    expect(snapStore.getState().past.length).toBe(1)
  })

  it('should undo last gate move', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().undo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.z).toBe(0)
    expect(store.getState().future.length).toBe(1)
  })

  it('should redo undone gate move', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().undo()
    store.getState().redo()

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.position.z).toBe(-1)
  })

  it('should rotate gate clockwise', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().rotateGate('gate-1', true)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.rotation).toBe(30)
  })

  it('should rotate gate counter-clockwise', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { rotation: 30 }),
    ])
    store.getState().setTrack(track)

    store.getState().rotateGate('gate-1', false)

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.rotation).toBe(0)
  })

  it('should update gate properties', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    store.getState().updateGate('gate-1', { type: 'h-gate' })

    const gate = store.getState().currentTrack?.gates.find(g => g.id === 'gate-1')
    expect(gate?.type).toBe('h-gate')
    expect(gate?.openings[0]?.id).toBe('lower')
  })

  it('should toggle gate direction and update matching sequence entries', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2'),
    ])
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'main')

    const gate = store.getState().currentTrack?.gates.find((candidate) => candidate.id === 'gate-1')
    expect(gate?.openings[0]?.reverse).toBe(true)
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: true },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-1', openingId: 'main', reverse: true },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should undo and redo gate opening direction toggles', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2'),
    ])

    store.getState().setTrack(track)
    store.getState().selectGate('gate-1')
    store.getState().toggleGateDirection('gate-1', 'main')
    store.getState().undo()

    expect(store.getState().currentTrack?.gates[0].openings[0]?.reverse).toBeFalsy()
    expect(store.getState().currentTrack?.gateSequence[0]?.reverse).toBe(false)
    expect(store.getState().selectedGateId).toBe('gate-1')

    store.getState().redo()

    expect(store.getState().currentTrack?.gates[0].openings[0]?.reverse).toBe(true)
    expect(store.getState().currentTrack?.gateSequence[0]?.reverse).toBe(true)
    expect(store.getState().selectedGateId).toBe('gate-1')
  })

  it('should not modify state when toggling unknown gate opening', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])

    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'missing')

    expect(store.getState().past).toEqual([])
    expect(store.getState().currentTrack?.gates[0].openings[0]?.reverse).toBeFalsy()
    expect(store.getState().currentTrack?.gateSequence[0]?.reverse).toBe(false)
  })

  it('should toggle visible opening direction even when the opening is not in the sequence', () => {
    const gate = createTestGate('gate-1', {
      type: 'double',
      openings: createDefaultGateOpenings('double'),
    })
    const track = createTestTrack([gate])
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'upper')

    const upperOpening = store.getState().currentTrack?.gates[0].openings.find((opening) => opening.id === 'upper')
    expect(upperOpening?.reverse).toBe(true)
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should move a gate sequence entry to a new number and shift the rest', () => {
    const firstDoubleGate = createTestGate('gate-1', {
      type: 'double',
      openings: createDefaultGateOpenings('double'),
    })
    const secondDoubleGate = createTestGate('gate-2', {
      type: 'double',
      openings: createDefaultGateOpenings('double'),
    })
    const track = createTestTrack([firstDoubleGate, secondDoubleGate])
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
      { gateId: 'gate-1', openingId: 'upper', reverse: false },
      { gateId: 'gate-2', openingId: 'lower', reverse: false },
      { gateId: 'gate-2', openingId: 'upper', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('gate-2', 'lower', 3, 2)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'lower', reverse: false },
      { gateId: 'gate-2', openingId: 'lower', reverse: false },
      { gateId: 'gate-1', openingId: 'upper', reverse: false },
      { gateId: 'gate-2', openingId: 'upper', reverse: false },
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should ignore sequence moves with mismatched source labels', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2'),
    ])

    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('gate-2', 'main', 1, 2)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().past).toEqual([])
  })

  it('should preserve an explicit double-h sequence order including middle when normalizing track', () => {
    const doubleHGate = createTestGate('double-h-1', {
      type: 'double-h',
      openings: createDefaultGateOpenings('double-h'),
    })
    const track = createTestTrack([doubleHGate])
    track.gateSequence = [
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
    ]

    store.getState().setTrack(track)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
    ])
  })

  it('should move a double-h upper opening from sequence number 10 to 9 without duplicating middle', () => {
    const fillerGates = Array.from({ length: 7 }, (_, index) => createTestGate(`gate-${index + 1}`))
    const doubleHGate = createTestGate('double-h-1', {
      type: 'double-h',
      openings: createDefaultGateOpenings('double-h'),
    })
    const track = createTestTrack([...fillerGates, doubleHGate])
    track.gateSequence = [
      ...fillerGates.map((gate) => ({ gateId: gate.id, openingId: 'main', reverse: false })),
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
    ]

    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('double-h-1', 'upper', 10, 9)

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      ...fillerGates.map((gate) => ({ gateId: gate.id, openingId: 'main', reverse: false })),
      { gateId: 'double-h-1', openingId: 'lower', reverse: false },
      { gateId: 'double-h-1', openingId: 'upper', reverse: false },
      { gateId: 'double-h-1', openingId: 'middle', reverse: false },
    ])
    expect(store.getState().currentTrack?.gateSequence).toHaveLength(10)
    expect(store.getState().past.length).toBe(1)
  })

  it('should select gate', () => {
    store.getState().selectGate('gate-1')
    expect(store.getState().selectedGateId).toBe('gate-1')
    expect(store.getState().selectedGateIds).toEqual(['gate-1'])

    store.getState().selectGate('gate-2', true)
    expect(store.getState().selectedGateIds).toEqual(['gate-1', 'gate-2'])

    store.getState().selectGate(null)
    expect(store.getState().selectedGateId).toBeNull()
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should move all selected gates', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1', 'gate-2'])

    store.getState().moveSelectedGates('N', 1)

    const movedTrack = store.getState().currentTrack
    const gate1 = movedTrack?.gates.find((g) => g.id === 'gate-1')
    const gate2 = movedTrack?.gates.find((g) => g.id === 'gate-2')

    expect(gate1?.position.z).toBe(-1)
    expect(gate2?.position.z).toBe(-1)
  })

  it('should delete all selected gates', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1', 'gate-2'])

    store.getState().deleteSelectedGates()

    expect(store.getState().currentTrack?.gates).toEqual([])
    expect(store.getState().currentTrack?.gateSequence).toEqual([])
    expect(store.getState().selectedGateIds).toEqual([])
  })

  it('should only open delete dialog for a single selected gate', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1'])
    expect(store.getState().isDeleteDialogOpen).toBe(false)

    store.getState().openDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(true)

    store.getState().setSelectedGates(['gate-1', 'gate-2'])
    store.getState().openDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(false)
  })

  it('should close delete dialog', () => {
    const track = createTestTrack([createTestGate('gate-1')])

    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1'])
    store.getState().openDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(true)

    store.getState().closeDeleteDialog()
    expect(store.getState().isDeleteDialogOpen).toBe(false)
  })

  it('should insert a gate at the provided gate and sequence indexes', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    track.updatedAt = '2026-04-23T00:00:00.000Z'
    track.gateSequence = [
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-1', openingId: 'main', reverse: false },
    ]

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      { id: 'gate-3', type: 'h-gate', position: { x: 5, y: 0, z: 0 }, rotation: 30, openings: createDefaultGateOpenings('h-gate') },
      1,
      2,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-2'])
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
      { gateId: 'gate-3', openingId: 'lower', reverse: false },
      { gateId: 'gate-3', openingId: 'backrest-pass', reverse: false },
    ])
    expect(store.getState().selectedGateId).toBe('gate-3')
    expect(store.getState().selectedGateIds).toEqual(['gate-3'])
    expect(store.getState().currentTrack?.updatedAt).not.toBe('2026-04-23T00:00:00.000Z')
    expect(store.getState().past.length).toBe(1)
  })

  it('should not insert a second start-finish gate', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'start-finish',
        position: { x: 5, y: 0, z: 0 },
        rotation: 30,
        openings: createDefaultGateOpenings('start-finish'),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-2'])
    expect(store.getState().past).toEqual([])
  })

  it('should insert multiple flag gates', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'flag',
        position: { x: 5, y: 0, z: 0 },
        rotation: 30,
        openings: createDefaultGateOpenings('flag'),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-2'])
    expect(store.getState().past.length).toBe(1)
  })

  it('should only block updates to an existing start-finish gate type', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-2'),
      createTestGate('gate-3', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-4'),
    ])

    store.getState().setTrack(track)
    store.getState().updateGate('gate-2', { type: 'start-finish' })
    store.getState().updateGate('gate-4', { type: 'flag' })

    expect(store.getState().currentTrack?.gates.map((gate) => gate.type)).toEqual([
      'start-finish',
      'standard',
      'flag',
      'flag',
    ])
    expect(store.getState().past.length).toBe(1)
  })

  it('should only remove duplicate start-finish gates when setting a track', () => {
    const track = createTestTrack([
      createTestGate('gate-1', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-2', { type: 'start-finish', openings: createDefaultGateOpenings('start-finish') }),
      createTestGate('gate-3', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-4', { type: 'flag', openings: createDefaultGateOpenings('flag') }),
      createTestGate('gate-5'),
    ])

    store.getState().setTrack(track)

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-4', 'gate-5'])
    expect(store.getState().currentTrack?.gateSequence.map((entry) => entry.gateId)).toEqual(['gate-1', 'gate-3', 'gate-4', 'gate-5'])
  })

  it('should insert double gates as lower then upper sequence visits', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])

    store.getState().setTrack(track)

    store.getState().insertGateAtIndex(
      {
        id: 'gate-3',
        type: 'double',
        position: { x: 5, y: 0, z: 0 },
        rotation: 0,
        openings: createDefaultGateOpenings('double'),
      },
      1,
      1,
    )

    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-3', openingId: 'lower', reverse: false },
      { gateId: 'gate-3', openingId: 'upper', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
  })

  it('should undo and redo inserted gates with selection history', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
      createTestGate('gate-2', { position: { x: 10, y: 0, z: 0 } }),
    ])
    const insertedGate = {
      id: 'gate-3',
      type: 'h-gate' as const,
      position: { x: 5, y: 0, z: 0 },
      rotation: 30,
      openings: createDefaultGateOpenings('h-gate'),
    }

    store.getState().setTrack(track)
    store.getState().selectGate('gate-2')

    store.getState().insertGateAtIndex(insertedGate, 1, 1)

    expect(store.getState().selectedGateId).toBe('gate-3')
    expect(store.getState().selectedGateIds).toEqual(['gate-3'])

    store.getState().undo()

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-2'])
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().selectedGateId).toBe('gate-2')
    expect(store.getState().selectedGateIds).toEqual(['gate-2'])

    store.getState().redo()

    expect(store.getState().currentTrack?.gates.map((gate) => gate.id)).toEqual(['gate-1', 'gate-3', 'gate-2'])
    expect(store.getState().currentTrack?.gateSequence).toEqual([
      { gateId: 'gate-1', openingId: 'main', reverse: false },
      { gateId: 'gate-3', openingId: 'lower', reverse: false },
      { gateId: 'gate-3', openingId: 'backrest-pass', reverse: false },
      { gateId: 'gate-2', openingId: 'main', reverse: false },
    ])
    expect(store.getState().selectedGateId).toBe('gate-3')
    expect(store.getState().selectedGateIds).toEqual(['gate-3'])
  })

  it('should limit history to 50 changes', () => {
    const track = createTestTrack([
      createTestGate('gate-1'),
    ])
    store.getState().setTrack(track)

    for (let i = 0; i < 60; i++) {
      store.getState().moveGate('gate-1', 'N', 1)
    }

    expect(store.getState().past.length).toBe(50)
  })

  it('should not undo when no history', () => {
    const track = createTestTrack([])
    store.getState().setTrack(track)

    store.getState().undo()

    expect(store.getState().currentTrack).toEqual(track)
  })

  it('should not redo when no future', () => {
    const track = createTestTrack([])
    store.getState().setTrack(track)

    store.getState().redo()

    expect(store.getState().currentTrack).toEqual(track)
  })
})

describe('TrackSlice - generationConfig and isTrackModified', () => {
  const fixtureGenerationConfig: GenerationConfig = {
    gateQuantities: {
      'standard': 2,
      'start-finish': 1,
      'h-gate': 1,
      'double-h': 1,
      'hurdle': 1,
      'dive': 1,
      'double': 1,
      'ladder': 1,
      'flag': 1,
      'flag-small': 0,
      'octagonal-tunnel': 1,
    },
    fieldSize: { width: 30, height: 15 },
  }

  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
  })

  it('setTrack without generationConfig sets generationConfig to null and isTrackModified to false', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    expect(store.getState().generationConfig).toBeNull()
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('setTrack with explicit generationConfig stores it', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track, fixtureGenerationConfig)
    expect(store.getState().generationConfig).toEqual(fixtureGenerationConfig)
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('setTrack always resets isTrackModified to false even after prior mutations', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)

    const nextTrack = createTestTrack([createTestGate('gate-2')])
    store.getState().setTrack(nextTrack)
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('replaceTrack clears both generationConfig and isTrackModified', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track, fixtureGenerationConfig)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().generationConfig).toEqual(fixtureGenerationConfig)
    expect(store.getState().isTrackModified).toBe(true)

    const loadedTrack = createTestTrack([createTestGate('gate-2')])
    store.getState().replaceTrack(loadedTrack)
    expect(store.getState().generationConfig).toBeNull()
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('moveGate sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('commitGateDrag sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().setGatePosition('gate-1', { x: 1, y: 0, z: 1 })
    expect(store.getState().isTrackModified).toBe(false)
    store.getState().commitGateDrag()
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('deleteSelectedGates sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1'), createTestGate('gate-2')])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1'])
    store.getState().deleteSelectedGates()
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('toggleGateDirection sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().toggleGateDirection('gate-1', 'main')
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('moveGateSequenceEntry sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1'), createTestGate('gate-2')])
    store.getState().setTrack(track)
    store.getState().moveGateSequenceEntry('gate-2', 'main', 2, 1)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('insertGateAtIndex sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().insertGateAtIndex(
      {
        id: 'gate-2',
        type: 'standard',
        position: { x: 5, y: 0, z: 0 },
        rotation: 0,
        openings: createDefaultGateOpenings('standard'),
      },
      1,
      1,
    )
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('rotateGate sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().rotateGate('gate-1', true)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('snapAllGatesToGrid sets isTrackModified to true', () => {
    const snapStore = createSnapTestStore({ snapGatesToGrid: true })
    const track = createTestTrack([createTestGate('gate-1', { position: { x: 1.1, y: 0, z: 0 } })])
    snapStore.getState().setTrack(track)
    snapStore.getState().snapAllGatesToGrid()
    expect(snapStore.getState().isTrackModified).toBe(true)
  })

  it('updateGate sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().updateGate('gate-1', { type: 'h-gate' })
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('moveSelectedGates sets isTrackModified to true', () => {
    const track = createTestTrack([createTestGate('gate-1'), createTestGate('gate-2')])
    store.getState().setTrack(track)
    store.getState().setSelectedGates(['gate-1', 'gate-2'])
    store.getState().moveSelectedGates('N', 1)
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('undo restores isTrackModified=false from history snapshot', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track, fixtureGenerationConfig)
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)

    store.getState().undo()
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('redo restores isTrackModified=true from future snapshot', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().moveGate('gate-1', 'N', 1)
    store.getState().undo()
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().redo()
    expect(store.getState().isTrackModified).toBe(true)
  })

  it('selectGate does not flip isTrackModified after a fresh setTrack', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().selectGate('gate-1')
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().selectGate('gate-1', true)
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().selectGate(null)
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('setGatePosition does not flip isTrackModified (drag-in-progress, transient)', () => {
    const track = createTestTrack([createTestGate('gate-1')])
    store.getState().setTrack(track)
    store.getState().setGatePosition('gate-1', { x: 1, y: 0, z: 1 })
    expect(store.getState().isTrackModified).toBe(false)

    store.getState().setGatePosition('gate-1', { x: 2, y: 0, z: 2 })
    expect(store.getState().isTrackModified).toBe(false)
  })

  it('requestDestructiveAction resolves immediately when the track is clean', async () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))

    await expect(store.getState().requestDestructiveAction('shuffle')).resolves.toBe(true)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('requestDestructiveAction stays pending with its reason when the track is modified', async () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    store.getState().moveGate('gate-1', 'N', 1)

    let settled = false
    void store.getState().requestDestructiveAction('import').then(() => {
      settled = true
    })
    await Promise.resolve()

    expect(settled).toBe(false)
    expect(store.getState().pendingDestructiveAction).toEqual({ reason: 'import' })
  })

  it('cancelDestructiveAction resolves false and clears the request', async () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    store.getState().moveGate('gate-1', 'N', 1)

    const request = store.getState().requestDestructiveAction('load')
    store.getState().cancelDestructiveAction()

    await expect(request).resolves.toBe(false)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('confirmDestructiveAction resolves true and clears the request', async () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    store.getState().moveGate('gate-1', 'N', 1)

    const request = store.getState().requestDestructiveAction('shuffle')
    store.getState().confirmDestructiveAction()

    await expect(request).resolves.toBe(true)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('saveBeforeDestructiveAction opens the save dialog while the request stays pending', () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    store.getState().moveGate('gate-1', 'N', 1)

    void store.getState().requestDestructiveAction('duplicate')
    store.getState().saveBeforeDestructiveAction()

    expect(store.getState().isSaveDialogOpen).toBe(true)
    expect(store.getState().pendingDestructiveAction).toEqual({ reason: 'duplicate' })
  })

  it('markTrackSaved clears dirty state and lets a pending request proceed', async () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    store.getState().moveGate('gate-1', 'N', 1)
    expect(store.getState().isTrackModified).toBe(true)

    const request = store.getState().requestDestructiveAction('apply-config')
    store.getState().saveBeforeDestructiveAction()
    store.getState().markTrackSaved()

    await expect(request).resolves.toBe(true)
    expect(store.getState().isTrackModified).toBe(false)
    expect(store.getState().isSaveDialogOpen).toBe(false)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('dismissSaveDialog cancels both the save dialog and the pending request', async () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    store.getState().moveGate('gate-1', 'N', 1)

    const request = store.getState().requestDestructiveAction('shuffle')
    store.getState().saveBeforeDestructiveAction()
    store.getState().dismissSaveDialog()

    await expect(request).resolves.toBe(false)
    expect(store.getState().isSaveDialogOpen).toBe(false)
    expect(store.getState().pendingDestructiveAction).toBeNull()
  })

  it('a newer request cancels an older pending one', async () => {
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    store.getState().moveGate('gate-1', 'N', 1)

    const first = store.getState().requestDestructiveAction('shuffle')
    void store.getState().requestDestructiveAction('load')

    await expect(first).resolves.toBe(false)
    expect(store.getState().pendingDestructiveAction).toEqual({ reason: 'load' })
  })
})

describe('TrackSlice - renameTrack', () => {
  it('renames undoably and marks the track dirty', () => {
    const store = createTestStore()
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))

    store.getState().renameTrack('  Vereinsrennen  ')
    expect(store.getState().currentTrack?.name).toBe('Vereinsrennen')
    expect(store.getState().isTrackModified).toBe(true)

    store.getState().undo()
    expect(store.getState().currentTrack?.name).toBe('Test Track')
  })

  it('ignores empty or unchanged names', () => {
    const store = createTestStore()
    store.getState().setTrack(createTestTrack([createTestGate('gate-1')]))
    const historyLength = store.getState().past.length

    store.getState().renameTrack('   ')
    store.getState().renameTrack('Test Track')

    expect(store.getState().past).toHaveLength(historyLength)
    expect(store.getState().isTrackModified).toBe(false)
  })
})
