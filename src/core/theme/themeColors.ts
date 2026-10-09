import type { GateType } from '@/core/types/gate'
import type { SceneLookSettings, ThemeColors, ThemeConfig } from '@/core/types/theme'
import { GROUND_PRESETS, QUALITY_PRESETS, SKY_PRESETS } from '@/core/types/theme'

/** Multiplies each RGB channel of a `#rrggbb` color by `factor`. */
export function shadeHex(color: string, factor: number): string {
  const value = Number.parseInt(color.slice(1), 16)
  const channel = (shift: number) => Math.round(((value >> shift) & 0xff) * factor)
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`
}

const lookCache = new Map<string, ThemeConfig>()

/** Combines sky, ground and quality presets into the scene appearance. Results are cached per combination. */
export function getSceneLook({ sky, ground, quality }: SceneLookSettings): ThemeConfig {
  const key = `${sky}:${ground}:${quality}`
  const cached = lookCache.get(key)
  if (cached) return cached

  const skyPreset = SKY_PRESETS[sky]
  const groundPreset = GROUND_PRESETS[ground]
  const qualityPreset = QUALITY_PRESETS[quality]
  const override = skyPreset.groundOverride
  const { surfaceShade, ...lineOverrides } = override ?? { surfaceShade: 1 }

  const look: ThemeConfig = {
    dpr: qualityPreset.dpr,
    antialias: qualityPreset.antialias,
    shadows: qualityPreset.shadows,
    toneMappingExposure: skyPreset.toneMappingExposure,
    background: skyPreset.background,
    sunGlow: qualityPreset.sunGlow && skyPreset.sunGlow,
    environment: qualityPreset.environment ? skyPreset.environment : null,
    bloom: skyPreset.bloom,
    unlitGround: skyPreset.unlitGround,
    colors: {
      ...skyPreset.colors,
      ...groundPreset,
      ...lineOverrides,
      groundSurface: surfaceShade === 1 ? groundPreset.groundSurface : shadeHex(groundPreset.groundSurface, surfaceShade),
      groundTint: shadeHex('#ffffff', surfaceShade),
    } satisfies ThemeColors,
  }

  lookCache.set(key, look)
  return look
}

/** Gate frame color + selection emissive for a given theme / gate type / selection state */
export function getGateColors(colors: ThemeColors, gateType: GateType, isSelected: boolean) {
  const gate = colors.gates[gateType] ?? colors.gates['standard']
  const color = isSelected ? gate.selected : gate.normal
  const gateEmissiveIntensity = colors.gateEmissiveIntensities?.[gateType] ?? colors.gateEmissiveIntensity ?? 0

  return {
    color,
    emissiveColor: gateEmissiveIntensity > 0 ? color : (isSelected ? colors.selectionEmissive : '#000000'),
    emissiveIntensity: gateEmissiveIntensity > 0
      ? Math.max(gateEmissiveIntensity, isSelected ? colors.selectionEmissiveIntensity : 0)
      : (isSelected ? colors.selectionEmissiveIntensity : 0),
  }
}

/** Flag pole color — always brown, same across all themes */
export function getFlagPoleColor(): string {
  return '#5C4033'
}

/** Start/Finish text color — always dark, same across all themes */
export function getStartFinishTextColor(): string {
  return '#111827'
}
