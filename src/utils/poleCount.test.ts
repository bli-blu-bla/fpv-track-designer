import { describe, it, expect } from 'vitest'
import { calculatePoleBreakdown } from './poleCount'
import { GATE_DEFINITIONS } from './gateDefinitions'
import { GATE_TYPES } from '../types'
import type { Gate, GateType } from '../types'
import { createDefaultGateOpenings } from './gateOpenings'

const makeGate = (type: GateType, idSuffix: string | number): Gate => ({
  id: `${type}-${idSuffix}`,
  type,
  position: { x: 0, y: 0, z: 0 },
  rotation: 0,
  openings: createDefaultGateOpenings(type),
})

describe('gate pole counts', () => {
  it('defines the agreed pole counts for every gate type', () => {
    expect(Object.fromEntries(GATE_TYPES.map((type) => [type, GATE_DEFINITIONS[type].poles]))).toEqual({
      'standard': 3,
      'start-finish': 3,
      'h-gate': 4,
      'double-h': 7,
      'hurdle': 0,
      'double': 6,
      'ladder': 9,
      'flag': 2,
      'flag-small': 1,
      'dive': 0,
      'octagonal-tunnel': 0,
    })
  })
})

describe('calculatePoleBreakdown', () => {
  it('returns total 0 and no entries for an empty track', () => {
    const result = calculatePoleBreakdown([])
    expect(result.total).toBe(0)
    expect(result.entries).toEqual([])
  })

  it('sums poles for a single gate type', () => {
    const result = calculatePoleBreakdown([
      makeGate('standard', 1),
      makeGate('standard', 2),
      makeGate('standard', 3),
    ])
    expect(result.total).toBe(9)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]).toMatchObject({
      type: 'standard',
      count: 3,
      polesPerGate: 3,
      subtotal: 9,
      notBuildable: false,
    })
  })

  it('aggregates counts across multiple gate types', () => {
    const result = calculatePoleBreakdown([
      makeGate('start-finish', 1), // 3
      makeGate('standard', 1),     // 3
      makeGate('standard', 2),     // 3
      makeGate('h-gate', 1),       // 4
      makeGate('double-h', 1),     // 7
      makeGate('hurdle', 1),       // 0
      makeGate('double', 1),       // 6
      makeGate('ladder', 1),       // 9
      makeGate('flag', 1),         // 2
    ])
    // 3 + 3 + 3 + 4 + 7 + 0 + 6 + 9 + 2 = 37
    expect(result.total).toBe(37)
    expect(result.entries.map((e) => e.type)).toEqual([
      'start-finish',
      'standard',
      'h-gate',
      'double-h',
      'hurdle',
      'double',
      'ladder',
      'flag',
    ])
  })

  it('marks hurdle, dive and tunnel gates as not buildable and counts them as 0', () => {
    const result = calculatePoleBreakdown([
      makeGate('hurdle', 1),
      makeGate('dive', 1),
      makeGate('dive', 2),
      makeGate('octagonal-tunnel', 1),
      makeGate('standard', 1),
    ])
    expect(result.total).toBe(3) // only the standard gate contributes

    const dive = result.entries.find((e) => e.type === 'dive')
    const hurdle = result.entries.find((e) => e.type === 'hurdle')
    const tunnel = result.entries.find((e) => e.type === 'octagonal-tunnel')

    expect(hurdle).toMatchObject({ count: 1, polesPerGate: 0, subtotal: 0, notBuildable: true })
    expect(dive).toMatchObject({ count: 2, polesPerGate: 0, subtotal: 0, notBuildable: true })
    expect(tunnel).toMatchObject({ count: 1, polesPerGate: 0, subtotal: 0, notBuildable: true })
  })

  it('orders entries according to GATE_TYPES ordering', () => {
    // Insertion order intentionally scrambled
    const result = calculatePoleBreakdown([
      makeGate('flag', 1),
      makeGate('start-finish', 1),
      makeGate('ladder', 1),
      makeGate('h-gate', 1),
      makeGate('hurdle', 1),
    ])
    expect(result.entries.map((e) => e.type)).toEqual([
      'start-finish',
      'h-gate',
      'hurdle',
      'ladder',
      'flag',
    ])
  })

  it('omits gate types that are not present on the track', () => {
    const result = calculatePoleBreakdown([makeGate('standard', 1)])
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].type).toBe('standard')
  })
})
