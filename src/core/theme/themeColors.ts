import type { GateType } from '@/core/types/gate'
import type { ThemeColors, ThemeConfig } from '@/core/types/theme'
import { THEME_PRESETS } from '@/core/types/theme'

/** Resolve the active ThemeConfig from a ThemeId */
export function getThemeConfig(themeId: string): ThemeConfig {
  return THEME_PRESETS[themeId as keyof typeof THEME_PRESETS] ?? THEME_PRESETS.minimal
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
