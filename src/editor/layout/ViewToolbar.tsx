import type { LucideIcon } from 'lucide-react'
import { Grid3x3, ListOrdered, Magnet, Map as MapIcon, Rotate3d, Route, Scan } from 'lucide-react'
import { SNAP_GRID_SIZES, type SnapGridSize } from '@/core/types'
import type { SceneViewMode } from '@/scene/CameraViewController'
import { useAppStore } from '@/editor/store'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTranslation, type TranslationKey } from '@/i18n'

const FLOATING_SURFACE = 'border border-border bg-background/90 shadow-xl shadow-black/35 backdrop-blur-md'

function ToggleButton({ icon: Icon, labelKey, hintKey, active, onClick }: {
  icon: LucideIcon
  labelKey: TranslationKey
  hintKey: TranslationKey
  active: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors hover:text-foreground',
            active ? 'bg-primary/14 text-amber-400' : 'text-muted-foreground',
          )}
        >
          <Icon className="size-[15px]" />
          <span className="hidden lg:inline">{t(labelKey)}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t(hintKey)}</TooltipContent>
    </Tooltip>
  )
}

/** Floating display toggles at the bottom of the canvas. */
export function ViewToolbar({ onResetView }: { onResetView: () => void }) {
  const { t, language } = useTranslation()
  const config = useAppStore((state) => state.config)
  const setShowGrid = useAppStore((state) => state.setShowGrid)
  const setSnapGatesToGrid = useAppStore((state) => state.setSnapGatesToGrid)
  const setSnapGridSize = useAppStore((state) => state.setSnapGridSize)
  const snapAllGatesToGrid = useAppStore((state) => state.snapAllGatesToGrid)
  const setShowFlightPath = useAppStore((state) => state.setShowFlightPath)
  const setShowOpeningLabels = useAppStore((state) => state.setShowOpeningLabels)

  const toggleSnap = () => {
    setSnapGatesToGrid(!config.snapGatesToGrid)
    if (!config.snapGatesToGrid) snapAllGatesToGrid()
  }

  const changeSnapSize = (size: SnapGridSize) => {
    setSnapGridSize(size)
    snapAllGatesToGrid()
  }

  return (
    <div
      className={cn(
        'absolute bottom-4 left-1/2 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[10px] p-1 whitespace-nowrap [scrollbar-width:none]',
        FLOATING_SURFACE,
      )}
    >
      <ToggleButton icon={Grid3x3} labelKey="showGrid" hintKey="showGridDescription" active={config.showGrid} onClick={() => setShowGrid(!config.showGrid)} />
      <ToggleButton icon={Magnet} labelKey="gridSnap" hintKey="gridSnapDescription" active={config.snapGatesToGrid} onClick={toggleSnap} />
      <ToggleButton icon={Route} labelKey="flightPath" hintKey="flightPathDescription" active={config.showFlightPath} onClick={() => setShowFlightPath(!config.showFlightPath)} />
      <ToggleButton icon={ListOrdered} labelKey="passThroughs" hintKey="passThroughsDescription" active={config.showOpeningLabels} onClick={() => setShowOpeningLabels(!config.showOpeningLabels)} />

      {config.snapGatesToGrid && (
        <div role="group" aria-label={t('gridSnapPrecision')} className="flex gap-0.5 rounded-md bg-muted p-0.5">
          {SNAP_GRID_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={config.snapGridSize === size}
              onClick={() => changeSnapSize(size)}
              className={cn(
                'h-[26px] rounded-[4px] px-2 font-mono text-[11px] font-medium transition-colors',
                config.snapGridSize === size ? 'bg-strong-border text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {`${size.toLocaleString(language === 'de' ? 'de-DE' : 'en-US')} m`}
            </button>
          ))}
        </div>
      )}

      <div aria-hidden="true" className="mx-1 h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onResetView}
            aria-label={t('resetView')}
            className="flex size-[30px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Scan className="size-[15px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{t('resetView')}</TooltipContent>
      </Tooltip>
    </div>
  )
}

/** 3D / top-view switch in the top-left canvas corner. */
export function ViewModeTabs({ viewMode, onChange }: { viewMode: SceneViewMode; onChange: (mode: SceneViewMode) => void }) {
  const { t } = useTranslation()
  const tabs: { mode: SceneViewMode; icon: LucideIcon; labelKey: TranslationKey }[] = [
    { mode: 'perspective', icon: Rotate3d, labelKey: 'view3d' },
    { mode: 'top', icon: MapIcon, labelKey: 'viewTop' },
  ]

  return (
    <div role="tablist" className={cn('absolute top-3 left-3 flex gap-0.5 rounded-lg p-[3px]', FLOATING_SURFACE)}>
      {tabs.map(({ mode, icon: Icon, labelKey }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={viewMode === mode}
          onClick={() => onChange(mode)}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-[5px] px-3 text-xs font-medium transition-colors',
            viewMode === mode ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-3.5" />
          {t(labelKey)}
        </button>
      ))}
    </div>
  )
}
