import { create } from 'zustand'
import type { Config, Track } from '@/core/types'
import type { EntrySummary, NamespaceSummary } from '@/core/api/collections'

export type ViewerStatus = 'loading' | 'ready' | 'error'

/** Shown above the scene when the track is a collection entry. */
export interface ViewerEntryContext {
  namespace: NamespaceSummary
  entryName: string
  labels: string[]
}

export interface ViewerCollection {
  namespace: NamespaceSummary
  entries: EntrySummary[]
}

interface ViewerState {
  status: ViewerStatus
  track: Track | null
  config: Config | null
  entryContext: ViewerEntryContext | null
  collection: ViewerCollection | null
  error: string | null
  setLoading: () => void
  setTrackData: (track: Track, config: Config, entryContext?: ViewerEntryContext | null) => void
  setCollection: (collection: ViewerCollection) => void
  setError: (error: string) => void
  reset: () => void
}

const initialViewerState = {
  status: 'loading' as ViewerStatus,
  track: null,
  config: null,
  entryContext: null,
  collection: null,
  error: null,
}

export const useViewerStore = create<ViewerState>()((set) => ({
  ...initialViewerState,
  setLoading: () => set(initialViewerState),
  setTrackData: (track, config, entryContext = null) => set({ ...initialViewerState, status: 'ready', track, config, entryContext }),
  setCollection: (collection) => set({ ...initialViewerState, status: 'ready', collection }),
  setError: (error) => set({ ...initialViewerState, status: 'error', error }),
  reset: () => set(initialViewerState),
}))
