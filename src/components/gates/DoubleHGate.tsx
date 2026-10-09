import { useRef } from 'react'
import type { Mesh } from 'three'
import { GATE_BASE_HEIGHT, GATE_BASE_WIDTH, GATE_POST_THICKNESS, H_GATE_BACKREST_HEIGHT_MULTIPLIER } from '../../constants/gateDimensions'
import { getHGateBackrestSide } from '../../utils/gateDefinitions'
import { useTheme } from '../../hooks/useTheme'
import { getGateColors } from '../../utils/themeColors'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const POST_THICKNESS = GATE_POST_THICKNESS
const BASE_WIDTH = GATE_BASE_WIDTH
const BASE_HEIGHT = GATE_BASE_HEIGHT
const STACK_DISTANCE = BASE_HEIGHT

export function DoubleHGate({ gateId, position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const width = BASE_WIDTH
  const height = BASE_HEIGHT
  const backrestHeight = height * H_GATE_BACKREST_HEIGHT_MULTIPLIER
  const backrestSide = getHGateBackrestSide(gateId)
  const backrestX = backrestSide * width / 2
  const theme = useTheme()
  const { color, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'double-h', !!isSelected)
  const stackOffset = STACK_DISTANCE

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Bottom standard gate: first fly-through opening */}
      <group position={[0, 0, 0]}>
        <mesh position={[-width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>
        <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>
        <mesh position={[0, height, 0]} onClick={onClick}>
          <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>
      </group>

      {/* Top H-gate: middle fly-through plus side-defining upper backrest pass */}
      <group position={[0, stackOffset, 0]}>
        <mesh position={[-width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>

        <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>

        <mesh position={[0, height, 0]} onClick={onClick}>
          <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>

        <mesh position={[backrestX, height + (backrestHeight - height) / 2, 0]} onClick={onClick}>
          <boxGeometry args={[POST_THICKNESS, backrestHeight - height, POST_THICKNESS]} />
          <meshStandardMaterial color={color} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
        </mesh>
      </group>

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
