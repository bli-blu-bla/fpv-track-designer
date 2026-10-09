import { useMemo } from 'react'
import * as THREE from 'three'
import type { Gate, GateSequenceItem } from '@/core/types'
import { calculateFlightPath } from '@/core/track/flightPath'
import { useTheme } from '@/editor/hooks/useTheme'
import { Line } from '@react-three/drei'

interface FlightPathProps {
  gates: Gate[]
  gateSequence?: GateSequenceItem[]
}

export function FlightPath({ gates, gateSequence }: FlightPathProps) {
  const theme = useTheme()
  const path = useMemo(() => calculateFlightPath(gates, gateSequence), [gates, gateSequence])
  // Build one native THREE.Line per sampled curve to avoid implicit connections between disjoint segments.
  const lineObjects = useMemo(() => path.sampledSegments.map((segment) => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(segment.length * 3)

    for (let i = 0; i < segment.length; i++) {
      const p = segment[i]
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({ color: theme.colors.flightPath, linewidth: 2 })
    return new THREE.Line(geometry, material)
  }), [path.sampledSegments, theme.colors.flightPath])

  if (path.segments.length === 0) return null

  return (
    <group>
      {/* Flight path curves — rendered separately to preserve gate entry/exit discontinuities */}
      {lineObjects.map((lineObject, index) => (
        <primitive key={index} object={lineObject} />
      ))}

      {/* Direction arrows — two-line chevrons every 1.5m */}
      {path.arrows.map((arrow, i) => (
        <group
          key={i}
          position={[arrow.position.x, arrow.position.y, arrow.position.z]}
          quaternion={[
            arrow.quaternion.x,
            arrow.quaternion.y,
            arrow.quaternion.z,
            arrow.quaternion.w,
          ]}
        >
          <Line
            points={[
              [-0.04, 0, 0.04],
              [0, 0, -0.06],
            ]}
            color={theme.colors.flightPath}
            lineWidth={1.5}
          />
          <Line
            points={[
              [0.04, 0, 0.04],
              [0, 0, -0.06],
            ]}
            color={theme.colors.flightPath}
            lineWidth={1.5}
          />
        </group>
      ))}
    </group>
  )
}
