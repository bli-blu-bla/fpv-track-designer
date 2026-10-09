import { useEffect, useRef, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import type { OrbitControls } from 'three-stdlib'

export type SceneViewMode = 'perspective' | 'top'

const PERSPECTIVE_POSITION: [number, number, number] = [0, 30, 30]
// A tiny z offset keeps OrbitControls away from the gimbal pole straight above the target.
const TOP_HEIGHT_FACTOR = 1.25
const TOP_Z_OFFSET = 0.01

interface CameraViewControllerProps {
  controlsRef: RefObject<OrbitControls | null>
  viewMode: SceneViewMode
  /** Changing this re-applies the current view mode (reset view). */
  resetToken: number
  fieldSize: { width: number; height: number }
}

/**
 * Moves the camera to a preset when the view mode or reset token changes; the initial camera stays as created.
 * Must render before `SmoothZoom` so its resync effect reads the new distance.
 */
export function CameraViewController({ controlsRef, viewMode, resetToken, fieldSize }: CameraViewControllerProps) {
  const camera = useThree((state) => state.camera)
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }

    const controls = controlsRef.current
    const position: [number, number, number] = viewMode === 'top'
      ? [0, Math.max(fieldSize.width, fieldSize.height) * TOP_HEIGHT_FACTOR, TOP_Z_OFFSET]
      : PERSPECTIVE_POSITION

    camera.position.set(...position)
    controls?.target.set(0, 0, 0)
    controls?.update()
  }, [camera, controlsRef, viewMode, resetToken, fieldSize.width, fieldSize.height])

  return null
}
