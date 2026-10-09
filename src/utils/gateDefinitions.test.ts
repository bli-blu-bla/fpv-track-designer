import { describe, expect, it } from 'vitest'
import type { Gate } from '../types'
import { GATE_TYPES } from '../types'
import { GATE_DEFINITIONS, START_FINISH_GATE_TYPES } from './gateDefinitions'

const createGate = (type: Gate['type'], id: string): Gate => ({
  id,
  type,
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  openings: GATE_DEFINITIONS[type].createOpenings(id),
})

describe('GATE_DEFINITIONS', () => {
  it.each(GATE_TYPES)('%s creates openings with unique ids', (type) => {
    const ids = GATE_DEFINITIONS[type].createOpenings('gate-1').map((opening) => opening.id)

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(GATE_TYPES)('%s only sequences openings it actually has', (type) => {
    const gate = createGate(type, 'gate-1')
    const openingIds = new Set(gate.openings.map((opening) => opening.id))
    const sequenceIds = GATE_DEFINITIONS[type].sequenceOpeningIds?.(gate) ?? []

    expect(sequenceIds.every((id) => openingIds.has(id))).toBe(true)
  })

  it.each(GATE_TYPES)('%s references existing openings for tunnel and implicit passes', (type) => {
    const definition = GATE_DEFINITIONS[type]
    const openingIds = new Set(definition.createOpenings('gate-1').map((opening) => opening.id))
    const referenced = [
      definition.tunnelOpeningId,
      ...(definition.implicitPass ? [...definition.implicitPass.between, definition.implicitPass.via] : []),
    ].filter((id): id is string => id !== undefined)

    expect(referenced.every((id) => openingIds.has(id))).toBe(true)
  })

  it('has exactly one start/finish gate type', () => {
    expect(START_FINISH_GATE_TYPES).toEqual(['start-finish'])
  })
})
