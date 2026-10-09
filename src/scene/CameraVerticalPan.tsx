import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three-stdlib'

interface CameraVerticalPanProps {
  controlsRef: React.RefObject<OrbitControls | null>
}

export function CameraVerticalPan({ controlsRef }: CameraVerticalPanProps) {
  const { camera, gl } = useThree()

  const isShiftHeld = useRef(false)
  const isPanning = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = gl.domElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault()
        isShiftHeld.current = true
        canvas.style.cursor = 'n-resize'
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        isShiftHeld.current = false
        if (isPanning.current) {
          isPanning.current = false
          const controls = controlsRef.current
          if (controls) {
            controls.enabled = true
          }
        }
        canvas.style.cursor = ''
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (!isShiftHeld.current || e.button !== 0) return

      e.preventDefault()
      isPanning.current = true
      canvas.dataset.cameraVerticalPanning = 'true'
      prevMouse.current = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'row-resize'

      const controls = controlsRef.current
      if (controls) {
        controls.enabled = false
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPanning.current) return

      const dy = e.clientY - prevMouse.current.y
      prevMouse.current = { x: e.clientX, y: e.clientY }

      // Scale factor: approximate world units per pixel based on distance to target
      const controls = controlsRef.current
      const distance = controls
        ? camera.position.distanceTo(controls.target)
        : camera.position.length()

      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50
      const scale = (distance * Math.tan(((fov / 2) * Math.PI) / 180)) / (canvas.clientHeight / 2)

      // Drag upward (negative screen Y delta) -> camera goes higher (Y increases)
      // Drag downward (positive screen Y delta) -> camera goes lower (Y decreases)
      const yDelta = -dy * scale

      camera.position.y += yDelta
      if (controls) {
        controls.target.y += yDelta
      }
    }

    const handlePointerUp = () => {
      if (!isPanning.current) return

      isPanning.current = false
      canvas.dataset.cameraVerticalPanning = 'false'
      const controls = controlsRef.current
      if (controls) {
        controls.enabled = true
      }
      canvas.style.cursor = isShiftHeld.current ? 'n-resize' : ''
    }

    // Also stop panning if window loses focus
    const handleBlur = () => {
      isShiftHeld.current = false
      if (isPanning.current) {
        isPanning.current = false
        canvas.dataset.cameraVerticalPanning = 'false'
        const controls = controlsRef.current
        if (controls) {
          controls.enabled = true
        }
      }
      canvas.style.cursor = ''
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      canvas.dataset.cameraVerticalPanning = 'false'
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [camera, gl, controlsRef])

  return null
}
