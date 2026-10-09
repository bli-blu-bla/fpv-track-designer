import type { StateCreator } from 'zustand'
import type { Gate, Track } from '@/core/types'
import { normalizeGates, recreateGateOpenings } from '@/core/gates/gateOpenings'
import { buildDefaultGateSequenceEntries } from '@/core/gates/gateSequence'
import type { GenerationConfig } from '@/core/track/generationConfig'
import { CLOSED_GATE_DIALOGS } from './editorUiSlice'
import { appendHistory, createHistoryEntry, getSelectionState, pushHistory, type TrackHistoryEntry } from './history'
import {
  getMoveDelta,
  hasSingletonGateConflict,
  normalizeRotation,
  normalizeTrack,
  prepareGatePosition,
  touchTrack,
  translatePosition,
  type MoveDirection,
} from './trackOperations'
import type { AppState } from './types'

/** The edited track document plus its undo/redo history and dirty flag. */
export interface TrackSlice {
  currentTrack: Track | null
  past: TrackHistoryEntry[]
  future: TrackHistoryEntry[]
  /** Drag-start snapshot; committed to `past` once when the drag ends. */
  dragHistoryEntry: TrackHistoryEntry | null
  generationConfig: GenerationConfig | null
  isTrackModified: boolean
  setTrack: (track: Track | null, generationConfig?: GenerationConfig | null) => void
  replaceTrack: (track: Track | null) => void
  syncCurrentTrack: (track: Track) => void
  renameTrack: (name: string) => void
  updateGate: (gateId: string, updates: Partial<Gate>) => void
  setGatePosition: (gateId: string, position: { x: number; y: number; z: number }) => void
  snapAllGatesToGrid: () => void
  commitGateDrag: () => void
  setGateRotation: (gateId: string, rotation: number) => void
  moveGate: (gateId: string, direction: MoveDirection, distance?: number) => void
  moveSelectedGates: (direction: MoveDirection, distance?: number) => void
  rotateGate: (gateId: string, clockwise: boolean) => void
  insertGateAtIndex: (gate: Gate, gateIndex: number, sequenceIndex: number) => void
  deleteSelectedGates: () => void
  toggleGateDirection: (gateId: string, openingId: string) => void
  moveGateSequenceEntry: (gateId: string, openingId: string, fromSequenceNumber: number, toSequenceNumber: number) => void
  undo: () => void
  redo: () => void
}

type AppStateUpdate = Partial<AppState>

/**
 * Applies an undoable edit: snapshots history, normalizes the result and marks
 * the track dirty. `edit` returns the next track (or null to abort) plus any
 * extra state such as selection changes.
 */
function applyEdit(
  state: AppState,
  edit: (track: Track) => { track: Track; extra?: AppStateUpdate } | null,
): AppStateUpdate {
  if (!state.currentTrack) return state

  const result = edit(state.currentTrack)
  if (!result) return state

  return {
    currentTrack: touchTrack(result.track),
    ...pushHistory(state),
    isTrackModified: true,
    ...result.extra,
  }
}

function moveGates(state: AppState, gateIds: Set<string>, direction: MoveDirection, distance: number): AppStateUpdate {
  const fieldSize = state.currentTrack?.fieldSize ?? state.config.fieldSize
  const delta = getMoveDelta(direction, distance)

  return applyEdit(state, (track) => ({
    track: {
      ...track,
      gates: track.gates.map((gate) => gateIds.has(gate.id)
        ? { ...gate, position: prepareGatePosition(translatePosition(gate.position, delta), state.config, fieldSize) }
        : gate),
    },
  }))
}

function restoreHistoryEntry(entry: TrackHistoryEntry): AppStateUpdate {
  const track = normalizeTrack(entry.track)

  return {
    ...CLOSED_GATE_DIALOGS,
    currentTrack: track,
    ...getSelectionState(track, entry.selectedGateId, entry.selectedGateIds),
    dragHistoryEntry: null,
    isTrackModified: entry.isTrackModified,
  }
}

const RESET_EDITING_STATE: AppStateUpdate = {
  ...CLOSED_GATE_DIALOGS,
  selectedGateId: null,
  selectedGateIds: [],
  dragHistoryEntry: null,
  isTrackModified: false,
}

export const createTrackSlice: StateCreator<AppState, [], [], TrackSlice> = (set) => ({
  currentTrack: null,
  past: [],
  future: [],
  dragHistoryEntry: null,
  generationConfig: null,
  isTrackModified: false,
  setTrack: (track, generationConfig) => set((state) => ({
    ...RESET_EDITING_STATE,
    currentTrack: track ? normalizeTrack(track) : null,
    generationConfig: generationConfig ?? null,
    ...pushHistory(state),
  })),
  replaceTrack: (track) => set({
    ...RESET_EDITING_STATE,
    currentTrack: track ? normalizeTrack(track) : null,
    past: [],
    future: [],
    generationConfig: null,
  }),
  syncCurrentTrack: (track) => set({ currentTrack: normalizeTrack(track) }),
  renameTrack: (name) => set((state) => applyEdit(state, (track) => {
    const trimmed = name.trim()
    return trimmed && trimmed !== track.name ? { track: { ...track, name: trimmed } } : null
  })),
  updateGate: (gateId, updates) => set((state) => applyEdit(state, (track) => {
    if (updates.type && hasSingletonGateConflict(track.gates, updates.type, gateId)) return null

    return {
      track: {
        ...track,
        gates: track.gates.map((gate) => gate.id !== gateId ? gate : {
          ...gate,
          ...updates,
          openings: updates.openings
            ?? (updates.type ? recreateGateOpenings({ id: gate.id, type: updates.type }) : gate.openings),
        }),
      },
    }
  })),
  // Live drag update: no history push and no dirty flag until `commitGateDrag`.
  setGatePosition: (gateId, position) => set((state) => {
    if (!state.currentTrack) return state

    const fieldSize = state.currentTrack.fieldSize ?? state.config.fieldSize
    const nextPosition = prepareGatePosition(position, state.config, fieldSize)

    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((gate) => gate.id === gateId ? { ...gate, position: nextPosition } : gate),
      },
      dragHistoryEntry: state.dragHistoryEntry ?? createHistoryEntry(state),
    }
  }),
  snapAllGatesToGrid: () => set((state) => {
    if (!state.config.snapGatesToGrid) return state

    return applyEdit(state, (track) => ({
      track: {
        ...track,
        gates: track.gates.map((gate) => ({
          ...gate,
          position: prepareGatePosition(gate.position, state.config, track.fieldSize ?? state.config.fieldSize, true),
        })),
      },
    }))
  }),
  commitGateDrag: () => set((state) => {
    if (!state.currentTrack || !state.dragHistoryEntry) return state

    return { past: appendHistory(state.past, state.dragHistoryEntry), future: [], dragHistoryEntry: null, isTrackModified: true }
  }),
  // Live rotate-drag update; history is committed via `commitGateDrag`.
  setGateRotation: (gateId, rotation) => set((state) => {
    if (!state.currentTrack) return state

    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((gate) => gate.id === gateId ? { ...gate, rotation: normalizeRotation(rotation) } : gate),
      },
    }
  }),
  moveGate: (gateId, direction, distance = 1) => set((state) => moveGates(state, new Set([gateId]), direction, distance)),
  moveSelectedGates: (direction, distance = 1) => set((state) => {
    if (state.selectedGateIds.length === 0) return state

    return moveGates(state, new Set(state.selectedGateIds), direction, distance)
  }),
  rotateGate: (gateId, clockwise) => set((state) => applyEdit(state, (track) => ({
    track: {
      ...track,
      gates: track.gates.map((gate) => gate.id === gateId
        ? { ...gate, rotation: normalizeRotation(gate.rotation + (clockwise ? 30 : -30)) }
        : gate),
    },
  }))),
  insertGateAtIndex: (gate, gateIndex, sequenceIndex) => set((state) => applyEdit(state, (track) => {
    if (hasSingletonGateConflict(track.gates, gate.type)) return null

    const normalizedGate = normalizeGates([gate])[0]
    const gates = [...track.gates]
    const gateSequence = [...track.gateSequence]

    gates.splice(Math.max(0, Math.min(gateIndex, gates.length)), 0, normalizedGate)
    gateSequence.splice(
      Math.max(0, Math.min(sequenceIndex, gateSequence.length)),
      0,
      ...buildDefaultGateSequenceEntries(normalizedGate),
    )

    return {
      track: { ...track, gates, gateSequence },
      extra: { ...CLOSED_GATE_DIALOGS, selectedGateId: normalizedGate.id, selectedGateIds: [normalizedGate.id] },
    }
  })),
  deleteSelectedGates: () => set((state) => {
    if (state.selectedGateIds.length === 0) return state

    const selectedIds = new Set(state.selectedGateIds)
    return applyEdit(state, (track) => ({
      track: {
        ...track,
        gates: track.gates.filter((gate) => !selectedIds.has(gate.id)),
        gateSequence: track.gateSequence.filter((entry) => !selectedIds.has(entry.gateId)),
      },
      extra: { ...CLOSED_GATE_DIALOGS, selectedGateId: null, selectedGateIds: [] },
    }))
  }),
  toggleGateDirection: (gateId, openingId) => set((state) => applyEdit(state, (track) => {
    const opening = track.gates.find((gate) => gate.id === gateId)?.openings.find((candidate) => candidate.id === openingId)
    if (!opening) return null

    const reverse = !opening.reverse

    return {
      track: {
        ...track,
        gates: track.gates.map((gate) => gate.id !== gateId ? gate : {
          ...gate,
          openings: gate.openings.map((candidate) => candidate.id === openingId ? { ...candidate, reverse } : candidate),
        }),
        gateSequence: track.gateSequence.map((entry) => (
          entry.gateId === gateId && entry.openingId === openingId ? { ...entry, reverse } : entry
        )),
      },
    }
  })),
  moveGateSequenceEntry: (gateId, openingId, fromSequenceNumber, toSequenceNumber) => set((state) => applyEdit(state, (track) => {
    const sourceIndex = fromSequenceNumber - 1
    const targetIndex = toSequenceNumber - 1
    const sequence = track.gateSequence
    const sourceEntry = sequence[sourceIndex]
    const isInRange = (index: number) => index >= 0 && index < sequence.length

    if (
      !isInRange(sourceIndex)
      || !isInRange(targetIndex)
      || sourceIndex === targetIndex
      || sourceEntry.gateId !== gateId
      || sourceEntry.openingId !== openingId
    ) {
      return null
    }

    const gateSequence = [...sequence]
    const [movedEntry] = gateSequence.splice(sourceIndex, 1)
    gateSequence.splice(targetIndex, 0, movedEntry)

    return { track: { ...track, gateSequence }, extra: { sequenceEditor: null } }
  })),
  undo: () => set((state) => {
    const previousEntry = state.past[state.past.length - 1]
    const currentEntry = createHistoryEntry(state)
    if (!previousEntry || !currentEntry) return state

    return {
      ...restoreHistoryEntry(previousEntry),
      past: state.past.slice(0, -1),
      future: [currentEntry, ...state.future],
    }
  }),
  redo: () => set((state) => {
    const nextEntry = state.future[0]
    const currentEntry = createHistoryEntry(state)
    if (!nextEntry || !currentEntry) return state

    return {
      ...restoreHistoryEntry(nextEntry),
      past: [...state.past, currentEntry],
      future: state.future.slice(1),
    }
  }),
})
