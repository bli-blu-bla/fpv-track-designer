import type { Group } from 'three'
import { useRef } from 'react'
import { GATE_BASE_WIDTH, GATE_POST_THICKNESS } from '@/core/constants/gateDimensions'
import { useSceneTheme } from '@/scene/SceneTheme'
import { getGateColors } from '@/core/theme/themeColors'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const BASE_DIAMETER = GATE_BASE_WIDTH
const POST_THICKNESS = GATE_POST_THICKNESS
const OCTAGON_SEGMENTS = 8
const ANGLE_OFFSET = Math.PI / OCTAGON_SEGMENTS

export function OctagonalTunnelGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Group>(null)
  const diameter = BASE_DIAMETER
  const radius = diameter / 2
  const centerY = radius
  const tunnelLength = 2
  const theme = useSceneTheme()
  const { color, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'octagonal-tunnel', !!isSelected)
  const vertices = Array.from({ length: OCTAGON_SEGMENTS }, (_, index) => {
    const angle = ANGLE_OFFSET + (index * 2 * Math.PI) / OCTAGON_SEGMENTS
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {vertices.map((start, index) => {
        const end = vertices[(index + 1) % vertices.length]
        const edgeLength = Math.hypot(end.x - start.x, end.y - start.y)
        const edgeAngle = Math.atan2(end.y - start.y, end.x - start.x)

        return (
          <mesh
            key={`octagonal-tunnel-edge-${index}`}
            position={[(start.x + end.x) / 2, centerY + (start.y + end.y) / 2, 0]}
            rotation-z={edgeAngle}
            onClick={onClick}
          >
            <boxGeometry args={[edgeLength + POST_THICKNESS, POST_THICKNESS, tunnelLength]} />
            <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
          </mesh>
        )
      })}

      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />

      {/* Mirrored exit-side indicator at the back of the tunnel — same opening.id so direction toggle and label edits stay in sync */}
      <group position={[0, 0, tunnelLength]}>
        <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
      </group>
    </group>
  )
}
