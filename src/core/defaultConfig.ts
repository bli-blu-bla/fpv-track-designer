import type { Config } from './types'

/** Settings for a first visit and the base for 'reset to default'. */
export const defaultConfig: Config = {
  gateQuantities: {
    'standard': 3,
    'start-finish': 1,
    'h-gate': 2,
    'double-h': 0,
    'hurdle': 0,
    'dive': 1,
    'double': 1,
    'ladder': 0,
    'flag': 1,
    'flag-small': 1,
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
