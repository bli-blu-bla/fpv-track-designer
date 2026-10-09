import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Copy, Trash2, X } from 'lucide-react'
import type { Gate } from '@/core/types'
import { GATE_DEFINITIONS } from '@/core/gates/gateDefinitions'
import { createDefaultGateOpenings } from '@/core/gates/gateOpenings'
import { calculatePoleBreakdown } from '@/core/gates/poleCount'
import { calculateFlightPath } from '@/core/track/flightPath'
import { useAppStore } from '@/editor/store'
import { useGateUiColor } from '@/editor/hooks/useGateUiColor'
import { useTranslation } from '@/i18n'

const ROTATION_PRESETS = [0, 90, 180, 270]
const DUPLICATE_OFFSET = 1.5

function formatMeters(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium text-muted-foreground">{children}</div>
}

function InspectorHeader({ children }: { children: ReactNode }) {
  return <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border pr-2 pl-4">{children}</div>
}

/** Number field that commits on blur/Enter and resets to the store value on invalid input. */
function MeterInput({ axis, value, onCommit }: { axis: string; value: number; onCommit: (value: number) => void }) {
  return (
    <label className="flex h-[34px] min-w-0 items-center rounded-md border border-border pl-2.5 focus-within:border-ring">
      <span className="w-3.5 font-mono text-[11px] font-medium text-subtle-foreground">{axis}</span>
      <input
        key={value}
        type="number"
        step="0.1"
        defaultValue={formatMeters(value)}
        onBlur={(event) => {
          const next = Number.parseFloat(event.currentTarget.value)
          if (Number.isFinite(next)) onCommit(next)
          else event.currentTarget.value = formatMeters(value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        className="h-8 min-w-0 flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none"
      />
      <span className="pr-2 text-[11px] text-subtle-foreground">m</span>
    </label>
  )
}

function SelectedGateInspector({ gate }: { gate: Gate }) {
  const { t, gateTypeLabel } = useTranslation()
  const gateColor = useGateUiColor()
  const track = useAppStore((state) => state.currentTrack)
  const snapRotation = useAppStore((state) => state.config.snapGatesToGrid)
  const updateGate = useAppStore((state) => state.updateGate)
  const moveGateSequenceEntry = useAppStore((state) => state.moveGateSequenceEntry)
  const insertGateAtIndex = useAppStore((state) => state.insertGateAtIndex)
  const openDeleteDialog = useAppStore((state) => state.openDeleteDialog)
  const selectGate = useAppStore((state) => state.selectGate)
  // Slider drafts stay local so dragging the slider creates one undo step, not dozens.
  const [rotationDraft, setRotationDraft] = useState<{ gateId: string; value: number } | null>(null)

  if (!track) return null

  const definition = GATE_DEFINITIONS[gate.type]
  const field = track.fieldSize
  const sequenceIndex = track.gateSequence.findIndex((entry) => entry.gateId === gate.id)
  const sequenceEntry = track.gateSequence[sequenceIndex]
  const sequenceLength = track.gateSequence.length
  const rotation = rotationDraft?.gateId === gate.id ? rotationDraft.value : Math.round(gate.rotation)

  const commitPosition = (patch: Partial<Gate['position']>) => {
    const next = { ...gate.position, ...patch }
    updateGate(gate.id, {
      position: {
        x: Math.max(-field.width / 2, Math.min(field.width / 2, next.x)),
        y: Math.max(0, next.y),
        z: Math.max(-field.height / 2, Math.min(field.height / 2, next.z)),
      },
    })
  }

  const commitRotation = (value: number) => {
    setRotationDraft(null)
    const normalized = ((value % 360) + 360) % 360
    if (normalized !== gate.rotation) updateGate(gate.id, { rotation: normalized })
  }

  const movePass = (delta: number) => {
    if (!sequenceEntry) return
    moveGateSequenceEntry(gate.id, sequenceEntry.openingId, sequenceIndex + 1, sequenceIndex + 1 + delta)
  }

  const duplicate = () => {
    if (definition.isStartFinish) return
    const id = crypto.randomUUID()
    const gateIndex = track.gates.findIndex((candidate) => candidate.id === gate.id)
    const lastPass = track.gateSequence.reduce((last, entry, index) => entry.gateId === gate.id ? index : last, -1)
    insertGateAtIndex(
      {
        id,
        type: gate.type,
        position: { ...gate.position, x: Math.min(field.width / 2, gate.position.x + DUPLICATE_OFFSET) },
        rotation: gate.rotation,
        openings: createDefaultGateOpenings(gate.type, id),
      },
      gateIndex + 1,
      lastPass + 1,
    )
  }

  return (
    <>
      <InspectorHeader>
        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px]" style={{ background: gateColor(gate.type) }} />
        <h2 className="truncate text-sm font-semibold">
          {gateTypeLabel(gate.type)}{sequenceIndex >= 0 && ` ${sequenceIndex + 1}`}
        </h2>
        <span className="shrink-0 rounded-full border border-strong-border px-[7px] py-px text-[11px] text-muted-foreground">
          {definition.poles > 0 ? t('polesCount', { count: definition.poles }) : t('notBuildableShort')}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => selectGate(null)}
          aria-label={t('clearSelection')}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </InspectorHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          <SectionLabel>{t('position')}</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <MeterInput axis="X" value={gate.position.x} onCommit={(x) => commitPosition({ x })} />
            <MeterInput axis="Z" value={gate.position.z} onCommit={(z) => commitPosition({ z })} />
          </div>
          <MeterInput axis="↑" value={gate.position.y} onCommit={(y) => commitPosition({ y })} />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between">
            <SectionLabel>{t('rotation')}</SectionLabel>
            <span className="font-mono text-xs">{rotation}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={359}
            step={snapRotation ? 15 : 1}
            value={rotation}
            aria-label={t('rotation')}
            onChange={(event) => setRotationDraft({ gateId: gate.id, value: Number(event.target.value) })}
            onPointerUp={(event) => commitRotation(Number(event.currentTarget.value))}
            onKeyUp={(event) => commitRotation(Number(event.currentTarget.value))}
            onBlur={(event) => rotationDraft && commitRotation(Number(event.currentTarget.value))}
            className="w-full accent-primary"
          />
          <div className="grid grid-cols-4 gap-1">
            {ROTATION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => commitRotation(preset)}
                className="h-[26px] rounded-[5px] border border-border font-mono text-[11px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {preset}°
              </button>
            ))}
          </div>
        </div>

        {sequenceEntry && (
          <div className="flex flex-col gap-2">
            <SectionLabel>{t('passOrder')}</SectionLabel>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => movePass(-1)}
                disabled={sequenceIndex === 0}
                aria-label={t('passEarlier')}
                className="flex size-[34px] items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex h-[34px] flex-1 items-center justify-center rounded-md border border-border font-mono text-[13px]">
                {t('passOf', { n: sequenceIndex + 1, count: sequenceLength })}
              </div>
              <button
                type="button"
                onClick={() => movePass(1)}
                disabled={sequenceIndex >= sequenceLength - 1}
                aria-label={t('passLater')}
                className="flex size-[34px] items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={duplicate}
          disabled={definition.isStartFinish}
          className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md border border-border text-[13px] font-medium hover:bg-secondary disabled:opacity-40"
        >
          <Copy className="size-3.5" />
          {t('duplicate')}
        </button>
        <button
          type="button"
          onClick={openDeleteDialog}
          className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-md border border-destructive/35 bg-destructive/8 text-[13px] font-medium text-red-400 hover:bg-destructive/16"
        >
          <Trash2 className="size-3.5" />
          {t('delete')}
        </button>
      </div>
    </>
  )
}

function TrackOverview() {
  const { t } = useTranslation()
  const track = useAppStore((state) => state.currentTrack)
  const stats = useMemo(() => {
    if (!track) return null

    return {
      objects: track.gates.length,
      poles: calculatePoleBreakdown(track.gates).total,
      lap: calculateFlightPath(track.gates, track.gateSequence).totalLength,
      field: `${track.fieldSize.width}×${track.fieldSize.height}`,
    }
  }, [track])

  return (
    <>
      <InspectorHeader>
        <h2 className="text-sm font-semibold">{t('inspectorTrack')}</h2>
      </InspectorHeader>
      <div className="flex flex-col gap-4 p-4">
        {stats && (
          <dl className="grid grid-cols-2 gap-2">
            {[
              [t('statObjects'), stats.objects],
              [t('statPoles'), stats.poles],
              [t('statLap'), `${stats.lap.toFixed(1)} m`],
              [t('statField'), stats.field],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-mono text-xl font-semibold tracking-tight">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-pretty text-muted-foreground">{t('inspectorHint')}</p>
      </div>
    </>
  )
}

/** Right sidebar: track stats, or properties of the selected gate. */
export function Inspector() {
  const { t } = useTranslation()
  const selectedGateIds = useAppStore((state) => state.selectedGateIds)
  const selectedGate = useAppStore((state) => (
    state.selectedGateIds.length === 1
      ? state.currentTrack?.gates.find((gate) => gate.id === state.selectedGateIds[0]) ?? null
      : null
  ))
  const selectGate = useAppStore((state) => state.selectGate)

  return (
    <aside aria-label={t('inspectorTrack')} className="hidden min-h-0 w-[288px] shrink-0 flex-col border-l border-border bg-background lg:flex">
      {selectedGate ? (
        <SelectedGateInspector key={selectedGate.id} gate={selectedGate} />
      ) : selectedGateIds.length > 1 ? (
        <>
          <InspectorHeader>
            <h2 className="text-sm font-semibold">{t('multiSelection', { count: selectedGateIds.length })}</h2>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => selectGate(null)}
              aria-label={t('clearSelection')}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </InspectorHeader>
          <p className="m-4 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{t('multiSelectionHint')}</p>
        </>
      ) : (
        <TrackOverview />
      )}
    </aside>
  )
}
