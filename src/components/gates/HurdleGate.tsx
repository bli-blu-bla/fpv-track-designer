import { useRef } from 'react'
import type { Group } from 'three'
import { GATE_BASE_HEIGHT, GATE_BASE_WIDTH, GATE_POST_THICKNESS } from '../../constants/gateDimensions'
import { useTheme } from '../../hooks/useTheme'
import { getGateColors } from '../../utils/themeColors'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const POST_THICKNESS = GATE_POST_THICKNESS
const WIDTH = GATE_BASE_WIDTH * 2
const LOWER_BODY_HEIGHT = GATE_BASE_HEIGHT
const OPENING_HEIGHT = GATE_BASE_HEIGHT * 0.9
const TOTAL_HEIGHT = LOWER_BODY_HEIGHT + OPENING_HEIGHT

export function HurdleGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Group>(null)
  const theme = useTheme()
  const { color, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'hurdle', !!isSelected)

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      <mesh position={[-WIDTH / 2, TOTAL_HEIGHT / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, TOTAL_HEIGHT, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      <mesh position={[WIDTH / 2, TOTAL_HEIGHT / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, TOTAL_HEIGHT, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      <mesh position={[0, LOWER_BODY_HEIGHT / 2, 0]} onClick={onClick}>
        <boxGeometry args={[WIDTH + POST_THICKNESS, LOWER_BODY_HEIGHT, POST_THICKNESS]} />
        <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
