import { describe, expect, it } from 'vitest'
import { getArrowKeyNudge } from './keyboardNudge'

const free = { snapGatesToGrid: false, snapGridSize: 0.5 } as const
const snapped = { snapGatesToGrid: true, snapGridSize: 0.5 } as const

describe('getArrowKeyNudge', () => {
  it('moves on the ground with plain arrows', () => {
    expect(getArrowKeyNudge('ArrowUp', false, free)).toEqual({ dz: -0.1 })
    expect(getArrowKeyNudge('ArrowDown', false, free)).toEqual({ dz: 0.1 })
    expect(getArrowKeyNudge('ArrowLeft', false, free)).toEqual({ dx: -0.1 })
    expect(getArrowKeyNudge('ArrowRight', false, free)).toEqual({ dx: 0.1 })
  })

  it('changes height and rotation with Shift', () => {
    expect(getArrowKeyNudge('ArrowUp', true, free)).toEqual({ dy: 0.1 })
    expect(getArrowKeyNudge('ArrowDown', true, free)).toEqual({ dy: -0.1 })
    expect(getArrowKeyNudge('ArrowLeft', true, free)).toEqual({ rotation: -5 })
    expect(getArrowKeyNudge('ArrowRight', true, free)).toEqual({ rotation: 5 })
  })

  it('uses the snap grid and 15 degree steps when snapping', () => {
    expect(getArrowKeyNudge('ArrowRight', false, snapped)).toEqual({ dx: 0.5 })
    expect(getArrowKeyNudge('ArrowUp', true, snapped)).toEqual({ dy: 0.5 })
    expect(getArrowKeyNudge('ArrowRight', true, snapped)).toEqual({ rotation: 15 })
  })

  it('ignores other keys', () => {
    expect(getArrowKeyNudge('a', false, free)).toBeNull()
  })
})
