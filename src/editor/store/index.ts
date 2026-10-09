import { create, type StateCreator } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createConfigSlice } from './configSlice'
import { createEditorUiSlice } from './editorUiSlice'
import { createSelectionSlice } from './selectionSlice'
import { createTrackSlice } from './trackSlice'
import { createUnsavedChangesSlice } from './unsavedChangesSlice'
import type { AppState } from './types'

export type { AppState } from './types'

const createAppState: StateCreator<AppState> = (...args) => ({
  ...createConfigSlice(...args),
  ...createTrackSlice(...args),
  ...createSelectionSlice(...args),
  ...createEditorUiSlice(...args),
  ...createUnsavedChangesSlice(...args),
})

/** Fresh, isolated editor store without devtools (tests). */
export function createEditorStore() {
  return create<AppState>()(createAppState)
}

export const useAppStore = create<AppState>()(devtools(createAppState))
