import type { Gate, GateOpening, GateType, PersistedGateOpening } from '../types'
import { GATE_TYPES } from '../types'
import {
  FLAG_BASE_HEIGHT,
  FLAG_SMALL_BASE_HEIGHT,
  GATE_BASE_HEIGHT,
  GATE_BASE_WIDTH,
  GATE_POST_THICKNESS,
  H_GATE_BACKREST_HEIGHT_MULTIPLIER,
} from '../constants/gateDimensions'

/**
 * Single source of truth for everything that differs per gate type.
 *
 * Adding a gate type means: add it to `GATE_TYPES`, add an entry here, add a
 * component to `components/gates/gateComponents.ts`, plus icon, theme colors
 * and labels. Every per-type map is typed as `Record<GateType, …>`, so the
 * compiler lists anything that is still missing.
 */
export interface GateDefinition {
  /** Poles needed to build the gate physically; 0 = not buildable from poles. */
  poles: number
  /** Only one gate of this type may exist per track; it starts the generated lap. */
  isStartFinish: boolean
  /** Height of the gate's highest point in meters; editor handles float above it. */
  topHeight: number
  /** Default openings; `gateId` seeds per-gate variants (dive exit side). */
  createOpenings: (gateId?: string) => GateOpening[]
  /** Renames openings saved under an older layout of this gate type to today's ids. */
  remapLegacyOpenings?: (openings: PersistedGateOpening[]) => PersistedGateOpening[]
  /** Opening ids in default flight order. Defaults to the primary opening. */
  sequenceOpeningIds?: (gate: Gate) => string[]
  /** Same-gate transitions whose exit side is defined by the gate geometry (flight path). */
  isSideDefinedTransition?: (fromOpeningId: string, toOpeningId: string) => boolean
  /** Opening that is a tunnel passage rather than a flat frame (flight path). */
  tunnelOpeningId?: string
  /** Opening the sequence must pass between two stacked openings, e.g. double-h lower → middle → upper. */
  implicitPass?: { between: [string, string]; via: string }
}

const BASE_WIDTH = GATE_BASE_WIDTH
const BASE_HEIGHT = GATE_BASE_HEIGHT
const STACK_DISTANCE = BASE_HEIGHT
const TOP_BAR_HALF_THICKNESS = GATE_POST_THICKNESS / 2
const HURDLE_WIDTH_MULTIPLIER = 2
const HURDLE_OPENING_HEIGHT_MULTIPLIER = 0.9
const STACKED_OPENING_ORDER = ['lower', 'middle', 'upper'] as const

type DiveExitSide = 'front' | 'back' | 'left' | 'right'
const DIVE_EXIT_SIDES: DiveExitSide[] = ['front', 'back', 'left', 'right']

export function hashGateId(seed: string): number {
  let hash = 0

  for (const char of seed) {
    hash += char.charCodeAt(0)
  }

  return hash
}

/** Number of id-derived gate variants; dive exit side and h-gate backrest side depend only on this. */
export const GATE_ID_VARIANT_COUNT = 4

/** Per-gate visual variant derived from the gate id (0–3). Share links store this instead of the id. */
export function getGateIdVariant(gateId: string): number {
  return hashGateId(gateId) % GATE_ID_VARIANT_COUNT
}

function getDiveExitSide(gateId?: string): DiveExitSide {
  return gateId ? DIVE_EXIT_SIDES[getGateIdVariant(gateId)] : DIVE_EXIT_SIDES[0]
}

export function getHGateBackrestSide(gateId: string): -1 | 1 {
  return getGateIdVariant(gateId) % 2 === 0 ? -1 : 1
}

function createOpening(
  id: string,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  rotation = 0,
  rotationX?: number,
): GateOpening {
  return {
    id,
    position: { x, y, z },
    width,
    height,
    rotation,
    ...(rotationX !== undefined ? { rotationX } : {}),
  }
}

function createStackedOpenings(ids: readonly string[]): GateOpening[] {
  return ids.map((id, index) => createOpening(id, 0, STACK_DISTANCE * index + BASE_HEIGHT / 2, 0, BASE_WIDTH, BASE_HEIGHT))
}

function createHGateOpenings(): GateOpening[] {
  return [
    createOpening('lower', 0, BASE_HEIGHT / 2, 0, BASE_WIDTH, BASE_HEIGHT),
    createOpening('backrest-pass', 0, STACK_DISTANCE + BASE_HEIGHT / 2, 0, BASE_WIDTH, BASE_HEIGHT * 0.9),
  ]
}

function createDiveOpenings(gateId?: string): GateOpening[] {
  const half = BASE_WIDTH * 0.5
  const entryTopOpening = createOpening('entry-top', 0, BASE_HEIGHT, 0, BASE_WIDTH, BASE_HEIGHT, 0, 90)
  const side = getDiveExitSide(gateId)

  switch (side) {
    case 'front':
      return [entryTopOpening, createOpening('exit-front', 0, BASE_HEIGHT / 2, -half, BASE_WIDTH, BASE_HEIGHT, 180)]
    case 'back':
      return [entryTopOpening, createOpening('exit-back', 0, BASE_HEIGHT / 2, half, BASE_WIDTH, BASE_HEIGHT, 0)]
    case 'left':
      return [entryTopOpening, createOpening('exit-left', -half, BASE_HEIGHT / 2, 0, BASE_WIDTH, BASE_HEIGHT, 270)]
    case 'right':
      return [entryTopOpening, createOpening('exit-right', half, BASE_HEIGHT / 2, 0, BASE_WIDTH, BASE_HEIGHT, 90)]
  }
}

// Legacy double-h gates had two openings (`lower`, `upper`); their `upper` is today's `middle`.
function remapLegacyDoubleHOpenings(openings: PersistedGateOpening[]): PersistedGateOpening[] {
  const ids = new Set(openings.map((opening) => opening.id))
  const isLegacyTwoOpening = openings.length === 2 && ids.has('upper') && !ids.has('middle')

  return isLegacyTwoOpening
    ? openings.map((opening) => opening.id === 'upper' ? { ...opening, id: 'middle' } : opening)
    : openings
}

// Legacy dive gates had a single opening; it becomes the top entry.
function remapLegacyDiveOpenings(openings: PersistedGateOpening[]): PersistedGateOpening[] {
  const hasDiveIds = openings.some((opening) => opening.id === 'entry-top' || opening.id.startsWith('exit-'))

  return !hasDiveIds && openings.length === 1 ? [{ ...openings[0], id: 'entry-top' }] : openings
}

function isAdjacentStackedTransition(fromOpeningId: string, toOpeningId: string): boolean {
  const order: readonly string[] = STACKED_OPENING_ORDER
  const fromIndex = order.indexOf(fromOpeningId)
  const toIndex = order.indexOf(toOpeningId)

  return fromIndex >= 0 && toIndex >= 0 && Math.abs(fromIndex - toIndex) === 1
}

function singleOpening(x: number, y: number, z: number, width: number, height: number): () => GateOpening[] {
  return () => [createOpening('main', x, y, z, width, height)]
}

const standardOpening = singleOpening(0, BASE_HEIGHT / 2, 0, BASE_WIDTH, BASE_HEIGHT)

export const GATE_DEFINITIONS: Record<GateType, GateDefinition> = {
  'start-finish': {
    poles: 3,
    isStartFinish: true,
    topHeight: BASE_HEIGHT + 0.375,
    createOpenings: standardOpening,
  },
  standard: {
    poles: 3,
    isStartFinish: false,
    topHeight: BASE_HEIGHT + TOP_BAR_HALF_THICKNESS,
    createOpenings: standardOpening,
  },
  'h-gate': {
    poles: 4,
    isStartFinish: false,
    topHeight: BASE_HEIGHT * H_GATE_BACKREST_HEIGHT_MULTIPLIER,
    createOpenings: createHGateOpenings,
    sequenceOpeningIds: () => ['lower', 'backrest-pass'],
    isSideDefinedTransition: (from, to) => (from === 'lower' && to === 'backrest-pass') || (from === 'backrest-pass' && to === 'lower'),
  },
  'double-h': {
    poles: 7,
    isStartFinish: false,
    topHeight: BASE_HEIGHT + BASE_HEIGHT * H_GATE_BACKREST_HEIGHT_MULTIPLIER,
    createOpenings: () => createStackedOpenings(STACKED_OPENING_ORDER),
    remapLegacyOpenings: remapLegacyDoubleHOpenings,
    sequenceOpeningIds: () => [...STACKED_OPENING_ORDER],
    isSideDefinedTransition: isAdjacentStackedTransition,
    implicitPass: { between: ['lower', 'upper'], via: 'middle' },
  },
  hurdle: {
    poles: 0,
    isStartFinish: false,
    topHeight: BASE_HEIGHT + BASE_HEIGHT * HURDLE_OPENING_HEIGHT_MULTIPLIER,
    createOpenings: singleOpening(
      0,
      BASE_HEIGHT + (BASE_HEIGHT * HURDLE_OPENING_HEIGHT_MULTIPLIER) / 2,
      0,
      BASE_WIDTH * HURDLE_WIDTH_MULTIPLIER,
      BASE_HEIGHT * HURDLE_OPENING_HEIGHT_MULTIPLIER,
    ),
  },
  dive: {
    poles: 0,
    isStartFinish: false,
    topHeight: BASE_HEIGHT + TOP_BAR_HALF_THICKNESS,
    createOpenings: createDiveOpenings,
    remapLegacyOpenings: remapLegacyDiveOpenings,
    sequenceOpeningIds: (gate) => {
      const entry = gate.openings.find((opening) => opening.id === 'entry-top') ?? gate.openings[0]
      const exit = gate.openings.find((opening) => opening.id.startsWith('exit-') && opening.id !== entry?.id) ?? gate.openings[1]
      return entry && exit ? [entry.id, exit.id] : []
    },
  },
  double: {
    poles: 6,
    isStartFinish: false,
    topHeight: BASE_HEIGHT * 2 + TOP_BAR_HALF_THICKNESS,
    createOpenings: () => createStackedOpenings(['lower', 'upper']),
    sequenceOpeningIds: () => ['lower', 'upper'],
  },
  ladder: {
    poles: 9,
    isStartFinish: false,
    topHeight: BASE_HEIGHT * 3 + TOP_BAR_HALF_THICKNESS,
    createOpenings: () => createStackedOpenings(STACKED_OPENING_ORDER),
    sequenceOpeningIds: () => [...STACKED_OPENING_ORDER],
  },
  flag: {
    poles: 2,
    isStartFinish: false,
    topHeight: FLAG_BASE_HEIGHT,
    createOpenings: singleOpening(-0.45, 1.1, 0, 0.8, 1.6),
  },
  'flag-small': {
    poles: 1,
    isStartFinish: false,
    topHeight: FLAG_SMALL_BASE_HEIGHT,
    createOpenings: singleOpening(-0.35, 0.6, 0, 0.6, 1.2),
  },
  'octagonal-tunnel': {
    poles: 0,
    isStartFinish: false,
    topHeight: BASE_HEIGHT + TOP_BAR_HALF_THICKNESS,
    createOpenings: singleOpening(0, BASE_HEIGHT / 2, -1, BASE_WIDTH, BASE_HEIGHT),
    tunnelOpeningId: 'main',
  },
}

export const START_FINISH_GATE_TYPES: readonly GateType[] = GATE_TYPES.filter((type) => GATE_DEFINITIONS[type].isStartFinish)

export function getGateDefinition(type: GateType): GateDefinition {
  return GATE_DEFINITIONS[type]
}
