import type { Gate, GateOpening, GateType } from '../types'
import { GATE_DEFINITIONS } from './gateDefinitions'

type GateLike = Omit<Gate, 'openings'> & { openings?: GateOpening[] }

export function createDefaultGateOpenings(type: GateType, gateId?: string): GateOpening[] {
  return GATE_DEFINITIONS[type].createOpenings(gateId)
}

export function normalizeGate(gate: GateLike): Gate {
  const gateWithoutLegacySize = { ...gate }
  delete (gateWithoutLegacySize as GateLike & { size?: unknown }).size

  const definition = GATE_DEFINITIONS[gateWithoutLegacySize.type]
  const openings = definition.normalizeOpenings
    ? definition.normalizeOpenings(gateWithoutLegacySize)
    : gateWithoutLegacySize.openings && gateWithoutLegacySize.openings.length > 0
    ? gateWithoutLegacySize.openings
    : definition.createOpenings(gateWithoutLegacySize.id)

  return { ...gateWithoutLegacySize, openings }
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
