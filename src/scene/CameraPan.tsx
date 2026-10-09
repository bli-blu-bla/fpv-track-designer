import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3, PerspectiveCamera } from 'three'
import type { OrbitControls } from 'three-stdlib'

interface CameraPanProps {
  controlsRef: React.RefObject<OrbitControls | null>
}

export function CameraPan({ controlsRef }: CameraPanProps) {
  const { camera, gl } = useThree()

  const isSpaceHeld = useRef(false)
  const isPanning = useRef(false)
  const isTouchPanning = useRef(false)
  const prevMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = gl.domElement
    let isUsingNativeTouch = false

    const setControlsEnabled = (enabled: boolean) => {
      const controls = controlsRef.current
      if (controls) {
        controls.enabled = enabled
      }
    }

    const applyPlanarPan = (dx: number, dy: number) => {
      // Convert screen delta to world-space delta on the XZ plane
      // Extract camera right and up from its world matrix
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)

      // Zero out Y components for horizontal-only movement
      right.y = 0
      up.y = 0

      right.normalize()
      up.normalize()

      // Scale factor: approximate world units per pixel based on distance to target
      const controls = controlsRef.current
      const distance = controls
        ? camera.position.distanceTo(controls.target)
        : camera.position.length()

      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50
      const scale = (distance * Math.tan(((fov / 2) * Math.PI) / 180)) / (canvas.clientHeight / 2)

      const panDelta = right.multiplyScalar(-dx * scale).add(up.multiplyScalar(dy * scale))

      // Apply to camera and OrbitControls target
      camera.position.add(panDelta)
      if (controls) {
        controls.target.add(panDelta)
      }
    }

    const touchPointers = new Map<number, { x: number; y: number }>()

    const getTouchMidpoint = () => {
      const [first, second] = Array.from(touchPointers.values())
      if (!first || !second) return null

      return {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      }
    }

    const getNativeTouchMidpoint = (touches: TouchList) => {
      const first = touches.item(0)
      const second = touches.item(1)
      if (!first || !second) return null

      return {
        x: (first.clientX + second.clientX) / 2,
        y: (first.clientY + second.clientY) / 2,
      }
    }

    const stopTouchPanning = () => {
      if (!isTouchPanning.current) return

      isTouchPanning.current = false
      isUsingNativeTouch = false
      canvas.dataset.cameraPanning = 'false'
      setControlsEnabled(true)
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length < 2) return

      const midpoint = getNativeTouchMidpoint(e.touches)
      if (!midpoint) return

      isUsingNativeTouch = true
      if (e.cancelable) {
        e.preventDefault()
      }
      e.stopPropagation()
      isTouchPanning.current = true
      canvas.dataset.cameraPanning = 'true'
      prevMouse.current = midpoint
      setControlsEnabled(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchPanning.current || e.touches.length < 2) return

      const midpoint = getNativeTouchMidpoint(e.touches)
      if (!midpoint) return

      if (e.cancelable) {
        e.preventDefault()
      }
      e.stopPropagation()

      const dx = midpoint.x - prevMouse.current.x
      const dy = midpoint.y - prevMouse.current.y
      prevMouse.current = midpoint
      applyPlanarPan(dx, dy)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isUsingNativeTouch) return

      if (e.touches.length >= 2) {
        const midpoint = getNativeTouchMidpoint(e.touches)
        if (midpoint) {
          prevMouse.current = midpoint
        }
        return
      }

      touchPointers.clear()
      stopTouchPanning()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        isSpaceHeld.current = true
        canvas.style.cursor = 'grab'
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpaceHeld.current = false
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
      if (e.pointerType === 'touch') {
        if (isUsingNativeTouch) return

        touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

        if (touchPointers.size === 2) {
          const midpoint = getTouchMidpoint()
          if (!midpoint) return

          e.preventDefault()
          e.stopPropagation()
          isTouchPanning.current = true
          canvas.dataset.cameraPanning = 'true'
          prevMouse.current = midpoint
          setControlsEnabled(false)
        }
        return
      }

      if (e.button === 2) {
        e.preventDefault()
      }
      if ((!isSpaceHeld.current && e.button !== 2) || (e.button !== 0 && e.button !== 2)) return

      isPanning.current = true
      canvas.dataset.cameraPanning = 'true'
      prevMouse.current = { x: e.clientX, y: e.clientY }
      canvas.style.cursor = 'grabbing'
      setControlsEnabled(false)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        if (isUsingNativeTouch) return
        if (!touchPointers.has(e.pointerId)) return

        touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (!isTouchPanning.current || touchPointers.size !== 2) return

        const midpoint = getTouchMidpoint()
        if (!midpoint) return

        e.preventDefault()
        e.stopPropagation()

        const dx = midpoint.x - prevMouse.current.x
        const dy = midpoint.y - prevMouse.current.y
        prevMouse.current = midpoint
        applyPlanarPan(dx, dy)
        return
      }

      if (!isPanning.current) return

      const dx = e.clientX - prevMouse.current.x
      const dy = e.clientY - prevMouse.current.y
      prevMouse.current = { x: e.clientX, y: e.clientY }
      applyPlanarPan(dx, dy)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        if (isUsingNativeTouch) return
        touchPointers.delete(e.pointerId)
        if (touchPointers.size < 2) {
          stopTouchPanning()
        } else {
          const midpoint = getTouchMidpoint()
          if (midpoint) {
            prevMouse.current = midpoint
          }
        }
        return
      }

      if (!isPanning.current) return

      isPanning.current = false
      canvas.dataset.cameraPanning = 'false'
      setControlsEnabled(true)
      canvas.style.cursor = isSpaceHeld.current ? 'grab' : ''
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      if (isUsingNativeTouch) return

      touchPointers.delete(e.pointerId)
      stopTouchPanning()
    }

    // Also stop panning if window loses focus
    const handleBlur = () => {
      isSpaceHeld.current = false
      if (isPanning.current) {
        isPanning.current = false
        canvas.dataset.cameraPanning = 'false'
        setControlsEnabled(true)
      }
      touchPointers.clear()
      stopTouchPanning()
      canvas.style.cursor = ''
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false })
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointercancel', handlePointerCancel)
    canvas.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('blur', handleBlur)

    return () => {
      canvas.dataset.cameraPanning = 'false'
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
      canvas.removeEventListener('touchcancel', handleTouchEnd)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointercancel', handlePointerCancel)
      canvas.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('blur', handleBlur)
    }
  }, [camera, gl, controlsRef])

  return null
}
