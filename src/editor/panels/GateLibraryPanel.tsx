import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { GATE_TYPES, type GateType } from '@/core/types'
import { GATE_DEFINITIONS, type GateCategory } from '@/core/gates/gateDefinitions'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { useAppStore } from '@/editor/store'
import { GateIcon } from '@/editor/icons/GateIcon'
import { useGateUiColor } from '@/editor/hooks/useGateUiColor'
import { cn } from '@/lib/utils'
import { useTranslation, type TranslationKey } from '@/i18n'

type CategoryFilter = 'all' | GateCategory

const CATEGORY_TABS: { id: CategoryFilter; labelKey: TranslationKey }[] = [
  { id: 'all', labelKey: 'categoryAll' },
  { id: 'gate', labelKey: 'categoryGates' },
  { id: 'flag', labelKey: 'categoryFlags' },
  { id: 'obstacle', labelKey: 'categoryObstacles' },
]

/** Gate catalog; a click appends the gate at the field center and selects it. */
export function GateLibraryPanel() {
  const { t, gateTypeLabel } = useTranslation()
  const gateColor = useGateUiColor()
  const currentTrack = useAppStore((state) => state.currentTrack)
  const insertGateAtIndex = useAppStore((state) => state.insertGateAtIndex)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')

  const placedStartFinish = currentTrack?.gates.some((gate) => GATE_DEFINITIONS[gate.type].isStartFinish) ?? false
  const normalizedQuery = query.trim().toLowerCase()
  const visibleTypes = useMemo(() => GATE_TYPES.filter((type) => (
    (category === 'all' || GATE_DEFINITIONS[type].category === category)
    && gateTypeLabel(type).toLowerCase().includes(normalizedQuery)
  )), [category, gateTypeLabel, normalizedQuery])

  const placeGate = (type: GateType) => {
    if (!currentTrack) return

    const id = crypto.randomUUID()
    insertGateAtIndex(
      { id, type, position: { x: 0, y: 0, z: 0 }, rotation: 0, openings: createDefaultGateOpenings(type, id) },
      currentTrack.gates.length,
      currentTrack.gateSequence.length,
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-subtle-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchObjects')}
          aria-label={t('searchObjects')}
          className="h-[34px] w-full rounded-md border border-border bg-transparent pr-2.5 pl-8 text-[13px] text-foreground outline-none placeholder:text-subtle-foreground focus:border-ring focus:ring-3 focus:ring-muted-foreground/15"
        />
      </div>

      <div role="tablist" className="grid grid-cols-4 gap-0.5 rounded-lg bg-muted p-[3px]">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={category === tab.id}
            onClick={() => setCategory(tab.id)}
            className={cn(
              'h-7 truncate rounded-[5px] px-1 text-xs font-medium transition-colors',
              category === tab.id ? 'bg-background text-foreground shadow-sm shadow-black/40' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {visibleTypes.length === 0 ? (
        <p className="py-6 text-center text-xs text-subtle-foreground">{t('libraryNoResults')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {visibleTypes.map((type) => {
            const definition = GATE_DEFINITIONS[type]
            const disabled = !currentTrack || (definition.isStartFinish && placedStartFinish)

            return (
              <button
                key={type}
                type="button"
                onClick={() => placeGate(type)}
                disabled={disabled}
                className="flex flex-col gap-2 rounded-lg border border-border bg-background p-2 text-left transition-colors hover:border-ring hover:bg-muted disabled:pointer-events-none disabled:opacity-45"
              >
                <span className="flex h-16 items-center justify-center rounded-[5px] bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_6px,#1f1f23_6px_12px)]">
                  <GateIcon type={type} className="size-10" style={{ color: gateColor(type) }} />
                </span>
                <span className="flex flex-col gap-px">
                  <span className="truncate text-xs font-medium">{gateTypeLabel(type)}</span>
                  <span className="truncate font-mono text-[11px] text-subtle-foreground">
                    {definition.isStartFinish && placedStartFinish
                      ? t('alreadyPlaced')
                      : definition.poles > 0 ? t('polesCount', { count: definition.poles }) : t('notBuildableShort')}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-pretty text-subtle-foreground">{t('libraryHint')}</p>
    </div>
  )
}
