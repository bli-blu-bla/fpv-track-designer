import { useEffect, useRef, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Gate as GateModel } from '@/core/types'
import { GATE_COMPONENTS } from './gateComponents'

/** What `Scene` passes to whichever component renders a gate (read-only `Gate` or the editor's wrapper). */
export interface SceneGateProps {
  gate: GateModel
  openingLabels?: Record<string, string>
  showOpeningLabels: boolean
}

interface GateProps extends SceneGateProps {
  isSelected?: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onOpeningClick?: (openingId: string, e: ThreeEvent<MouseEvent>) => void
  onOpeningLabelClick?: (openingId: string, sequenceNumber: number, e: ThreeEvent<MouseEvent>) => void
  /** Overlays such as edit handles, rendered next to the gate. */
  children?: ReactNode
}

/** Renders one gate with shadows; interaction is opt-in via callbacks. */
export function Gate({ gate, openingLabels, showOpeningLabels, isSelected = false, onClick, onOpeningClick, onOpeningLabelClick, children }: GateProps) {
  const shadowGroupRef = useRef<THREE.Group>(null)
  const GateComponent = GATE_COMPONENTS[gate.type]

  useEffect(() => {
    shadowGroupRef.current?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true
      }
    })
  })

  return (
    <group ref={shadowGroupRef}>
      <GateComponent
        gateId={gate.id}
        position={gate.position}
        rotation={gate.rotation}
        openings={showOpeningLabels ? gate.openings : []}
        openingLabels={showOpeningLabels ? openingLabels : undefined}
        isSelected={isSelected}
        onClick={onClick}
        onOpeningClick={showOpeningLabels ? onOpeningClick : undefined}
        onOpeningLabelClick={showOpeningLabels ? onOpeningLabelClick : undefined}
      />
      {children}
    </group>
  )
}
