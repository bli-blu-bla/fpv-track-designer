import type { StateCreator } from 'zustand'
import type { Config } from '../types/config'
import type { Track, Gate } from '../types'
import { GATE_BASE_WIDTH } from '../constants/gateDimensions'
import { normalizeGates, recreateGateOpenings } from '../utils/gateOpenings'
import { GATE_DEFINITIONS } from '../utils/gateDefinitions'
import { buildDefaultGateSequenceEntries, normalizeGateSequence } from '../utils/gateSequence'
import type { GenerationConfig } from '../utils/generationConfig'

const MAX_HISTORY = 50

function isSingletonGateType(type: Gate['type']): boolean {
  return GATE_DEFINITIONS[type].isStartFinish
}

function hasSingletonGateConflict(gates: Gate[], type: Gate['type'], ignoredGateId?: string): boolean {
  if (!isSingletonGateType(type)) return false

  return gates.some((gate) => gate.id !== ignoredGateId && gate.type === type)
}

function enforceSingletonGates(gates: Gate[]): Gate[] {
  const seenSingletonTypes = new Set<Gate['type']>()

  return gates.filter((gate) => {
    if (!isSingletonGateType(gate.type)) return true
    if (seenSingletonTypes.has(gate.type)) return false

    seenSingletonTypes.add(gate.type)
    return true
  })
}

interface TrackHistoryEntry {
  track: Track
  selectedGateId: string | null
  selectedGateIds: string[]
  isTrackModified: boolean
}

interface PendingGateInsertion {
  gateIndex: number
  sequenceIndex: number
  position: { x: number; y: number; z: number }
  rotation: number
}

interface SequenceEditorState {
  gateId: string
  openingId: string
  sourceSequenceNumber: number
}

export interface PendingDestructiveAction {
  /**
   * Callback executed when the user confirms ("Verwerfen") or after a
   * successful save ("Zuerst speichern" → save → continue).
   * The callback is responsible for performing the destructive operation
   * itself (e.g. calling setTrack with a freshly generated track).
   */
  action: () => void
  /** Localized dialog title (German) */
  title: string
  /** Localized dialog body (German) */
  description: string
}

interface SnapGridState {
  config?: Pick<Config, 'fieldSize' | 'snapGatesToGrid' | 'snapGridSize'>
}

export interface TrackSlice {
  currentTrack: Track | null
  selectedGateId: string | null
  selectedGateIds: string[]
  isDeleteDialogOpen: boolean
  pendingGateInsertion: PendingGateInsertion | null
  sequenceEditor: SequenceEditorState | null
  dragHistoryEntry: TrackHistoryEntry | null
  past: TrackHistoryEntry[]
  future: TrackHistoryEntry[]
  generationConfig: GenerationConfig | null
  isTrackModified: boolean
  pendingDestructiveAction: PendingDestructiveAction | null
  isSaveDialogOpen: boolean
  setTrack: (track: Track | null, generationConfig?: GenerationConfig | null) => void
  replaceTrack: (track: Track | null) => void
  syncCurrentTrack: (track: Track) => void
  /**
   * Guarded entry point for any action that overwrites the current track
   * (shuffle, import JSON, gallery load, gallery duplicate, apply config).
   * Runs `action` immediately when the track is clean; otherwise opens the
   * UnsavedChangesDialog and stages `action` until the user resolves it.
   */
  requestDestructiveAction: (action: () => void, title: string, description: string) => void
  /** User clicked "Verwerfen" – run staged action and clear it. */
  confirmDestructiveAction: () => void
  /** User clicked "Abbrechen" – discard staged action without running it. */
  cancelDestructiveAction: () => void
  /** User clicked "Zuerst speichern" – open SaveTrackDialog while keeping the staged action. */
  saveBeforeDestructiveAction: () => void
  /** Open the global SaveTrackDialog (Cmd+S, Speichern button). */
  openSaveDialog: () => void
  /** Cancel/close SaveTrackDialog – ALSO discards any staged destructive action. */
  dismissSaveDialog: () => void
  /**
   * Called by SaveTrackDialog after a successful save. Clears the dirty flag,
   * closes the save dialog, and runs any staged destructive action.
   */
  markTrackSaved: () => void
  updateGate: (gateId: string, updates: Partial<Gate>) => void
  setGatePosition: (gateId: string, position: { x: number; y: number; z: number }) => void
  snapAllGatesToGrid: () => void
  commitGateDrag: () => void
  setGateRotation: (gateId: string, rotation: number) => void
  moveGate: (gateId: string, direction: 'N' | 'S' | 'E' | 'W', distance?: number) => void
  moveSelectedGates: (direction: 'N' | 'S' | 'E' | 'W', distance?: number) => void
  rotateGate: (gateId: string, clockwise: boolean) => void
  selectGate: (gateId: string | null, additive?: boolean) => void
  setSelectedGates: (gateIds: string[]) => void
  insertGateAtIndex: (gate: Gate, gateIndex: number, sequenceIndex: number) => void
  openGateInsertionDialog: (insertion: PendingGateInsertion) => void
  closeGateInsertionDialog: () => void
  deleteSelectedGates: () => void
  toggleGateDirection: (gateId: string, openingId: string) => void
  openSequenceEditor: (editor: SequenceEditorState) => void
  closeSequenceEditor: () => void
  openDeleteDialog: () => void
  closeDeleteDialog: () => void
  moveGateSequenceEntry: (gateId: string, openingId: string, fromSequenceNumber: number, toSequenceNumber: number) => void
  undo: () => void
  redo: () => void
  setDraggingGate: (isDragging: boolean) => void
  isDraggingGate: boolean
}

function normalizeTrack(track: Track): Track {
  const gates = enforceSingletonGates(normalizeGates(track.gates))

  return {
    ...track,
    gates,
    gateSequence: normalizeGateSequence(track.gateSequence, gates),
  }
}

function createHistoryEntry(state: Pick<TrackSlice, 'currentTrack' | 'selectedGateId' | 'selectedGateIds' | 'isTrackModified'>): TrackHistoryEntry | null {
  if (!state.currentTrack) return null

  return {
    track: state.currentTrack,
    selectedGateId: state.selectedGateId,
    selectedGateIds: state.selectedGateIds,
    isTrackModified: state.isTrackModified,
  }
}

function getSelectionState(track: Track, selectedGateId: string | null, selectedGateIds: string[]) {
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

// Gates share their base footprint with the gate opening geometry.
// The default snap step is 1/4 of the gate footprint (0.3m), while the user can
// choose coarser 0.5m or 1m field-cell steps for faster alignment.
const GATE_BASE_FOOTPRINT = GATE_BASE_WIDTH
const DEFAULT_SNAP_STEP = GATE_BASE_FOOTPRINT / 4

function getSnapStep(state: SnapGridState): number {
  return state.config?.snapGridSize ?? DEFAULT_SNAP_STEP
}

function snapCoordinate(value: number, step: number): number {
  return Math.round(value / step) * step
}

function snapGatePosition(position: Gate['position'], step: number): Gate['position'] {
  return {
    ...position,
    x: snapCoordinate(position.x, step),
    y: snapCoordinate(position.y, step),
    z: snapCoordinate(position.z, step),
  }
}

function clampGateHeight(position: Gate['position']): Gate['position'] {
  return {
    ...position,
    y: Math.max(0, position.y),
  }
}

function clampGatePositionToField(position: Gate['position'], fieldSize: Config['fieldSize']): Gate['position'] {
  const halfWidth = fieldSize.width / 2
  const halfHeight = fieldSize.height / 2

  return {
    ...position,
    x: Math.max(-halfWidth, Math.min(halfWidth, position.x)),
    z: Math.max(-halfHeight, Math.min(halfHeight, position.z)),
  }
}

function prepareGatePosition(
  position: Gate['position'],
  snapToGrid: boolean,
  fieldSize: Config['fieldSize'],
  snapStep: number,
): Gate['position'] {
  const clampedPosition = clampGateHeight(position)
  const snappedPosition = snapToGrid ? snapGatePosition(clampedPosition, snapStep) : clampedPosition
  return clampGatePositionToField(snappedPosition, fieldSize)
}

function translateGatePosition(
  position: Gate['position'],
  delta: Partial<Gate['position']>,
): Gate['position'] {
  return {
    x: position.x + (delta.x ?? 0),
    y: position.y + (delta.y ?? 0),
    z: position.z + (delta.z ?? 0),
  }
}

function getActiveFieldSize(state: SnapGridState & Pick<TrackSlice, 'currentTrack'>): Config['fieldSize'] | null {
  return state.currentTrack?.fieldSize ?? state.config?.fieldSize ?? null
}

function shouldSnapToGrid(state: SnapGridState): boolean {
  return state.config?.snapGatesToGrid ?? false
}

function pushHistory(state: TrackSlice): { past: TrackHistoryEntry[]; future: TrackHistoryEntry[] } {
  if (!state.currentTrack) return { past: state.past, future: [] }

  const entry = createHistoryEntry(state)
  if (!entry) return { past: state.past, future: [] }

  const newPast = [...state.past, entry].slice(-MAX_HISTORY)
  return { past: newPast, future: [] }
}

export const createTrackSlice: StateCreator<TrackSlice & SnapGridState, [], [], TrackSlice> = (set, get) => ({
  currentTrack: null,
  selectedGateId: null,
  selectedGateIds: [],
  isDeleteDialogOpen: false,
  pendingGateInsertion: null,
  sequenceEditor: null,
  isDraggingGate: false,
  dragHistoryEntry: null,
  past: [],
  future: [],
  generationConfig: null,
  isTrackModified: false,
  pendingDestructiveAction: null,
  isSaveDialogOpen: false,
  setTrack: (track, generationConfig) => set((state) => ({
    currentTrack: track ? normalizeTrack(track) : null,
    selectedGateId: null,
    selectedGateIds: [],
    isDeleteDialogOpen: false,
    pendingGateInsertion: null,
    sequenceEditor: null,
    dragHistoryEntry: null,
    generationConfig: generationConfig ?? null,
    isTrackModified: false,
    ...pushHistory({ ...state, currentTrack: state.currentTrack }),
  })),
  replaceTrack: (track) => set({
    currentTrack: track ? normalizeTrack(track) : null,
    selectedGateId: null,
    selectedGateIds: [],
    isDeleteDialogOpen: false,
    pendingGateInsertion: null,
    sequenceEditor: null,
    dragHistoryEntry: null,
    past: [],
    future: [],
    generationConfig: null,
    isTrackModified: false,
  }),
  syncCurrentTrack: (track) => set({
    currentTrack: normalizeTrack(track),
  }),
  updateGate: (gateId, updates) => set((state) => {
    if (!state.currentTrack) return state

    if (updates.type && hasSingletonGateConflict(state.currentTrack.gates, updates.type, gateId)) {
      return state
    }

    const history = pushHistory(state)

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((gate) => {
          if (gate.id !== gateId) return gate

          return {
            ...gate,
            ...updates,
            openings: updates.openings
              ?? (updates.type
                ? recreateGateOpenings({ id: gate.id, type: updates.type })
                : gate.openings),
          }
        }),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
      isTrackModified: true,
    }
  }),
  setGatePosition: (gateId, position) => set((state) => {
    if (!state.currentTrack) return state
    const snapToGrid = shouldSnapToGrid(state)
    const snapStep = getSnapStep(state)
    const fieldSize = getActiveFieldSize(state)
    if (!fieldSize) return state
    const nextPosition = prepareGatePosition(position, snapToGrid, fieldSize, snapStep)
    const dragHistoryEntry = state.dragHistoryEntry ?? createHistoryEntry(state)
    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, position: nextPosition } : g,
        ),
      },
      dragHistoryEntry,
    }
  }),
  snapAllGatesToGrid: () => set((state) => {
    if (!state.currentTrack) return state
    if (!shouldSnapToGrid(state)) return state
    const snapStep = getSnapStep(state)
    const fieldSize = getActiveFieldSize(state)
    if (!fieldSize) return state

    const history = pushHistory(state)

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((gate) => ({
          ...gate,
          position: prepareGatePosition(gate.position, true, fieldSize, snapStep),
        })),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
      isTrackModified: true,
    }
  }),
  commitGateDrag: () => set((state) => {
    if (!state.currentTrack) return state

    const entry = state.dragHistoryEntry
    if (!entry) return state

    const newPast = [...state.past, entry].slice(-MAX_HISTORY)
    return { past: newPast, future: [], dragHistoryEntry: null, isTrackModified: true }
  }),
  setGateRotation: (gateId, rotation) => set((state) => {
    if (!state.currentTrack) return state
    return {
      currentTrack: {
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId ? { ...g, rotation: ((rotation % 360) + 360) % 360 } : g,
        ),
      },
    }
  }),
  moveGate: (gateId, direction, distance = 1) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    const deltas = { N: { z: -distance }, S: { z: distance }, E: { x: distance }, W: { x: -distance } }
    const delta = deltas[direction]
    const snapToGrid = shouldSnapToGrid(state)
    const snapStep = getSnapStep(state)
    const fieldSize = getActiveFieldSize(state)
    if (!fieldSize) return state
    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId
            ? { ...g, position: prepareGatePosition(translateGatePosition(g.position, delta), snapToGrid, fieldSize, snapStep) }
            : g,
        ),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
      isTrackModified: true,
    }
  }),
  moveSelectedGates: (direction, distance = 1) => set((state) => {
    if (!state.currentTrack || state.selectedGateIds.length === 0) return state

    const history = pushHistory(state)
    const selectedIds = new Set(state.selectedGateIds)
    const deltas = { N: { z: -distance }, S: { z: distance }, E: { x: distance }, W: { x: -distance } }
    const delta = deltas[direction]
    const snapToGrid = shouldSnapToGrid(state)
    const snapStep = getSnapStep(state)
    const fieldSize = getActiveFieldSize(state)
    if (!fieldSize) return state

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          selectedIds.has(g.id)
            ? { ...g, position: prepareGatePosition(translateGatePosition(g.position, delta), snapToGrid, fieldSize, snapStep) }
            : g,
        ),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
      isTrackModified: true,
    }
  }),
  rotateGate: (gateId, clockwise) => set((state) => {
    if (!state.currentTrack) return state
    const history = pushHistory(state)
    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.map((g) =>
          g.id === gateId
            ? { ...g, rotation: clockwise ? (g.rotation + 30) % 360 : (g.rotation - 30 + 360) % 360 }
            : g,
        ),
        updatedAt: new Date().toISOString(),
      }),
      ...history,
      isTrackModified: true,
    }
  }),
  selectGate: (gateId, additive = false) => set((state) => {
    if (!gateId) {
      return { selectedGateId: null, selectedGateIds: [], isDeleteDialogOpen: false, pendingGateInsertion: null, sequenceEditor: null }
    }

    if (!additive) {
      return { selectedGateId: gateId, selectedGateIds: [gateId], isDeleteDialogOpen: false, pendingGateInsertion: null, sequenceEditor: null }
    }

    const isAlreadySelected = state.selectedGateIds.includes(gateId)
    const selectedGateIds = isAlreadySelected
      ? state.selectedGateIds.filter((id) => id !== gateId)
      : [...state.selectedGateIds, gateId]

    return {
      selectedGateIds,
      selectedGateId: selectedGateIds.length > 0 ? selectedGateIds[0] : null,
      isDeleteDialogOpen: false,
      pendingGateInsertion: null,
      sequenceEditor: null,
    }
  }),
  setSelectedGates: (gateIds) => set((state) => {
    if (!state.currentTrack) return { selectedGateId: null, selectedGateIds: [] }

    const existingGateIds = new Set(state.currentTrack.gates.map((g) => g.id))
    const selectedGateIds = [...new Set(gateIds)].filter((id) => existingGateIds.has(id))

    return {
      selectedGateIds,
      selectedGateId: selectedGateIds.length > 0 ? selectedGateIds[0] : null,
      isDeleteDialogOpen: false,
      pendingGateInsertion: null,
      sequenceEditor: null,
    }
  }),
  insertGateAtIndex: (gate, gateIndex, sequenceIndex) => set((state) => {
    if (!state.currentTrack) return state

    if (hasSingletonGateConflict(state.currentTrack.gates, gate.type)) {
      return state
    }

    const history = pushHistory(state)
    const normalizedGate = normalizeGates([gate])[0]
    const nextGates = [...state.currentTrack.gates]
    const nextSequence = [...state.currentTrack.gateSequence]
    const clampedGateIndex = Math.max(0, Math.min(gateIndex, nextGates.length))
    const clampedSequenceIndex = Math.max(0, Math.min(sequenceIndex, nextSequence.length))

    nextGates.splice(clampedGateIndex, 0, normalizedGate)
    nextSequence.splice(clampedSequenceIndex, 0, ...buildDefaultGateSequenceEntries(normalizedGate))

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: nextGates,
        gateSequence: nextSequence,
        updatedAt: new Date().toISOString(),
      }),
      selectedGateId: normalizedGate.id,
      selectedGateIds: [normalizedGate.id],
      isDeleteDialogOpen: false,
      pendingGateInsertion: null,
      sequenceEditor: null,
      ...history,
      isTrackModified: true,
    }
  }),
  openGateInsertionDialog: (insertion) => set({ pendingGateInsertion: insertion, isDeleteDialogOpen: false, sequenceEditor: null }),
  closeGateInsertionDialog: () => set({ pendingGateInsertion: null }),
  deleteSelectedGates: () => set((state) => {
    if (!state.currentTrack || state.selectedGateIds.length === 0) return state

    const history = pushHistory(state)
    const selectedIds = new Set(state.selectedGateIds)

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: state.currentTrack.gates.filter((g) => !selectedIds.has(g.id)),
        gateSequence: state.currentTrack.gateSequence.filter((entry) => !selectedIds.has(entry.gateId)),
        updatedAt: new Date().toISOString(),
      }),
      selectedGateId: null,
      selectedGateIds: [],
      isDeleteDialogOpen: false,
      pendingGateInsertion: null,
      sequenceEditor: null,
      ...history,
      isTrackModified: true,
    }
  }),
  openDeleteDialog: () => set((state) => {
    if (!state.selectedGateId || state.selectedGateIds.length !== 1) {
      return state
    }

    return { isDeleteDialogOpen: true, pendingGateInsertion: null, sequenceEditor: null }
  }),
  closeDeleteDialog: () => set({ isDeleteDialogOpen: false }),
  toggleGateDirection: (gateId, openingId) => set((state) => {
    if (!state.currentTrack) return state
    const gate = state.currentTrack.gates.find((candidate) => candidate.id === gateId)
    const opening = gate?.openings.find((candidate) => candidate.id === openingId)
    if (!gate || !opening) return state

    const nextReverse = !opening.reverse
    const nextSequence = state.currentTrack.gateSequence.map((entry) => {
      if (entry.gateId !== gateId || entry.openingId !== openingId) return entry

      return {
        ...entry,
        reverse: nextReverse,
      }
    })

    const history = pushHistory(state)
    const nextGates = state.currentTrack.gates.map((candidate) => {
      if (candidate.id !== gateId) return candidate

      return {
        ...candidate,
        openings: candidate.openings.map((candidateOpening) => (
          candidateOpening.id === openingId
            ? { ...candidateOpening, reverse: nextReverse }
            : candidateOpening
        )),
      }
    })

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gates: nextGates,
        gateSequence: nextSequence,
        updatedAt: new Date().toISOString(),
      }),
      ...history,
      isTrackModified: true,
    }
  }),
  moveGateSequenceEntry: (gateId, openingId, fromSequenceNumber, toSequenceNumber) => set((state) => {
    if (!state.currentTrack) return state

    const sourceIndex = fromSequenceNumber - 1
    const targetIndex = toSequenceNumber - 1
    const sequence = state.currentTrack.gateSequence
    const sourceEntry = sequence[sourceIndex]

    if (
      sourceIndex < 0
      || sourceIndex >= sequence.length
      || targetIndex < 0
      || targetIndex >= sequence.length
      || sourceIndex === targetIndex
      || sourceEntry.gateId !== gateId
      || sourceEntry.openingId !== openingId
    ) {
      return state
    }

    const history = pushHistory(state)
    const nextSequence = [...sequence]
    const [movedEntry] = nextSequence.splice(sourceIndex, 1)
    nextSequence.splice(targetIndex, 0, movedEntry)

    return {
      currentTrack: normalizeTrack({
        ...state.currentTrack,
        gateSequence: nextSequence,
        updatedAt: new Date().toISOString(),
      }),
      sequenceEditor: null,
      ...history,
      isTrackModified: true,
    }
  }),
  openSequenceEditor: (editor) => set({ sequenceEditor: editor, isDeleteDialogOpen: false, pendingGateInsertion: null }),
  closeSequenceEditor: () => set({ sequenceEditor: null }),
  undo: () => set((state) => {
    if (state.past.length === 0 || !state.currentTrack) return state

    const previousEntry = state.past[state.past.length - 1]
    const previous = normalizeTrack(previousEntry.track)
    const newPast = state.past.slice(0, -1)

    const currentEntry = createHistoryEntry(state)
    if (!currentEntry) return state

    return {
      currentTrack: previous,
      ...getSelectionState(previous, previousEntry.selectedGateId, previousEntry.selectedGateIds),
      past: newPast,
      future: [currentEntry, ...state.future],
      isDeleteDialogOpen: false,
      pendingGateInsertion: null,
      sequenceEditor: null,
      dragHistoryEntry: null,
      isTrackModified: previousEntry.isTrackModified,
    }
  }),
  redo: () => set((state) => {
    if (state.future.length === 0 || !state.currentTrack) return state

    const nextEntry = state.future[0]
    const next = normalizeTrack(nextEntry.track)
    const newFuture = state.future.slice(1)

    const currentEntry = createHistoryEntry(state)
    if (!currentEntry) return state

    return {
      currentTrack: next,
      ...getSelectionState(next, nextEntry.selectedGateId, nextEntry.selectedGateIds),
      past: [...state.past, currentEntry],
      future: newFuture,
      isDeleteDialogOpen: false,
      pendingGateInsertion: null,
      sequenceEditor: null,
      dragHistoryEntry: null,
      isTrackModified: nextEntry.isTrackModified,
    }
  }),
  requestDestructiveAction: (action, title, description) => {
    if (!get().isTrackModified) {
      action()
      return
    }
    set({ pendingDestructiveAction: { action, title, description } })
  },
  confirmDestructiveAction: () => {
    const pending = get().pendingDestructiveAction
    if (!pending) return
    set({ pendingDestructiveAction: null })
    pending.action()
  },
  cancelDestructiveAction: () => set({ pendingDestructiveAction: null }),
  saveBeforeDestructiveAction: () => set({ isSaveDialogOpen: true }),
  openSaveDialog: () => set({ isSaveDialogOpen: true, pendingDestructiveAction: null }),
  dismissSaveDialog: () => set({ isSaveDialogOpen: false, pendingDestructiveAction: null }),
  markTrackSaved: () => {
    const pending = get().pendingDestructiveAction
    set({
      isSaveDialogOpen: false,
      isTrackModified: false,
      pendingDestructiveAction: null,
    })
    if (pending) pending.action()
  },
  setDraggingGate: (isDragging) => set({ isDraggingGate: isDragging }),
})
