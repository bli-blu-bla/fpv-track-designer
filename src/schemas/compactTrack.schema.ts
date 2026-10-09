import { z } from 'zod'
import type { Config } from '../types/config'
import type { Gate, GateType } from '../types/gate'
import { GATE_TYPES } from '../types/gate'
import { THEME_IDS } from '../types/theme'
import type { Track } from '../types/track'
import { GATE_DEFINITIONS, GATE_ID_VARIANT_COUNT, getGateIdVariant, hashGateId } from '../utils/gateDefinitions'
import { buildFallbackGateSequence } from '../utils/gateSequence'
import { parseTrackExport, SCHEMA_VERSION, type DeserializeResult, type TrackExportInput } from './track.schema'

/**
 * Compact, positional share-link format. Only what the viewer needs survives:
 *
 *   [version, name, fieldWidth, fieldHeight, themeIndex, displayFlags, gates, sequence?]
 *   gate     = [typeIndex, xCm, zCm, rotationDeg, yCm?, idVariant?, reversedOpeningMask?]
 *   sequence = gateIndex * 16 + openingIndex * 2 + reverse   (omitted when it is the default lap)
 *
 * Positions are rounded to centimeters and rotations to whole degrees. Gate ids
 * are not stored; decoding creates ids with the same `getGateIdVariant`, so dive
 * exits and h-gate backrests look identical. Trailing default values are trimmed.
 * Decoded payloads still pass through `trackExportSchema`.
 */
const COMPACT_FORMAT_VERSION = 1
const SEQUENCE_GATE_FACTOR = 16
const MAX_OPENINGS_PER_GATE = SEQUENCE_GATE_FACTOR / 2

const DISPLAY_FLAGS = {
  showGrid: 1,
  showFlightPath: 2,
  showOpeningLabels: 4,
} as const satisfies Partial<Record<keyof Config, number>>

const int = z.number().int()

const compactGateSchema = z.tuple([
  int.min(0).max(GATE_TYPES.length - 1),
  int,
  int,
  int,
]).rest(int)

const compactTrackSchema = z.tuple([
  z.literal(COMPACT_FORMAT_VERSION),
  z.string(),
  z.number().positive(),
  z.number().positive(),
  int.min(0).max(THEME_IDS.length - 1),
  int.min(0),
  z.array(compactGateSchema),
]).rest(z.array(int.min(0)))

function trimTrailingZeros(values: number[], keep: number): number[] {
  let end = values.length
  while (end > keep && values[end - 1] === 0) end -= 1
  return values.slice(0, end)
}

const toCm = (meters: number) => Math.round(meters * 100)

function encodeGate(gate: Gate): number[] {
  const reversedMask = gate.openings.reduce((mask, opening, index) => opening.reverse ? mask | (1 << index) : mask, 0)

  return trimTrailingZeros([
    GATE_TYPES.indexOf(gate.type),
    toCm(gate.position.x),
    toCm(gate.position.z),
    Math.round(gate.rotation) % 360,
    toCm(gate.position.y),
    getGateIdVariant(gate.id),
    reversedMask,
  ], 4)
}

function encodeSequence(track: Track): number[] | null {
  const fallback = buildFallbackGateSequence(track.gates)
  const isDefault = fallback.length === track.gateSequence.length && fallback.every((entry, index) => (
    entry.gateId === track.gateSequence[index].gateId
    && entry.openingId === track.gateSequence[index].openingId
    && Boolean(entry.reverse) === Boolean(track.gateSequence[index].reverse)
  ))
  if (isDefault) return null

  const gateIndexById = new Map(track.gates.map((gate, index) => [gate.id, index]))

  return track.gateSequence.flatMap((entry) => {
    const gateIndex = gateIndexById.get(entry.gateId)
    const openingIndex = gateIndex === undefined ? -1 : track.gates[gateIndex].openings.findIndex((opening) => opening.id === entry.openingId)
    if (gateIndex === undefined || openingIndex < 0 || openingIndex >= MAX_OPENINGS_PER_GATE) return []

    return [gateIndex * SEQUENCE_GATE_FACTOR + openingIndex * 2 + (entry.reverse ? 1 : 0)]
  })
}

export function encodeCompactTrack(track: Track, config: Config): string {
  const flags = (Object.keys(DISPLAY_FLAGS) as (keyof typeof DISPLAY_FLAGS)[])
    .reduce((mask, key) => config[key] ? mask | DISPLAY_FLAGS[key] : mask, 0)
  const sequence = encodeSequence(track)

  return JSON.stringify([
    COMPACT_FORMAT_VERSION,
    track.name,
    track.fieldSize.width,
    track.fieldSize.height,
    THEME_IDS.indexOf(config.theme),
    flags,
    track.gates.map(encodeGate),
    ...(sequence ? [sequence] : []),
  ])
}

/** Short id whose `getGateIdVariant` equals `variant`, e.g. `g3b`. */
function createGateId(index: number, variant: number): string {
  const base = `g${index}`
  const firstSuffix = 'a'.charCodeAt(0)
  const offset = ((variant - hashGateId(base) - firstSuffix) % GATE_ID_VARIANT_COUNT + GATE_ID_VARIANT_COUNT) % GATE_ID_VARIANT_COUNT
  return base + String.fromCharCode(firstSuffix + offset)
}

function toTrackExport(compact: z.infer<typeof compactTrackSchema>): TrackExportInput {
  const [, name, width, height, themeIndex, flags, compactGates, sequence] = compact
  const now = new Date().toISOString()

  const gates = compactGates.map(([typeIndex, xCm, zCm, rotation, yCm = 0, variant = 0, reversedMask = 0], index) => {
    const type: GateType = GATE_TYPES[typeIndex]
    const id = createGateId(index, variant % GATE_ID_VARIANT_COUNT)
    const openings = GATE_DEFINITIONS[type].createOpenings(id)
      .filter((_, openingIndex) => reversedMask & (1 << openingIndex))
      .map((opening) => ({ id: opening.id, reverse: true }))

    return {
      id,
      type,
      position: { x: xCm / 100, y: yCm / 100, z: zCm / 100 },
      rotation: ((rotation % 360) + 360) % 360,
      ...(openings.length > 0 ? { openings } : {}),
    }
  })

  const gateSequence = sequence?.flatMap((value) => {
    const gate = gates[Math.floor(value / SEQUENCE_GATE_FACTOR)]
    const opening = gate && GATE_DEFINITIONS[gate.type].createOpenings(gate.id)[Math.floor((value % SEQUENCE_GATE_FACTOR) / 2)]
    return gate && opening ? [{ gateId: gate.id, openingId: opening.id, reverse: value % 2 === 1 }] : []
  })

  const gateQuantities = Object.fromEntries(GATE_TYPES.map((type) => [type, gates.filter((gate) => gate.type === type).length]))

  return {
    version: SCHEMA_VERSION,
    track: {
      id: crypto.randomUUID(),
      name,
      gates,
      ...(gateSequence ? { gateSequence } : {}),
      fieldSize: { width, height },
      createdAt: now,
      updatedAt: now,
    },
    config: {
      gateQuantities,
      fieldSize: { width, height },
      showGrid: Boolean(flags & DISPLAY_FLAGS.showGrid),
      showFlightPath: Boolean(flags & DISPLAY_FLAGS.showFlightPath),
      showOpeningLabels: Boolean(flags & DISPLAY_FLAGS.showOpeningLabels),
      theme: THEME_IDS[themeIndex],
    },
  }
}

export function decodeCompactTrack(json: string): DeserializeResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch {
    return { error: 'Invalid JSON', errors: [{ field: 'root', message: 'Failed to parse JSON' }] }
  }

  const compact = compactTrackSchema.safeParse(parsed)
  if (!compact.success) {
    return { error: 'Invalid compact track', errors: [{ field: 'root', message: 'Unsupported compact share format' }] }
  }

  return parseTrackExport(toTrackExport(compact.data))
}
