import type { StateCreator } from 'zustand'
import type { AppState } from './types'

/** Why the current track is about to be replaced; the dialog derives its copy from this. */
export type DestructiveActionReason = 'shuffle' | 'apply-config' | 'import' | 'load' | 'duplicate'

export interface UnsavedChangesSlice {
  /** Set while the user decides whether unsaved changes may be discarded. */
  pendingDestructiveAction: { reason: DestructiveActionReason } | null
  isSaveDialogOpen: boolean
  /**
   * Guarded entry point for anything that overwrites the current track
   * (shuffle, import JSON, gallery load/duplicate, apply config).
   * Resolves `true` right away when the track is clean; otherwise opens the
   * UnsavedChangesDialog and resolves once the user discards (`true`),
   * saves first (`true` after a successful save) or cancels (`false`).
   */
  requestDestructiveAction: (reason: DestructiveActionReason) => Promise<boolean>
  /** "Verwerfen": proceed and lose the changes. */
  confirmDestructiveAction: () => void
  /** "Abbrechen": keep the current track. */
  cancelDestructiveAction: () => void
  /** "Zuerst speichern": open the save dialog while the request stays pending. */
  saveBeforeDestructiveAction: () => void
  /** Open the global SaveTrackDialog (Cmd+S, Speichern button). */
  openSaveDialog: () => void
  /** Close SaveTrackDialog without saving; also cancels a pending request. */
  dismissSaveDialog: () => void
  /** Called after a successful save: clears the dirty flag and lets a pending request proceed. */
  markTrackSaved: () => void
}

export const createUnsavedChangesSlice: StateCreator<AppState, [], [], UnsavedChangesSlice> = (set, get) => {
  // The resolver is not state: it never renders and must not end up in devtools snapshots.
  let resolvePending: ((proceed: boolean) => void) | null = null

  const settle = (proceed: boolean) => {
    const resolve = resolvePending
    resolvePending = null
    resolve?.(proceed)
  }

  return {
    pendingDestructiveAction: null,
    isSaveDialogOpen: false,
    requestDestructiveAction: (reason) => {
      if (!get().isTrackModified) return Promise.resolve(true)

      settle(false)
      set({ pendingDestructiveAction: { reason } })
      return new Promise<boolean>((resolve) => {
        resolvePending = resolve
      })
    },
    confirmDestructiveAction: () => {
      set({ pendingDestructiveAction: null })
      settle(true)
    },
    cancelDestructiveAction: () => {
      set({ pendingDestructiveAction: null })
      settle(false)
    },
    saveBeforeDestructiveAction: () => set({ isSaveDialogOpen: true }),
    openSaveDialog: () => {
      set({ isSaveDialogOpen: true, pendingDestructiveAction: null })
      settle(false)
    },
    dismissSaveDialog: () => {
      set({ isSaveDialogOpen: false, pendingDestructiveAction: null })
      settle(false)
    },
    markTrackSaved: () => {
      set({ isSaveDialogOpen: false, isTrackModified: false, pendingDestructiveAction: null })
      settle(true)
    },
  }
}
