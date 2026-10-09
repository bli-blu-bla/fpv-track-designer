import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useAppStore } from '@/editor/store'
import type { ThemeColors } from '@/core/types/theme'

function isCameraTouchGesture(e: ThreeEvent<MouseEvent>) {
  const target = e.nativeEvent.target
  if (!(target instanceof HTMLElement)) return false

  const canvas = target.closest('canvas')
  return canvas?.dataset.cameraTouchGesturing === 'true'
}

interface GridProps {
  fieldSize?: { width: number; height: number }
  colors: ThemeColors
  showGrid: boolean
  // Used by themes whose field color must bypass scene lighting/tone mapping/fog.
  useUnlitGround?: boolean
}

export function Grid({ fieldSize = { width: 100, height: 100 }, colors, showGrid, useUnlitGround = false }: GridProps) {
  const halfW = fieldSize.width / 2
  const halfH = fieldSize.height / 2
  const watermarkSize = Math.max(6, Math.min(fieldSize.width / 5.2, fieldSize.height * 0.32))
  const selectGate = useAppStore((state) => state.selectGate)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const gridCellSize = 1
  const sectionSize = 5
  const boundaryThickness = 0.035

  const { cellPositions, sectionPositions } = useMemo(() => {
    const cells: number[] = []
    const sections: number[] = []

    const pushLine = (target: number[], startX: number, startZ: number, endX: number, endZ: number) => {
      target.push(startX, 0, startZ, endX, 0, endZ)
    }

    for (let x = Math.ceil(-halfW); x <= Math.floor(halfW); x += gridCellSize) {
      pushLine(x % sectionSize === 0 ? sections : cells, x, -halfH, x, halfH)
    }

    for (let z = Math.ceil(-halfH); z <= Math.floor(halfH); z += gridCellSize) {
      pushLine(z % sectionSize === 0 ? sections : cells, -halfW, z, halfW, z)
    }

    return {
      cellPositions: new Float32Array(cells),
      sectionPositions: new Float32Array(sections),
    }
  }, [halfH, halfW])

  const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate || isCameraTouchGesture(e)) return
    selectGate(null)
  }

  return (
    <group>
      {/* Earth-toned underside makes the floating field read like soil from the side. */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[fieldSize.width, 0.1, fieldSize.height]} />
        <meshStandardMaterial color={colors.groundEarth} roughness={0.94} metalness={0} />
      </mesh>

      {/* Ground plane - grass. Theme colors come from Scene; do not read the store here. */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleGroundClick}
      >
        <planeGeometry args={[fieldSize.width, fieldSize.height]} />
        {useUnlitGround ? (
          <meshBasicMaterial color={colors.groundGrass} toneMapped={false} fog={false} />
        ) : (
          <meshStandardMaterial color={colors.groundGrass} roughness={0.95} metalness={0} />
        )}
      </mesh>

      {/* Field boundary — always visible, independent from the optional inner grid. */}
      <group position={[0, 0.025, 0]}>
        <mesh position={[0, 0, -halfH]}>
          <boxGeometry args={[fieldSize.width, 0.01, boundaryThickness]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
        <mesh position={[halfW, 0, 0]}>
          <boxGeometry args={[boundaryThickness, 0.01, fieldSize.height]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, halfH]}>
          <boxGeometry args={[fieldSize.width, 0.01, boundaryThickness]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
        <mesh position={[-halfW, 0, 0]}>
          <boxGeometry args={[boundaryThickness, 0.01, fieldSize.height]} />
          <meshBasicMaterial color={colors.groundBoundary} toneMapped={false} />
        </mesh>
      </group>

      {showGrid && (
        <group position={[0, 0.035, 0]} renderOrder={1}>
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[cellPositions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={colors.groundBoundary} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
          </lineSegments>
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[sectionPositions, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color={colors.groundBoundary} transparent opacity={0.46} depthWrite={false} toneMapped={false} />
          </lineSegments>
        </group>
      )}

      {/* Subtle field branding */}
      <Text
        position={[0, 0.025, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={watermarkSize}
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
      >
        #FPVOOE
        <meshBasicMaterial
          color={colors.watermarkColor}
          transparent
          opacity={0.035}
          depthWrite={false}
          toneMapped={false}
        />
      </Text>

    </group>
  )
}
