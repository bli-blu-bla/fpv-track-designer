import type { Gate, GateType } from '@/core/types'
import { GATE_TYPES } from '@/core/types'
import { GATE_DEFINITIONS } from './gateDefinitions'

/**
 * Eintrag im Detail-Breakdown des Stangenzählers.
 *
 * Ein Eintrag pro tatsächlich auf der Strecke vorhandenem Gate-Typ –
 * Typen, von denen kein einziges Gate platziert ist, werden ausgelassen.
 */
export interface PoleBreakdownEntry {
  type: GateType
  /** Anzahl Gates dieses Typs auf der Strecke. */
  count: number
  /** Stangen pro einzelnem Gate dieses Typs (`GATE_DEFINITIONS[type].poles`). */
  polesPerGate: number
  /** count × polesPerGate. */
  subtotal: number
  /** True für Dive/Tunnel – wird im UI als "nicht aus Stangen baubar" markiert. */
  notBuildable: boolean
}

export interface PoleBreakdown {
  /** Summe aller `subtotal`-Werte – die kompakte Zahl im Badge. */
  total: number
  /** Detailaufstellung pro Gate-Typ, sortiert wie in `GATE_TYPES`. */
  entries: PoleBreakdownEntry[]
}

/**
 * Berechnet die Stangenkalkulation für eine Liste von Gates.
 *
 * Die Reihenfolge der Einträge folgt `GATE_TYPES`, damit die Anzeige
 * deterministisch und konsistent zum restlichen UI ist.
 */
export function calculatePoleBreakdown(gates: Gate[]): PoleBreakdown {
  const counts = new Map<GateType, number>()

  for (const gate of gates) {
    counts.set(gate.type, (counts.get(gate.type) ?? 0) + 1)
  }

  const entries: PoleBreakdownEntry[] = []
  let total = 0

  for (const type of GATE_TYPES) {
    const count = counts.get(type) ?? 0
    if (count === 0) continue

    const polesPerGate = GATE_DEFINITIONS[type].poles
    const subtotal = count * polesPerGate
    total += subtotal

    entries.push({
      type,
      count,
      polesPerGate,
      subtotal,
      notBuildable: polesPerGate === 0,
    })
  }

  return { total, entries }
}
