import type { ThreeEvent } from '@react-three/fiber'
import { Gate, type SceneGateProps } from '@/scene/gates/Gate'
import { isCameraTouchGesture } from '@/scene/pointer'
import { useAppStore } from '@/editor/store'
import { GateHandles } from './GateHandles'

/** Editor gate: selection, direction toggles, sequence editing and edit handles. */
export function EditableGate({ gate, openingLabels, showOpeningLabels }: SceneGateProps) {
  const isSelected = useAppStore((state) => state.selectedGateIds.includes(gate.id))
  const selectGate = useAppStore((state) => state.selectGate)
  const toggleGateDirection = useAppStore((state) => state.toggleGateDirection)
  const openSequenceEditor = useAppStore((state) => state.openSequenceEditor)

  // Clicks that end a drag or a camera gesture must not change the selection.
  const isPointerBusy = (e: ThreeEvent<MouseEvent>) => useAppStore.getState().isDraggingGate || isCameraTouchGesture(e)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isPointerBusy(e)) return

    selectGate(gate.id, e.shiftKey || e.metaKey || e.ctrlKey)
  }

  const handleOpeningClick = (openingId: string, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (useAppStore.getState().isDraggingGate) return

    if (!isSelected) selectGate(gate.id)
    toggleGateDirection(gate.id, openingId)
  }

  const handleOpeningLabelClick = (openingId: string, sequenceNumber: number, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (useAppStore.getState().isDraggingGate) return

    if (!isSelected) selectGate(gate.id)
    if ((useAppStore.getState().currentTrack?.gateSequence.length ?? 0) === 0) return

    openSequenceEditor({ gateId: gate.id, openingId, sourceSequenceNumber: sequenceNumber })
  }

  return (
    <Gate
      gate={gate}
      openingLabels={openingLabels}
      showOpeningLabels={showOpeningLabels}
      isSelected={isSelected}
      onClick={handleClick}
      onOpeningClick={handleOpeningClick}
      onOpeningLabelClick={handleOpeningLabelClick}
    >
      {isSelected && <GateHandles gateId={gate.id} gateType={gate.type} position={gate.position} rotation={gate.rotation} />}
    </Gate>
  )
}
