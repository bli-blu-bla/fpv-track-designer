import { useRef } from 'react'
import type { Mesh } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { GATE_BASE_HEIGHT, GATE_BASE_WIDTH, GATE_POST_THICKNESS } from '@/core/constants/gateDimensions'
import { useTheme } from '@/editor/hooks/useTheme'
import { getGateColors } from '@/core/theme/themeColors'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const POST_THICKNESS = GATE_POST_THICKNESS
const BASE_WIDTH = GATE_BASE_WIDTH
const BASE_HEIGHT = GATE_BASE_HEIGHT
const STACK_DISTANCE = BASE_HEIGHT
function GateFrame({ y, width, height, color, emissiveColor, emissiveIntensity, onClick }: {
  y: number; width: number; height: number; color: string; emissiveColor: string; emissiveIntensity: number; onClick?: (e: ThreeEvent<MouseEvent>) => void
}) {
  return (
    <group position={[0, y, 0]}>
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
  )
}

export function LadderGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const width = BASE_WIDTH
  const height = BASE_HEIGHT
  const theme = useTheme()
  const { color, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'ladder', !!isSelected)
  const stackOffset = STACK_DISTANCE

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      <GateFrame y={0} width={width} height={height} color={color} emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} onClick={onClick} />
      <GateFrame y={stackOffset} width={width} height={height} color={color} emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} onClick={onClick} />
      <GateFrame y={stackOffset * 2} width={width} height={height} color={color} emissiveColor={emissiveColor} emissiveIntensity={emissiveIntensity} onClick={onClick} />

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
