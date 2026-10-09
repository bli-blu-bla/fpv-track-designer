import { describe, expect, it } from 'vitest'
import type { Gate } from '@/core/types'
import { createDefaultGateOpenings, normalizeGate } from './gateOpenings'

describe('createDefaultGateOpenings', () => {
  it('creates a single side-pass opening for flags', () => {
    const openings = createDefaultGateOpenings('flag')

    expect(openings).toHaveLength(1)
    expect(openings.map((opening) => opening.id)).toEqual(['main'])
    expect(openings[0].position.x).toBeLessThan(0)
    expect(openings[0].position.x).toBe(-0.45)
  })

  it('creates one front entry opening for octagonal tunnel gates', () => {
    const openings = createDefaultGateOpenings('octagonal-tunnel')

    expect(openings).toHaveLength(1)
    expect(openings[0]).toMatchObject({
      id: 'main',
      position: { x: 0, z: -1 },
      rotation: 0,
    })
    expect(openings[0].position.y).toBeCloseTo(0.6, 9)
    expect(openings[0].width).toBeCloseTo(1.2, 9)
    expect(openings[0].height).toBeCloseTo(1.2, 9)
  })

  it('creates top and bottom openings for double gates', () => {
    const openings = createDefaultGateOpenings('double')

    expect(openings).toHaveLength(2)
    expect(openings.map((opening) => opening.id)).toEqual(['lower', 'upper'])
    expect(openings[0].position.y).toBeLessThan(openings[1].position.y)
  })

  it('creates three ladder-like openings for double-h gates', () => {
    const openings = createDefaultGateOpenings('double-h')

    expect(openings).toHaveLength(3)
    expect(openings.map((opening) => opening.id)).toEqual(['lower', 'middle', 'upper'])
    expect(openings[0].position.y).toBeLessThan(openings[1].position.y)
    expect(openings[1].position.y).toBeLessThan(openings[2].position.y)
  })

  it('creates a lower fly-through and backrest pass for h-gates', () => {
    const openings = createDefaultGateOpenings('h-gate')

    expect(openings).toHaveLength(2)
    expect(openings.map((opening) => opening.id)).toEqual(['lower', 'backrest-pass'])
    expect(openings.find((opening) => opening.id === 'upper')).toBeUndefined()
    expect(openings[0].position.x).toBe(0)
    expect(openings[1].rotation).toBe(openings[0].rotation)
  })

  it('centers h-gate backrest pass above the lower opening', () => {
    const openings = createDefaultGateOpenings('h-gate')
    const backrestPass = openings.find((opening) => opening.id === 'backrest-pass')

    expect(backrestPass?.position.x).toBe(0)
  })

  it('aligns h-gate entry and exit sides across both openings', () => {
    const openings = createDefaultGateOpenings('h-gate')
    const lower = openings.find((opening) => opening.id === 'lower')
    const backrestPass = openings.find((opening) => opening.id === 'backrest-pass')

    expect(backrestPass?.rotation).toBe(lower?.rotation)
  })

  it('creates a dive gate with a top entry and one random side exit', () => {
    const openings = createDefaultGateOpenings('dive', 'stable-gate-id')

    expect(openings).toHaveLength(2)
    expect(openings[0].id).toBe('entry-top')
    expect(openings[0].position.y).toBe(1.2)
    expect(openings[0].rotationX).toBe(90)
    expect(openings[1].id).toMatch(/^exit-(front|back|left|right)$/)
  })

  it('creates one upper opening for hurdles above the closed lower body', () => {
    const openings = createDefaultGateOpenings('hurdle')

    expect(openings).toHaveLength(1)
    expect(openings[0]).toMatchObject({
      id: 'main',
      position: { x: 0, y: 1.74, z: 0 },
      width: 2.4,
      height: 1.08,
      rotation: 0,
    })
  })

  it('uses deterministic dive exit side for the same gate id', () => {
    const a = createDefaultGateOpenings('dive', 'same-id')
    const b = createDefaultGateOpenings('dive', 'same-id')

    expect(a).toEqual(b)
    expect(a[1].id).toEqual(b[1].id)
  })

  it('orients dive side exits with green inside and red outside', () => {
    expect(createDefaultGateOpenings('dive', 'd')[1]).toMatchObject({
      id: 'exit-front',
      position: { x: 0, y: 0.6, z: -0.6 },
      rotation: 180,
    })
    expect(createDefaultGateOpenings('dive', 'e')[1]).toMatchObject({
      id: 'exit-back',
      position: { x: 0, y: 0.6, z: 0.6 },
      rotation: 0,
    })
    expect(createDefaultGateOpenings('dive', 'f')[1]).toMatchObject({
      id: 'exit-left',
      position: { x: -0.6, y: 0.6, z: 0 },
      rotation: 270,
    })
    expect(createDefaultGateOpenings('dive', 'g')[1]).toMatchObject({
      id: 'exit-right',
      position: { x: 0.6, y: 0.6, z: 0 },
      rotation: 90,
    })
  })

  it('normalizes a legacy single dive opening into top entry and side exit', () => {
    const legacy: Gate = {
      id: 'legacy-dive-gate',
      type: 'dive',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: [
        {
          id: 'main',
          position: { x: 0, y: 1.2 / 2, z: 0 },
          width: 1.2,
          height: 1.2,
          rotation: 0,
        },
      ],
    }
    const normalized = normalizeGate(legacy)

    expect(normalized.openings).toHaveLength(2)
    expect(normalized.openings[0].id).toBe('entry-top')
    expect(normalized.openings[1].id).toMatch(/^exit-(front|back|left|right)$/)
  })

  it('normalizes legacy two-opening double-h gates into lower, middle and upper passes', () => {
    const legacy: Gate = {
      id: 'legacy-double-h-gate',
      type: 'double-h',
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      openings: [
        {
          id: 'lower',
          position: { x: 0, y: 0.6, z: 0 },
          width: 1.2,
          height: 1.2,
          rotation: 0,
        },
        {
          id: 'upper',
          position: { x: 0, y: 1.8, z: 0 },
          width: 1.2,
          height: 1.2,
          rotation: 0,
          reverse: true,
        },
      ],
    }
    const normalized = normalizeGate(legacy)

    expect(normalized.openings).toHaveLength(3)
    expect(normalized.openings.map((opening) => opening.id)).toEqual(['lower', 'middle', 'upper'])
    expect(normalized.openings[1].reverse).toBe(true)
    expect(normalized.openings[2].reverse).toBeUndefined()
  })

  it('creates a half-width, standard-height opening for small flags with a standard-height pole', () => {
    const openings = createDefaultGateOpenings('flag-small')

    expect(openings).toHaveLength(1)
    expect(openings.map((opening) => opening.id)).toEqual(['main'])
    // Opening sits beside the pole, right edge adjacent like the regular flag
    expect(openings[0].position.x).toBe(-0.35)
    // Vertically centered on the 1.2m pole (same ground clearance as the flag gate)
    expect(openings[0].position.y).toBeCloseTo(0.6, 9)
    // Half the width of a standard gate opening (1.2), same height (1.2)
    expect(openings[0].width).toBeCloseTo(0.6, 9)
    expect(openings[0].height).toBeCloseTo(1.2, 9)
  })
})