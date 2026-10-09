import { useRef } from 'react'
import type { Mesh } from 'three'
import { GATE_BASE_HEIGHT, GATE_BASE_WIDTH, GATE_POST_THICKNESS } from '@/core/constants/gateDimensions'
import { useSceneTheme } from '@/scene/SceneTheme'
import { getGateColors } from '@/core/theme/themeColors'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const POST_THICKNESS = GATE_POST_THICKNESS
const BASE_WIDTH = GATE_BASE_WIDTH
const BASE_HEIGHT = GATE_BASE_HEIGHT

export function StandardGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const width = BASE_WIDTH
  const height = BASE_HEIGHT
  const theme = useSceneTheme()
  const { color, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'standard', !!isSelected)

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Left post */}
      <mesh position={[-width / 2, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      {/* Right post */}
      <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      {/* Top crossbar */}
      <mesh position={[0, height, 0]} onClick={onClick}>
        <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>


      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
