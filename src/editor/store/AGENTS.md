# Store — Editor Zustand State

**Domain:** Editor-only state, composed from slices into `useAppStore`. The viewer has its own `src/viewer/store.ts`.

## STRUCTURE
```
store/
├── index.ts                # createAppState, useAppStore (devtools), createEditorStore() for tests
├── types.ts                # AppState = Config & Track & Selection & EditorUi & UnsavedChanges slices
├── configSlice.ts          # config + setters; defaults from src/core/defaultConfig.ts
├── trackSlice.ts           # currentTrack, past/future history, drag snapshot, isTrackModified, all edit actions
├── selectionSlice.ts       # selectedGateId(s), selectGate, setSelectedGates
├── editorUiSlice.ts        # delete dialog, pending insertion, sequence editor, isDraggingGate
├── unsavedChangesSlice.ts  # requestDestructiveAction(reason) → Promise<boolean>, save dialog
├── accountSlice.ts         # accountUser/accountStatus/accountNamespaces; initAccount() (returns cleanup), login/register/OAuth/logout
├── syncSlice.ts            # trackSyncStatus { trackId, state }, syncConflict; syncTrack(), resolveSyncConflict()
├── trackOperations.ts      # pure: normalizeTrack, touchTrack, snapping/clamping, move deltas, singleton rule
└── history.ts              # pure: TrackHistoryEntry, pushHistory, MAX_HISTORY = 50, selection restore
```

## CONVENTIONS
- Every slice is `StateCreator<AppState, [], [], XSlice>` and may update other slices' keys in the same `set` (e.g. edits close gate dialogs via `CLOSED_GATE_DIALOGS`).
- Undoable edits go through `applyEdit(state, edit)` in `trackSlice.ts`: snapshots history, normalizes + stamps `updatedAt`, sets `isTrackModified`. Return `null` from `edit` to abort without a history entry.
- Live drag updates (`setGatePosition`, `setGateRotation`) skip history; `commitGateDrag()` pushes the drag-start snapshot once.
- `import type` for type-only imports; `AppState` lives in `types.ts` to avoid import cycles.
- `accountSlice`/`syncSlice` call `src/editor/api` and `src/editor/sync`; tests mock those modules. `initAccount()` validates the stored token before subscribing and returns a cleanup, so the StrictMode double mount is safe.

## DIRTY-STATE / UNSAVED-CHANGES FLOW
`isTrackModified` is the single source of truth for unsaved changes. It is set by undoable edits and drag commits, reset by `setTrack`, `replaceTrack` and `markTrackSaved`, and stored in history entries so undo/redo restores it.

Destructive actions call `await requestDestructiveAction(reason)` with `reason` in `'shuffle' | 'apply-config' | 'import' | 'load' | 'duplicate'`:
- clean track → resolves `true` immediately;
- dirty track → `pendingDestructiveAction = { reason }` opens `panels/UnsavedChangesDialog`, which derives its text from the reason:
  - **Abbrechen** → `cancelDestructiveAction()` → `false`
  - **Verwerfen** → `confirmDestructiveAction()` → `true`
  - **Zuerst speichern** → `saveBeforeDestructiveAction()` opens the save dialog; `markTrackSaved()` → `true`, `dismissSaveDialog()` → `false`
- A newer request resolves an older pending one with `false`.

The promise resolver is kept in the slice closure, not in state, so the store stays serializable (no callbacks, no translated strings).

## TESTING
- Build stores with `createEditorStore()` and `setConfig()` for custom config; never hand-compose slices.
- Cover dirty state and history together: undo/redo must restore `isTrackModified` snapshots.
- Destructive-action tests await the returned promise for cancel, discard, save-first and dismiss paths.
