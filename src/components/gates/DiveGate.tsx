import { useRef } from 'react'
import type { Mesh } from 'three'
import { GATE_BASE_WIDTH, GATE_POST_THICKNESS } from '../../constants/gateDimensions'
import { useTheme } from '../../hooks/useTheme'
import { getGateColors } from '../../utils/themeColors'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const POST_THICKNESS = GATE_POST_THICKNESS
const BASE_SIZE = GATE_BASE_WIDTH

export function DiveGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const s = BASE_SIZE
  const half = s / 2
  const theme = useTheme()
  const { color, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'dive', !!isSelected)

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >


      {/* Four vertical edges */}
      {/* Front-left */}
      <mesh position={[-half, half, half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Front-right */}
      <mesh position={[half, half, half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Back-left */}
      <mesh position={[-half, half, -half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Back-right */}
      <mesh position={[half, half, -half]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, s, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Top connecting edges — open at bottom */}
      {/* Front */}
      <mesh position={[0, s, half]} onClick={onClick}>
        <boxGeometry args={[s + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Back */}
      <mesh position={[0, s, -half]} onClick={onClick}>
        <boxGeometry args={[s + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Left */}
      <mesh position={[-half, s, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, POST_THICKNESS, s + POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>
      {/* Right */}
      <mesh position={[half, s, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, POST_THICKNESS, s + POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
