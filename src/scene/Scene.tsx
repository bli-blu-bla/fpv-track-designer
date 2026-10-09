import { useMemo, useRef, type ComponentType } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { ACESFilmicToneMapping, AdditiveBlending, CanvasTexture, MOUSE } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { buildDefaultGateSequenceEntries } from '@/core/gates/gateSequence'
import { getThemeConfig } from '@/core/theme/themeColors'
import { Gate, type SceneGateProps } from './gates/Gate'
import { SceneThemeContext } from './SceneTheme'
import { FlightPath } from './FlightPath'
import { Grid } from './Grid'
import { CameraPan } from './CameraPan'
import { CameraVerticalPan } from './CameraVerticalPan'
import { SmoothZoom } from './SmoothZoom'
import { SkyDome } from './SkyDome'
import { FpvFlyThrough } from './FpvFlyThrough'
import type { Config, Track } from '@/core/types'
import { calculateFlightPath } from '@/core/track/flightPath'

interface SceneProps {
  track: Track | null
  config: Config
  /** Renders each gate; defaults to the read-only `Gate`. The editor passes its interactive wrapper. */
  gateComponent?: ComponentType<SceneGateProps>
  /** Click on empty ground. */
  onGroundClick?: () => void
  fpvModeActive?: boolean
  onFpvComplete?: () => void
}

/**
 * The single R3F Canvas for editor and viewer. Renders whatever track/config it
 * is given and never reads an app store, so it stays usable read-only.
 */
export function Scene({ track: currentTrack, config, gateComponent: GateView = Gate, onGroundClick, fpvModeActive = false, onFpvComplete }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const theme = useMemo(() => getThemeConfig(config.theme), [config.theme])
  const usesMinimalScene = theme.useSkyDome
  const flightPath = useMemo(() => {
    if (!currentTrack) return null
    return calculateFlightPath(currentTrack.gates, currentTrack.gateSequence)
  }, [currentTrack])

  const sunGlowTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256

    const center = canvas.width / 2

    const context = canvas.getContext('2d')
    if (context) {
      context.globalCompositeOperation = 'lighter'

      const drawRay = (rotation: number, length: number, width: number, opacity: number) => {
        context.save()
        context.translate(center, center)
        context.rotate(rotation)

        const rayGradient = context.createLinearGradient(0, 0, length, 0)
        rayGradient.addColorStop(0, `rgba(255, 248, 176, ${opacity})`)
        rayGradient.addColorStop(0.35, `rgba(255, 202, 88, ${opacity * 0.42})`)
        rayGradient.addColorStop(1, 'rgba(255, 148, 56, 0)')

        context.fillStyle = rayGradient
        context.beginPath()
        context.ellipse(length / 2, 0, length / 2, width, 0, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }

      drawRay(-0.18, 116, 12, 0.28)
      drawRay(Math.PI - 0.18, 116, 12, 0.28)
      drawRay(Math.PI / 2 - 0.12, 96, 9, 0.18)
      drawRay(-Math.PI / 2 - 0.12, 96, 9, 0.18)
      drawRay(Math.PI / 4, 76, 6, 0.13)
      drawRay(-Math.PI / 4, 76, 6, 0.13)
      drawRay((Math.PI * 3) / 4, 76, 6, 0.13)
      drawRay((-Math.PI * 3) / 4, 76, 6, 0.13)

      const gradient = context.createRadialGradient(center, center, 2, center, center, center)
      gradient.addColorStop(0, 'rgba(255, 255, 210, 1)')
      gradient.addColorStop(0.08, 'rgba(255, 245, 150, 0.96)')
      gradient.addColorStop(0.22, 'rgba(255, 202, 88, 0.58)')
      gradient.addColorStop(0.52, 'rgba(255, 150, 66, 0.22)')
      gradient.addColorStop(1, 'rgba(255, 105, 36, 0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)
    }

    return new CanvasTexture(canvas)
  }, [])

  const gateLabels = useMemo(() => {
    if (!currentTrack) return new Map<string, Record<string, string>>()

    const labelsByGate = new Map<string, Record<string, string>>()
    const sequence = currentTrack.gateSequence.length > 0
      ? currentTrack.gateSequence
      : currentTrack.gates.flatMap(buildDefaultGateSequenceEntries)

    for (const [index, entry] of sequence.entries()) {
      const gateLabelMap = labelsByGate.get(entry.gateId) ?? {}
      gateLabelMap[entry.openingId] = String(index + 1)
      labelsByGate.set(entry.gateId, gateLabelMap)
    }

    currentTrack.gates.forEach((gate, index) => {
      if (labelsByGate.has(gate.id)) return

      const openingId = gate.openings[0]?.id
      if (!openingId) return

      labelsByGate.set(gate.id, { [openingId]: String(index + 1) })
    })

    return labelsByGate
  }, [currentTrack])

  const trackContent = currentTrack ? (
    <>
      {currentTrack.gates.map((gate) => (
        <GateView
          key={gate.id}
          gate={gate}
          openingLabels={config.showOpeningLabels ? gateLabels.get(gate.id) : undefined}
          showOpeningLabels={config.showOpeningLabels}
        />
      ))}
      {config.showFlightPath && <FlightPath gates={currentTrack.gates} gateSequence={currentTrack.gateSequence} />}
    </>
  ) : null

  const cameraControls = (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        enableZoom={false}
        enablePan={false}
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
        }}
        maxPolarAngle={Math.PI / 2.1}
        enabled={!fpvModeActive}
      />
      {!fpvModeActive && <CameraPan controlsRef={controlsRef} />}
      {!fpvModeActive && <CameraVerticalPan controlsRef={controlsRef} />}
      {!fpvModeActive && <SmoothZoom controlsRef={controlsRef} />}
      <FpvFlyThrough
        active={fpvModeActive}
        points={flightPath?.sampledPoints ?? []}
        controlsRef={controlsRef}
        onComplete={onFpvComplete ?? (() => undefined)}
      />
    </>
  )

  return (
    <Canvas
      dpr={theme.dpr}
      gl={{
        antialias: theme.antialias,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: theme.toneMappingExposure,
      }}
      shadows={theme.useShadows}
      camera={{ position: [0, 30, 30], fov: 50, near: 0.1, far: 1000 }}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <SceneThemeContext.Provider value={theme}>
      {/* ── MINIMAL THEMES ──────────────────────────────────────────────────── */}
      {usesMinimalScene && (
        <>
          <SkyDome
            topColor={theme.colors.skyTop}
            midColor={theme.colors.skyMid}
            horizonColor={theme.colors.skyHorizon}
            bottomColor={theme.colors.skyBottom}
            sunColor={theme.colors.skySun}
          />
          <fog attach="fog" args={[theme.colors.fogColor, theme.colors.fogNear, theme.colors.fogFar]} />
          <hemisphereLight args={[theme.colors.hemisphereSky, theme.colors.hemisphereGround, theme.colors.hemisphereIntensity]} />
          <directionalLight
            position={theme.colors.sunPosition}
            intensity={theme.colors.sunIntensity}
            color={theme.colors.sunColor}
          />
          <directionalLight
            position={theme.colors.fillPosition}
            intensity={theme.colors.fillIntensity}
            color={theme.colors.fillColor}
          />
          <ambientLight intensity={theme.colors.ambientIntensity} color={theme.colors.ambientColor} />
          <Grid fieldSize={config.fieldSize} colors={theme.colors} showGrid={config.showGrid} onGroundClick={onGroundClick} />
          {trackContent}
          {cameraControls}
        </>
      )}

      {/* ── REALISTIC THEME ──────────────────────────────────────────────────── */}
      {theme.id === 'realistic' && (
        <>
          <SkyDome
            topColor={theme.colors.skyTop}
            midColor={theme.colors.skyMid}
            horizonColor={theme.colors.skyHorizon}
            bottomColor={theme.colors.skyBottom}
            sunColor={theme.colors.skySun}
          />
          <group position={[82, 20, -66]}>
            <sprite scale={[48, 48, 1]} renderOrder={2}>
              <spriteMaterial map={sunGlowTexture} transparent opacity={0.95} depthTest={false} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite scale={[24, 24, 1]} renderOrder={3}>
              <spriteMaterial map={sunGlowTexture} transparent opacity={0.55} depthTest={false} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
            </sprite>
            <mesh renderOrder={4}>
              <sphereGeometry args={[4.8, 32, 32]} />
              <meshBasicMaterial color="#FFF2A6" toneMapped={false} depthTest={false} depthWrite={false} fog={false} />
            </mesh>
          </group>
          <Environment preset={theme.environmentPreset as 'sunset' | 'night'} environmentIntensity={theme.environmentIntensity} />
          <fog attach="fog" args={[theme.colors.fogColor, theme.colors.fogNear, theme.colors.fogFar]} />
          <hemisphereLight args={[theme.colors.hemisphereSky, theme.colors.hemisphereGround, theme.colors.hemisphereIntensity]} />
          <directionalLight
            position={theme.colors.sunPosition}
            intensity={theme.colors.sunIntensity}
            color={theme.colors.sunColor}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={200}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
            shadow-bias={-0.00015}
            shadow-normalBias={0.02}
          />
          <directionalLight
            position={theme.colors.fillPosition}
            intensity={theme.colors.fillIntensity}
            color={theme.colors.fillColor}
          />
          <ambientLight intensity={theme.colors.ambientIntensity} color={theme.colors.ambientColor} />
          <Grid fieldSize={config.fieldSize} colors={theme.colors} showGrid={config.showGrid} onGroundClick={onGroundClick} />
          {trackContent}
          {cameraControls}
        </>
      )}

      {/* ── NIGHT THEME ─────────────────────────────────────────────────────── */}
      {theme.id === 'night' && (
        <>
          <color attach="background" args={[theme.colors.skyTop]} />
          <Stars radius={100} depth={60} count={4000} factor={3} saturation={0} fade speed={0.5} />
          <Environment preset={theme.environmentPreset as 'sunset' | 'night'} environmentIntensity={theme.environmentIntensity} />
          <fog attach="fog" args={[theme.colors.fogColor, theme.colors.fogNear, theme.colors.fogFar]} />
          <hemisphereLight args={[theme.colors.hemisphereSky, theme.colors.hemisphereGround, theme.colors.hemisphereIntensity]} />
          <directionalLight
            position={theme.colors.sunPosition}
            intensity={theme.colors.sunIntensity}
            color={theme.colors.sunColor}
          />
          <directionalLight
            position={theme.colors.fillPosition}
            intensity={theme.colors.fillIntensity}
            color={theme.colors.fillColor}
          />
          <ambientLight intensity={theme.colors.ambientIntensity} color={theme.colors.ambientColor} />
          {/* Night field colors use the unlit Grid path so ThemeColors.groundGrass is visible as authored. */}
          <Grid fieldSize={config.fieldSize} colors={theme.colors} showGrid={config.showGrid} useUnlitGround onGroundClick={onGroundClick} />
          {currentTrack && (
            <EffectComposer>
              <Bloom mipmapBlur intensity={1.6} luminanceThreshold={1} luminanceSmoothing={0.2} />
            </EffectComposer>
          )}
          {trackContent}
          {cameraControls}
        </>
      )}
      </SceneThemeContext.Provider>
    </Canvas>
  )
}
