import type { FC } from 'react'
import { useMemo } from 'react'
import { Hammer } from 'lucide-react'
import { useAppStore } from '@/editor/store'
import { calculatePoleBreakdown } from '@/core/gates/poleCount'
import { useTranslation } from '@/i18n'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Stangenzähler – zeigt im TopBar an, wie viele Stangen für den Aufbau
 * der aktuellen Strecke gebraucht werden. Bei Klick öffnet sich ein Popover
 * mit dem Detail-Breakdown pro Gate-Typ.
 *
 * Dive-Gates und Tunnel werden als "nicht aus Stangen baubar" markiert
 * (siehe `POLES_PER_GATE`).
 */
export const PoleCounter: FC = () => {
  const { t, gateTypeLabel } = useTranslation()
  const gates = useAppStore((state) => state.currentTrack?.gates ?? null)

  const breakdown = useMemo(
    () => calculatePoleBreakdown(gates ?? []),
    [gates],
  )

  if (!gates || gates.length === 0) {
    return null
  }

  const buildableEntries = breakdown.entries.filter((e) => !e.notBuildable)
  const notBuildableEntries = breakdown.entries.filter((e) => e.notBuildable)

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('polesAria', { count: breakdown.total })}
            >
              <Hammer className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">{t('polesLabel')}</span>
              <span className="tabular-nums">{breakdown.total}</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {t('poleCounterTooltip')}
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex flex-col">
          <div className="border-b border-border px-3 py-2">
            <div className="text-sm font-semibold">{t('poleCalculation')}</div>
            <div className="text-xs text-muted-foreground">
              {t('poleCalculationDescription')}
            </div>
          </div>

          <div className="px-3 py-2">
            {buildableEntries.length === 0 ? (
              <div className="py-2 text-xs text-muted-foreground">
                {t('noBuildableGates')}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="pb-1 text-left font-medium">{t('gateType')}</th>
                    <th className="pb-1 text-right font-medium">{t('quantity')}</th>
                    <th className="pb-1 text-right font-medium">×</th>
                    <th className="pb-1 text-right font-medium">{t('poles')}</th>
                  </tr>
                </thead>
                <tbody>
                  {buildableEntries.map((entry) => (
                    <tr key={entry.type} className="align-baseline">
                      <td className="py-0.5 pr-2">{gateTypeLabel(entry.type)}</td>
                      <td className="py-0.5 pr-2 text-right tabular-nums">{entry.count}</td>
                      <td className="py-0.5 pr-2 text-right tabular-nums text-muted-foreground">
                        {entry.polesPerGate}
                      </td>
                      <td className="py-0.5 text-right tabular-nums font-medium">
                        {entry.subtotal}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td className="pt-1.5 pr-2 text-sm font-semibold" colSpan={3}>
                      {t('total')}
                    </td>
                    <td className="pt-1.5 text-right text-sm font-semibold tabular-nums">
                      {breakdown.total}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {notBuildableEntries.length > 0 && (
            <div className="border-t border-border bg-muted/30 px-3 py-2">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('notBuildableFromPoles')}
              </div>
              <ul className="space-y-0.5 text-xs">
                {notBuildableEntries.map((entry) => (
                  <li
                    key={entry.type}
                    className="flex items-center justify-between text-muted-foreground"
                  >
                    <span>{gateTypeLabel(entry.type)}</span>
                    <span className="tabular-nums">{entry.count}×</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
