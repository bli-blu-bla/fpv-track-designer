import { useEffect, useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { isCameraTouchGesture } from './pointer'
import { getParquetTexture, PARQUET_TILE_METERS } from './parquetTexture'
import { CourtMarkings } from './CourtMarkings'
import type { ThemeColors } from '@/core/types/theme'

interface GridProps {
  fieldSize?: { width: number; height: number }
  colors: ThemeColors
  showGrid: boolean
  // Used by themes whose field color must bypass scene lighting/tone mapping/fog.
  useUnlitGround?: boolean
  /** Click on empty ground (editor: clear selection). */
  onGroundClick?: () => void
}

export function Grid({ fieldSize = { width: 100, height: 100 }, colors, showGrid, useUnlitGround = false, onGroundClick }: GridProps) {
  const halfW = fieldSize.width / 2
  const halfH = fieldSize.height / 2
  const watermarkSize = Math.max(6, Math.min(fieldSize.width / 5.2, fieldSize.height * 0.32))
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

  // One shared canvas image; each field size gets its own clone for the repeat.
  const surfaceTexture = useMemo(() => {
    if (colors.groundPattern !== 'parquet') return null

    const texture = getParquetTexture().clone()
    texture.repeat.set(fieldSize.width / PARQUET_TILE_METERS, fieldSize.height / PARQUET_TILE_METERS)
    texture.needsUpdate = true
    return texture
  }, [colors.groundPattern, fieldSize.width, fieldSize.height])
  const surfaceColor = surfaceTexture ? colors.groundTint ?? '#ffffff' : colors.groundSurface
  useEffect(() => () => surfaceTexture?.dispose(), [surfaceTexture])
  // three.js only recompiles a material's shader when `needsUpdate` is set; adding or removing a map
  // in place leaves the old shader (and pattern) active, so a new material is created instead.
  const materialKey = surfaceTexture ? `textured:${surfaceTexture.uuid}` : 'plain'

  const handleGroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isCameraTouchGesture(e)) return
    onGroundClick?.()
  }

  return (
    <group>
      {/* Earth-toned underside makes the floating field read like soil from the side. */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[fieldSize.width, 0.1, fieldSize.height]} />
        <meshStandardMaterial color={colors.groundEarth} roughness={0.94} metalness={0} />
      </mesh>

      {/* Ground plane. Colors and pattern come from the resolved scene look; do not read the store here. */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        receiveShadow
        onClick={handleGroundClick}
      >
        <planeGeometry args={[fieldSize.width, fieldSize.height]} />
        {useUnlitGround ? (
          <meshBasicMaterial key={materialKey} color={surfaceColor} map={surfaceTexture} toneMapped={false} fog={false} />
        ) : (
          <meshStandardMaterial
            key={materialKey}
            color={surfaceColor}
            map={surfaceTexture}
            roughness={surfaceTexture ? 0.7 : 0.95}
            metalness={0}
          />
        )}
      </mesh>

      {colors.courtLines && <CourtMarkings fieldSize={fieldSize} lines={colors.courtLines} unlit={useUnlitGround} />}

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
