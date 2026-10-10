import type { StateCreator } from 'zustand'
import type { NamespaceSummary } from '@/core/api/collections'
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

/** The current track was loaded from this collection entry. Only applies while `currentTrack.id === trackId`. */
export interface CollectionEntryLink {
  namespace: NamespaceSummary
  entryId: string
  entryName: string
  trackId: string
  /** `currentTrack.updatedAt` when the entry last matched the editor; a different value means unpublished edits. */
  publishedUpdatedAt: string
}

/** Transient, per-gate editor UI. Only one gate dialog is open at a time. */
export interface EditorUiSlice {
  isDeleteDialogOpen: boolean
  pendingGateInsertion: PendingGateInsertion | null
  sequenceEditor: SequenceEditorState | null
  isDraggingGate: boolean
  /** Any other track (shuffle, load, import, copy) has a new id, so the link stops applying by itself. */
  collectionEntryLink: CollectionEntryLink | null
  setCollectionEntryLink: (link: CollectionEntryLink | null) => void
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
  collectionEntryLink: null,
  setCollectionEntryLink: (link) => set({ collectionEntryLink: link }),
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
