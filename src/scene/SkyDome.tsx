import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { BackSide, Color, ShaderMaterial, Vector3 } from 'three'

const TOP_COLOR = '#9CCFEA'
const MID_COLOR = '#5FADE0'
const HORIZON_COLOR = '#347CC3'
const BOTTOM_COLOR = '#1F4E8F'
const SUN_COLOR = '#F4DCA8'
const HORIZON_OFFSET = 0.16
const HAZE_SOFTNESS = 0.16
const BELOW_HORIZON_SOFTNESS = 0.72
const RADIUS = 600
const SEGMENTS = 64
const SUN_DIRECTION = new Vector3(-0.38, 0.58, -0.72).normalize()

// Local-space gradient: each vertex of the sphere knows its own position,
// which directly tells us its altitude relative to the dome center. By
// keeping the dome glued to the camera, "altitude relative to dome" maps
// to "altitude relative to viewer", giving a stable gradient regardless of
// camera tilt or position.
const VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 midColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  uniform vec3 sunColor;
  uniform vec3 sunDirection;
  uniform float exponent;
  uniform float horizonOffset;
  uniform float hazeSoftness;
  uniform float belowHorizonSoftness;
  varying vec3 vLocal;

  void main() {
    vec3 direction = normalize(vLocal);
    // h: 1 = zenith, 0 = horizon, negative = below horizon.
    // A positive offset pushes the visible horizon band lower in the view,
    // leaving more mid-sky above the field before the pale horizon starts.
    float h = direction.y + horizonOffset;
    float t = pow(clamp(h, 0.0, 1.0), exponent);
    // Horizon haze band that fades into the mid sky, then blends into the
    // deep zenith. Themes can widen this band to avoid a hard sky/ground seam.
    float haze = 1.0 - smoothstep(0.0, hazeSoftness, clamp(h, 0.0, 1.0));
    vec3 lower = mix(midColor, horizonColor, haze);
    vec3 sky = mix(lower, topColor, t);
    float belowHorizon = smoothstep(0.0, belowHorizonSoftness, clamp(-h, 0.0, 1.0));
    sky = mix(sky, bottomColor, belowHorizon);

    float sunAmount = max(dot(direction, sunDirection), 0.0);
    float sunDisk = smoothstep(0.9975, 0.9996, sunAmount);
    float sunGlow = pow(sunAmount, 32.0) * 0.32 + pow(sunAmount, 160.0) * 0.42;
    float horizonWarmth = pow(sunAmount, 6.0) * smoothstep(-0.1, 0.5, direction.y) * 0.16;
    sky = mix(sky, sunColor, clamp(sunGlow + horizonWarmth, 0.0, 0.62));
    sky += sunColor * sunDisk * 0.7;

    gl_FragColor = vec4(sky, 1.0);
  }
`

interface SkyDomeProps {
  topColor?: string
  midColor?: string
  horizonColor?: string
  bottomColor?: string
  sunColor?: string
  /**
   * Smaller = more of the dome is the deep top color (sharp transition near horizon).
   * Larger = the top color stays close to the zenith (soft, washed gradient).
   */
  exponent?: number
  /** Positive values push the horizon gradient lower in the viewport. */
  horizonOffset?: number
  /** Width of the warm haze band above the mathematical horizon. */
  hazeSoftness?: number
  /** Width of the blend into the lower dome color below the horizon. */
  belowHorizonSoftness?: number
}

export function SkyDome({
  topColor = TOP_COLOR,
  midColor = MID_COLOR,
  horizonColor = HORIZON_COLOR,
  bottomColor = BOTTOM_COLOR,
  sunColor = SUN_COLOR,
  exponent = 0.82,
  horizonOffset = HORIZON_OFFSET,
  hazeSoftness = HAZE_SOFTNESS,
  belowHorizonSoftness = BELOW_HORIZON_SOFTNESS,
}: SkyDomeProps) {
  const meshRef = useRef<Mesh>(null)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          topColor: { value: new Color(topColor) },
          midColor: { value: new Color(midColor) },
          horizonColor: { value: new Color(horizonColor) },
          bottomColor: { value: new Color(bottomColor) },
          sunColor: { value: new Color(sunColor) },
          sunDirection: { value: SUN_DIRECTION },
          exponent: { value: exponent },
          horizonOffset: { value: horizonOffset },
          hazeSoftness: { value: hazeSoftness },
          belowHorizonSoftness: { value: belowHorizonSoftness },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [topColor, midColor, horizonColor, bottomColor, sunColor, exponent, horizonOffset, hazeSoftness, belowHorizonSoftness],
  )

  useEffect(() => () => material.dispose(), [material])

  // Anchor the dome to the camera so the viewer is always at its center.
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position)
    }
  })

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, SEGMENTS, SEGMENTS]} />
    </mesh>
  )
}
