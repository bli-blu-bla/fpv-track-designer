import type { Config } from '@/core/types/config'

export type GenerationConfig = Pick<Config, 'gateQuantities' | 'fieldSize'>

export function extractGenerationConfig(config: Config): GenerationConfig {
  return {
    gateQuantities: { ...config.gateQuantities },
    fieldSize: { ...config.fieldSize },
  }
}

export function hasConfigDrift(
  current: Config,
  generation: GenerationConfig | null,
): boolean {
  if (!generation) return false
  if (current.fieldSize.width !== generation.fieldSize.width) return true
  if (current.fieldSize.height !== generation.fieldSize.height) return true
  const currentEntries = Object.entries(current.gateQuantities)
  const generationEntries = Object.entries(generation.gateQuantities)
  if (currentEntries.length !== generationEntries.length) return true
  for (const [key, value] of currentEntries) {
    if (generation.gateQuantities[key as keyof typeof generation.gateQuantities] !== value) return true
  }
  return false
}
