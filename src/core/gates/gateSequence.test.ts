import { describe, expect, it } from 'vitest'
import type { Gate } from '@/core/types'
import { createDefaultGateOpenings } from './gateOpenings'
import { buildDefaultGateSequenceEntries, normalizeGateSequence } from './gateSequence'

function createGate(id: string, type: Gate['type']): Gate {
  return {
    id,
    type,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    openings: createDefaultGateOpenings(type, id),
  }
}

describe('gateSequence', () => {
  it('builds h-gate default sequence as lower then backrest pass', () => {
    const gate = createGate('h-gate-1', 'h-gate')

    expect(buildDefaultGateSequenceEntries(gate)).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'backrest-pass', reverse: false },
    ])
  })

  it('expands legacy string h-gate sequence entries to both h-gate passes', () => {
    const gate = createGate('legacy-h-gate', 'h-gate')

    expect(normalizeGateSequence([gate.id], [gate])).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'backrest-pass', reverse: false },
    ])
  })

  it('builds ladder default sequence as lower, middle and upper', () => {
    const gate = createGate('ladder-1', 'ladder')

    expect(buildDefaultGateSequenceEntries(gate)).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
    ])
  })

  it('expands legacy string ladder sequence entries to all ladder openings', () => {
    const gate = createGate('legacy-ladder', 'ladder')

    expect(normalizeGateSequence([gate.id], [gate])).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
    ])
  })

  it('builds double-h default sequence as lower, middle and upper', () => {
    const gate = createGate('double-h-1', 'double-h')

    expect(buildDefaultGateSequenceEntries(gate)).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
    ])
  })

  it('expands legacy string double-h sequence entries to all double-h openings', () => {
    const gate = createGate('legacy-double-h', 'double-h')

    expect(normalizeGateSequence([gate.id], [gate])).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
    ])
  })

  it('inserts the missing middle pass for legacy explicit double-h lower-to-upper sequences', () => {
    const gate = createGate('legacy-explicit-double-h', 'double-h')

    expect(normalizeGateSequence([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
    ], [gate])).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
    ])
  })

  it('does not duplicate middle pass for a manually ordered double-h lower-upper-middle sequence', () => {
    const gate = createGate('double-h-custom-order', 'double-h')

    expect(normalizeGateSequence([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
    ], [gate])).toEqual([
      { gateId: gate.id, openingId: 'lower', reverse: false },
      { gateId: gate.id, openingId: 'upper', reverse: false },
      { gateId: gate.id, openingId: 'middle', reverse: false },
    ])
  })

  it('builds dive default sequence as entry-top then an exit side', () => {
    const gate = {
      ...createGate('dive-1', 'dive'),
      id: 'dive-1',
    }

    expect(buildDefaultGateSequenceEntries(gate)).toEqual([
      { gateId: gate.id, openingId: 'entry-top', reverse: false },
      { gateId: gate.id, openingId: gate.openings[1].id, reverse: false },
    ])
  })

  it('expands legacy string dive sequence entries to both dive openings', () => {
    const gate = createGate('legacy-dive', 'dive')

    expect(normalizeGateSequence([gate.id], [gate])).toEqual([
      { gateId: gate.id, openingId: 'entry-top', reverse: false },
      { gateId: gate.id, openingId: gate.openings[1].id, reverse: false },
    ])
  })

  it('preserves reverse flag from explicit sequence entries', () => {
    const gate = createGate('standard-1', 'standard')

    expect(normalizeGateSequence([
      { gateId: gate.id, openingId: 'main', reverse: true },
    ], [gate])).toEqual([
      { gateId: gate.id, openingId: 'main', reverse: true },
    ])
  })

  it('builds octagonal tunnel default sequence as one main pass', () => {
    const gate = createGate('octagonal-tunnel-1', 'octagonal-tunnel')

    expect(buildDefaultGateSequenceEntries(gate)).toEqual([
      { gateId: gate.id, openingId: 'main', reverse: false },
    ])
  })

  it('uses opening reverse flags when building default sequence entries', () => {
    const gate = {
      ...createGate('standard-1', 'standard'),
      openings: createDefaultGateOpenings('standard').map((opening) => ({
        ...opening,
        reverse: true,
      })),
    }

    expect(buildDefaultGateSequenceEntries(gate)).toEqual([
      { gateId: gate.id, openingId: 'main', reverse: true },
    ])
  })
})
