# Store — Editor Zustand State

**Domain:** Global editor state via Zustand slice pattern. The share viewer uses separate `src/viewer-store.ts`.

## STRUCTURE
```
store/
├── index.ts        # Combined editor store (ConfigSlice + TrackSlice) with devtools
├── configSlice.ts  # Config state, default preset, theme/display/generation settings
└── trackSlice.ts   # Track state, selection, drag, undo/redo, unsaved-change flow
```

## CONVENTIONS
- Slice pattern: each editor domain gets a `StateCreator` slice file.
- `src/store/index.ts` defines `type AppState = ConfigSlice & TrackSlice` and spreads slices into `create()`.
- DevTools middleware is enabled only on the editor root store.
- `import type` is required for type-only imports.
- Config actions update nested config immutably; `theme` values come from `src/types/theme.ts`.
- Undoable track actions call `pushHistory()` and set `isTrackModified: true`.

## WHERE TO LOOK
| Task | File |
|------|------|
| Add config setting | `configSlice.ts` + `src/types/config.ts` + schema serialization if persisted |
| Add theme setting | `configSlice.ts`, `src/types/theme.ts`, `GateConfigPanel.tsx` |
| Add track action | `trackSlice.ts` — use `pushHistory()` for undoable actions |
| Add new editor domain slice | New slice file + `AppState` type + spread in `index.ts` |
| Change viewer state | `src/viewer-store.ts`, not this directory |

## KEY PATTERNS
```typescript
const action = (payload) => set((state) => {
  const history = pushHistory(state)
  return { ...newState, ...history, isTrackModified: true }
})
```

## DIRTY-STATE / UNSAVED-CHANGES FLOW
`isTrackModified` is the single source of truth for unsaved editor changes.

- Set `true` by undoable mutations such as `updateGate`, `moveGate`, `moveSelectedGates`, `rotateGate`, `insertGateAtIndex`, `deleteSelectedGates`, `toggleGateDirection`, `moveGateSequenceEntry`, `snapAllGatesToGrid`, and drag commits.
- Reset to `false` by `setTrack`, `replaceTrack`, and `markTrackSaved` after successful localStorage save.
- Stored in `TrackHistoryEntry` so undo/redo restores the dirty flag of each snapshot.

Destructive actions (Shuffle, Import JSON, Gallery Load/Duplicate, Apply Config) MUST go through `requestDestructiveAction(action, title, description)`. If dirty, the action is staged in `pendingDestructiveAction` and `components/ui/UnsavedChangesDialog.tsx` presents:

- **Abbrechen** → `cancelDestructiveAction()`
- **Zuerst speichern** → `saveBeforeDestructiveAction()` opens the global save dialog; `markTrackSaved()` then runs the staged action
- **Verwerfen** → `confirmDestructiveAction()`

The global save dialog is store-driven via `isSaveDialogOpen`, `openSaveDialog()`, and `dismissSaveDialog()`.

## NOTES
- `commitGateDrag()` pushes the drag-start snapshot once, avoiding undo stack pollution during pointer moves.
- Viewer state intentionally does not expose editor mutation actions.

## TESTING
- `trackSlice.test.ts` is the largest suite; keep new store invariants there.
- Use isolated Zustand stores with `create<...>()(...)` for slice tests.
- Cover dirty-state and history together: undo/redo must restore `isTrackModified` snapshots.
- Destructive-action tests should exercise cancel, save-before-action, and discard paths.
