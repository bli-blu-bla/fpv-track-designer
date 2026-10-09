import { useEffect, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Gate as GateType } from '../../types'
import { useGateSelection } from '../../hooks/useGateSelection'
import { useAppStore } from '../../store'
import { GATE_COMPONENTS } from './gateComponents'
import { GateHandles } from './GateHandles'

interface GateProps {
  gate: GateType
  openingLabels?: Record<string, string>
  showOpeningLabels?: boolean
  readOnly?: boolean
}

export function Gate({ gate, openingLabels, showOpeningLabels = true, readOnly = false }: GateProps) {
  const shadowGroupRef = useRef<THREE.Group>(null)
  const { isSelected, handleClick } = useGateSelection(gate.id)
  const isDraggingGate = useAppStore((state) => state.isDraggingGate)
  const currentTrack = useAppStore((state) => state.currentTrack)
  const toggleGateDirection = useAppStore((state) => state.toggleGateDirection)
  const selectGate = useAppStore((state) => state.selectGate)
  const openSequenceEditor = useAppStore((state) => state.openSequenceEditor)

  const handleOpeningClick = (openingId: string, e: ThreeEvent<globalThis.MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return

    if (!isSelected) {
      selectGate(gate.id)
    }

    toggleGateDirection(gate.id, openingId)
  }

  const handleOpeningLabelClick = (openingId: string, sequenceNumber: number, e: ThreeEvent<globalThis.MouseEvent>) => {
    e.stopPropagation()
    if (isDraggingGate) return

    if (!isSelected) {
      selectGate(gate.id)
    }

    const sequenceLength = currentTrack?.gateSequence.length ?? 0
    if (sequenceLength === 0) return

    openSequenceEditor({
      gateId: gate.id,
      openingId,
      sourceSequenceNumber: sequenceNumber,
    })
  }

  const gateIsSelected = readOnly ? false : isSelected

  const commonProps = {
    position: gate.position,
    rotation: gate.rotation,
    openings: showOpeningLabels ? gate.openings : [],
    openingLabels: showOpeningLabels ? openingLabels : undefined,
    isSelected: gateIsSelected,
    onClick: readOnly ? undefined : handleClick,
    onOpeningClick: showOpeningLabels && !readOnly ? handleOpeningClick : undefined,
    onOpeningLabelClick: showOpeningLabels && !readOnly ? handleOpeningLabelClick : undefined,
  }

  useEffect(() => {
    shadowGroupRef.current?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
      }
    })
  })

  const GateComponent = GATE_COMPONENTS[gate.type]

  return (
    <group ref={shadowGroupRef}>
      <GateComponent {...commonProps} gateId={gate.id} />
      {!readOnly && isSelected && (
        <GateHandles
          gateId={gate.id}
          gateType={gate.type}
          position={gate.position}
          rotation={gate.rotation}
        />
      )}
    </group>
  )
}
