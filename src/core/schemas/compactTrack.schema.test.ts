import { describe, expect, it } from 'vitest'
import { defaultConfig } from '@/core/defaultConfig'
import type { Config, Gate, Track } from '@/core/types'
import { GATE_TYPES } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { getGateIdVariant } from '@/core/gates/gateDefinitions'
import { decodeCompactTrack, encodeCompactTrack } from './compactTrack.schema'

const createGate = (id: string, type: Gate['type'], x: number, z: number, rotation = 0): Gate => ({
  id,
  type,
  position: { x, y: 0, z },
  rotation,
  openings: createDefaultGateOpenings(type, id),
})

const baseTrack = (gates: Gate[]): Track => ({
  id: 'track-id',
  name: 'Kompakt',
  gates,
  gateSequence: gates.flatMap((gate) => gate.openings.slice(0, 1).map((opening) => ({ gateId: gate.id, openingId: opening.id, reverse: false }))),
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

function decode(track: Track, config: Config = defaultConfig) {
  const result = decodeCompactTrack(encodeCompactTrack(track, config))
  if ('error' in result) throw new Error(JSON.stringify(result.errors))
  return result
}

describe('compact share format', () => {
  it('round-trips every gate type with positions rounded to centimeters', () => {
    const gates = GATE_TYPES.map((type, index) => createGate(`uuid-${type}-${index}`, type, index * 1.234567, -index * 0.5, index * 30))
    const track = { ...baseTrack(gates), gateSequence: [] }
    const { track: decoded } = decode(track)

    expect(decoded.gates.map((gate) => gate.type)).toEqual(GATE_TYPES)
    decoded.gates.forEach((gate, index) => {
      expect(gate.position.x).toBeCloseTo(gates[index].position.x, 2)
      expect(gate.position.z).toBeCloseTo(gates[index].position.z, 2)
      expect(gate.rotation).toBe(gates[index].rotation)
    })
  })

  it('keeps id-derived variants such as dive exit side and h-gate backrest side', () => {
    const gates = ['a', 'b', 'c', 'd'].flatMap((suffix, index) => [
      createGate(`dive-${suffix}`, 'dive', index * 4, 0),
      createGate(`h-${suffix}`, 'h-gate', index * 4, 3),
    ])
    const { track: decoded } = decode(baseTrack(gates))

    decoded.gates.forEach((gate, index) => {
      expect(getGateIdVariant(gate.id)).toBe(getGateIdVariant(gates[index].id))
      expect(gate.openings.map((opening) => opening.id)).toEqual(gates[index].openings.map((opening) => opening.id))
    })
  })

  it('round-trips reversed openings and a custom sequence', () => {
    const double = createGate('double-1', 'double', 4, 0)
    double.openings = double.openings.map((opening) => opening.id === 'upper' ? { ...opening, reverse: true } : opening)
    const gates = [createGate('start-1', 'start-finish', 0, 0), double]
    const track: Track = {
      ...baseTrack(gates),
      gateSequence: [
        { gateId: 'double-1', openingId: 'upper', reverse: true },
        { gateId: 'start-1', openingId: 'main', reverse: false },
        { gateId: 'double-1', openingId: 'lower', reverse: false },
      ],
    }
    const { track: decoded } = decode(track)
    const [start, decodedDouble] = decoded.gates

    expect(decodedDouble.openings.find((opening) => opening.id === 'upper')?.reverse).toBe(true)
    expect(decoded.gateSequence).toEqual([
      { gateId: decodedDouble.id, openingId: 'upper', reverse: true },
      { gateId: start.id, openingId: 'main', reverse: false },
      { gateId: decodedDouble.id, openingId: 'lower', reverse: false },
    ])
  })

  it('carries sky, ground, quality, display flags, name and field size', () => {
    const config: Config = { ...defaultConfig, sky: 'night', ground: 'asphalt', quality: 'realistic', showGrid: true, showFlightPath: false, showOpeningLabels: true }
    const { track, config: decodedConfig } = decode(baseTrack([createGate('g', 'standard', 0, 0)]), config)

    expect(track.name).toBe('Kompakt')
    expect(track.fieldSize).toEqual({ width: 30, height: 15 })
    expect(decodedConfig).toMatchObject({ sky: 'night', ground: 'asphalt', quality: 'realistic', showGrid: true, showFlightPath: false, showOpeningLabels: true })
    expect(decodedConfig.gateQuantities.standard).toBe(1)
  })

  it('rejects malformed payloads', () => {
    expect('error' in decodeCompactTrack('[2,"x"]')).toBe(true)
    expect('error' in decodeCompactTrack('not json')).toBe(true)
  })

  it('maps the theme of version-1 links to sky and quality', () => {
    const [, ...rest] = JSON.parse(encodeCompactTrack(baseTrack([createGate('g', 'standard', 0, 0)]), defaultConfig))
    rest[3] = 2 // legacy theme index: night
    const result = decodeCompactTrack(JSON.stringify([1, ...rest]))

    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.config).toMatchObject({ sky: 'night', ground: 'grass', quality: 'realistic' })
  })
})
