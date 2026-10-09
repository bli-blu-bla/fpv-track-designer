import { z } from 'zod'
import type { Config } from '@/core/types/config'
import { SNAP_GRID_SIZES } from '@/core/types/config'
import type { Gate, GateType } from '@/core/types/gate'
import { GATE_TYPES } from '@/core/types/gate'
import { THEME_IDS } from '@/core/types/theme'
import type { GateSequenceItem, Track } from '@/core/types/track'
import { GATE_DEFINITIONS } from '@/core/gates/gateDefinitions'
import { normalizeGates } from '@/core/gates/gateOpenings'
import { buildFallbackGateSequence, normalizeGateSequence } from '@/core/gates/gateSequence'

/**
 * 2.x stores only what users can change: opening geometry is derived from the
 * gate type, unchanged defaults are omitted. 1.x files (full openings) still load.
 */
export const SCHEMA_VERSION = '2.0.0'

export interface ValidationError {
  field: string
  message: string
}

export type DeserializeResult = { track: Track; config: Config } | { error: string; errors: ValidationError[] }

const LEGACY_GATE_TYPES = { asymmetric: 'double-h' } as const satisfies Record<string, GateType>

const positionSchema = z.object(
  {
    x: z.number({ error: 'Position x must be a number' }),
    y: z.number({ error: 'Position y must be a number' }),
    z: z.number({ error: 'Position z must be a number' }),
  },
  { error: 'Position must be an object' },
)

const fieldSizeSchema = z.object(
  {
    width: z.number({ error: 'Width must be a positive number' }).positive({ error: 'Width must be a positive number' }),
    height: z.number({ error: 'Length must be a positive number' }).positive({ error: 'Length must be a positive number' }),
  },
  { error: 'Field size must be an object' },
)

// Geometry fields of 1.x exports are accepted but ignored; it is rebuilt from the gate type.
const openingSchema = z.object({
  id: z.string({ error: 'Opening id must be a string' }),
  reverse: z.boolean({ error: 'Opening reverse must be a boolean when provided' }).optional(),
})

const gateTypeSchema = z.enum([...GATE_TYPES, ...(Object.keys(LEGACY_GATE_TYPES) as (keyof typeof LEGACY_GATE_TYPES)[])], {
  error: `Gate type must be one of: ${GATE_TYPES.join(', ')}`,
}).transform((type): GateType => type in LEGACY_GATE_TYPES ? LEGACY_GATE_TYPES[type as keyof typeof LEGACY_GATE_TYPES] : type as GateType)

const gateSchema = z.object({
  id: z.string({ error: 'Gate id must be a string' }),
  type: gateTypeSchema,
  position: positionSchema,
  rotation: z.number({ error: 'Rotation must be a finite number between 0 and less than 360 degrees' })
    .min(0, { error: 'Rotation must be a finite number between 0 and less than 360 degrees' })
    .lt(360, { error: 'Rotation must be a finite number between 0 and less than 360 degrees' }),
  openings: z.array(openingSchema, { error: 'Gate openings must be an array when provided' }).optional(),
})

const sequenceItemSchema = z.union([
  z.string(),
  z.object({
    gateId: z.string({ error: 'gateId must be a string' }),
    openingId: z.string({ error: 'openingId must be a string' }),
    reverse: z.boolean({ error: 'reverse must be a boolean when provided' }).optional(),
  }),
], { error: 'gateSequence entry must be a string or sequence object' })

const trackSchema = z.object({
  id: z.string({ error: 'Track id must be a string' }),
  name: z.string({ error: 'Track name must be a string' }),
  gates: z.array(gateSchema, { error: 'Track gates must be an array' }),
  gateSequence: z.array(sequenceItemSchema, { error: 'gateSequence must be an array when provided' }).optional(),
  fieldSize: fieldSizeSchema,
  createdAt: z.string({ error: 'CreatedAt must be an ISO date string' }),
  updatedAt: z.string({ error: 'UpdatedAt must be an ISO date string' }),
}, { error: 'Track must be an object' }).superRefine((track, ctx) => {
  // Sequence entries must point at existing gates/openings; openings are derived per type, so check against those.
  const openingsByGate = new Map(track.gates.map((gate) => [
    gate.id,
    new Set(GATE_DEFINITIONS[gate.type].createOpenings(gate.id).map((opening) => opening.id).concat(gate.openings?.map((opening) => opening.id) ?? [])),
  ]))
  const sequence = track.gateSequence ?? []
  const sameEntry = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

  sequence.forEach((entry, index) => {
    const gateId = typeof entry === 'string' ? entry : entry.gateId
    const openings = openingsByGate.get(gateId)
    const path = typeof entry === 'string' ? ['gateSequence', index] : ['gateSequence', index, 'gateId']

    if (!openings) {
      ctx.addIssue({ code: 'custom', path, message: `gateId '${gateId}' does not match any gate id` })
    } else if (typeof entry !== 'string' && !openings.has(entry.openingId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['gateSequence', index, 'openingId'],
        message: `openingId '${entry.openingId}' does not match any opening on gate '${gateId}'`,
      })
    }

    if (index > 0 && sameEntry(entry, sequence[index - 1])) {
      ctx.addIssue({ code: 'custom', path: ['gateSequence', index], message: 'Consecutive identical gateSequence entries are not allowed' })
    }
  })

  if (sequence.length > 1 && sameEntry(sequence[0], sequence[sequence.length - 1])) {
    ctx.addIssue({ code: 'custom', path: ['gateSequence'], message: 'First and last gateSequence entry must not be identical in looped tracks' })
  }
})

const gateQuantitySchema = (type: string) => z.number({ error: `Gate quantity for ${type} must be a non-negative integer` })
  .int({ error: `Gate quantity for ${type} must be a non-negative integer` })
  .min(0, { error: `Gate quantity for ${type} must be a non-negative integer` })

const gateQuantitiesSchema = z.object({
  ...Object.fromEntries(GATE_TYPES.map((type) => [type, gateQuantitySchema(type).optional()])) as Record<GateType, z.ZodOptional<z.ZodNumber>>,
  // Legacy name of `double-h`; it wins when present, matching what old exports meant.
  asymmetric: gateQuantitySchema('double-h').optional(),
}, { error: 'Gate quantities must be an object' }).transform(({ asymmetric, ...quantities }) => {
  const result = Object.fromEntries(GATE_TYPES.map((type) => [type, quantities[type] ?? 0])) as Record<GateType, number>
  if (asymmetric !== undefined) result['double-h'] = asymmetric
  return result
})

const configSchema = z.object({
  gateQuantities: gateQuantitiesSchema,
  fieldSize: fieldSizeSchema,
  snapGatesToGrid: z.boolean({ error: 'Config value must be a boolean when provided' }).default(false),
  snapGridSize: z.union(SNAP_GRID_SIZES.map((size) => z.literal(size)), {
    error: `Snap grid size must be one of: ${SNAP_GRID_SIZES.join(', ')}`,
  }).default(0.3),
  showGrid: z.boolean({ error: 'Config value must be a boolean when provided' }).default(false),
  showFlightPath: z.boolean({ error: 'Config value must be a boolean when provided' }).default(true),
  showOpeningLabels: z.boolean({ error: 'Config value must be a boolean when provided' }).default(true),
  theme: z.enum(THEME_IDS, { error: `Theme must be one of: ${THEME_IDS.join(', ')}` }).default('minimal'),
}, { error: 'Config must be an object' })

export const trackExportSchema = z.object({
  version: z.string({ error: 'Version must be a string' }),
  track: trackSchema,
  config: configSchema,
}, { error: 'Data must be an object' })

export type TrackExportInput = z.input<typeof trackExportSchema>

function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return 'root'

  return path.reduce<string>((field, segment) => (
    typeof segment === 'number' ? `${field}[${segment}]` : field ? `${field}.${String(segment)}` : String(segment)
  ), '')
}

function toValidationErrors(error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({ field: formatPath(issue.path), message: issue.message }))
}

export function validateTrack(data: unknown): { valid: boolean; errors: ValidationError[] } {
  const result = trackExportSchema.safeParse(data)
  return result.success ? { valid: true, errors: [] } : { valid: false, errors: toValidationErrors(result.error) }
}

export function isValidTrack(data: unknown): boolean {
  return trackExportSchema.safeParse(data).success
}

/** Validates any parsed payload (file, storage, share link) and turns it into editor state. */
export function parseTrackExport(data: unknown): DeserializeResult {
  const result = trackExportSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Validation failed', errors: toValidationErrors(result.error) }
  }

  const { track, config } = result.data
  const gates = normalizeGates(track.gates)

  return {
    track: {
      id: track.id,
      name: track.name,
      gates,
      gateSequence: normalizeGateSequence(track.gateSequence, gates),
      fieldSize: track.fieldSize,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    },
    config,
  }
}

function isSameSequence(a: GateSequenceItem[], b: GateSequenceItem[]): boolean {
  return a.length === b.length && a.every((entry, index) => (
    entry.gateId === b[index].gateId
    && entry.openingId === b[index].openingId
    && Boolean(entry.reverse) === Boolean(b[index].reverse)
  ))
}

function compactGate(gate: Gate) {
  const reversed = gate.openings.filter((opening) => opening.reverse).map((opening) => ({ id: opening.id, reverse: true }))

  return {
    id: gate.id,
    type: gate.type,
    position: gate.position,
    rotation: gate.rotation,
    ...(reversed.length > 0 ? { openings: reversed } : {}),
  }
}

/** Plain export object; omits derived opening geometry and a default gate sequence. */
export function toTrackExport(track: Track, config: Config): TrackExportInput {
  const gateSequence = isSameSequence(track.gateSequence, buildFallbackGateSequence(track.gates))
    ? undefined
    : track.gateSequence.map(({ gateId, openingId, reverse }) => ({ gateId, openingId, ...(reverse ? { reverse } : {}) }))

  return {
    version: SCHEMA_VERSION,
    track: {
      id: track.id,
      name: track.name,
      gates: track.gates.map(compactGate),
      ...(gateSequence ? { gateSequence } : {}),
      fieldSize: track.fieldSize,
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    },
    config: {
      gateQuantities: config.gateQuantities,
      fieldSize: config.fieldSize,
      snapGatesToGrid: config.snapGatesToGrid,
      snapGridSize: config.snapGridSize,
      showGrid: config.showGrid,
      showFlightPath: config.showFlightPath,
      showOpeningLabels: config.showOpeningLabels,
      theme: config.theme,
    },
  }
}

/** Compact JSON for storage; pass `pretty` for human-readable file exports. */
export function serializeTrack(track: Track, config: Config, { pretty = false } = {}): string {
  return JSON.stringify(toTrackExport(track, config), null, pretty ? 2 : undefined)
}

export function deserializeTrack(jsonString: string): DeserializeResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return { error: 'Invalid JSON', errors: [{ field: 'root', message: 'Failed to parse JSON' }] }
  }

  return parseTrackExport(parsed)
}
