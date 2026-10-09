import { CubicBezierCurve3, Quaternion, Vector3 } from 'three'
import type { Gate, GateOpening, GateSequenceItem } from '@/core/types'
import { normalizeGates } from '@/core/gates/gateOpenings'
import { GATE_DEFINITIONS, getHGateBackrestSide } from '@/core/gates/gateDefinitions'
import { buildFallbackGateSequence, normalizeGateSequence } from '@/core/gates/gateSequence'

export { GATE_BASE_HEIGHT } from '@/core/constants/gateDimensions'

const MIN_CURVE_SAMPLES_PER_SEGMENT = 80
const MAX_CURVE_SAMPLES_PER_SEGMENT = 400
const CURVE_SAMPLES_PER_METER = 14
export const CONTROL_POINT_FACTOR = 0.25
const MAX_CONTROL_HANDLE_LENGTH = 2.5
const U_TURN_DOT_THRESHOLD = -0.3
const FORBIDDEN_ZONE_TOLERANCE = 0.2
const MIN_CLEARANCE = 0.3
export const DIVE_TOP_APPROACH_CLEARANCE = 0.5
export const GATE_STRUCTURE_CLEARANCE = 0.5
const GATE_AVOIDANCE_SIDE_MARGIN = GATE_STRUCTURE_CLEARANCE
const GATE_AVOIDANCE_FRONT_MARGIN = 0.25
const OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR = 1

export interface PathSegment {
  from: { x: number; y: number; z: number }
  to: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  length: number
}

export interface ArrowPosition {
  position: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  quaternion: { x: number; y: number; z: number; w: number }
}

export interface FlightPath {
  segments: PathSegment[]
  arrows: ArrowPosition[]
  totalLength: number
  points: { x: number; y: number; z: number }[]
  sampledPoints: { x: number; y: number; z: number }[]
  sampledSegments: { x: number; y: number; z: number }[][]
  sampledLegs: { x: number; y: number; z: number }[][]
}

interface GateVisit {
  gate: Gate
  opening: GateOpening
  reverse: boolean
}

const ARROW_SPACING = 1.5

function createStraightCurve(from: Vector3, to: Vector3): CubicBezierCurve3 {
  const delta = to.clone().sub(from)
  const cp1 = from.clone().add(delta.clone().multiplyScalar(1 / 3))
  const cp2 = from.clone().add(delta.clone().multiplyScalar(2 / 3))
  return new CubicBezierCurve3(from, cp1, cp2, to)
}

function createDirectionalCurve(from: Vector3, to: Vector3, fromDirection: Vector3, toDirection: Vector3): CubicBezierCurve3 {
  const distance = from.distanceTo(to)
  const handleLength = Math.min(distance * CONTROL_POINT_FACTOR, MAX_CONTROL_HANDLE_LENGTH)
  const cp1 = from.clone().add(fromDirection.clone().multiplyScalar(handleLength))
  const cp2 = to.clone().sub(toDirection.clone().multiplyScalar(handleLength))
  return new CubicBezierCurve3(from, cp1, cp2, to)
}

function createAvoidanceCurve(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  waypoint: Vector3,
): { curves: { curve: CubicBezierCurve3; length: number }[]; totalLength: number } {
  const dist1 = from.distanceTo(waypoint)
  const handle1 = Math.min(dist1 * CONTROL_POINT_FACTOR, MAX_CONTROL_HANDLE_LENGTH)
  const cp1a = from.clone().add(fromDirection.clone().multiplyScalar(handle1))
  const cp1b = waypoint.clone().add(normalize(from.clone().sub(waypoint)).multiplyScalar(handle1))
  const curve1 = new CubicBezierCurve3(from, cp1a, cp1b, waypoint)
  const length1 = curve1.getLength()

  const dist2 = waypoint.distanceTo(to)
  const handle2 = Math.min(dist2 * CONTROL_POINT_FACTOR, MAX_CONTROL_HANDLE_LENGTH)
  const cp2a = waypoint.clone().multiplyScalar(2).sub(cp1b)
  const cp2b = to.clone().sub(toDirection.clone().multiplyScalar(handle2))
  const curve2 = new CubicBezierCurve3(waypoint, cp2a, cp2b, to)
  const length2 = curve2.getLength()

  return {
    curves: [
      { curve: curve1, length: length1 },
      { curve: curve2, length: length2 },
    ],
    totalLength: length1 + length2,
  }
}

function distance3d(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}

function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2)
  if (len === 0) return new Vector3(0, 0, 0)
  return new Vector3(v.x / len, v.y / len, v.z / len)
}

function getCurveSamples(length: number): number {
  const byLength = Math.ceil(length * CURVE_SAMPLES_PER_METER)
  return Math.max(MIN_CURVE_SAMPLES_PER_SEGMENT, Math.min(MAX_CURVE_SAMPLES_PER_SEGMENT, byLength))
}

function rotateLocalVector(x: number, z: number, rotation: number): { x: number; z: number } {
  const rad = (rotation * Math.PI) / 180
  const cosR = Math.cos(rad)
  const sinR = Math.sin(rad)

  return {
    x: x * cosR + z * sinR,
    z: -x * sinR + z * cosR,
  }
}

export function getGateEntryDirection(gate: Gate, opening: GateOpening, reverse = false): Vector3 {
  const pitchRad = ((opening.rotationX ?? 0) * Math.PI) / 180
  const yawRad = ((gate.rotation + opening.rotation) * Math.PI) / 180
  const pitchedLocalY = Math.sin(pitchRad)
  const pitchedLocalZ = -Math.cos(pitchRad)
  const direction = new Vector3(
    pitchedLocalZ * Math.sin(yawRad),
    pitchedLocalY,
    pitchedLocalZ * Math.cos(yawRad),
  ).normalize()
  return reverse ? direction.negate() : direction
}

function getGateExitDirection(gate: Gate, opening: GateOpening, reverse = false): Vector3 {
  return getGateEntryDirection(gate, opening, reverse).negate()
}

function getGateVisitCenterPoint(visit: GateVisit): Vector3 {
  const rotatedPosition = rotateLocalVector(visit.opening.position.x, visit.opening.position.z, visit.gate.rotation)
  return new Vector3(
    visit.gate.position.x + rotatedPosition.x,
    visit.gate.position.y + visit.opening.position.y,
    visit.gate.position.z + rotatedPosition.z,
  )
}

function getGateOpeningWidthDirection(gate: Gate, opening: GateOpening): Vector3 {
  const yawRad = ((gate.rotation + opening.rotation) * Math.PI) / 180
  return new Vector3(Math.cos(yawRad), 0, Math.sin(yawRad)).normalize()
}

function getGatePassThroughOffset(opening: GateOpening): number {
  const defaultOffset = Math.min(opening.width, opening.height) * 0.375
  return opening.id === 'entry-top' ? Math.max(defaultOffset, DIVE_TOP_APPROACH_CLEARANCE) : defaultOffset
}

function isTunnelVisit(visit: GateVisit): boolean {
  return GATE_DEFINITIONS[visit.gate.type].tunnelOpeningId === visit.opening.id
}

function getOctagonalTunnelPortalPoint(visit: GateVisit, localZ: number, outsideDirection: Vector3): Vector3 {
  const rotatedPosition = rotateLocalVector(0, localZ, visit.gate.rotation)
  const openingOffset = outsideDirection.multiplyScalar(getGatePassThroughOffset(visit.opening))

  return new Vector3(
    visit.gate.position.x + rotatedPosition.x,
    visit.gate.position.y + visit.opening.position.y,
    visit.gate.position.z + rotatedPosition.z,
  ).add(openingOffset)
}

function getGateEntryPoint(visit: GateVisit): Vector3 {
  if (isTunnelVisit(visit)) {
    const entryDirection = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
    const entryLocalZ = visit.reverse ? OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR : -OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR
    return getOctagonalTunnelPortalPoint(visit, entryLocalZ, entryDirection)
  }

  const center = getGateVisitCenterPoint(visit)
  const offset = getGateEntryDirection(visit.gate, visit.opening, visit.reverse).multiplyScalar(getGatePassThroughOffset(visit.opening))
  return center.add(offset)
}

function getGateExitPoint(visit: GateVisit): Vector3 {
  if (isTunnelVisit(visit)) {
    const exitDirection = getGateExitDirection(visit.gate, visit.opening, visit.reverse)
    const exitLocalZ = visit.reverse ? -OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR : OCTAGONAL_TUNNEL_HALF_LENGTH_FACTOR
    return getOctagonalTunnelPortalPoint(visit, exitLocalZ, exitDirection)
  }

  const center = getGateVisitCenterPoint(visit)
  const offset = getGateExitDirection(visit.gate, visit.opening, visit.reverse).multiplyScalar(getGatePassThroughOffset(visit.opening))
  return center.add(offset)
}

function isInForbiddenZone(point: Vector3, visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)
  return point.clone().sub(center).dot(getGateEntryDirection(visit.gate, visit.opening, visit.reverse)) < -FORBIDDEN_ZONE_TOLERANCE
}

function curvePassesForbiddenZone(curve: CubicBezierCurve3, visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)

  for (let t = 0.05; t < 0.95; t += 0.05) {
    const point = curve.getPoint(t)
    if (point.distanceTo(center) < 3 && isInForbiddenZone(point, visit)) {
      return true
    }
  }

  return false
}

function curveReentersGateOpening(curve: CubicBezierCurve3, visit: GateVisit): boolean {
  const center = getGateVisitCenterPoint(visit)
  const halfWidth = visit.opening.width / 2
  const halfHeight = visit.opening.height / 2
  const normal = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
  const widthDirection = getGateOpeningWidthDirection(visit.gate, visit.opening)
  const heightDirection = normalize(normal.clone().cross(widthDirection))

  for (let t = 0.2; t < 1; t += 0.03) {
    const point = curve.getPoint(t)
    const offset = point.clone().sub(center)
    const localX = offset.dot(widthDirection)
    const localY = offset.dot(heightDirection)
    const localZ = offset.dot(normal)

    if (Math.abs(localX) < halfWidth && Math.abs(localY) < halfHeight && Math.abs(localZ) < MIN_CLEARANCE) {
      return true
    }
  }

  return false
}

function calculateWaypointForSide(visit: GateVisit, side: 1 | -1): Vector3 {
  const center = getGateVisitCenterPoint(visit)
  const entryDir = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
  const sideDir = new Vector3(entryDir.z, 0, -entryDir.x).normalize()
  const sideOffset = visit.opening.width / 2 + GATE_AVOIDANCE_SIDE_MARGIN
  const frontOffset = getGatePassThroughOffset(visit.opening) + GATE_AVOIDANCE_FRONT_MARGIN

  return center
    .clone()
    .add(sideDir.multiplyScalar(side * sideOffset))
    .add(entryDir.multiplyScalar(frontOffset))
}

function calculateOutsideLaneWaypoint(visit: GateVisit, side: 1 | -1, frontDirection: Vector3): Vector3 {
  const center = getGateVisitCenterPoint(visit)
  const entryDir = getGateEntryDirection(visit.gate, visit.opening, visit.reverse)
  const sideDir = new Vector3(entryDir.z, 0, -entryDir.x).normalize()
  const sideOffset = visit.opening.width / 2 + GATE_STRUCTURE_CLEARANCE
  const frontOffset = getGatePassThroughOffset(visit.opening) + GATE_AVOIDANCE_FRONT_MARGIN

  return center
    .clone()
    .add(sideDir.multiplyScalar(side * sideOffset))
    .add(frontDirection.clone().normalize().multiplyScalar(frontOffset))
}

function getGateLocalXDirection(gate: Gate): Vector3 {
  const rotated = rotateLocalVector(1, 0, gate.rotation)
  return new Vector3(rotated.x, 0, rotated.z).normalize()
}

function calculatePhysicalSideOutsideLaneWaypoint(
  visit: GateVisit,
  physicalSideDirection: Vector3,
  frontDirection: Vector3,
): Vector3 {
  const center = getGateVisitCenterPoint(visit)
  const sideOffset = visit.opening.width / 2 + GATE_STRUCTURE_CLEARANCE
  const frontOffset = getGatePassThroughOffset(visit.opening) + GATE_AVOIDANCE_FRONT_MARGIN

  return center
    .clone()
    .add(physicalSideDirection.clone().normalize().multiplyScalar(sideOffset))
    .add(frontDirection.clone().normalize().multiplyScalar(frontOffset))
}

function createSameGatePhysicalSideClearanceCurve(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  fromVisit: GateVisit,
  toVisit: GateVisit,
  physicalSideDirection: Vector3,
): { curves: { curve: CubicBezierCurve3; length: number }[]; totalLength: number } {
  const fromWaypoint = calculatePhysicalSideOutsideLaneWaypoint(fromVisit, physicalSideDirection, fromDirection)
  const toWaypoint = calculatePhysicalSideOutsideLaneWaypoint(toVisit, physicalSideDirection, getGateEntryDirection(toVisit.gate, toVisit.opening, toVisit.reverse))
  const laneDirection = normalize(toWaypoint.clone().sub(fromWaypoint))
  const sideExitDirection = normalize(physicalSideDirection.clone().multiplyScalar(2).add(fromDirection))

  const curve1 = createDirectionalCurve(from, fromWaypoint, sideExitDirection, laneDirection)
  const curve2 = createStraightCurve(fromWaypoint, toWaypoint)
  const curve3 = createDirectionalCurve(toWaypoint, to, laneDirection, toDirection)
  const length1 = curve1.getLength()
  const length2 = curve2.getLength()
  const length3 = curve3.getLength()

  return {
    curves: [
      { curve: curve1, length: length1 },
      { curve: curve2, length: length2 },
      { curve: curve3, length: length3 },
    ],
    totalLength: length1 + length2 + length3,
  }
}

function isSideDefinedSameGateTransition(fromVisit: GateVisit, toVisit: GateVisit): boolean {
  if (fromVisit.gate.id !== toVisit.gate.id) return false

  return GATE_DEFINITIONS[fromVisit.gate.type].isSideDefinedTransition?.(fromVisit.opening.id, toVisit.opening.id) ?? false
}

function createSameGateClearanceCurve(
  from: Vector3,
  fromDirection: Vector3,
  to: Vector3,
  toDirection: Vector3,
  fromVisit: GateVisit,
  toVisit: GateVisit,
  side: 1 | -1,
): { curves: { curve: CubicBezierCurve3; length: number }[]; totalLength: number } {
  const fromWaypoint = calculateOutsideLaneWaypoint(fromVisit, side, fromDirection)
  const toWaypoint = calculateOutsideLaneWaypoint(toVisit, side, getGateEntryDirection(toVisit.gate, toVisit.opening, toVisit.reverse))
  const laneDirection = normalize(toWaypoint.clone().sub(fromWaypoint))

  const curve1 = createDirectionalCurve(from, fromWaypoint, fromDirection, laneDirection)
  const curve2 = createStraightCurve(fromWaypoint, toWaypoint)
  const curve3 = createDirectionalCurve(toWaypoint, to, laneDirection, toDirection)
  const length1 = curve1.getLength()
  const length2 = curve2.getLength()
  const length3 = curve3.getLength()

  return {
    curves: [
      { curve: curve1, length: length1 },
      { curve: curve2, length: length2 },
      { curve: curve3, length: length3 },
    ],
    totalLength: length1 + length2 + length3,
  }
}

function resolveVisits(gates: Gate[], gateSequence?: GateSequenceItem[]): GateVisit[] {
  const normalizedGates = normalizeGates(gates)
  const sequence = normalizeGateSequence(gateSequence ?? buildFallbackGateSequence(normalizedGates), normalizedGates)
  const gateMap = new Map(normalizedGates.map((gate) => [gate.id, gate]))

  return sequence.map((entry) => {
    const gate = gateMap.get(entry.gateId)
    if (!gate) return null

    const opening = gate.openings.find((candidate) => candidate.id === entry.openingId) ?? gate.openings[0]
    if (!opening) return null

    return {
      gate,
      opening,
      reverse: Boolean(entry.reverse),
    }
  }).filter((visit): visit is GateVisit => visit !== null)
}

export function calculateFlightPath(gates: Gate[], gateSequence?: GateSequenceItem[]): FlightPath {
  const orderedVisits = resolveVisits(gates, gateSequence)
  if (orderedVisits.length < 2) {
    return { segments: [], arrows: [], totalLength: 0, points: [], sampledPoints: [], sampledSegments: [], sampledLegs: [] }
  }

  const curves: { curve: CubicBezierCurve3; length: number }[] = []
  const legCurveGroups: { curve: CubicBezierCurve3; length: number }[][] = []
  const allPoints: Vector3[] = []
  const segments: PathSegment[] = []
  let totalLength = 0

  for (let i = 0; i < orderedVisits.length; i++) {
    const fromVisit = orderedVisits[i]
    const toVisit = orderedVisits[(i + 1) % orderedVisits.length]

    const throughGateCurve = createStraightCurve(getGateEntryPoint(fromVisit), getGateExitPoint(fromVisit))
    const throughGateLength = throughGateCurve.getLength()
    const throughGate = { curve: throughGateCurve, length: throughGateLength }
    const legCurves = [throughGate]
    curves.push(throughGate)
    totalLength += throughGateLength
    allPoints.push(throughGateCurve.v0, throughGateCurve.v1, throughGateCurve.v2)

    const from = getGateExitPoint(fromVisit)
    const to = getGateEntryPoint(toVisit)
    const fromDirection = getGateExitDirection(fromVisit.gate, fromVisit.opening, fromVisit.reverse)
    const toDirection = getGateExitDirection(toVisit.gate, toVisit.opening, toVisit.reverse)
    const standardCurve = createDirectionalCurve(from, to, fromDirection, toDirection)
    const tangent = normalize(getGateVisitCenterPoint(toVisit).clone().sub(getGateVisitCenterPoint(fromVisit)))
    const isSameGateTransition = fromVisit.gate.id === toVisit.gate.id

    let transitionCurves = [{ curve: standardCurve, length: standardCurve.getLength() }]
    let needsAvoidance = isSameGateTransition
      && fromVisit.opening.id === toVisit.opening.id
    let reentersFromOpening = false

    if (!needsAvoidance && curvePassesForbiddenZone(standardCurve, toVisit)) {
      needsAvoidance = true
    }

    if (curveReentersGateOpening(standardCurve, fromVisit)) {
      reentersFromOpening = true
      needsAvoidance = true
    }

    if (!needsAvoidance) {
      const approachDirection = normalize(to.clone().sub(from))
      if (approachDirection.dot(toDirection) < U_TURN_DOT_THRESHOLD) {
        needsAvoidance = true
      }
    }

    if (isSideDefinedSameGateTransition(fromVisit, toVisit)) {
      const backrestSideDirection = getGateLocalXDirection(fromVisit.gate).multiplyScalar(getHGateBackrestSide(fromVisit.gate.id))
      const sideAwareCurve = createSameGatePhysicalSideClearanceCurve(
        from,
        fromDirection,
        to,
        toDirection,
        fromVisit,
        toVisit,
        backrestSideDirection,
      )
      transitionCurves = sideAwareCurve.curves
    } else if (needsAvoidance) {
      const candidates = ([1, -1] as const).map((side) => {
        if (isSameGateTransition) {
          return createSameGateClearanceCurve(from, fromDirection, to, toDirection, fromVisit, toVisit, side)
        }

        const waypoint = reentersFromOpening
          ? calculateOutsideLaneWaypoint(fromVisit, side, fromDirection)
          : calculateWaypointForSide(toVisit, side)
        return createAvoidanceCurve(from, fromDirection, to, toDirection, waypoint)
      })

      const validCandidates = candidates.filter((candidate) => candidate.curves.every(({ curve }) => !curveReentersGateOpening(curve, fromVisit)))
      const pool = validCandidates.length > 0 ? validCandidates : candidates
      const best = pool.reduce((shortest, current) => current.totalLength < shortest.totalLength ? current : shortest)
      transitionCurves = best.curves
    }

    for (const { curve, length } of transitionCurves) {
      const transitionCurve = { curve, length }
      curves.push(transitionCurve)
      legCurves.push(transitionCurve)
      totalLength += length
      allPoints.push(curve.v0, curve.v1, curve.v2)
    }

    legCurveGroups.push(legCurves)

    segments.push({
      from: fromVisit.gate.position,
      to: toVisit.gate.position,
      direction: { x: tangent.x, y: tangent.y, z: tangent.z },
      length: distance3d(fromVisit.gate.position, toVisit.gate.position),
    })
  }

  const sampledPoints: { x: number; y: number; z: number }[] = []
  const sampledSegments: { x: number; y: number; z: number }[][] = []
  const sampledLegs = legCurveGroups.map((legCurves) => {
    const legPoints: { x: number; y: number; z: number }[] = []

    for (const { curve, length } of legCurves) {
      const samples = getCurveSamples(length)

      for (let i = 0; i < samples; i++) {
        const point = curve.getPoint(i / samples)
        legPoints.push({ x: point.x, y: point.y, z: point.z })
      }

      const endPoint = curve.getPoint(1)
      legPoints.push({ x: endPoint.x, y: endPoint.y, z: endPoint.z })
    }

    return legPoints
  })

  for (const { curve, length } of curves) {
    const samples = getCurveSamples(length)
    const segmentPoints: { x: number; y: number; z: number }[] = []

    for (let i = 0; i < samples; i++) {
      const t = i / samples
      const point = curve.getPoint(t)
      const sampledPoint = { x: point.x, y: point.y, z: point.z }
      sampledPoints.push(sampledPoint)
      segmentPoints.push(sampledPoint)
    }

    const endPoint = curve.getPoint(1)
    const sampledEndPoint = { x: endPoint.x, y: endPoint.y, z: endPoint.z }
    sampledPoints.push(sampledEndPoint)
    segmentPoints.push(sampledEndPoint)
    sampledSegments.push(segmentPoints)
  }

  const arrows: ArrowPosition[] = []
  const arrowCount = Math.max(1, Math.floor(totalLength / ARROW_SPACING))

  for (let i = 0; i < arrowCount; i++) {
    const targetDist = (i / arrowCount) * totalLength
    let accumulatedDist = 0

    for (let curveIndex = 0; curveIndex < curves.length; curveIndex++) {
      const { curve, length } = curves[curveIndex]

      if (accumulatedDist + length >= targetDist || curveIndex === curves.length - 1) {
        const localT = length > 0 ? (targetDist - accumulatedDist) / length : 0
        const clampedT = Math.max(0, Math.min(1, localT))
        const point = curve.getPointAt(clampedT)
        const tangent = curve.getTangentAt(clampedT)
        const direction = normalize(tangent)
        const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), direction)
        arrows.push({
          position: { x: point.x, y: point.y, z: point.z },
          direction: { x: tangent.x, y: tangent.y, z: tangent.z },
          quaternion: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
        })
        break
      }

      accumulatedDist += length
    }
  }

  return {
    segments,
    arrows,
    totalLength,
    points: allPoints.map((point) => ({ x: point.x, y: point.y, z: point.z })),
    sampledPoints,
    sampledSegments,
    sampledLegs,
  }
}
