import type { ThreeEvent } from '@react-three/fiber'

/** True while a camera touch gesture (pan/pinch) is active, so taps during it do not select. */
export function isCameraTouchGesture(e: ThreeEvent<MouseEvent>): boolean {
  const target = e.nativeEvent.target
  if (!(target instanceof HTMLElement)) return false

  return target.closest('canvas')?.dataset.cameraTouchGesturing === 'true'
}
