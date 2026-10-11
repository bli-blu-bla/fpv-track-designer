import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createRoute, sampleRoute, type FlightPoint, type SampledRoute } from './flightRoute'

interface TrackBotsProps {
  points: FlightPoint[]
  count?: number
  speed?: number
}

const DEFAULT_BOT_COUNT = 3
const DEFAULT_SPEED_METERS_PER_SECOND = 6
const MAX_BOT_SPACING_METERS = 5
const LOOK_AHEAD_METERS = 0.6
const TURN_LOOK_AHEAD_METERS = 2
const FADE_METERS = 0.8
const CRUISE_PITCH_RADIANS = 0.32
const MAX_BANK_RADIANS = 0.85
const BANK_GAIN = 1.4
const ORIENTATION_SMOOTHING = 8
const PROP_SPIN_RADIANS_PER_SECOND = 70
const MIN_DIRECTION_DISTANCE = 0.001

// One LED color per bot; cycles if more bots are requested.
const BOT_COLORS = ['#ff3b5c', '#22d3ee', '#facc15', '#a3e635']

const ARM_LENGTH = 0.3
const PROP_OFFSET = ARM_LENGTH / 2 / Math.SQRT2
const PROP_POSITIONS: [number, number, number][] = [
  [PROP_OFFSET, 0.035, PROP_OFFSET],
  [-PROP_OFFSET, 0.035, PROP_OFFSET],
  [PROP_OFFSET, 0.035, -PROP_OFFSET],
  [-PROP_OFFSET, 0.035, -PROP_OFFSET],
]

interface BotProps {
  route: SampledRoute
  color: string
  /** Meters along the route this bot starts at. */
  headStart: number
  speed: number
}

function Bot({ route, color, headStart, speed }: BotProps) {
  const rootRef = useRef<THREE.Group>(null)
  const bankRef = useRef<THREE.Group>(null)
  const propRefs = useRef<(THREE.Mesh | null)[]>([])
  const travelledRef = useRef(0)
  const bankAngleRef = useRef(0)
  const orientedRef = useRef(false)
  const scratch = useMemo(() => ({
    position: new THREE.Vector3(),
    ahead: new THREE.Vector3(),
    farAhead: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    turnDirection: new THREE.Vector3(),
    lastDirection: new THREE.Vector3(0, 0, 1),
    lookMatrix: new THREE.Matrix4(),
    targetQuaternion: new THREE.Quaternion(),
    up: new THREE.Vector3(0, 1, 0),
    origin: new THREE.Vector3(),
  }), [])

  useFrame((_, rawDelta) => {
    const root = rootRef.current
    const bank = bankRef.current
    if (!root || !bank || route.totalLength <= 0) return

    // Clamp large deltas (tab switches) so bots do not jump or spin wildly.
    const delta = Math.min(rawDelta, 0.1)
    travelledRef.current += delta * speed
    const length = route.totalLength
    const distance = (travelledRef.current + headStart) % length

    const position = sampleRoute(route, distance, scratch.position)
    const ahead = sampleRoute(route, Math.min(distance + LOOK_AHEAD_METERS, length), scratch.ahead)
    const farAhead = sampleRoute(route, Math.min(distance + TURN_LOOK_AHEAD_METERS, length), scratch.farAhead)

    const direction = scratch.direction.copy(ahead).sub(position)
    if (direction.length() > MIN_DIRECTION_DISTANCE) {
      scratch.lastDirection.copy(direction.normalize())
    }

    // Object3D convention: +Z faces the target, so build the look rotation from the flight direction.
    scratch.lookMatrix.lookAt(scratch.lastDirection, scratch.origin, scratch.up)
    scratch.targetQuaternion.setFromRotationMatrix(scratch.lookMatrix)

    const smoothing = 1 - Math.exp(-ORIENTATION_SMOOTHING * delta)
    root.position.copy(position)
    if (orientedRef.current) {
      root.quaternion.slerp(scratch.targetQuaternion, smoothing)
    } else {
      root.quaternion.copy(scratch.targetQuaternion)
      orientedRef.current = true
    }

    // Bank into turns: signed horizontal heading change over the next meters.
    const turnDirection = scratch.turnDirection.copy(farAhead).sub(position)
    let targetBank = 0
    if (turnDirection.lengthSq() > MIN_DIRECTION_DISTANCE) {
      const forward = scratch.lastDirection
      const turnAngle = Math.atan2(
        forward.z * turnDirection.x - forward.x * turnDirection.z,
        forward.x * turnDirection.x + forward.z * turnDirection.z,
      )
      targetBank = THREE.MathUtils.clamp(-turnAngle * BANK_GAIN, -MAX_BANK_RADIANS, MAX_BANK_RADIANS)
    }
    bankAngleRef.current += (targetBank - bankAngleRef.current) * smoothing
    bank.rotation.set(CRUISE_PITCH_RADIANS, 0, bankAngleRef.current, 'ZXY')

    // Shrink in and out at the route ends so the wrap-around jump stays invisible.
    const edgeDistance = Math.min(distance, length - distance)
    const scale = THREE.MathUtils.smoothstep(edgeDistance, 0, FADE_METERS)
    root.scale.setScalar(Math.max(scale, 0.0001))

    for (const [index, prop] of propRefs.current.entries()) {
      if (!prop) continue
      prop.rotation.y += (index % 2 === 0 ? 1 : -1) * PROP_SPIN_RADIANS_PER_SECOND * delta
    }
  })

  return (
    <group ref={rootRef}>
      <group ref={bankRef}>
        {/* Frame: body plate, camera pod and two crossed arms */}
        <mesh castShadow>
          <boxGeometry args={[0.07, 0.03, 0.14]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.02, 0.06]} castShadow>
          <boxGeometry args={[0.035, 0.035, 0.035]} />
          <meshStandardMaterial color="#111827" roughness={0.5} />
        </mesh>
        {[Math.PI / 4, -Math.PI / 4].map((angle) => (
          <mesh key={angle} rotation={[0, angle, 0]} castShadow>
            <boxGeometry args={[0.018, 0.012, ARM_LENGTH]} />
            <meshStandardMaterial color="#374151" roughness={0.7} />
          </mesh>
        ))}
        {PROP_POSITIONS.map((propPosition, index) => (
          <group key={index} position={propPosition}>
            <mesh position={[0, -0.015, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.025, 8]} />
              <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh ref={(mesh) => { propRefs.current[index] = mesh }}>
              <boxGeometry args={[0.13, 0.003, 0.014]} />
              <meshStandardMaterial color={color} transparent opacity={0.75} />
            </mesh>
          </group>
        ))}
        {/* Rear LED: unlit so it glows in every sky and blooms at night */}
        <mesh position={[0, 0.005, -0.075]}>
          <boxGeometry args={[0.05, 0.015, 0.01]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/** A few drones flying the sampled flight path in a loop, spaced apart. Purely decorative. */
export function TrackBots({ points, count = DEFAULT_BOT_COUNT, speed = DEFAULT_SPEED_METERS_PER_SECOND }: TrackBotsProps) {
  const route = useMemo(() => createRoute(points), [points])

  if (route.points.length < 2 || route.totalLength <= 0 || count <= 0) return null

  const spacing = Math.min(MAX_BOT_SPACING_METERS, route.totalLength / count)

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <Bot
          key={index}
          route={route}
          color={BOT_COLORS[index % BOT_COLORS.length]}
          headStart={(count - 1 - index) * spacing}
          speed={speed}
        />
      ))}
    </>
  )
}
