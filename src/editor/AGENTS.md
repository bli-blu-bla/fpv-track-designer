# Editor — App Shell, Store, Panels, Edit Handles

**Domain:** Everything only the editor needs: orchestration, Zustand store, localStorage, keyboard shortcuts, toolbar/side rail, dialogs/panels, interactive gates and drag handles, plus the optional PocketBase account, track sync and collection management.

## STRUCTURE
```
editor/
├── App.tsx                 # Shell layout (header / rail / side panel / canvas / inspector), dialogs, first-load generation
├── storage.ts              # localStorage CRUD via core schema (`fpv-track-<id>`), list with gate/pole counts, JPEG previews under `fpv-track-thumb-<id>`
├── store/                  # Zustand slices, see store/AGENTS.md
├── api/                    # ONLY place that imports the `pocketbase` SDK (ESLint)
│   ├── client.ts           # getPocketBase(): SDK instance or null without VITE_API_URL; token in localStorage `pocketbase_auth`
│   ├── auth.ts             # login/register/OAuth popup/password reset/refresh, listMyNamespaces, AccountError + toAccountError
│   ├── tracks.ts           # account `tracks` CRUD (multipart incl. thumbnail), dataUrlToBlob
│   └── collections.ts      # entries/labels writes, LabelTakenError (unique conflict)
├── sync/
│   ├── syncMeta.ts         # localStorage `fpv-track-sync`: per track { userId, remoteId, remoteUpdated, syncedAt }
│   └── trackSync.ts        # uploadTrack (conflict detection), downloadTrack, deleteAccountTrack, mergeGalleryEntries
├── collections/labelPlan.ts# normalize/validate labels, planLabelChanges (create/move/remove), applyLabelPlan
├── hooks/                  # useKeyboardShortcuts, useShareTrack (#c. link + PocketBase short link), useGateUiColor (look-aware swatches)
├── layout/
│   ├── TopBar.tsx          # logo, undo/redo, editable track name, save/sync state, shuffle, poles, export menu, language, help, account, FPV
│   ├── AccountMenu.tsx     # sign-in button + LoginDialog, or user menu (namespaces, sign out); hidden when accounts are disabled
│   ├── ToolRail.tsx        # 52px icon rail; sidePanels.ts holds SidePanelId + titles
│   ├── SidePanel.tsx       # 300px panel frame (title, close, optional footer)
│   ├── ViewToolbar.tsx     # floating canvas toolbar (grid/snap/path/passes, snap size, reset view) + 3D/top tabs
│   ├── Inspector.tsx       # 288px right sidebar: track stats or selected-gate properties (hidden below lg)
│   └── PoleCounter.tsx
├── panels/                 # GateLibraryPanel, LayersPanel, GateConfigPanel (Feld + Untergrund), ThemeConfigPanel (Szene + Grafikqualität),
│                           # ApplyConfigFooter, SaveTrackDialog, TrackGallery (Meine Tracks panel), ShareTrackDialog,
│                           # UnsavedChangesDialog, KeyboardShortcutsDialog, LoginDialog, SyncConflictDialog,
│                           # CollectionsPanel + CollectionEntryDialog (publish/edit entries, label moves)
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
| Shortcuts | `hooks/useKeyboardShortcuts.ts` (S, Cmd/Ctrl+S, G, Cmd/Ctrl+Z/Y, Escape, Backspace, Enter, arrows) |
| Arrow-key nudging | `keyboardNudge.ts` (key → `GateNudge`, steps follow snap) + store `nudgeSelectedGates` (key repeat = one undo step) |
| Import/export JSON | `layout/TopBar.tsx` export menu → `serializeTrack(…, { pretty: true })` / `deserializeTrack()` |
| Shuffle | `App.tsx` `shuffleTrack` (TopBar dice + `S`) |
| Share | `hooks/useShareTrack.ts`, `panels/ShareTrackDialog.tsx`, `src/core/share/`, `src/core/api/shares.ts` |
| Account / login | `store/accountSlice.ts`, `api/auth.ts`, `layout/AccountMenu.tsx`, `panels/LoginDialog.tsx` |
| Track sync | `store/syncSlice.ts`, `sync/`, `panels/SaveTrackDialog.tsx` (upload after local save), `panels/TrackGallery.tsx`, `panels/SyncConflictDialog.tsx` |
| Collections | `panels/CollectionsPanel.tsx`, `panels/CollectionEntryDialog.tsx`, `collections/labelPlan.ts`, `api/collections.ts` |
| Place gates from the library | `panels/GateLibraryPanel.tsx` (field center, appended to the lap) |
| Numeric gate editing | `layout/Inspector.tsx` (position/height/rotation/order, duplicate, delete) |
| Camera presets | `ViewModeTabs` / reset → `Scene` `viewMode` + `viewResetToken` → `src/scene/CameraViewController.tsx` |
| Gate click/selection | `gates/EditableGate.tsx` (Shift/Meta/Ctrl additive; ignored while dragging or camera-gesturing) |
| Drag behavior | `gates/gateHandleMath.ts` (math), `gates/useGateDrag.ts` (events) |
| Insert handle placement | `gateHandleMath.getInsertControl()` |
| Pole counter UI | `layout/PoleCounter.tsx`; rules in `src/core/gates/poleCount.ts` |

## CONVENTIONS
- Anything replacing the current track (shuffle, import, gallery load/duplicate, apply config) awaits `requestDestructiveAction(reason)` and only proceeds on `true`. Read import files after confirmation.
- Panels may read `useAppStore`; shadcn primitives in `src/components/ui` must not.
- Shortcut handlers early-return for `INPUT`, `TEXTAREA`, `isContentEditable` targets.
- All copy goes through `useTranslation()`; add DE + EN keys together.
- Visual language (Claude Design "Track Builder"): zinc surfaces (`background`/`muted`/`secondary`), amber `primary` only for the FPV button, active toggles and badges, `font-mono` for numbers and units. Use tokens (`text-subtle-foreground`, `border-strong-border`, …) instead of raw hex.
- Rail panels are mutually exclusive (library, layers, tracks, collections, field, appearance); share stays a dialog. `collections` only shows for namespace members (`accountNamespaces`).
- Accounts are optional: without `VITE_API_URL` `accountStatus` is `disabled` and no account UI renders. Local storage stays the primary store; sync never blocks or replaces a local save.
- Sync: `uploadTrack` reads the server copy first; if it changed since this device's `remoteUpdated` (or there is no sync record) it reports a conflict → SyncConflictDialog (overwrite / save as copy / cancel). Account data is validated with `parseTrackExport()` before it is stored.
- Collections: labels are planned against the server; moving an existing label is one `update` of its `entry` and needs confirmation. `LabelTakenError` (parallel edit) re-plans and asks again. Loading an entry into the editor goes through `requestDestructiveAction('load')` and assigns a new track id.
- Saving captures a preview via `Scene` `onSnapshotReady` → `SaveTrackDialog captureThumbnail`; thumbnails are optional (old saves have none) and only `data:image/jpeg;base64,` values are read back.
- Inspector edits go through `updateGate`, so each commit is one undo step; the rotation slider keeps a local draft until release.
- Geist Mono is imported in `src/main.tsx` only, so the single-file viewer does not inline it.

## ANTI-PATTERNS
- Do not call `generateTrack()` / `replaceTrack()` from UI without the destructive-action request.
- Do not build share payloads or parse JSON in UI; use `src/core/schemas` and `src/core/share`.
- Do not move pole-count or gate-type rules into components.

## TESTING
- `store/trackSlice.test.ts` (largest suite), `configSlice.test.ts`; tests use `createEditorStore()`.
- RTL suites: `layout/TopBar`, `layout/ToolRail` (incl. share flow via stubbed `fetch` + `vi.stubEnv('VITE_API_URL')`), `layout/ViewToolbar`, `layout/Inspector`, `layout/AccountMenu`, `panels/GateLibraryPanel` (+ layers), `GateConfigPanel`, `ThemeConfigPanel`, `TrackGallery` (+ `.account` with mocked `api/tracks`), `CollectionsPanel`, `ShareTrackDialog`. Destructive flows are async: assert with `waitFor`.
- Backend modules are mocked per file (`vi.mock('@/editor/api/…')`); `api/auth.test.ts` covers SDK error mapping, `sync/trackSync.test.ts` conflict detection and gallery merge, `collections/labelPlan.test.ts` label planning.
- jsdom `FormData` is not understood by Node's `fetch`: for manual live checks against a local PocketBase use `// @vitest-environment node` in a throwaway test.
- `hooks/useKeyboardShortcuts.test.tsx`, `gates/gateHandleMath.test.ts`, `storage.test.ts`.
