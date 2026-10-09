import { createContext, useContext } from 'react'
import type { ThemeConfig } from '@/core/types'
import { DEFAULT_THEME } from '@/core/types'
import { getThemeConfig } from '@/core/theme/themeColors'

// Provided inside the Canvas by `Scene` from the rendered config, so editor and viewer each get their own theme.
export const SceneThemeContext = createContext<ThemeConfig>(getThemeConfig(DEFAULT_THEME))

export function useSceneTheme(): ThemeConfig {
  return useContext(SceneThemeContext)
}
