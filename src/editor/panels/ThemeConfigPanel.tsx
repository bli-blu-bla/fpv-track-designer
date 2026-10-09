import { useAppStore } from '@/editor/store'
import { QUALITY_IDS, SKY_IDS, SKY_PRESETS, type QualityId, type SkyId } from '@/core/types'
import { cn } from '@/lib/utils'
import { useTranslation, type TranslationKey } from '@/i18n'

const SKY_LABELS: Record<SkyId, TranslationKey> = {
  day: 'skyDay',
  dusk: 'skyDusk',
  night: 'skyNight',
  studio: 'skyStudio',
}

const QUALITY_TEXT: Record<QualityId, { label: TranslationKey; description: TranslationKey }> = {
  simple: { label: 'qualitySimple', description: 'qualitySimpleDescription' },
  realistic: { label: 'qualityRealistic', description: 'qualityRealisticDescription' },
}

function skyPreview(sky: SkyId): string {
  const { skyTop, skyHorizon, skyBottom } = SKY_PRESETS[sky].colors
  return sky === 'night'
    ? `radial-gradient(120% 90% at 50% 20%, #27272a 0%, ${skyTop} 70%)`
    : `linear-gradient(${skyTop}, ${skyHorizon} 70%, ${skyBottom})`
}

/** "Darstellung": sky and graphics quality. Both are saved with the track. */
export function ThemeConfigPanel() {
  const { t } = useTranslation()
  const sky = useAppStore((state) => state.config.sky)
  const quality = useAppStore((state) => state.config.quality)
  const setSceneLook = useAppStore((state) => state.setSceneLook)

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">{t('sceneLabel')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {SKY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={sky === id}
              onClick={() => setSceneLook({ sky: id })}
              className={cn(
                'flex flex-col gap-1.5 rounded-lg border p-1.5 text-left text-xs transition-colors',
                sky === id ? 'border-foreground' : 'border-border hover:border-ring',
              )}
            >
              <span aria-hidden="true" className="h-11 rounded-[5px]" style={{ background: skyPreview(id) }} />
              <span className="px-1 pb-0.5">{t(SKY_LABELS[id])}</span>
            </button>
          ))}
        </div>
        {sky === 'night' && <p className="text-[11px] text-subtle-foreground">{t('skyNightDescription')}</p>}
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">{t('qualityLabel')}</h3>
        <div className="grid gap-2">
          {QUALITY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={quality === id}
              onClick={() => setSceneLook({ quality: id })}
              className={cn(
                'flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors',
                quality === id ? 'border-foreground' : 'border-border hover:border-ring',
              )}
            >
              <span className="text-xs font-medium">{t(QUALITY_TEXT[id].label)}</span>
              <span className="text-[11px] text-subtle-foreground">{t(QUALITY_TEXT[id].description)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
