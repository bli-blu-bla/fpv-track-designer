import type { Track } from '../../types'

/** Pure geometry for gate edit handles: drag updates and insert-handle placement. */

export type Point3 = { x: number; y: number; z: number }
type FieldSize = { width: number; height: number }

export type DragMode = 'move' | 'elevate' | 'rotate'
export type InsertDirection = 'before' | 'after'

/** Everything captured on pointer-down that a drag needs to compute later updates. */
export type GateDrag =
  | { mode: 'move'; startHit: { x: number; z: number }; startPosition: Point3 }
  | { mode: 'elevate'; startClientY: number; startPosition: Point3 }
  | { mode: 'rotate'; startClientX: number; startRotation: number }

export interface DragPointer {
  clientX: number
  clientY: number
  /** Pointer projected onto the ground plane; only needed for `move`. */
  groundHit: () => { x: number; z: number }
}

export type DragUpdate = { position: Point3 } | { rotation: number }

export interface InsertControl {
  direction: InsertDirection
  insertPosition: Point3
  handlePosition: Point3
  gateIndex: number
  sequenceIndex: number
}

export const DEGREES_PER_PIXEL = 1
export const ROTATION_SNAP_STEP_DEGREES = 15
export const METERS_PER_ELEVATION_PIXEL = 0.03
const FALLBACK_INSERT_DISTANCE = 3
const INSERT_HANDLE_OFFSET_Y = 0.9

export function clampToField(position: Point3, fieldSize: FieldSize): Point3 {
  const halfWidth = fieldSize.width / 2
  const halfHeight = fieldSize.height / 2

  return {
    x: Math.max(-halfWidth, Math.min(halfWidth, position.x)),
    y: position.y,
    z: Math.max(-halfHeight, Math.min(halfHeight, position.z)),
  }
}

export function getDragUpdate(drag: GateDrag, pointer: DragPointer, fieldSize: FieldSize, snapRotation: boolean): DragUpdate {
  switch (drag.mode) {
    case 'move': {
      const hit = pointer.groundHit()
      return {
        position: clampToField({
          x: drag.startPosition.x + hit.x - drag.startHit.x,
          y: drag.startPosition.y,
          z: drag.startPosition.z + hit.z - drag.startHit.z,
        }, fieldSize),
      }
    }
    case 'elevate': {
      const pointerDeltaY = drag.startClientY - pointer.clientY
      return {
        position: { ...drag.startPosition, y: Math.max(0, drag.startPosition.y + pointerDeltaY * METERS_PER_ELEVATION_PIXEL) },
      }
    }
    case 'rotate': {
      const rawRotation = drag.startRotation + (pointer.clientX - drag.startClientX) * DEGREES_PER_PIXEL
      return {
        rotation: snapRotation
          ? Math.round(rawRotation / ROTATION_SNAP_STEP_DEGREES) * ROTATION_SNAP_STEP_DEGREES
          : rawRotation,
      }
    }
  }
}

function getMidpoint(a: Point3, b: Point3): Point3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}

function getSquaredDistance(a: Point3, b: Point3): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
}

function getClosestPoint(target: Point3, points: Point3[]): Point3 | null {
  if (points.length === 0) return null

  return points.reduce((closest, point) => (
    getSquaredDistance(point, target) < getSquaredDistance(closest, target) ? point : closest
  ))
}

function getWrappedIndex(index: number, length: number): number {
  return length > 0 ? (index + length) % length : -1
}

function getFallbackInsertPosition(position: Point3, rotation: number, direction: InsertDirection, fieldSize: FieldSize): Point3 {
  const radians = rotation * (Math.PI / 180)
  const directionMultiplier = direction === 'before' ? -1 : 1

  return clampToField({
    x: position.x + Math.sin(radians) * FALLBACK_INSERT_DISTANCE * directionMultiplier,
    y: position.y,
    z: position.z + Math.cos(radians) * FALLBACK_INSERT_DISTANCE * directionMultiplier,
  }, fieldSize)
}

/**
 * Where a new gate goes when inserted before/after `gateId` in flight order:
 * halfway to the neighboring gate in the sequence, snapped onto the flight path
 * leg between them when available, otherwise a fixed distance along the gate's facing.
 */
export function getInsertControl(
  track: Track,
  gateId: string,
  direction: InsertDirection,
  sampledLegs: Point3[][],
): InsertControl | null {
  const gateIndex = track.gates.findIndex((gate) => gate.id === gateId)
  const gate = track.gates[gateIndex]
  if (!gate) return null

  const sequenceGateIds = track.gateSequence.map((entry) => entry.gateId)
  const ownSequenceIndex = direction === 'before' ? sequenceGateIds.indexOf(gateId) : sequenceGateIds.lastIndexOf(gateId)
  const sequenceIndex = direction === 'before'
    ? Math.max(0, ownSequenceIndex)
    : ownSequenceIndex >= 0 ? ownSequenceIndex + 1 : track.gateSequence.length

  const neighborSequenceIndex = ownSequenceIndex >= 0
    ? getWrappedIndex(direction === 'before' ? ownSequenceIndex - 1 : ownSequenceIndex + 1, sequenceGateIds.length)
    : -1
  const neighborId = sequenceGateIds[neighborSequenceIndex]
  const neighbor = neighborId ? track.gates.find((candidate) => candidate.id === neighborId) : undefined

  const target = neighbor
    ? getMidpoint(gate.position, neighbor.position)
    : getFallbackInsertPosition(gate.position, gate.rotation, direction, track.fieldSize)
  const legIndex = direction === 'before' ? neighborSequenceIndex : ownSequenceIndex
  const pathPoint = getClosestPoint(target, legIndex >= 0 ? sampledLegs[legIndex] ?? [] : [])
  const insertPosition = clampToField({
    x: pathPoint?.x ?? target.x,
    y: gate.position.y,
    z: pathPoint?.z ?? target.z,
  }, track.fieldSize)

  return {
    direction,
    insertPosition,
    handlePosition: pathPoint
      ? { x: insertPosition.x, y: pathPoint.y, z: insertPosition.z }
      : { x: insertPosition.x, y: insertPosition.y + INSERT_HANDLE_OFFSET_Y, z: insertPosition.z },
    gateIndex: direction === 'before' ? gateIndex : gateIndex + 1,
    sequenceIndex,
  }
}
