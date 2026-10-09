# Editor — App Shell, Store, Panels, Edit Handles

**Domain:** Everything only the editor needs: orchestration, Zustand store, localStorage, keyboard shortcuts, toolbar/side rail, dialogs/panels, interactive gates and drag handles.

## STRUCTURE
```
editor/
├── App.tsx                 # Dialogs, first-load generation, passes store state into <Scene>
├── storage.ts              # localStorage CRUD via core schema (key prefix `fpv-track-`)
├── store/                  # Zustand slices, see store/AGENTS.md
├── hooks/useKeyboardShortcuts.ts
├── layout/                 # TopBar, LeftToolPanel, PoleCounter
├── panels/                 # GateConfigPanel, ThemeConfigPanel, ApplyConfigFooter, SaveTrackDialog,
│                           # TrackGallery, ShareTrackDialog, UnsavedChangesDialog, KeyboardShortcutsDialog
├── gates/
│   ├── EditableGate.tsx    # Scene gate + selection, direction toggle, sequence editor, handles
│   ├── GateHandles.tsx     # Html overlay buttons: move/elevate/rotate/delete + insert handles
│   ├── useGateDrag.ts      # pointer listeners, ground raycast, orbit lock, one history commit per drag
│   └── gateHandleMath.ts   # pure drag updates + insert placement (tested)
└── icons/GateIcon.tsx      # SVG silhouette per gate type
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Store state/actions, dirty flow | `store/`, `store/AGENTS.md` |
| Shortcuts | `hooks/useKeyboardShortcuts.ts` (S, Cmd/Ctrl+S, G, Cmd/Ctrl+Z/Y, Escape, Backspace, Enter) |
| Import/export JSON | `layout/TopBar.tsx` → `serializeTrack(…, { pretty: true })` / `deserializeTrack()` |
| Shuffle / share | `layout/LeftToolPanel.tsx`, `panels/ShareTrackDialog.tsx`, `src/core/share/` |
| Gate click/selection | `gates/EditableGate.tsx` (Shift/Meta/Ctrl additive; ignored while dragging or camera-gesturing) |
| Drag behavior | `gates/gateHandleMath.ts` (math), `gates/useGateDrag.ts` (events) |
| Insert handle placement | `gateHandleMath.getInsertControl()` |
| Pole counter UI | `layout/PoleCounter.tsx`; rules in `src/core/gates/poleCount.ts` |

## CONVENTIONS
- Anything replacing the current track (shuffle, import, gallery load/duplicate, apply config) awaits `requestDestructiveAction(reason)` and only proceeds on `true`. Read import files after confirmation.
- Panels may read `useAppStore`; shadcn primitives in `src/components/ui` must not.
- Shortcut handlers early-return for `INPUT`, `TEXTAREA`, `isContentEditable` targets.
- All copy goes through `useTranslation()`; add DE + EN keys together.
- Keep mobile bottom-rail and desktop side-rail classes together in `LeftToolPanel`.

## ANTI-PATTERNS
- Do not call `generateTrack()` / `replaceTrack()` from UI without the destructive-action request.
- Do not build share payloads or parse JSON in UI; use `src/core/schemas` and `src/core/share`.
- Do not move pole-count or gate-type rules into components.

## TESTING
- `store/trackSlice.test.ts` (largest suite), `configSlice.test.ts`; tests use `createEditorStore()`.
- RTL suites: `layout/TopBar`, `layout/LeftToolPanel`, `panels/GateConfigPanel`, `ThemeConfigPanel`, `TrackGallery`, `ShareTrackDialog`. Destructive flows are async: assert with `waitFor`.
- `hooks/useKeyboardShortcuts.test.tsx`, `gates/gateHandleMath.test.ts`, `storage.test.ts`.
