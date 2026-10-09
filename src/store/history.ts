import type { Track } from '../types'

export const MAX_HISTORY = 50

export interface TrackHistoryEntry {
  track: Track
  selectedGateId: string | null
  selectedGateIds: string[]
  isTrackModified: boolean
}

interface HistorySource {
  currentTrack: Track | null
  selectedGateId: string | null
  selectedGateIds: string[]
  isTrackModified: boolean
  past: TrackHistoryEntry[]
}

export function createHistoryEntry(state: Omit<HistorySource, 'past'>): TrackHistoryEntry | null {
  if (!state.currentTrack) return null

  return {
    track: state.currentTrack,
    selectedGateId: state.selectedGateId,
    selectedGateIds: state.selectedGateIds,
    isTrackModified: state.isTrackModified,
  }
}

/** Snapshot the current state before an undoable change and drop the redo stack. */
export function pushHistory(state: HistorySource): { past: TrackHistoryEntry[]; future: TrackHistoryEntry[] } {
  const entry = createHistoryEntry(state)
  return { past: entry ? appendHistory(state.past, entry) : state.past, future: [] }
}

export function appendHistory(past: TrackHistoryEntry[], entry: TrackHistoryEntry): TrackHistoryEntry[] {
  return [...past, entry].slice(-MAX_HISTORY)
}

/** Restores a snapshot's selection, dropping gates that no longer exist. */
export function getSelectionState(track: Track, selectedGateId: string | null, selectedGateIds: string[]) {
  const existingGateIds = new Set(track.gates.map((gate) => gate.id))
  const nextSelectedGateIds = [...new Set(selectedGateIds)].filter((gateId) => existingGateIds.has(gateId))

  if (selectedGateId && existingGateIds.has(selectedGateId)) {
    return {
      selectedGateId,
      selectedGateIds: nextSelectedGateIds.includes(selectedGateId)
        ? nextSelectedGateIds
        : [selectedGateId, ...nextSelectedGateIds],
    }
  }

  return {
    selectedGateId: nextSelectedGateIds[0] ?? null,
    selectedGateIds: nextSelectedGateIds,
  }
}
