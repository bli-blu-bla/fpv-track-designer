import type { GateType } from './gate'

/** Background, light and gate palette of the scene. */
export const SKY_IDS = ['day', 'dusk', 'night', 'studio'] as const
export type SkyId = (typeof SKY_IDS)[number]

/** Field surface. */
export const GROUND_IDS = ['grass', 'hall', 'asphalt'] as const
export type GroundId = (typeof GROUND_IDS)[number]

/** Renderer cost: shadows, environment lighting, antialiasing, pixel ratio. */
export const QUALITY_IDS = ['simple', 'realistic'] as const
export type QualityId = (typeof QUALITY_IDS)[number]

export interface SceneLookSettings {
  sky: SkyId
  ground: GroundId
  quality: QualityId
}

/** Pre-2.1 `config.theme` values and the look they correspond to. */
export const LEGACY_THEME_LOOKS = {
  minimal: { sky: 'day', quality: 'simple' },
  realistic: { sky: 'day', quality: 'realistic' },
  night: { sky: 'night', quality: 'realistic' },
} as const satisfies Record<string, Omit<SceneLookSettings, 'ground'>>

export type LegacyThemeId = keyof typeof LEGACY_THEME_LOOKS

export const DEFAULT_SCENE_LOOK: SceneLookSettings = { sky: 'day', ground: 'grass', quality: 'simple' }

/**
 * Theme color contract.
 *
 * Resolved by `getSceneLook()` from a sky, a ground and a quality preset. Consumers:
 * - Sky/fog/light values: `src/scene/Scene.tsx`
 * - Ground/grid values: `src/scene/Grid.tsx`
 * - Gate/emissive values: `src/core/theme/themeColors.ts` and the gate components
 *
 * The night sky renders the field unlit (`unlitGround`), so its `groundSurface` is
 * shown as authored instead of being dimmed by low light, tone mapping or fog.
 */
export interface ThemeColors {
  // Sky / Background
  skyTop: string
  skyMid: string
  skyHorizon: string
  skyBottom: string
  skySun: string

  // Fog
  fogColor: string
  fogNear: number
  fogFar: number

  // Lighting
  hemisphereSky: string
  hemisphereGround: string
  hemisphereIntensity: number
  sunColor: string
  sunIntensity: number
  sunPosition: [number, number, number]
  fillColor: string
  fillIntensity: number
  fillPosition: [number, number, number]
  ambientColor: string
  ambientIntensity: number

  // Ground / Grid
  groundSurface: string
  /** Procedural surface texture; when set, `groundTint` multiplies it instead of `groundSurface`. */
  groundPattern?: 'parquet'
  groundTint?: string
  /** Sports-hall court lines painted on the floor. */
  courtLines?: { main: string; accent: string }
  groundEarth: string
  groundBoundary: string
  gridColor: string
  watermarkColor: string

  // Flight path
  flightPath: string

  // Gate colors per gate type
  gates: Record<GateType, { normal: string; selected: string }>

  // Selection highlight
  selectionEmissive: string
  selectionEmissiveIntensity: number
  gateEmissiveIntensity?: number
  gateEmissiveIntensities?: Partial<Record<GateType, number>>

  // Entry/Exit indicators
  indicatorEntryPlane: string
  indicatorExitPlane: string
  indicatorEntryLabel: string
  indicatorExitLabel: string
  indicatorEntryOutline: string
  indicatorExitOutline: string
}

type EnvironmentPreset = 'sunset' | 'night' | 'studio' | 'dawn'

/** Fully resolved scene appearance consumed by `src/scene`. */
export interface ThemeConfig {
  // Renderer
  dpr: [number, number]
  antialias: boolean
  toneMappingExposure: number
  shadows: boolean

  // Scene composition
  background: 'dome' | 'stars' | 'flat'
  sunGlow: boolean
  environment: { preset: EnvironmentPreset; intensity: number } | null
  bloom: boolean
  unlitGround: boolean

  colors: ThemeColors
}

type GroundColors = Pick<ThemeColors, 'groundSurface' | 'groundEarth' | 'groundBoundary' | 'gridColor' | 'watermarkColor' | 'groundPattern' | 'courtLines'>
type SkyColors = Omit<ThemeColors, keyof GroundColors>

export interface SkyPreset {
  background: ThemeConfig['background']
  toneMappingExposure: number
  /** Environment map used by the realistic quality. */
  environment: ThemeConfig['environment']
  sunGlow: boolean
  bloom: boolean
  unlitGround: boolean
  /** Neon skies replace the ground's line colors; the surface is darkened instead. */
  groundOverride?: Partial<GroundColors> & { surfaceShade: number }
  colors: SkyColors
}

const STANDARD_GATES: ThemeColors['gates'] = {
  'standard': { normal: '#1F7AEC', selected: '#4A9CFF' },
  'h-gate': { normal: '#E63946', selected: '#F46A75' },
  'double-h': { normal: '#9333EA', selected: '#B560F5' },
  'hurdle': { normal: '#22C55E', selected: '#4ADE80' },
  'dive': { normal: '#EC4899', selected: '#F472B6' },
  'double': { normal: '#FACC15', selected: '#FDE047' },
  'ladder': { normal: '#F97316', selected: '#FB923C' },
  'start-finish': { normal: '#F5F5F5', selected: '#F5F5F5' },
  'flag': { normal: '#DC2626', selected: '#EF4444' },
  'flag-small': { normal: '#DC2626', selected: '#EF4444' },
  'octagonal-tunnel': { normal: '#06B6D4', selected: '#22D3EE' },
}

const STANDARD_INDICATORS = {
  indicatorEntryPlane: '#16a34a',
  indicatorExitPlane: '#ef4444',
  indicatorEntryLabel: '#86efac',
  indicatorExitLabel: '#fca5a5',
  indicatorEntryOutline: '#4ade80',
  indicatorExitOutline: '#f87171',
} satisfies Partial<ThemeColors>

export const SKY_PRESETS: Record<SkyId, SkyPreset> = {
  day: {
    background: 'dome',
    toneMappingExposure: 1.05,
    environment: { preset: 'sunset', intensity: 0.4 },
    sunGlow: true,
    bloom: false,
    unlitGround: false,
    colors: {
      skyTop: '#C8E2EE',
      skyMid: '#A8C9DC',
      skyHorizon: '#82ACC8',
      skyBottom: '#5F8BAA',
      skySun: '#F4DCA8',
      fogColor: '#AFCBDC',
      fogNear: 160,
      fogFar: 380,
      hemisphereSky: '#D6E7EE',
      hemisphereGround: '#4C8B38',
      hemisphereIntensity: 0.72,
      sunColor: '#FFF0C8',
      sunIntensity: 1.4,
      sunPosition: [80, 110, 60],
      fillColor: '#B8CBD8',
      fillIntensity: 0.4,
      fillPosition: [-60, 40, -40],
      ambientColor: '#FFFDF6',
      ambientIntensity: 0.28,
      flightPath: '#FF8B5A',
      gates: STANDARD_GATES,
      selectionEmissive: '#FFD27A',
      selectionEmissiveIntensity: 0.8,
      ...STANDARD_INDICATORS,
    },
  },
  dusk: {
    background: 'dome',
    toneMappingExposure: 1,
    environment: { preset: 'sunset', intensity: 0.5 },
    sunGlow: true,
    bloom: false,
    unlitGround: false,
    colors: {
      skyTop: '#2B3655',
      skyMid: '#4A4F75',
      skyHorizon: '#D9875E',
      skyBottom: '#1C2333',
      skySun: '#FFB070',
      fogColor: '#5C5675',
      fogNear: 120,
      fogFar: 360,
      hemisphereSky: '#9A92C0',
      hemisphereGround: '#3A2E2A',
      hemisphereIntensity: 0.55,
      sunColor: '#FFB27A',
      sunIntensity: 1.5,
      sunPosition: [70, 18, -50],
      fillColor: '#6C7BB0',
      fillIntensity: 0.35,
      fillPosition: [-50, 30, 40],
      ambientColor: '#FFE2CC',
      ambientIntensity: 0.24,
      flightPath: '#FFD166',
      gates: STANDARD_GATES,
      selectionEmissive: '#FFD27A',
      selectionEmissiveIntensity: 0.9,
      ...STANDARD_INDICATORS,
    },
  },
  night: {
    background: 'stars',
    toneMappingExposure: 0.9,
    environment: { preset: 'night', intensity: 0.15 },
    sunGlow: false,
    bloom: true,
    unlitGround: true,
    groundOverride: { surfaceShade: 0.72, groundBoundary: '#FF00E5', gridColor: '#C4B5FD', watermarkColor: '#6D28D9' },
    colors: {
      skyTop: '#050510',
      skyMid: '#060618',
      skyHorizon: '#0A0A20',
      skyBottom: '#020208',
      skySun: '#000000',
      fogColor: '#050510',
      fogNear: 60,
      fogFar: 300,
      hemisphereSky: '#0D0D28',
      hemisphereGround: '#0A0A0A',
      hemisphereIntensity: 0.15,
      sunColor: '#1A1A3A',
      sunIntensity: 0.15,
      sunPosition: [0, 60, 0],
      fillColor: '#0A0A20',
      fillIntensity: 0.1,
      fillPosition: [-30, 30, 30],
      ambientColor: '#1A1A3A',
      ambientIntensity: 0.1,
      flightPath: '#FFEA00',
      // Neon gate colors — vibrant, high saturation
      gates: {
        'standard': { normal: '#00E5FF', selected: '#80F0FF' },
        'h-gate': { normal: '#FF1744', selected: '#FF616F' },
        'double-h': { normal: '#D500F9', selected: '#EA80FC' },
        'hurdle': { normal: '#34D399', selected: '#6EE7B7' },
        'dive': { normal: '#FF4081', selected: '#FF80AB' },
        'double': { normal: '#FFEA00', selected: '#FFFF8D' },
        'ladder': { normal: '#FF9100', selected: '#FFB74D' },
        'start-finish': { normal: '#E0E0E0', selected: '#FFFFFF' },
        'flag': { normal: '#FF3D00', selected: '#FF6E40' },
        'flag-small': { normal: '#FF3D00', selected: '#FF6E40' },
        'octagonal-tunnel': { normal: '#00E676', selected: '#69F0AE' },
      },
      selectionEmissive: '#FFFFFF',
      selectionEmissiveIntensity: 3.0,
      gateEmissiveIntensity: 2.4,
      gateEmissiveIntensities: {
        'standard': 1.55,
        'h-gate': 3.9,
        'double-h': 4.3,
        'hurdle': 1.1,
        'dive': 2.8,
        'double': 1.35,
        'ladder': 1.9,
        'start-finish': 1.4,
        'flag': 3.6,
        'flag-small': 3.6,
        'octagonal-tunnel': 1.25,
      },
      indicatorEntryPlane: '#00E676',
      indicatorExitPlane: '#FF1744',
      indicatorEntryLabel: '#69F0AE',
      indicatorExitLabel: '#FF616F',
      indicatorEntryOutline: '#00E676',
      indicatorExitOutline: '#FF1744',
    },
  },
  studio: {
    background: 'flat',
    toneMappingExposure: 1,
    environment: { preset: 'studio', intensity: 0.6 },
    sunGlow: false,
    bloom: false,
    unlitGround: false,
    colors: {
      skyTop: '#18181B',
      skyMid: '#18181B',
      skyHorizon: '#18181B',
      skyBottom: '#18181B',
      skySun: '#18181B',
      fogColor: '#18181B',
      fogNear: 140,
      fogFar: 420,
      hemisphereSky: '#FFFFFF',
      hemisphereGround: '#3F3F46',
      hemisphereIntensity: 0.8,
      sunColor: '#FFFFFF',
      sunIntensity: 1.2,
      sunPosition: [40, 80, 30],
      fillColor: '#E4E4E7',
      fillIntensity: 0.5,
      fillPosition: [-50, 40, -30],
      ambientColor: '#FFFFFF',
      ambientIntensity: 0.32,
      flightPath: '#F59E0B',
      gates: STANDARD_GATES,
      selectionEmissive: '#FFD27A',
      selectionEmissiveIntensity: 0.8,
      ...STANDARD_INDICATORS,
    },
  },
}

export const GROUND_PRESETS: Record<GroundId, GroundColors> = {
  grass: {
    groundSurface: '#6F8732',
    groundEarth: '#7A4A24',
    groundBoundary: '#FFE8C8',
    gridColor: '#8B6B3E',
    watermarkColor: '#e8d5b0',
  },
  // Gym floor: light oak herringbone parquet with handball court lines.
  hall: {
    groundSurface: '#A56D3A',
    groundPattern: 'parquet',
    groundEarth: '#5A3A1E',
    groundBoundary: '#18181B',
    gridColor: '#3F3F46',
    watermarkColor: '#8A5A2B',
    courtLines: { main: '#18181B', accent: '#E4572E' },
  },
  asphalt: {
    groundSurface: '#3A3A40',
    groundEarth: '#27272A',
    groundBoundary: '#F5F5F5',
    gridColor: '#71717A',
    watermarkColor: '#52525B',
  },
}

export const QUALITY_PRESETS: Record<QualityId, Pick<ThemeConfig, 'dpr' | 'antialias' | 'shadows'> & { environment: boolean; sunGlow: boolean }> = {
  simple: { dpr: [1, 1], antialias: false, shadows: false, environment: false, sunGlow: false },
  realistic: { dpr: [1, 2], antialias: true, shadows: true, environment: true, sunGlow: true },
}
