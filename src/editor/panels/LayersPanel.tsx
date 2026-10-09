import { useAppStore } from '@/editor/store'
import { useGateUiColor } from '@/editor/hooks/useGateUiColor'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/i18n'

/** All gates in placement order; click selects, Shift/Cmd/Ctrl-click adds to the selection. */
export function LayersPanel() {
  const { t, gateTypeLabel } = useTranslation()
  const gateColor = useGateUiColor()
  const gates = useAppStore((state) => state.currentTrack?.gates ?? [])
  const gateSequence = useAppStore((state) => state.currentTrack?.gateSequence ?? [])
  const selectedGateIds = useAppStore((state) => state.selectedGateIds)
  const selectGate = useAppStore((state) => state.selectGate)

  if (gates.length === 0) {
    return <p className="py-6 text-center text-xs text-subtle-foreground">{t('layersEmpty')}</p>
  }

  // First pass number of each gate, matching the labels in the scene.
  const firstPass = new Map<string, number>()
  gateSequence.forEach((entry, index) => {
    if (!firstPass.has(entry.gateId)) firstPass.set(entry.gateId, index + 1)
  })

  return (
    <ul className="-mx-2 flex flex-col gap-0.5">
      {gates.map((gate, index) => {
        const isSelected = selectedGateIds.includes(gate.id)
        const passNumber = firstPass.get(gate.id) ?? index + 1

        return (
          <li key={gate.id}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={(event) => selectGate(gate.id, event.shiftKey || event.metaKey || event.ctrlKey)}
              className={cn(
                'flex h-[34px] w-full items-center gap-2.5 rounded-md pr-1.5 pl-2.5 text-left transition-colors',
                isSelected ? 'bg-secondary' : 'hover:bg-muted',
              )}
            >
              <span className="w-[22px] font-mono text-[11px] font-medium text-subtle-foreground">
                {String(passNumber).padStart(2, '0')}
              </span>
              <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: gateColor(gate.type) }} />
              <span className="flex-1 truncate text-[13px]">{gateTypeLabel(gate.type)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
