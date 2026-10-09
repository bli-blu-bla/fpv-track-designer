import type { FocusEvent, KeyboardEvent } from 'react'
import { useAppStore } from '@/editor/store'
import { GATE_TYPES, GROUND_IDS, GROUND_PRESETS, type GroundId } from '@/core/types'
import { cn } from '@/lib/utils'
import { GateIcon } from '@/editor/icons/GateIcon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useTranslation, type TranslationKey } from '@/i18n'


const GROUND_LABELS: Record<GroundId, TranslationKey> = {
  grass: 'groundGrass',
  hall: 'groundHall',
  asphalt: 'groundAsphalt',
}

export function GateConfigPanel() {
  const { t, gateTypeLabel } = useTranslation()
  const config = useAppStore((state) => state.config)
  const setGateQuantity = useAppStore((state) => state.setGateQuantity)
  const setFieldSize = useAppStore((state) => state.setFieldSize)
  const resetToDefault = useAppStore((state) => state.resetToDefault)
  const setSceneLook = useAppStore((state) => state.setSceneLook)


  const normalizeFieldSizeValue = (value: string): string | null => {
    const parsedValue = parseInt(value, 10)

    return Number.isNaN(parsedValue) || parsedValue <= 0 ? null : String(parsedValue)
  }

  const commitFieldWidth = (event: FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeFieldSizeValue(event.currentTarget.value)

    if (!normalized) {
      event.currentTarget.value = String(config.fieldSize.width)
      return
    }

    setFieldSize(parseInt(normalized, 10), config.fieldSize.height)
    event.currentTarget.value = normalized
  }

  const commitFieldHeight = (event: FocusEvent<HTMLInputElement>) => {
    const normalized = normalizeFieldSizeValue(event.currentTarget.value)

    if (!normalized) {
      event.currentTarget.value = String(config.fieldSize.height)
      return
    }

    setFieldSize(config.fieldSize.width, parseInt(normalized, 10))
    event.currentTarget.value = normalized
  }

  const commitFieldSizeOnSubmit = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{t('fieldSize')}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-width" className="text-xs font-medium text-muted-foreground">
              {t('width')}
            </Label>
            <Input
              id="field-width"
              type="number"
              defaultValue={config.fieldSize.width}
              key={`field-width-${config.fieldSize.width}`}
              onBlur={commitFieldWidth}
              onKeyDown={commitFieldSizeOnSubmit}
              className="h-[34px] font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="field-height" className="text-xs font-medium text-muted-foreground">
              {t('length')}
            </Label>
            <Input
              id="field-height"
              type="number"
              defaultValue={config.fieldSize.height}
              key={`field-height-${config.fieldSize.height}`}
              onBlur={commitFieldHeight}
              onKeyDown={commitFieldSizeOnSubmit}
              className="h-[34px] font-mono"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">{t('groundLabel')}</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {GROUND_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={config.ground === id}
              onClick={() => setSceneLook({ ground: id })}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-1.5 rounded-lg border text-xs transition-colors',
                config.ground === id ? 'border-foreground' : 'border-border hover:border-ring',
              )}
            >
              <span aria-hidden="true" className="h-3 w-[22px] rounded-[3px]" style={{ background: GROUND_PRESETS[id].groundSurface }} />
              {t(GROUND_LABELS[id])}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">{t('gateQuantity')}</h3>
        <p className="text-xs leading-relaxed text-subtle-foreground">{t('courseConfigDescription')}</p>
        <div className="-mx-2 flex flex-col gap-0.5">
          {GATE_TYPES.map((type) => (
            <div key={type} className="flex h-10 items-center justify-between gap-2 rounded-md px-2 hover:bg-muted">
              <Label className="flex items-center gap-2.5 text-[13px] font-normal text-foreground">
                <GateIcon type={type} className="size-5 shrink-0 text-muted-foreground" />
                <span>{gateTypeLabel(type)}</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={config.gateQuantities[type]}
                aria-label={gateTypeLabel(type)}
                onChange={(e) =>
                  setGateQuantity(
                    type,
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="h-8 w-16 text-center font-mono"
              />
            </div>
          ))}
        </div>
      </section>

      <Button variant="outline" onClick={resetToDefault} className="w-full">
        <RotateCcw />
        {t('resetDefaults')}
      </Button>
    </div>
  )
}
