import type { Config, Gate, Track } from '@/core/types'
import { GATE_BASE_WIDTH } from '@/core/constants/gateDimensions'
import { GATE_DEFINITIONS } from '@/core/gates/gateDefinitions'
import { normalizeGates } from '@/core/gates/gateOpenings'
import { normalizeGateSequence } from '@/core/gates/gateSequence'

export type MoveDirection = 'N' | 'S' | 'E' | 'W'

/** Relative change applied to every selected gate (meters / degrees). */
export interface GateNudge {
  dx?: number
  dy?: number
  dz?: number
  rotation?: number
}

type SnapConfig = Pick<Config, 'snapGatesToGrid' | 'snapGridSize'>

// Gates share their base footprint with the gate opening geometry.
// The default snap step is 1/4 of the gate footprint (0.3m), while the user can
// choose coarser 0.5m or 1m field-cell steps for faster alignment.
const DEFAULT_SNAP_STEP = GATE_BASE_WIDTH / 4

export function hasSingletonGateConflict(gates: Gate[], type: Gate['type'], ignoredGateId?: string): boolean {
  if (!GATE_DEFINITIONS[type].isStartFinish) return false

  return gates.some((gate) => gate.id !== ignoredGateId && gate.type === type)
}

function enforceSingletonGates(gates: Gate[]): Gate[] {
  const seenSingletonTypes = new Set<Gate['type']>()

  return gates.filter((gate) => {
    if (!GATE_DEFINITIONS[gate.type].isStartFinish) return true
    if (seenSingletonTypes.has(gate.type)) return false

    seenSingletonTypes.add(gate.type)
    return true
  })
}

export function normalizeTrack(track: Track): Track {
  const gates = enforceSingletonGates(normalizeGates(track.gates))

  return {
    ...track,
    gates,
    gateSequence: normalizeGateSequence(track.gateSequence, gates),
  }
}

/** Normalizes the edited track and stamps it as changed now. */
export function touchTrack(track: Track): Track {
  return normalizeTrack({ ...track, updatedAt: new Date().toISOString() })
}

function snapCoordinate(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function prepareGatePosition(
  position: Gate['position'],
  config: SnapConfig | undefined,
  fieldSize: Config['fieldSize'],
  forceSnap = false,
): Gate['position'] {
  const step = config?.snapGridSize ?? DEFAULT_SNAP_STEP
  const shouldSnap = forceSnap || (config?.snapGatesToGrid ?? false)
  const lifted = { ...position, y: Math.max(0, position.y) }
  const snapped = shouldSnap
    ? { x: snapCoordinate(lifted.x, step), y: snapCoordinate(lifted.y, step), z: snapCoordinate(lifted.z, step) }
    : lifted
  const halfWidth = fieldSize.width / 2
  const halfHeight = fieldSize.height / 2

  return {
    ...snapped,
    x: Math.max(-halfWidth, Math.min(halfWidth, snapped.x)),
    z: Math.max(-halfHeight, Math.min(halfHeight, snapped.z)),
  }
}

export function getMoveDelta(direction: MoveDirection, distance: number): Partial<Gate['position']> {
  switch (direction) {
    case 'N':
      return { z: -distance }
    case 'S':
      return { z: distance }
    case 'E':
      return { x: distance }
    case 'W':
      return { x: -distance }
  }
}

export function translatePosition(position: Gate['position'], delta: Partial<Gate['position']>): Gate['position'] {
  return {
    x: position.x + (delta.x ?? 0),
    y: position.y + (delta.y ?? 0),
    z: position.z + (delta.z ?? 0),
  }
}

export function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360
}
