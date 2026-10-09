import { useRef } from 'react'
import { Text } from '@react-three/drei'
import type { Mesh } from 'three'
import { GATE_BASE_HEIGHT, GATE_BASE_WIDTH, GATE_POST_THICKNESS } from '@/core/constants/gateDimensions'
import { useSceneTheme } from '@/scene/SceneTheme'
import { getGateColors, getStartFinishTextColor } from '@/core/theme/themeColors'
import { GateOpeningIndicators } from './GateOpeningIndicators'
import type { GateComponentProps } from './gateComponentProps'


const POST_THICKNESS = GATE_POST_THICKNESS
const BASE_WIDTH = GATE_BASE_WIDTH
const BASE_HEIGHT = GATE_BASE_HEIGHT
const PANEL_WIDTH = 0.6
const PANEL_HEIGHT = 0.25
const PANEL_DEPTH = 0.02
const PANEL_TEXT = 'Start'

export function StartFinishGate({ position, rotation, openings, openingLabels, isSelected, onClick, onOpeningClick, onOpeningLabelClick }: GateComponentProps) {
  const groupRef = useRef<Mesh>(null)
  const width = BASE_WIDTH
  const height = BASE_HEIGHT
  const theme = useSceneTheme()
  const { color: accentColor, emissiveColor, emissiveIntensity } = getGateColors(theme.colors, 'start-finish', !!isSelected)
  const textColor = getStartFinishTextColor()
  const panelY = height + 0.25
  const panelTextZ = PANEL_DEPTH / 2 + 0.006

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation-y={(rotation * Math.PI) / 180}
    >
      {/* Left post */}
      <mesh position={[-width / 2, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      {/* Right post */}
      <mesh position={[width / 2, height / 2, 0]} onClick={onClick}>
        <boxGeometry args={[POST_THICKNESS, height, POST_THICKNESS]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      {/* Top crossbar */}
      <mesh position={[0, height, 0]} onClick={onClick}>
        <boxGeometry args={[width + POST_THICKNESS, POST_THICKNESS, POST_THICKNESS]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>


      {/* Start panel on top */}
      <mesh position={[0, panelY, 0]} onClick={onClick}>
        <boxGeometry args={[PANEL_WIDTH, PANEL_HEIGHT, PANEL_DEPTH]} />
        <meshStandardMaterial color={accentColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} toneMapped={false} />
      </mesh>

      <Text
        position={[0, panelY, panelTextZ]}
        color={textColor}
        fontSize={0.13}
        maxWidth={PANEL_WIDTH * 0.86}
        anchorX="center"
        anchorY="middle"
        onClick={onClick}
      >
        {PANEL_TEXT}
      </Text>

      <Text
        position={[0, panelY, -panelTextZ]}
        rotation-y={Math.PI}
        color={textColor}
        fontSize={0.13}
        maxWidth={PANEL_WIDTH * 0.86}
        anchorX="center"
        anchorY="middle"
        onClick={onClick}
      >
        {PANEL_TEXT}
      </Text>

      {/* Entry/exit indicator — green entry side, red exit side */}
      <GateOpeningIndicators openings={openings} openingLabels={openingLabels} isSelected={isSelected} onClick={onClick} onOpeningClick={onOpeningClick} onOpeningLabelClick={onOpeningLabelClick} />
    </group>
  )
}
