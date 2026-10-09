import { useAppStore } from '@/editor/store'
import type { ThemeId } from '@/core/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/i18n'

export function ThemeConfigPanel() {
  const { t } = useTranslation()
  const activeTheme = useAppStore((state) => state.config.theme)
  const setTheme = useAppStore((state) => state.setTheme)

  const themeOptions: Array<{ id: ThemeId; label: string; description: string }> = [
  { id: 'minimal', label: t('themeMinimal'), description: t('themeMinimalDescription') },
  { id: 'realistic', label: t('themeRealistic'), description: t('themeRealisticDescription') },
  { id: 'night', label: t('themeNight'), description: t('themeNightDescription') },
]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('design')}</CardTitle>
        <CardDescription>
          {t('designDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Label className="text-sm text-muted-foreground">
          {t('visualAppearance')}
        </Label>
        <div className="grid gap-2">
          {themeOptions.map(({ id, label, description }) => {
            const isSelected = activeTheme === id

            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/70'
                    : 'border-border hover:border-primary/50 hover:bg-accent/30'
                }`}
              >
                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>{label}</span>
                <span className={`text-xs ${isSelected ? 'text-foreground/80' : 'text-muted-foreground'}`}>{description}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
