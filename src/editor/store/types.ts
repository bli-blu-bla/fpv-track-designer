import type { AccountSlice } from './accountSlice'
import type { ConfigSlice } from './configSlice'
import type { EditorUiSlice } from './editorUiSlice'
import type { SelectionSlice } from './selectionSlice'
import type { SyncSlice } from './syncSlice'
import type { TrackSlice } from './trackSlice'
import type { UnsavedChangesSlice } from './unsavedChangesSlice'

export type AppState = ConfigSlice & TrackSlice & SelectionSlice & EditorUiSlice & UnsavedChangesSlice & AccountSlice & SyncSlice
