import { useRef } from 'react'
import type { Mesh } from 'three'
import { useSceneTheme } from '@/scene/SceneTheme'
import { getGateColors, getFlagPoleColor } from '@/core/theme/themeColors'
import { GATE_BASE_HEIGHT } from '@/core/constants/gateDimensions'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const POLE_THICKNESS = 0.06
const BASE_HEIGHT = GATE_BASE_HEIGHT

export function FlagSmall({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const height = BASE_HEIGHT
  const theme = useSceneTheme()
  const { color, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'flag-small', !!isSelected)
  const poleColor = theme.id === 'night' ? color : getFlagPoleColor()

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Vertical pole */}
      <mesh position={[0, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POLE_THICKNESS, height, POLE_THICKNESS]} />
        <meshStandardMaterial color={poleColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      {/* Small triangular flag */}
      <mesh position={[0.075, height - 0.075, 0]} onClick={onClick}>
        <boxGeometry args={[0.15, 0.1, 0.02]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />

    </group>
  )
}
