import { useCallback } from 'react'
import type { GateType } from '@/core/types'
import { getSceneLook } from '@/core/theme/themeColors'
import { useAppStore } from '@/editor/store'

/** Gate color of the active scene theme, so UI swatches match the 3D gates. */
export function useGateUiColor() {
  const sky = useAppStore((state) => state.config.sky)
  const ground = useAppStore((state) => state.config.ground)
  const quality = useAppStore((state) => state.config.quality)

  return useCallback((type: GateType) => getSceneLook({ sky, ground, quality }).colors.gates[type].normal, [sky, ground, quality])
}
