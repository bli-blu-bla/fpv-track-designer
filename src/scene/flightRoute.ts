import * as THREE from 'three'

export interface FlightPoint {
  x: number
  y: number
  z: number
}

export interface SampledRoute {
  points: THREE.Vector3[]
  distances: number[]
  totalLength: number
}

export function createRoute(points: FlightPoint[]): SampledRoute {
  const vectors = points.map((point) => new THREE.Vector3(point.x, point.y, point.z))
  const distances = [0]
  let totalLength = 0

  for (let i = 1; i < vectors.length; i++) {
    totalLength += vectors[i - 1].distanceTo(vectors[i])
    distances.push(totalLength)
  }

  return { points: vectors, distances, totalLength }
}

/** Writes the point `distance` meters along the route into `target` (clamped to the route ends). */
export function sampleRoute(route: SampledRoute, distance: number, target: THREE.Vector3) {
  if (route.points.length === 0) return target.set(0, 0, 0)
  if (route.points.length === 1 || distance <= 0) return target.copy(route.points[0])
  if (distance >= route.totalLength) return target.copy(route.points[route.points.length - 1])

  const segmentIndex = route.distances.findIndex((segmentDistance) => segmentDistance >= distance)
  const endIndex = Math.max(1, segmentIndex)
  const startIndex = endIndex - 1
  const startDistance = route.distances[startIndex]
  const endDistance = route.distances[endIndex]
  const segmentLength = endDistance - startDistance
  const t = segmentLength > 0 ? (distance - startDistance) / segmentLength : 0

  return target.copy(route.points[startIndex]).lerp(route.points[endIndex], t)
}
