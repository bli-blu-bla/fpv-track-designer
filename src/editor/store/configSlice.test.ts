import { describe, it, expect } from 'vitest'
import { create } from 'zustand'
import { createConfigSlice, defaultConfig, type ConfigSlice } from './configSlice'

const createTestStore = () =>
  create<ConfigSlice>()((set, get, store) => ({
    ...createConfigSlice(set, get, store),
  }))

describe('ConfigSlice - default settings', () => {
  it('defines the default field size', () => {
    expect(defaultConfig.fieldSize.width).toBe(30)
    expect(defaultConfig.fieldSize.height).toBe(15)
  })

  it('defines standard as 3, h-gate as 2, dive, double, octagonal tunnel, flag and small flag as 1 by default, ladder, double-h and hurdle as 0', () => {
    const config = defaultConfig

    expect(config.gateQuantities.standard).toBe(3)
    expect(config.gateQuantities['start-finish']).toBe(1)
    expect(config.gateQuantities['h-gate']).toBe(2)
    expect(config.gateQuantities['double-h']).toBe(0)
    expect(config.gateQuantities.hurdle).toBe(0)
    expect(config.gateQuantities.dive).toBe(1)
    expect(config.gateQuantities.double).toBe(1)
    expect(config.gateQuantities.ladder).toBe(0)
    expect(config.gateQuantities.flag).toBe(1)
    expect(config.gateQuantities['flag-small']).toBe(1)
    expect(config.gateQuantities['octagonal-tunnel']).toBe(1)
  })

  it('resets to defaults including required gate counts', () => {
    const store = createTestStore()

    store.getState().setGateQuantity('standard', 5)
    store.getState().setGateQuantity('flag', 3)
    store.getState().setGateQuantity('ladder', 0)
    store.getState().setGateQuantity('dive', 4)
    store.getState().setGateQuantity('double-h', 2)
    store.getState().setGateQuantity('h-gate', 1)

    store.getState().resetToDefault()

    expect(store.getState().config.gateQuantities.standard).toBe(3)
    expect(store.getState().config.gateQuantities['start-finish']).toBe(1)
    expect(store.getState().config.gateQuantities['h-gate']).toBe(2)
    expect(store.getState().config.gateQuantities['double-h']).toBe(0)
    expect(store.getState().config.gateQuantities.hurdle).toBe(0)
    expect(store.getState().config.gateQuantities.dive).toBe(1)
    expect(store.getState().config.gateQuantities.ladder).toBe(0)
    expect(store.getState().config.gateQuantities.flag).toBe(1)
    expect(store.getState().config.gateQuantities['flag-small']).toBe(1)
    expect(store.getState().config.gateQuantities['octagonal-tunnel']).toBe(1)
  })

  it('replaces config when loading a saved track', () => {
    const store = createTestStore()

    store.getState().setConfig({
      gateQuantities: {
        standard: 3,
        'start-finish': 1,
        'h-gate': 0,
        'double-h': 2,
        hurdle: 1,
        dive: 1,
        double: 0,
        ladder: 4,
        flag: 1,
        'flag-small': 0,
        'octagonal-tunnel': 2,
      },
      fieldSize: { width: 42, height: 24 },
      snapGatesToGrid: true,
      snapGridSize: 0.5,
      showFlightPath: false,
      showOpeningLabels: false,
      showGrid: true,
      theme: 'minimal',
    })

    expect(store.getState().config.fieldSize).toEqual({ width: 42, height: 24 })
    expect(store.getState().config.snapGatesToGrid).toBe(true)
    expect(store.getState().config.snapGridSize).toBe(0.5)
    expect(store.getState().config.showFlightPath).toBe(false)
    expect(store.getState().config.gateQuantities.ladder).toBe(4)
  })

  it('updates the snap grid size independently from the snap toggle', () => {
    const store = createTestStore()

    store.getState().setSnapGridSize(1)

    expect(store.getState().config.snapGridSize).toBe(1)
    expect(store.getState().config.snapGatesToGrid).toBe(false)
  })
})
