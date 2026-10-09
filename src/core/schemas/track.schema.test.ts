import { describe, expect, it } from 'vitest'

import { deserializeTrack, serializeTrack } from './track.schema'
import type { Config, Track } from '@/core/types'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'

const config: Config = {
  gateQuantities: {
    standard: 1,
    'h-gate': 0,
    'double-h': 0,
    hurdle: 0,
    dive: 0,
    double: 0,
    ladder: 0,
    'start-finish': 0,
    flag: 0,
    'flag-small': 0,
    'octagonal-tunnel': 0,
  },
  fieldSize: { width: 30, height: 15 },
  snapGatesToGrid: false,
  snapGridSize: 0.3,
  showFlightPath: true,
  showOpeningLabels: true,
  showGrid: false,
  theme: 'minimal',
}

const track: Track = {
  id: 'track-id',
  name: 'Continuous Rotation Track',
  gates: [
    {
      id: 'gate-1',
      type: 'standard',
      position: { x: 0, y: 0, z: 0 },
      rotation: 91.5999755859375,
      openings: createDefaultGateOpenings('standard', 'gate-1'),
    },
  ],
  gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: false }],
  fieldSize: { width: 30, height: 15 },
  createdAt: '2026-04-25T15:41:20.141Z',
  updatedAt: '2026-04-25T15:55:07.407Z',
}

describe('track schema', () => {
  it('imports tracks with continuous drag rotations exported by the app', () => {
    const result = deserializeTrack(serializeTrack(track, config))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[0].rotation).toBe(91.5999755859375)
  })

  it('imports small flag gates and fills missing flag-small quantities with 0', () => {
    const smallFlagPayload = JSON.stringify({
      version: '1.2.0',
      track: {
        ...track,
        gates: [
          {
            id: 'gate-small-1',
            type: 'flag-small',
            position: { x: 2, y: 0, z: 1 },
            rotation: 90,
            openings: createDefaultGateOpenings('flag-small', 'gate-small-1'),
          },
        ],
        gateSequence: [{ gateId: 'gate-small-1', openingId: 'main', reverse: false }],
      },
      config: {
        gateQuantities: { standard: 1 },
        fieldSize: { width: 30, height: 15 },
      },
    })

    const result = deserializeTrack(smallFlagPayload)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[0].type).toBe('flag-small')
    expect(result.track.gates[0].openings[0]).toMatchObject({
      id: 'main',
      width: 0.6,
      height: 1.2,
    })
    expect(result.config.gateQuantities['flag-small']).toBe(0)
  })

  it('fills missing optional config display flags with defaults when importing legacy payloads', () => {
    const legacyJson = JSON.stringify({
      version: '1.0.0',
      track: {
        ...track,
        gateSize: 1.5,
        gates: track.gates.map((trackGate) => ({ ...trackGate, size: 1.5 })),
      },
      config: {
        gateQuantities: {
          ...config.gateQuantities,
        },
        fieldSize: config.fieldSize,
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.snapGatesToGrid).toBe(false)
    expect(result.config.snapGridSize).toBe(0.3)
    expect(result.config.showGrid).toBe(false)
    expect(result.config.showFlightPath).toBe(true)
    expect(result.config.showOpeningLabels).toBe(true)
  })

  it('rejects rotations outside the normalized degree range', () => {
    const invalidTrack = {
      ...track,
      gates: [{ ...track.gates[0], rotation: 360 }],
    }

    const result = deserializeTrack(serializeTrack(invalidTrack, config))

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'track.gates[0].rotation',
      message: 'Rotation must be a finite number between 0 and less than 360 degrees',
    })
  })

  it('loads legacy saved tracks with gateSize and gate size fields and drops them', () => {
    const legacyJson = JSON.stringify({
      version: '1.1.0',
      track: {
        ...track,
        gateSize: 1.5,
        gates: track.gates.map((gate) => ({ ...gate, size: 1.5 })),
      },
      config: {
        ...config,
        gateSize: 1.5,
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect('gateSize' in result.track).toBe(false)
    expect('gateSize' in result.config).toBe(false)
    expect('size' in result.track.gates[0]).toBe(false)
  })

  it('loads legacy exports created before octagonal tunnel gate quantities existed', () => {
    const legacyGateQuantities: Partial<Config['gateQuantities']> = { ...config.gateQuantities }
    delete legacyGateQuantities['octagonal-tunnel']
    const legacyJson = JSON.stringify({
      version: '1.1.0',
      track: {
        ...track,
        gateSize: 1,
        gates: track.gates.map((gate) => ({ ...gate, size: 1 })),
      },
      config: {
        ...config,
        gateQuantities: legacyGateQuantities,
        gateSize: 1,
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.gateQuantities['octagonal-tunnel']).toBe(0)
    expect(result.config.gateQuantities.standard).toBe(1)
  })

  it('round-trips hurdle gates through serialization and deserialization', () => {
    const hurdleTrack: Track = {
      ...track,
      gates: [
        {
          id: 'hurdle-1',
          type: 'hurdle',
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          openings: createDefaultGateOpenings('hurdle', 'hurdle-1'),
        },
      ],
      gateSequence: [{ gateId: 'hurdle-1', openingId: 'main', reverse: false }],
    }
    const hurdleConfig: Config = {
      ...config,
      gateQuantities: {
        ...config.gateQuantities,
        standard: 0,
        hurdle: 1,
      },
    }

    const result = deserializeTrack(serializeTrack(hurdleTrack, hurdleConfig))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[0].type).toBe('hurdle')
    expect(result.track.gates[0].openings[0]).toMatchObject({
      id: 'main',
      position: { x: 0, y: 1.74, z: 0 },
    })
    expect(result.config.gateQuantities.hurdle).toBe(1)
  })

  it('still rejects invalid legacy gate quantity values when the key is present', () => {
    const legacyJson = JSON.stringify({
      version: '1.1.0',
      track,
      config: {
        ...config,
        gateQuantities: {
          ...config.gateQuantities,
          'octagonal-tunnel': -1,
        },
      },
    })

    const result = deserializeTrack(legacyJson)

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'config.gateQuantities.octagonal-tunnel',
      message: 'Gate quantity for octagonal-tunnel must be a non-negative integer',
    })
  })

  it('rejects unsupported theme ids in track payload', () => {
    const unsupportedThemePayload = JSON.stringify({
      version: '1.2.0',
      track,
      config: {
        ...config,
        theme: 'unsupported-theme',
      },
    })

    const result = deserializeTrack(unsupportedThemePayload)

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'config.theme',
      message: 'Theme must be one of: minimal, realistic, night',
    })
  })

  it('round-trips configured snap grid size', () => {
    const result = deserializeTrack(serializeTrack(track, { ...config, snapGatesToGrid: true, snapGridSize: 1 }))

    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.config.snapGatesToGrid).toBe(true)
    expect(result.config.snapGridSize).toBe(1)
  })

  it('rejects unsupported snap grid sizes', () => {
    const invalidPayload = JSON.stringify({
      version: '1.2.0',
      track,
      config: {
        ...config,
        snapGridSize: 0.25,
      },
    })

    const result = deserializeTrack(invalidPayload)

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'config.snapGridSize',
      message: 'Snap grid size must be one of: 0.3, 0.5, 1',
    })
  })

  it('stores only user state: no opening geometry and no default gate sequence', () => {
    const exported = JSON.parse(serializeTrack(track, config))

    expect(exported.version).toBe('2.0.0')
    expect(exported.track.gates[0]).not.toHaveProperty('openings')
    expect(exported.track).not.toHaveProperty('gateSequence')
  })

  it('round-trips reversed openings and a custom gate sequence', () => {
    const doubleGate: Track['gates'][number] = {
      id: 'gate-2',
      type: 'double',
      position: { x: 3, y: 0, z: 1 },
      rotation: 30,
      openings: createDefaultGateOpenings('double', 'gate-2').map((opening) => (
        opening.id === 'upper' ? { ...opening, reverse: true } : opening
      )),
    }
    const customTrack: Track = {
      ...track,
      gates: [track.gates[0], doubleGate],
      gateSequence: [
        { gateId: 'gate-2', openingId: 'upper', reverse: true },
        { gateId: 'gate-1', openingId: 'main', reverse: false },
        { gateId: 'gate-2', openingId: 'lower', reverse: false },
      ],
    }

    const exported = JSON.parse(serializeTrack(customTrack, config))
    expect(exported.track.gates[1].openings).toEqual([{ id: 'upper', reverse: true }])

    const result = deserializeTrack(JSON.stringify(exported))
    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[1].openings).toEqual(doubleGate.openings)
    expect(result.track.gateSequence).toEqual(customTrack.gateSequence)
  })

  it('loads 1.x exports with full opening geometry and keeps their direction flags', () => {
    const legacyJson = JSON.stringify({
      version: '1.2.0',
      track: {
        ...track,
        gates: [{
          ...track.gates[0],
          openings: [{ id: 'main', position: { x: 0, y: 9, z: 0 }, width: 5, height: 5, rotation: 0, reverse: true }],
        }],
        gateSequence: [{ gateId: 'gate-1', openingId: 'main', reverse: true }],
      },
      config,
    })

    const result = deserializeTrack(legacyJson)
    expect('error' in result).toBe(false)
    if ('error' in result) return

    expect(result.track.gates[0].openings).toEqual([
      { ...createDefaultGateOpenings('standard', 'gate-1')[0], reverse: true },
    ])
  })

  it('rejects sequence entries that reference unknown gates', () => {
    const result = deserializeTrack(JSON.stringify({
      version: '2.0.0',
      track: { ...track, gateSequence: [{ gateId: 'missing', openingId: 'main' }] },
      config,
    }))

    expect('error' in result).toBe(true)
    if (!('error' in result)) return

    expect(result.errors).toContainEqual({
      field: 'track.gateSequence[0].gateId',
      message: "gateId 'missing' does not match any gate id",
    })
  })
})
