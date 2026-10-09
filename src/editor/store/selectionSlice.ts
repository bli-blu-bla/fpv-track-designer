import type { StateCreator } from 'zustand'
import { CLOSED_GATE_DIALOGS } from './editorUiSlice'
import type { AppState } from './types'

export interface SelectionSlice {
  /** Primary selection; handles and the delete dialog act on this gate. */
  selectedGateId: string | null
  selectedGateIds: string[]
  selectGate: (gateId: string | null, additive?: boolean) => void
  setSelectedGates: (gateIds: string[]) => void
}

export const createSelectionSlice: StateCreator<AppState, [], [], SelectionSlice> = (set) => ({
  selectedGateId: null,
  selectedGateIds: [],
  selectGate: (gateId, additive = false) => set((state) => {
    if (!gateId) {
      return { ...CLOSED_GATE_DIALOGS, selectedGateId: null, selectedGateIds: [] }
    }

    if (!additive) {
      return { ...CLOSED_GATE_DIALOGS, selectedGateId: gateId, selectedGateIds: [gateId] }
    }

    const selectedGateIds = state.selectedGateIds.includes(gateId)
      ? state.selectedGateIds.filter((id) => id !== gateId)
      : [...state.selectedGateIds, gateId]

    return { ...CLOSED_GATE_DIALOGS, selectedGateIds, selectedGateId: selectedGateIds[0] ?? null }
  }),
  setSelectedGates: (gateIds) => set((state) => {
    if (!state.currentTrack) return { selectedGateId: null, selectedGateIds: [] }

    const existingGateIds = new Set(state.currentTrack.gates.map((gate) => gate.id))
    const selectedGateIds = [...new Set(gateIds)].filter((id) => existingGateIds.has(id))

    return { ...CLOSED_GATE_DIALOGS, selectedGateIds, selectedGateId: selectedGateIds[0] ?? null }
  }),
})
