import type { Config } from '@/core/types'
import type { GateNudge } from '@/editor/store/trackOperations'

const FREE_MOVE_STEP = 0.1
const FREE_ROTATION_STEP = 5
const SNAP_ROTATION_STEP = 15

/**
 * Arrow keys move on the ground (up = north/-z, right = east/+x); with Shift,
 * left/right rotate and up/down change the height. Steps follow grid snap.
 */
export function getArrowKeyNudge(
  key: string,
  shiftKey: boolean,
  config: Pick<Config, 'snapGatesToGrid' | 'snapGridSize'>,
): GateNudge | null {
  const step = config.snapGatesToGrid ? config.snapGridSize : FREE_MOVE_STEP
  const rotationStep = config.snapGatesToGrid ? SNAP_ROTATION_STEP : FREE_ROTATION_STEP

  switch (key) {
    case 'ArrowUp':
      return shiftKey ? { dy: step } : { dz: -step }
    case 'ArrowDown':
      return shiftKey ? { dy: -step } : { dz: step }
    case 'ArrowLeft':
      return shiftKey ? { rotation: -rotationStep } : { dx: -step }
    case 'ArrowRight':
      return shiftKey ? { rotation: rotationStep } : { dx: step }
    default:
      return null
  }
}
