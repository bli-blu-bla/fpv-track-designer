import type { Gate, GateOpening, GateType, PersistedGateOpening } from '../types'
import { GATE_DEFINITIONS } from './gateDefinitions'

type GateLike = Omit<Gate, 'openings'> & { openings?: PersistedGateOpening[] }

export function createDefaultGateOpenings(type: GateType, gateId?: string): GateOpening[] {
  return GATE_DEFINITIONS[type].createOpenings(gateId)
}

/**
 * Rebuilds a gate's openings from its type. Geometry always comes from the gate
 * definition; persisted openings only contribute user state (`reverse`), matched
 * by id, or by position when an older layout used other ids.
 */
function normalizeOpenings(gate: GateLike): GateOpening[] {
  const definition = GATE_DEFINITIONS[gate.type]
  const defaults = definition.createOpenings(gate.id)
  const persisted = definition.remapLegacyOpenings?.(gate.openings ?? []) ?? gate.openings ?? []
  if (persisted.length === 0) return defaults

  const persistedById = new Map(persisted.map((opening) => [opening.id, opening]))
  const matchByIndex = persisted.length === defaults.length && !persisted.some((opening) => defaults.some((d) => d.id === opening.id))

  return defaults.map((opening, index) => {
    const source = matchByIndex ? persisted[index] : persistedById.get(opening.id)
    return source?.reverse !== undefined ? { ...opening, reverse: source.reverse } : opening
  })
}

export function normalizeGate(gate: GateLike): Gate {
  const { id, type, position, rotation } = gate

  return { id, type, position, rotation, openings: normalizeOpenings(gate) }
}

export function normalizeGates(gates: GateLike[]): Gate[] {
  return gates.map(normalizeGate)
}

export function recreateGateOpenings(gate: Pick<Gate, 'type'> & { id?: string }): GateOpening[] {
  return createDefaultGateOpenings(gate.type, gate.id)
}

export function getPrimaryOpeningId(gate: Pick<Gate, 'openings'>): string {
  return gate.openings[0]?.id ?? 'main'
}
