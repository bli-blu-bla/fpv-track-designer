import { createContext, useContext } from 'react'
import type { ThemeConfig } from '@/core/types'
import { DEFAULT_SCENE_LOOK } from '@/core/types'
import { getSceneLook } from '@/core/theme/themeColors'

// Provided inside the Canvas by `Scene` from the rendered config, so editor and viewer each get their own theme.
export const SceneThemeContext = createContext<ThemeConfig>(getSceneLook(DEFAULT_SCENE_LOOK))

export function useSceneTheme(): ThemeConfig {
  return useContext(SceneThemeContext)
}
