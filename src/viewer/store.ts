import { create } from 'zustand'
import type { Config, Track } from '@/core/types'

interface ViewerState {
  track: Track | null
  config: Config | null
  error: string | null
  setTrackData: (track: Track, config: Config) => void
  setError: (error: string) => void
  reset: () => void
}

const initialViewerState = {
  track: null,
  config: null,
  error: null,
}

export const useViewerStore = create<ViewerState>()((set) => ({
  ...initialViewerState,
  setTrackData: (track, config) => set({ track, config, error: null }),
  setError: (error) => set({ ...initialViewerState, error }),
  reset: () => set(initialViewerState),
}))
