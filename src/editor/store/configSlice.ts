import type { StateCreator } from 'zustand'
import type { Config, GateType, SnapGridSize, ThemeId } from '@/core/types'
import { defaultConfig } from '@/core/defaultConfig'

export interface ConfigSlice {
  config: Config
  setConfig: (config: Config) => void
  setGateQuantity: (type: GateType, quantity: number) => void
  setFieldSize: (width: number, height: number) => void
  setSnapGatesToGrid: (value: boolean) => void
  setSnapGridSize: (value: SnapGridSize) => void
  setShowGrid: (value: boolean) => void
  setShowFlightPath: (value: boolean) => void
  setShowOpeningLabels: (value: boolean) => void
  setTheme: (theme: ThemeId) => void
  resetToDefault: () => void
}



export const createConfigSlice: StateCreator<ConfigSlice, [], [], ConfigSlice> = (set) => ({
  config: defaultConfig,
  setConfig: (config) => set({ config }),
  setGateQuantity: (type, quantity) => set((state) => ({
    config: {
      ...state.config,
      gateQuantities: { ...state.config.gateQuantities, [type]: quantity },
    },
  })),
  setFieldSize: (width, height) => set((state) => ({
    config: { ...state.config, fieldSize: { width, height } },
  })),
  setSnapGatesToGrid: (value) => set((state) => ({
    config: { ...state.config, snapGatesToGrid: value },
  })),
  setSnapGridSize: (value) => set((state) => ({
    config: { ...state.config, snapGridSize: value },
  })),
  setShowGrid: (value) => set((state) => ({
    config: { ...state.config, showGrid: value },
  })),
  setShowFlightPath: (value) => set((state) => ({
    config: { ...state.config, showFlightPath: value },
  })),
  setShowOpeningLabels: (value) => set((state) => ({
    config: { ...state.config, showOpeningLabels: value },
  })),
  setTheme: (theme) => set((state) => ({
    config: { ...state.config, theme },
  })),
  resetToDefault: () => set({ config: defaultConfig }),
})
