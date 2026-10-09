import { useMemo, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { Html } from '@react-three/drei'
import { ArrowUpDown, Move, Plus, RotateCw, Trash2 } from 'lucide-react'
import type { GateType } from '../../types'
import { useAppStore } from '../../store'
import { calculateFlightPath } from '../../utils/flightPath'
import { GATE_DEFINITIONS } from '../../utils/gateDefinitions'
import { Button } from '../ui/button'
import { useTranslation } from '@/i18n'
import { getInsertControl, type DragMode, type InsertControl, type Point3 } from './gateHandleMath'
import { useGateDrag } from './useGateDrag'

interface GateHandlesProps {
  gateId: string
  gateType: GateType
  position: Point3
  rotation: number
}

const HANDLE_CLEARANCE_ABOVE_GATE = 0.5
const GATE_HANDLE_Z_INDEX_RANGE: [number, number] = [30, 0]
const HANDLE_BUTTON_CLASSNAME = 'pointer-events-auto flex size-11 items-center justify-center rounded-full border shadow-lg shadow-black/30 backdrop-blur supports-backdrop-filter:backdrop-blur-sm transition-colors select-none touch-none'

const DRAG_HANDLE_STYLES: Record<DragMode, { active: string; idle: string; cursor: (active: boolean) => string }> = {
  move: {
    active: 'border-primary bg-primary text-primary-foreground',
    idle: 'border-primary/40 bg-surface-elevated/95 text-primary hover:bg-surface-hover',
    cursor: (active) => active ? 'grabbing' : 'grab',
  },
  elevate: {
    active: 'border-accent bg-accent text-accent-foreground',
    idle: 'border-accent/60 bg-surface-elevated/95 text-accent-foreground hover:bg-surface-hover',
    cursor: () => 'ns-resize',
  },
  rotate: {
    active: 'border-secondary bg-secondary text-secondary-foreground',
    idle: 'border-border bg-surface-elevated/95 text-foreground hover:bg-surface-hover',
    cursor: () => 'ew-resize',
  },
}

/** Keeps clicks on DOM overlays from reaching the canvas (deselect) or orbit controls. */
function stopHtmlInteraction(event: PointerEvent | MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  event.nativeEvent.stopImmediatePropagation()
}

function InsertHandle({ control, label, ariaLabel, onInsert }: {
  control: InsertControl
  label: string
  ariaLabel: string
  onInsert: (control: InsertControl) => void
}) {
  const { x, y, z } = control.handlePosition

  return (
    <Html position={[x, y, z]} center distanceFactor={9} zIndexRange={GATE_HANDLE_Z_INDEX_RANGE} style={{ pointerEvents: 'none' }}>
      <div className="relative flex flex-col items-center gap-2 pointer-events-auto">
        <div className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-md shadow-black/20 backdrop-blur">
          {label}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full border-border bg-surface-elevated/95 text-primary shadow-lg shadow-black/30 backdrop-blur supports-backdrop-filter:backdrop-blur-sm hover:bg-surface-hover"
          onPointerDown={stopHtmlInteraction}
          onClick={(event) => {
            stopHtmlInteraction(event)
            onInsert(control)
          }}
          aria-label={ariaLabel}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </Html>
  )
}

export function GateHandles({ gateId, gateType, position, rotation }: GateHandlesProps) {
  const { t } = useTranslation()
  const { activeMode, startDrag } = useGateDrag(gateId, position, rotation)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const isSingleSelectedGate = useAppStore((state) => state.selectedGateIds.length === 1 && state.selectedGateId === gateId)
  const openDeleteDialog = useAppStore((state) => state.openDeleteDialog)
  const closeDeleteDialog = useAppStore((state) => state.closeDeleteDialog)
  const openGateInsertionDialog = useAppStore((state) => state.openGateInsertionDialog)

  const sampledLegs = useMemo(
    () => currentTrack ? calculateFlightPath(currentTrack.gates, currentTrack.gateSequence).sampledLegs : [],
    [currentTrack],
  )
  const insertControls = isSingleSelectedGate && currentTrack
    ? (['before', 'after'] as const).map((direction) => getInsertControl(currentTrack, gateId, direction, sampledLegs))
    : []

  const handleInsert = (control: InsertControl) => {
    closeDeleteDialog()
    openGateInsertionDialog({
      gateIndex: control.gateIndex,
      sequenceIndex: control.sequenceIndex,
      position: control.insertPosition,
      rotation,
    })
  }

  const dragHandle = (mode: DragMode, labelKey: 'move' | 'adjustHeight' | 'rotate', icon: ReactNode) => {
    const isActive = activeMode === mode
    const styles = DRAG_HANDLE_STYLES[mode]

    return (
      <button
        type="button"
        aria-label={`${gateId} ${t(labelKey)}`}
        onPointerDown={(event) => startDrag(mode, event)}
        className={`${HANDLE_BUTTON_CLASSNAME} ${isActive ? styles.active : styles.idle}`}
        style={{ cursor: styles.cursor(isActive) }}
      >
        {icon}
      </button>
    )
  }

  return (
    <>
      {insertControls.map((control) => control && (
        <InsertHandle
          key={control.direction}
          control={control}
          label={t(control.direction)}
          ariaLabel={`${gateId} ${t(control.direction)} ${t('insert')}`}
          onInsert={handleInsert}
        />
      ))}

      <Html
        position={[position.x, position.y + GATE_DEFINITIONS[gateType].topHeight + HANDLE_CLEARANCE_ABOVE_GATE, position.z]}
        center
        distanceFactor={8}
        zIndexRange={GATE_HANDLE_Z_INDEX_RANGE}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{ display: 'flex', gap: 24, pointerEvents: 'none' }}>
          {dragHandle('move', 'move', <Move size={22} />)}
          {dragHandle('elevate', 'adjustHeight', <ArrowUpDown size={22} />)}
          {dragHandle('rotate', 'rotate', <RotateCw size={22} />)}

          {isSingleSelectedGate && (
            <button
              type="button"
              aria-label={`${gateId} ${t('delete')}`}
              onPointerDown={stopHtmlInteraction}
              onClick={(event) => {
                stopHtmlInteraction(event)
                openDeleteDialog()
              }}
              className={`${HANDLE_BUTTON_CLASSNAME} border-destructive/60 bg-destructive text-destructive-foreground hover:bg-destructive/90`}
            >
              <Trash2 size={22} />
            </button>
          )}
        </div>
      </Html>
    </>
  )
}
