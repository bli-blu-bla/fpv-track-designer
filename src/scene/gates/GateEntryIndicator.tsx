import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneTheme } from '@/scene/SceneTheme'
import { useRef, useState } from 'react'

interface GateEntryIndicatorProps {
  width: number
  height: number
  position?: [number, number, number]
  rotationX?: number
  rotationY?: number
  reverse?: boolean
  label?: string
  isSelected?: boolean
  canToggleDirection?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onSwapClick?: (e: ThreeEvent<MouseEvent>) => void
  onLabelClick?: (e: ThreeEvent<MouseEvent>) => void
}

/**
 * Transparent entry/exit indicator planes filling the gate opening.
 * Green on the entry side (front, -Z), red on the back side (+Z).
 * Makes it immediately clear which side to approach the gate from.
 */
export function GateEntryIndicator({ width, height, position = [0, height / 2, 0], rotationX = 0, rotationY = 0, reverse = false, label, isSelected, canToggleDirection, onClick, onSwapClick, onLabelClick }: GateEntryIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const entryLabelRef = useRef<THREE.Group>(null)
  const exitLabelRef = useRef<THREE.Group>(null)
  const entrySwapRef = useRef<THREE.Group>(null)
  const exitSwapRef = useRef<THREE.Group>(null)
  const [isSwapIconHovered, setIsSwapIconHovered] = useState(false)
  const [isLabelHovered, setIsLabelHovered] = useState(false)
  const [isOpeningHovered, setIsOpeningHovered] = useState(false)
  const lines = label?.split('\n') ?? []
  const lineCount = Math.max(lines.length, 1)
  const widestLineLength = Math.max(...lines.map((line) => line.length), 1)
  const fontSize = Math.min((width * 0.58) / widestLineLength, (height * 0.56) / lineCount)
  const theme = useSceneTheme()
  const entryLabelColor = theme.colors.indicatorEntryLabel
  const exitLabelColor = theme.colors.indicatorExitLabel
  const entryOutlineColor = theme.colors.indicatorEntryOutline
  const exitOutlineColor = theme.colors.indicatorExitOutline
  const canEditLabel = !!onLabelClick
  const showOpeningHighlight = isSelected || isOpeningHovered
  const canShowSwapIcon = isSelected || isOpeningHovered || isLabelHovered || isSwapIconHovered
  const swapIconHoverColor = theme.colors.selectionEmissive
  const isLabelBright = isLabelHovered
  const labelHoverColor = theme.colors.selectionEmissive
  const labelFillOpacity = isLabelBright ? 0.9 : 0.12
  const labelOutlineWidth = isLabelBright ? fontSize * 0.03 : fontSize * 0.006
  const labelEntryColor = isLabelBright ? labelHoverColor : entryLabelColor
  const labelExitColor = isLabelBright ? labelHoverColor : exitLabelColor
  const labelEntryOutlineColor = isLabelBright ? theme.colors.selectionEmissive : entryOutlineColor
  const labelExitOutlineColor = isLabelBright ? theme.colors.selectionEmissive : exitOutlineColor
  const entryZ = reverse ? 0.02 : -0.02
  const exitZ = reverse ? -0.02 : 0.02
  const entryLabelZ = reverse ? 0.03 : -0.03
  const exitLabelZ = reverse ? -0.03 : 0.03
  const entryLabelRotationY = reverse ? 0 : Math.PI
  const exitLabelRotationY = reverse ? Math.PI : 0

  const openingHoverOpacity = isOpeningHovered ? 0.68 : 0.48
  const showSwapIcon = !!canToggleDirection && canShowSwapIcon
  const swapIconFontSize = Math.min(width, height) * 0.18
  const swapIconColor = isSwapIconHovered ? swapIconHoverColor : theme.colors.indicatorEntryLabel
  const swapIconFillOpacity = isSwapIconHovered ? 0.9 : 0.78
  const swapIconOutlineWidth = isSwapIconHovered ? swapIconFontSize * 0.09 : swapIconFontSize * 0.06
  const swapIconEntryZ = reverse ? 0.045 : -0.045
  const swapIconExitZ = reverse ? -0.045 : 0.045
  const swapIconEntryRotationY = reverse ? 0 : Math.PI
  const swapIconExitRotationY = reverse ? Math.PI : 0

  const updateHoverCursor = (shouldShowPointer: boolean) => {
    document.body.style.cursor = shouldShowPointer ? 'pointer' : 'auto'
  }

  const handleOpeningPointerOver = () => {
    setIsOpeningHovered(true)
    updateHoverCursor(true)
  }

  const handleOpeningPointerOut = () => {
    setIsOpeningHovered(false)
    updateHoverCursor(isLabelHovered || isSwapIconHovered)
  }

  const handleSwapIconPointerOver = () => {
    setIsSwapIconHovered(true)
    updateHoverCursor(true)
  }
  const handleSwapIconPointerOut = () => {
    setIsSwapIconHovered(false)
    updateHoverCursor(isLabelHovered || isOpeningHovered)
  }

  const handleLabelPointerOver = () => {
    if (!canEditLabel) return

    setIsLabelHovered(true)
    updateHoverCursor(true)
  }

  const handleLabelPointerOut = () => {
    if (!canEditLabel) return

    setIsLabelHovered(false)
    updateHoverCursor(isOpeningHovered || isSwapIconHovered)
  }

  const renderSwapBadge = () => (
    <Text
      color={swapIconColor}
      fontSize={swapIconFontSize}
      anchorX="center"
      anchorY="middle"
      outlineWidth={swapIconOutlineWidth}
      outlineColor={isSwapIconHovered ? swapIconHoverColor : theme.colors.indicatorEntryOutline}
      fillOpacity={swapIconFillOpacity}
      material-depthTest={false}
      material-depthWrite={false}
      material-side={THREE.FrontSide}
      renderOrder={3}
      onClick={onSwapClick}
      onPointerOver={handleSwapIconPointerOver}
      onPointerOut={handleSwapIconPointerOut}
    >
      ⇄
    </Text>
  )

  useFrame(({ camera }) => {
    if (!groupRef.current) return

    const localCameraPosition = groupRef.current.worldToLocal(camera.position.clone())
    const isEntrySideVisible = reverse ? localCameraPosition.z >= 0 : localCameraPosition.z <= 0

    if (entryLabelRef.current) {
      entryLabelRef.current.visible = isEntrySideVisible
    }

    if (entrySwapRef.current) {
      entrySwapRef.current.visible = isEntrySideVisible
    }

    if (exitLabelRef.current) {
      exitLabelRef.current.visible = !isEntrySideVisible
    }

    if (exitSwapRef.current) {
      exitSwapRef.current.visible = !isEntrySideVisible
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[(rotationX * Math.PI) / 180, (rotationY * Math.PI) / 180, 0]}
    >
      {/* Entry side — green (approach from here) */}
      <mesh
        position={[0, 0, entryZ]}
        onClick={onClick}
        onPointerOver={handleOpeningPointerOver}
        onPointerOut={handleOpeningPointerOut}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={theme.colors.indicatorEntryPlane}
          transparent
          opacity={showOpeningHighlight ? openingHoverOpacity : 0.48}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Exit side — red (do not approach from here) */}
      <mesh
        position={[0, 0, exitZ]}
        onClick={onClick}
        onPointerOver={handleOpeningPointerOver}
        onPointerOut={handleOpeningPointerOut}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={theme.colors.indicatorExitPlane}
          transparent
          opacity={showOpeningHighlight ? openingHoverOpacity : 0.48}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {label && (
        <>
          <group ref={entryLabelRef} position={[0, 0, entryLabelZ]} rotation={[0, entryLabelRotationY, 0]}>
            <Text
              color={labelEntryColor}
              fontSize={fontSize}
              maxWidth={width * 0.78}
              lineHeight={0.9}
              anchorX="center"
              anchorY="middle"
              outlineWidth={labelOutlineWidth}
              outlineColor={labelEntryOutlineColor}
              fillOpacity={labelFillOpacity}
              material-side={THREE.FrontSide}
              renderOrder={2}
              onClick={onLabelClick ?? onClick}
              onPointerOver={handleLabelPointerOver}
              onPointerOut={handleLabelPointerOut}
            >
              {label}
            </Text>
          </group>

          <group ref={exitLabelRef} position={[0, 0, exitLabelZ]} rotation={[0, exitLabelRotationY, 0]}>
            <Text
              color={labelExitColor}
              fontSize={fontSize}
              maxWidth={width * 0.78}
              lineHeight={0.9}
              anchorX="center"
              anchorY="middle"
              outlineWidth={labelOutlineWidth}
              outlineColor={labelExitOutlineColor}
              fillOpacity={labelFillOpacity}
              material-side={THREE.FrontSide}
              renderOrder={2}
              onClick={onLabelClick ?? onClick}
              onPointerOver={handleLabelPointerOver}
              onPointerOut={handleLabelPointerOut}
            >
              {label}
            </Text>
          </group>
        </>
      )}

      {showSwapIcon && (
        <>
          <group ref={entrySwapRef} position={[width * 0.32, height * 0.32, swapIconEntryZ]} rotation={[0, swapIconEntryRotationY, 0]}>
            {renderSwapBadge()}
          </group>

          <group ref={exitSwapRef} position={[width * 0.32, height * 0.32, swapIconExitZ]} rotation={[0, swapIconExitRotationY, 0]}>
            {renderSwapBadge()}
          </group>
        </>
      )}
    </group>
  )
}
