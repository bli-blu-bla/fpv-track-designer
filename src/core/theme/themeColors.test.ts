import { describe, expect, it } from 'vitest'
import { GROUND_IDS, QUALITY_IDS, SKY_IDS } from '@/core/types/theme'
import { getSceneLook, shadeHex } from './themeColors'

describe('getSceneLook', () => {
  it('resolves every sky, ground and quality combination', () => {
    for (const sky of SKY_IDS) for (const ground of GROUND_IDS) for (const quality of QUALITY_IDS) {
      const look = getSceneLook({ sky, ground, quality })
      expect(look.colors.groundSurface).toMatch(/^#[0-9a-f]{6}$/i)
      expect(Object.keys(look.colors.gates)).toHaveLength(11)
    }
  })

  it('takes the field surface from the ground and the light from the sky', () => {
    const hall = getSceneLook({ sky: 'day', ground: 'hall', quality: 'simple' })
    const grassDusk = getSceneLook({ sky: 'dusk', ground: 'grass', quality: 'simple' })

    expect(hall.colors.groundSurface).toBe('#A56D3A')
    expect(grassDusk.colors.sunColor).toBe('#FFB27A')
  })

  it('gives the gym floor a parquet pattern and court lines; other grounds stay plain', () => {
    const gym = getSceneLook({ sky: 'day', ground: 'hall', quality: 'simple' })
    const grass = getSceneLook({ sky: 'day', ground: 'grass', quality: 'simple' })

    expect(gym.colors).toMatchObject({ groundPattern: 'parquet', groundTint: '#ffffff' })
    expect(gym.colors.courtLines?.main).toBe('#18181B')
    expect(grass.colors.groundPattern).toBeUndefined()
    expect(grass.colors.courtLines).toBeUndefined()
    expect(getSceneLook({ sky: 'night', ground: 'hall', quality: 'simple' }).colors.groundTint).toBe(shadeHex('#ffffff', 0.72))
  })

  it('adds environment, shadows and sun glow only for realistic quality', () => {
    const simple = getSceneLook({ sky: 'day', ground: 'grass', quality: 'simple' })
    const realistic = getSceneLook({ sky: 'day', ground: 'grass', quality: 'realistic' })

    expect(simple).toMatchObject({ environment: null, shadows: false, sunGlow: false })
    expect(realistic).toMatchObject({ environment: { preset: 'sunset' }, shadows: true, sunGlow: true })
  })

  it('keeps night neon: stars, bloom, unlit and darkened ground, neon field lines', () => {
    const night = getSceneLook({ sky: 'night', ground: 'grass', quality: 'simple' })

    expect(night).toMatchObject({ background: 'stars', bloom: true, unlitGround: true })
    expect(night.colors.groundSurface).toBe(shadeHex('#6F8732', 0.72))
    expect(night.colors.groundBoundary).toBe('#FF00E5')
  })

  it('returns the same object for the same combination', () => {
    expect(getSceneLook({ sky: 'studio', ground: 'asphalt', quality: 'simple' }))
      .toBe(getSceneLook({ sky: 'studio', ground: 'asphalt', quality: 'simple' }))
  })
})

describe('shadeHex', () => {
  it('scales each channel', () => {
    expect(shadeHex('#808080', 0.5)).toBe('#404040')
    expect(shadeHex('#ff0000', 1)).toBe('#ff0000')
  })
})
