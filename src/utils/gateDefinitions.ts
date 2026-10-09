import type { Gate, GateOpening, GateType } from '../types'
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
  /** Repairs persisted openings (legacy ids, missing openings). Defaults to keeping them. */
  normalizeOpenings?: (gate: Pick<Gate, 'id'> & { openings?: GateOpening[] }) => GateOpening[]
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

function hashGateId(seed: string): number {
  let hash = 0

  for (const char of seed) {
    hash += char.charCodeAt(0)
  }

  return hash
}

function getDiveExitSide(gateId?: string): DiveExitSide {
  if (!gateId) {
    return DIVE_EXIT_SIDES[0]
  }

  const index = hashGateId(gateId) % DIVE_EXIT_SIDES.length
  return DIVE_EXIT_SIDES[index] ?? DIVE_EXIT_SIDES[0]
}

export function getHGateBackrestSide(gateId: string): -1 | 1 {
  return hashGateId(gateId) % 2 === 0 ? -1 : 1
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

/** Keeps per-opening user state (e.g. `reverse`) but forces geometry back to the defaults. */
function mergeWithDefaultGeometry(defaultOpening: GateOpening, persisted: GateOpening | undefined): GateOpening {
  return {
    ...defaultOpening,
    ...(persisted ?? {}),
    id: defaultOpening.id,
    position: defaultOpening.position,
    rotation: defaultOpening.rotation,
    rotationX: defaultOpening.rotationX,
  }
}

function normalizeByDefaultIds(defaults: GateOpening[], openings: GateOpening[] | undefined): GateOpening[] {
  if (!openings || openings.length === 0) return defaults

  const openingsById = new Map(openings.map((opening) => [opening.id, opening]))
  return defaults.map((defaultOpening) => mergeWithDefaultGeometry(defaultOpening, openingsById.get(defaultOpening.id)))
}

function normalizeDoubleHGateOpenings(gate: { openings?: GateOpening[] }): GateOpening[] {
  const defaultOpenings = createStackedOpenings(STACKED_OPENING_ORDER)

  if (!gate.openings || gate.openings.length === 0) {
    return defaultOpenings
  }

  // Legacy double-h gates had two openings (`lower`, `upper`); their `upper` is today's `middle`.
  const openingsById = new Map(gate.openings.map((opening) => [opening.id, opening]))
  const isLegacyTwoOpeningDoubleH = gate.openings.length === 2 && openingsById.has('upper') && !openingsById.has('middle')

  return defaultOpenings.map((defaultOpening) => {
    const persistedOpening = !isLegacyTwoOpeningDoubleH
      ? openingsById.get(defaultOpening.id)
      : defaultOpening.id === 'middle'
      ? openingsById.get('upper')
      : defaultOpening.id === 'upper'
      ? undefined
      : openingsById.get(defaultOpening.id)

    return mergeWithDefaultGeometry(defaultOpening, persistedOpening)
  })
}

function normalizeDiveGateOpenings(gate: Pick<Gate, 'id'> & { openings?: GateOpening[] }): GateOpening[] {
  const defaultOpenings = createDiveOpenings(gate.id)

  if (!gate.openings || gate.openings.length === 0) {
    return defaultOpenings
  }

  const hasDiveDefaultIds = gate.openings.some((opening) => opening.id === 'entry-top' || opening.id.startsWith('exit-'))

  // Legacy dive gates had a single opening; it becomes the top entry.
  if (!hasDiveDefaultIds && gate.openings.length === 1) {
    return [{ ...gate.openings[0], ...defaultOpenings[0] }, defaultOpenings[1]]
  }

  return normalizeByDefaultIds(defaultOpenings, gate.openings)
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
    normalizeOpenings: (gate) => normalizeByDefaultIds(createHGateOpenings(), gate.openings),
    sequenceOpeningIds: () => ['lower', 'backrest-pass'],
    isSideDefinedTransition: (from, to) => (from === 'lower' && to === 'backrest-pass') || (from === 'backrest-pass' && to === 'lower'),
  },
  'double-h': {
    poles: 7,
    isStartFinish: false,
    topHeight: BASE_HEIGHT + BASE_HEIGHT * H_GATE_BACKREST_HEIGHT_MULTIPLIER,
    createOpenings: () => createStackedOpenings(STACKED_OPENING_ORDER),
    normalizeOpenings: normalizeDoubleHGateOpenings,
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
    normalizeOpenings: normalizeDiveGateOpenings,
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
