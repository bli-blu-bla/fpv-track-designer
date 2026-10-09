import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import { useAppStore } from '@/editor/store'
import { getDragUpdate, type DragMode, type GateDrag, type Point3 } from './gateHandleMath'

const RAYCASTER = new Raycaster()

function setControlsEnabled(controls: unknown, enabled: boolean) {
  if (controls && typeof controls === 'object' && 'enabled' in controls) {
    ;(controls as { enabled: boolean }).enabled = enabled
  }
}

/**
 * Pointer-driven move/elevate/rotate for one gate. Live updates go to the store
 * without history; the drag-start snapshot is committed once on pointer-up.
 * Orbit controls are disabled while dragging.
 */
export function useGateDrag(gateId: string, position: Point3, rotation: number) {
  const { camera, gl, controls } = useThree()
  const [activeMode, setActiveMode] = useState<DragMode | null>(null)
  const dragRef = useRef<GateDrag | null>(null)
  const releaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setGatePosition = useAppStore((state) => state.setGatePosition)
  const setGateRotation = useAppStore((state) => state.setGateRotation)
  const commitGateDrag = useAppStore((state) => state.commitGateDrag)
  const setDraggingGate = useAppStore((state) => state.setDraggingGate)
  const fieldSize = useAppStore((state) => state.config.fieldSize)
  const snapGatesToGrid = useAppStore((state) => state.config.snapGatesToGrid)

  // Window listeners outlive renders; read the latest values through one ref.
  const latest = useRef({ gateId, camera, gl, controls, fieldSize, snapGatesToGrid, setGatePosition, setGateRotation, commitGateDrag, setDraggingGate })
  useEffect(() => {
    latest.current = { gateId, camera, gl, controls, fieldSize, snapGatesToGrid, setGatePosition, setGateRotation, commitGateDrag, setDraggingGate }
  })

  const intersectGround = useCallback((clientX: number, clientY: number) => {
    const rect = latest.current.gl.domElement.getBoundingClientRect()
    const pointer = new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    RAYCASTER.setFromCamera(pointer, latest.current.camera)
    const { origin, direction } = RAYCASTER.ray
    const distance = -origin.y / direction.y
    return { x: origin.x + direction.x * distance, z: origin.z + direction.z * distance }
  }, [])

  const clearReleaseTimeout = () => {
    if (releaseTimeoutRef.current) clearTimeout(releaseTimeoutRef.current)
    releaseTimeoutRef.current = null
  }

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const { gateId: id, fieldSize: currentFieldSize, snapGatesToGrid: snap } = latest.current
      const update = getDragUpdate(drag, {
        clientX: event.clientX,
        clientY: event.clientY,
        groundHit: () => intersectGround(event.clientX, event.clientY),
      }, currentFieldSize, snap)

      if ('position' in update) latest.current.setGatePosition(id, update.position)
      else latest.current.setGateRotation(id, update.rotation)
    }

    const onPointerUp = () => {
      if (!dragRef.current) return

      dragRef.current = null
      setActiveMode(null)
      clearReleaseTimeout()
      // Released on the next tick so the click that ends the drag does not deselect the gate.
      releaseTimeoutRef.current = setTimeout(() => latest.current.setDraggingGate(false), 0)
      setControlsEnabled(latest.current.controls, true)
      latest.current.commitGateDrag()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      clearReleaseTimeout()
    }
  }, [intersectGround])

  // Unmounting mid-drag (e.g. undo removes the gate) must not leave controls disabled.
  useEffect(() => () => {
    if (!dragRef.current) return

    dragRef.current = null
    clearReleaseTimeout()
    latest.current.setDraggingGate(false)
    setControlsEnabled(latest.current.controls, true)
  }, [])

  const startDrag = useCallback((mode: DragMode, event: ReactPointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    setControlsEnabled(latest.current.controls, false)
    clearReleaseTimeout()

    dragRef.current = mode === 'move'
      ? { mode, startHit: intersectGround(event.clientX, event.clientY), startPosition: position }
      : mode === 'elevate'
      ? { mode, startClientY: event.clientY, startPosition: position }
      : { mode, startClientX: event.clientX, startRotation: rotation }
    setActiveMode(mode)
    latest.current.setDraggingGate(true)
  }, [intersectGround, position, rotation])

  return { activeMode, startDrag }
}
