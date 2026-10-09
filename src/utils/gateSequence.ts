import type { Gate, GateSequenceItem } from '../types'
import { getPrimaryOpeningId, normalizeGates } from './gateOpenings'
import { GATE_DEFINITIONS } from './gateDefinitions'

type RawGateSequenceItem = string | GateSequenceItem

function buildOpeningsSequence(gate: Gate, openingIds: readonly string[]): GateSequenceItem[] {
  const entries: GateSequenceItem[] = []

  for (const openingId of openingIds) {
    const opening = gate.openings.find((candidate) => candidate.id === openingId)
    if (!opening) return []

    entries.push({ gateId: gate.id, openingId: opening.id, reverse: Boolean(opening.reverse) })
  }

  return entries
}

function getOpeningReverse(gate: Gate, openingId: string): boolean {
  return Boolean(gate.openings.find((opening) => opening.id === openingId)?.reverse)
}

function isSameSequenceItem(a: GateSequenceItem, b: GateSequenceItem): boolean {
  return a.gateId === b.gateId && a.openingId === b.openingId && Boolean(a.reverse) === Boolean(b.reverse)
}

function getImplicitPassOpeningId(previous: GateSequenceItem | undefined, current: GateSequenceItem, gate: Gate | undefined): string | null {
  if (!previous || !gate || previous.gateId !== current.gateId) return null

  const implicitPass = GATE_DEFINITIONS[gate.type].implicitPass
  if (!implicitPass) return null

  const openingIds = new Set([previous.openingId, current.openingId])
  return implicitPass.between.every((id) => openingIds.has(id)) ? implicitPass.via : null
}

function insertMissingImplicitPasses(sequence: GateSequenceItem[], gateMap: Map<string, Gate>): GateSequenceItem[] {
  const expanded: GateSequenceItem[] = []
  const existingPasses = new Set(sequence.map((entry) => `${entry.gateId}:${entry.openingId}`))

  for (const item of sequence) {
    const gate = gateMap.get(item.gateId)
    const viaOpeningId = getImplicitPassOpeningId(expanded[expanded.length - 1], item, gate)

    if (viaOpeningId && !existingPasses.has(`${item.gateId}:${viaOpeningId}`)) {
      const viaOpening = gate?.openings.find((opening) => opening.id === viaOpeningId)
      if (viaOpening) {
        expanded.push({ gateId: item.gateId, openingId: viaOpening.id, reverse: Boolean(viaOpening.reverse) })
      }
    }

    expanded.push(item)
  }

  return expanded
}

function normalizeSequenceItem(item: RawGateSequenceItem, gateMap: Map<string, Gate>): GateSequenceItem[] {
  if (typeof item === 'string') {
    const gate = gateMap.get(item)
    if (!gate) return []

    return buildDefaultGateSequenceEntries(gate)
  }

  const gate = gateMap.get(item.gateId)
  if (!gate) return []

  const openingId = gate.openings.some((opening) => opening.id === item.openingId)
    ? item.openingId
    : getPrimaryOpeningId(gate)

  return [{
    gateId: item.gateId,
    openingId,
    reverse: Boolean(item.reverse),
  }]
}

export function buildFallbackGateSequence(gates: Gate[]): GateSequenceItem[] {
  return gates.flatMap(buildDefaultGateSequenceEntries)
}

export function buildDefaultGateSequenceEntries(gate: Gate): GateSequenceItem[] {
  const openingIds = GATE_DEFINITIONS[gate.type].sequenceOpeningIds?.(gate)
  const entries = openingIds ? buildOpeningsSequence(gate, openingIds) : []

  if (entries.length > 0) {
    return entries
  }

  return [{
    gateId: gate.id,
    openingId: getPrimaryOpeningId(gate),
    reverse: getOpeningReverse(gate, getPrimaryOpeningId(gate)),
  }]
}

export function normalizeGateSequence(sequence: RawGateSequenceItem[] | undefined, gates: Gate[]): GateSequenceItem[] {
  const normalizedGates = normalizeGates(gates)
  const gateMap = new Map(normalizedGates.map((gate) => [gate.id, gate]))
  const source = Array.isArray(sequence) && sequence.length > 0 ? sequence : buildFallbackGateSequence(normalizedGates)
  const normalized: GateSequenceItem[] = []

  for (const item of source) {
    const normalizedItems = normalizeSequenceItem(item, gateMap)

    for (const normalizedItem of normalizedItems) {
      const previous = normalized[normalized.length - 1]
      if (previous && isSameSequenceItem(previous, normalizedItem)) continue

      normalized.push(normalizedItem)
    }
  }

  const expanded = insertMissingImplicitPasses(normalized, gateMap)

  if (expanded.length > 1 && isSameSequenceItem(expanded[0], expanded[expanded.length - 1])) {
    expanded.pop()
  }

  return expanded.length > 0 ? expanded : buildFallbackGateSequence(normalizedGates)
}
