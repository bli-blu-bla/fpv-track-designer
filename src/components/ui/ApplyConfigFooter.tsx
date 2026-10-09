import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store'
import { generateTrack } from '@/utils/generator'
import { extractGenerationConfig, hasConfigDrift } from '@/utils/generationConfig'
import { useTranslation } from '@/i18n'

/**
 * Footer rendered inside the Settings sheet when the live config differs from
 * the config used to generate the current track. Clicking "Anwenden" always
 * goes through the global `requestDestructiveAction` flow, so the user gets
 * the unified Cancel / Save first / Discard dialog whenever there are
 * unsaved changes – matching Shuffle, Import and Gallery Load behaviour.
 */
export function ApplyConfigFooter() {
  const { t } = useTranslation()
  const config = useAppStore((s) => s.config)
  const generationConfig = useAppStore((s) => s.generationConfig)
  const setTrack = useAppStore((s) => s.setTrack)
  const requestDestructiveAction = useAppStore((s) => s.requestDestructiveAction)

  const drift = hasConfigDrift(config, generationConfig)
  if (!drift) return null

  const handleClick = () => {
    void requestDestructiveAction('apply-config').then((proceed) => {
      if (proceed) setTrack(generateTrack(config), extractGenerationConfig(config))
    })
  }

  return (
    <>
      <Separator />
      <div className="flex flex-col gap-2 p-4 animate-in slide-in-from-bottom-2 fade-in-0 duration-200">
        <p className="text-xs text-muted-foreground">
          {t('configChanged')}
        </p>
        <Button type="button" className="w-full" onClick={handleClick}>
          {t('applyConfig')}
        </Button>
      </div>
    </>
  )
}
