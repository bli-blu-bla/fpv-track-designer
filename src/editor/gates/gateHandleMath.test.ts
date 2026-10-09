import { describe, expect, it } from 'vitest'
import type { Gate, Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { getDragUpdate, getInsertControl, type GateDrag } from './gateHandleMath'

const FIELD = { width: 20, height: 10 }

const gate = (id: string, x: number, z: number, rotation = 0): Gate => ({
  id,
  type: 'standard',
  position: { x, y: 0, z },
  rotation,
  openings: createDefaultGateOpenings('standard', id),
})

const track = (gates: Gate[], sequenceIds = gates.map((g) => g.id)): Track => ({
  id: 't',
  name: 't',
  gates,
  gateSequence: sequenceIds.map((gateId) => ({ gateId, openingId: 'main', reverse: false })),
  fieldSize: FIELD,
  createdAt: '',
  updatedAt: '',
})

const pointer = (clientX: number, clientY: number, hit = { x: 0, z: 0 }) => ({ clientX, clientY, groundHit: () => hit })

describe('getDragUpdate', () => {
  it('moves by the ground delta and clamps to the field', () => {
    const drag: GateDrag = { mode: 'move', startHit: { x: 0, z: 0 }, startPosition: { x: 1, y: 0.5, z: 1 } }

    expect(getDragUpdate(drag, pointer(0, 0, { x: 2, z: -1 }), FIELD, false)).toEqual({ position: { x: 3, y: 0.5, z: 0 } })
    expect(getDragUpdate(drag, pointer(0, 0, { x: 50, z: 50 }), FIELD, false)).toEqual({ position: { x: 10, y: 0.5, z: 5 } })
  })

  it('raises the gate when dragging up and never below the ground', () => {
    const drag: GateDrag = { mode: 'elevate', startClientY: 100, startPosition: { x: 0, y: 1, z: 0 } }

    expect(getDragUpdate(drag, pointer(0, 0), FIELD, false)).toEqual({ position: { x: 0, y: 4, z: 0 } })
    expect(getDragUpdate(drag, pointer(0, 500), FIELD, false)).toEqual({ position: { x: 0, y: 0, z: 0 } })
  })

  it('rotates one degree per pixel and snaps to 15 degrees when grid snapping is on', () => {
    const drag: GateDrag = { mode: 'rotate', startClientX: 0, startRotation: 90 }

    expect(getDragUpdate(drag, pointer(22, 0), FIELD, false)).toEqual({ rotation: 112 })
    expect(getDragUpdate(drag, pointer(22, 0), FIELD, true)).toEqual({ rotation: 105 })
  })
})

describe('getInsertControl', () => {
  it('places inserts halfway to the sequence neighbors and updates indices', () => {
    const t = track([gate('a', 0, 0), gate('b', 4, 0), gate('c', 4, 4)])

    expect(getInsertControl(t, 'b', 'before', [])).toMatchObject({
      insertPosition: { x: 2, y: 0, z: 0 },
      gateIndex: 1,
      sequenceIndex: 1,
    })
    expect(getInsertControl(t, 'b', 'after', [])).toMatchObject({
      insertPosition: { x: 4, y: 0, z: 2 },
      gateIndex: 2,
      sequenceIndex: 2,
    })
  })

  it('snaps onto the closest sampled flight-path point of the leg', () => {
    const t = track([gate('a', 0, 0), gate('b', 4, 0)])
    const legs = [[{ x: 1, y: 1, z: 1 }, { x: 2, y: 1.5, z: 0.5 }]]

    expect(getInsertControl(t, 'a', 'after', legs)).toMatchObject({
      insertPosition: { x: 2, y: 0, z: 0.5 },
      handlePosition: { x: 2, y: 1.5, z: 0.5 },
    })
  })

  it('falls back to the gate facing when the gate is not in the sequence', () => {
    const t = track([gate('a', 0, 0, 90)], [])

    const control = getInsertControl(t, 'a', 'after', [])
    expect(control?.insertPosition.x).toBeCloseTo(3)
    expect(control?.insertPosition.z).toBeCloseTo(0)
  })

  it('returns null for unknown gates', () => {
    expect(getInsertControl(track([gate('a', 0, 0)]), 'missing', 'before', [])).toBeNull()
  })
})
