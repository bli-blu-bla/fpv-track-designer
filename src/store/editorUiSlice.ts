import type { StateCreator } from 'zustand'
import type { AppState } from './types'

export interface PendingGateInsertion {
  gateIndex: number
  sequenceIndex: number
  position: { x: number; y: number; z: number }
  rotation: number
}

export interface SequenceEditorState {
  gateId: string
  openingId: string
  sourceSequenceNumber: number
}

/** Transient, per-gate editor UI. Only one gate dialog is open at a time. */
export interface EditorUiSlice {
  isDeleteDialogOpen: boolean
  pendingGateInsertion: PendingGateInsertion | null
  sequenceEditor: SequenceEditorState | null
  isDraggingGate: boolean
  openGateInsertionDialog: (insertion: PendingGateInsertion) => void
  closeGateInsertionDialog: () => void
  openSequenceEditor: (editor: SequenceEditorState) => void
  closeSequenceEditor: () => void
  openDeleteDialog: () => void
  closeDeleteDialog: () => void
  setDraggingGate: (isDragging: boolean) => void
}

export const CLOSED_GATE_DIALOGS = {
  isDeleteDialogOpen: false,
  pendingGateInsertion: null,
  sequenceEditor: null,
} as const satisfies Partial<EditorUiSlice>

export const createEditorUiSlice: StateCreator<AppState, [], [], EditorUiSlice> = (set) => ({
  ...CLOSED_GATE_DIALOGS,
  isDraggingGate: false,
  openGateInsertionDialog: (insertion) => set({ ...CLOSED_GATE_DIALOGS, pendingGateInsertion: insertion }),
  closeGateInsertionDialog: () => set({ pendingGateInsertion: null }),
  openSequenceEditor: (editor) => set({ ...CLOSED_GATE_DIALOGS, sequenceEditor: editor }),
  closeSequenceEditor: () => set({ sequenceEditor: null }),
  openDeleteDialog: () => set((state) => {
    if (!state.selectedGateId || state.selectedGateIds.length !== 1) return state

    return { ...CLOSED_GATE_DIALOGS, isDeleteDialogOpen: true }
  }),
  closeDeleteDialog: () => set({ isDeleteDialogOpen: false }),
  setDraggingGate: (isDragging) => set({ isDraggingGate: isDragging }),
})
