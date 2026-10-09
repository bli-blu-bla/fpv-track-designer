import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls } from 'three-stdlib'

interface FlightPoint {
  x: number
  y: number
  z: number
}

interface FpvFlyThroughProps {
  active: boolean
  points: FlightPoint[]
  controlsRef: React.RefObject<OrbitControls | null>
  onComplete: () => void
  speed?: number
}

interface SampledRoute {
  points: THREE.Vector3[]
  distances: number[]
  totalLength: number
}

interface SavedCameraState {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  target: THREE.Vector3 | null
}

const DEFAULT_SPEED_METERS_PER_SECOND = 4
const LOOK_AHEAD_METERS = 1.25
const MIN_DIRECTION_DISTANCE = 0.001

function createRoute(points: FlightPoint[]): SampledRoute {
  const vectors = points.map((point) => new THREE.Vector3(point.x, point.y, point.z))
  const distances = [0]
  let totalLength = 0

  for (let i = 1; i < vectors.length; i++) {
    totalLength += vectors[i - 1].distanceTo(vectors[i])
    distances.push(totalLength)
  }

  return { points: vectors, distances, totalLength }
}

function sampleRoute(route: SampledRoute, distance: number, target: THREE.Vector3) {
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

export function FpvFlyThrough({
  active,
  points,
  controlsRef,
  onComplete,
  speed = DEFAULT_SPEED_METERS_PER_SECOND,
}: FpvFlyThroughProps) {
  const { camera } = useThree()
  const route = useMemo(() => createRoute(points), [points])
  const elapsedDistanceRef = useRef(0)
  const savedCameraStateRef = useRef<SavedCameraState | null>(null)
  const completionRequestedRef = useRef(false)
  const currentPositionRef = useRef(new THREE.Vector3())
  const lookAtRef = useRef(new THREE.Vector3())
  const lastDirectionRef = useRef(new THREE.Vector3(0, 0, -1))

  useEffect(() => {
    if (!active) return

    const controls = controlsRef.current
    savedCameraStateRef.current = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
      target: controls ? controls.target.clone() : null,
    }
    elapsedDistanceRef.current = 0
    completionRequestedRef.current = false
    lastDirectionRef.current.set(0, 0, -1)
    if (controls) {
      controls.enabled = false
    }

    return () => {
      const savedCameraState = savedCameraStateRef.current
      if (savedCameraState) {
        camera.position.copy(savedCameraState.position)
        camera.quaternion.copy(savedCameraState.quaternion)
      }

      if (controls) {
        if (savedCameraState?.target) {
          controls.target.copy(savedCameraState.target)
        }
        controls.enabled = true
        controls.update()
      }

      savedCameraStateRef.current = null
    }
  }, [active, camera, controlsRef])

  useFrame((_, delta) => {
    if (!active || completionRequestedRef.current) return

    if (route.points.length < 2 || route.totalLength <= 0) {
      completionRequestedRef.current = true
      onComplete()
      return
    }

    elapsedDistanceRef.current += delta * speed
    const currentDistance = Math.min(elapsedDistanceRef.current, route.totalLength)
    const lookAheadDistance = Math.min(currentDistance + LOOK_AHEAD_METERS, route.totalLength)
    const currentPosition = sampleRoute(route, currentDistance, currentPositionRef.current)
    const lookAt = sampleRoute(route, lookAheadDistance, lookAtRef.current)

    const direction = lookAt.clone().sub(currentPosition)
    if (direction.length() > MIN_DIRECTION_DISTANCE) {
      lastDirectionRef.current.copy(direction.normalize())
    } else {
      lookAt.copy(currentPosition).add(lastDirectionRef.current)
    }

    camera.position.copy(currentPosition)
    camera.lookAt(lookAt)
    camera.updateMatrixWorld()

    const controls = controlsRef.current
    if (controls) {
      controls.target.copy(lookAt)
      controls.update()
    }

    if (elapsedDistanceRef.current >= route.totalLength) {
      completionRequestedRef.current = true
      onComplete()
    }
  })

  return null
}
