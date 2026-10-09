import { useCallback } from 'react'
import type { GateType } from '@/core/types'
import { getThemeConfig } from '@/core/theme/themeColors'
import { useAppStore } from '@/editor/store'

/** Gate color of the active scene theme, so UI swatches match the 3D gates. */
export function useGateUiColor() {
  const themeId = useAppStore((state) => state.config.theme)

  return useCallback((type: GateType) => getThemeConfig(themeId).colors.gates[type].normal, [themeId])
}
