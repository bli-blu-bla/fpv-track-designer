import { useAppStore } from '@/editor/store'
import { THEME_IDS, THEME_PRESETS, type ThemeId } from '@/core/types'
import { cn } from '@/lib/utils'
import { useTranslation, type TranslationKey } from '@/i18n'

const THEME_TEXT: Record<ThemeId, { label: TranslationKey; description: TranslationKey }> = {
  minimal: { label: 'themeMinimal', description: 'themeMinimalDescription' },
  realistic: { label: 'themeRealistic', description: 'themeRealisticDescription' },
  night: { label: 'themeNight', description: 'themeNightDescription' },
}

export function ThemeConfigPanel() {
  const { t } = useTranslation()
  const activeTheme = useAppStore((state) => state.config.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">{t('visualAppearance')}</h3>
      <div className="grid gap-2">
        {THEME_IDS.map((id) => {
          const isSelected = activeTheme === id
          const { skyTop, skyHorizon, groundGrass } = THEME_PRESETS[id].colors

          return (
            <button
              key={id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setTheme(id)}
              className={cn(
                'flex flex-col gap-2 rounded-lg border p-1.5 text-left transition-colors',
                isSelected ? 'border-foreground' : 'border-border hover:border-ring',
              )}
            >
              <span
                aria-hidden="true"
                className="h-11 rounded-[5px]"
                style={{ background: `linear-gradient(${skyTop} 0%, ${skyHorizon} 62%, ${groundGrass} 62%)` }}
              />
              <span className="flex flex-col gap-0.5 px-1 pb-1">
                <span className="text-xs font-medium">{t(THEME_TEXT[id].label)}</span>
                <span className="text-[11px] leading-snug text-subtle-foreground">{t(THEME_TEXT[id].description)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
