import { describe, it, expect } from 'vitest'
import type { Config } from '@/core/types/config'
import { extractGenerationConfig, hasConfigDrift } from './generationConfig'

const baseConfig: Config = {
  gateQuantities: {
    'standard': 2,
    'start-finish': 1,
    'h-gate': 1,
    'double-h': 1,
    'hurdle': 1,
    'dive': 1,
    'double': 1,
    'ladder': 1,
    'flag': 1,
    'flag-small': 0,
    'octagonal-tunnel': 1,
  },
  fieldSize: { width: 30, height: 15 },
  snapGatesToGrid: false,
  snapGridSize: 0.3,
  showGrid: false,
  showFlightPath: true,
  showOpeningLabels: true,
  sky: 'day',
  ground: 'grass',
  quality: 'simple',
}

function makeConfig(overrides?: Partial<Config>): Config {
  return { ...baseConfig, ...overrides }
}

describe('extractGenerationConfig', () => {
  it('returns clones — mutating result.gateQuantities does not mutate input', () => {
    const config = makeConfig()
    const result = extractGenerationConfig(config)

    result.gateQuantities['standard'] = 99
    expect(config.gateQuantities['standard']).toBe(2)
  })

  it('returns clones — mutating result.fieldSize does not mutate input', () => {
    const config = makeConfig()
    const result = extractGenerationConfig(config)

    result.fieldSize.width = 999
    expect(config.fieldSize.width).toBe(30)
  })

  it('only includes generation-relevant fields', () => {
    const config = makeConfig()
    const result = extractGenerationConfig(config)

    expect(Object.keys(result).sort()).toEqual(['fieldSize', 'gateQuantities'])
  })
})

describe('hasConfigDrift', () => {
  it('returns false when generation is null', () => {
    expect(hasConfigDrift(makeConfig(), null)).toBe(false)
  })

  it('returns false when configs are equivalent', () => {
    const config = makeConfig()
    const generation = extractGenerationConfig(config)
    expect(hasConfigDrift(config, generation)).toBe(false)
  })

  it('returns true for changed fieldSize.width', () => {
    const config = makeConfig({ fieldSize: { width: 40, height: 15 } })
    const generation = extractGenerationConfig(makeConfig())
    expect(hasConfigDrift(config, generation)).toBe(true)
  })

  it('returns true for changed fieldSize.height', () => {
    const config = makeConfig({ fieldSize: { width: 30, height: 25 } })
    const generation = extractGenerationConfig(makeConfig())
    expect(hasConfigDrift(config, generation)).toBe(true)
  })

  it('returns true for changed gateQuantities value', () => {
    const config = makeConfig({ gateQuantities: { ...baseConfig.gateQuantities, standard: 3 } })
    const generation = extractGenerationConfig(makeConfig())
    expect(hasConfigDrift(config, generation)).toBe(true)
  })

  it('ignores non-generation config fields', () => {
    const config = makeConfig({
      snapGatesToGrid: true,
      snapGridSize: 1,
      showFlightPath: false,
      showOpeningLabels: false,
    })
    const generation = extractGenerationConfig(makeConfig())
    expect(hasConfigDrift(config, generation)).toBe(false)
  })
})
