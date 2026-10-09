import type { ThreeEvent } from '@react-three/fiber'
import { useAppStore } from '@/editor/store'

function isCameraTouchGesture(e: ThreeEvent<MouseEvent>) {
  const target = e.nativeEvent.target
  if (!(target instanceof HTMLElement)) return false

  const canvas = target.closest('canvas')
  return canvas?.dataset.cameraTouchGesturing === 'true'
}

export function useGateSelection(gateId: string) {
  const selectedGateIds = useAppStore((state) => state.selectedGateIds)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const selectGate = useAppStore((state) => state.selectGate)

  const isSelected = selectedGateIds.includes(gateId)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate || isCameraTouchGesture(e)) return

    const isAdditiveSelection = e.shiftKey || e.metaKey || e.ctrlKey
    selectGate(gateId, isAdditiveSelection)
  }

  return { isSelected, handleClick }
}
