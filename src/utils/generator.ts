import type { Gate, GateType, Track, Config } from '../types'
import { GATE_TYPES } from '../types'
import { createDefaultGateOpenings } from './gateOpenings'
import { GATE_DEFINITIONS } from './gateDefinitions'
import { buildFallbackGateSequence } from './gateSequence'

const MIN_DISTANCE = 3 // meters
const MAX_ATTEMPTS = 100
const EDGE_MARGIN = 3 // meters from field edge

function distance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

function isTooClose(newGate: Gate, existingGates: Gate[]): boolean {
  return existingGates.some((g) => distance(newGate.position, g.position) < MIN_DISTANCE)
}

function generateRandomPosition(fieldSize: {
  width: number
  height: number
}): { x: number; y: number; z: number } {
  const usableWidth = fieldSize.width - EDGE_MARGIN * 2
  const usableHeight = fieldSize.height - EDGE_MARGIN * 2
  return {
    x: -fieldSize.width / 2 + EDGE_MARGIN + Math.random() * usableWidth,
    y: 0, // On the ground
    z: -fieldSize.height / 2 + EDGE_MARGIN + Math.random() * usableHeight,
  }
}

function orderGatesByProximity(gates: Gate[]): Gate[] {
  if (gates.length <= 1) return gates

  const remaining = [...gates]
  const ordered: Gate[] = [remaining.shift()!] // Start with first gate (start-finish)

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]
    let nearestIdx = 0
    let nearestDist = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const d = distance(current.position, remaining[i].position)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    ordered.push(remaining.splice(nearestIdx, 1)[0])
  }

  return ordered
}

/** Align gate rotations so each gate faces the flight path direction (to next gate).
 *  Rotation is rounded to nearest 30° step to match the UI constraints.
 */
function alignGateRotations(gates: Gate[]): void {
  const n = gates.length
  if (n < 2) return

  for (let i = 0; i < n; i++) {
    const curr = gates[i]
    const next = gates[(i + 1) % n]

    const dx = next.position.x - curr.position.x
    const dz = next.position.z - curr.position.z

    // atan2(dx, dz) gives angle from +Z axis, which matches Three.js Y-rotation
    let angle = Math.atan2(dx, dz) * (180 / Math.PI)

    // Normalize to 0-360
    angle = ((angle % 360) + 360) % 360

    // Round to nearest 30° step (0, 30, 60, ..., 330)
    const rounded = Math.round(angle / 30) * 30

    gates[i].rotation = rounded % 360
  }
}

export function generateTrack(config: Config): Track {
  const gates: Gate[] = []
  const gateTypes: GateType[] = GATE_TYPES.flatMap((type) => Array<GateType>(config.gateQuantities[type] ?? 0).fill(type))

  // Place start-finish gate first at a random position on the field edge
  const startFinishIndex = gateTypes.findIndex((type) => GATE_DEFINITIONS[type].isStartFinish)
  if (startFinishIndex >= 0) {
    const [sf] = gateTypes.splice(startFinishIndex, 1)
    const id = crypto.randomUUID()
    const edge = Math.floor(Math.random() * 4) // 0=north, 1=south, 2=east, 3=west
    const halfW = config.fieldSize.width / 2
    const halfH = config.fieldSize.height / 2
    let startX: number, startZ: number

    switch (edge) {
      case 0: // north edge
        startX = -halfW + EDGE_MARGIN + Math.random() * (config.fieldSize.width - EDGE_MARGIN * 2)
        startZ = -halfH + EDGE_MARGIN
        break
      case 1: // south edge
        startX = -halfW + EDGE_MARGIN + Math.random() * (config.fieldSize.width - EDGE_MARGIN * 2)
        startZ = halfH - EDGE_MARGIN
        break
      case 2: // east edge
        startX = halfW - EDGE_MARGIN
        startZ = -halfH + EDGE_MARGIN + Math.random() * (config.fieldSize.height - EDGE_MARGIN * 2)
        break
      case 3: // west edge
        startX = -halfW + EDGE_MARGIN
        startZ = -halfH + EDGE_MARGIN + Math.random() * (config.fieldSize.height - EDGE_MARGIN * 2)
        break
      default:
        startX = 0
        startZ = 0
    }

    gates.push({
      id,
      type: sf as GateType,
      position: { x: startX, y: 0, z: startZ },
      rotation: 0,
      openings: createDefaultGateOpenings(sf as GateType, id),
    })
  }

  // Place remaining gates
  for (const type of gateTypes) {
    let placed = false
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !placed; attempt++) {
      const position = generateRandomPosition(config.fieldSize)
      const id = crypto.randomUUID()
      const gate: Gate = {
        id,
        type,
        position,
        rotation: Math.floor(Math.random() * 12) * 30, // 0-330 in 30deg steps
        openings: createDefaultGateOpenings(type, id),
      }
      if (!isTooClose(gate, gates)) {
        gates.push(gate)
        placed = true
      }
    }
    if (!placed) {
      console.warn(`Could not place ${type} gate`)
    }
  }

  // Order gates by proximity (nearest neighbor from start)
  const ordered = orderGatesByProximity(gates)

  // Align rotations so gates face the flight path
  alignGateRotations(ordered)

  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: `Track ${now.slice(0, 10)}`,
    gates: ordered,
    gateSequence: buildFallbackGateSequence(ordered),
    fieldSize: config.fieldSize,
    createdAt: now,
    updatedAt: now,
  }
}
