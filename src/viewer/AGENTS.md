# Viewer — Read-Only Share App

**Domain:** Standalone viewer UI for compressed shared track links. It reuses the 3D scene but never exposes editor mutations.

## STRUCTURE
```
components/viewer/
├── ViewerApp.tsx          # Read-only scene shell, export button, help button, error state
├── ViewerHelpDialog.tsx   # Viewer controls reference dialog
└── ViewerApp.test.tsx     # RTL coverage for error/read-only/export/help flows
```

Related files outside this folder:
- `src/viewer-main.tsx` decodes `window.location.hash` and mounts the viewer.
- `src/viewer-store.ts` stores `{ track, config, error }` only.
- `vite.config.viewer.ts` builds `viewer.html` into single-file `dist-viewer/index.html`.
- `src/utils/shareTrack.ts` encodes/decodes compressed `z.` payloads and legacy base64-url payloads.

## WHERE TO LOOK
| Task | File |
|------|------|
| Change viewer boot/load behavior | `src/viewer-main.tsx`, `src/utils/shareTrack.ts` |
| Change read-only viewer UI | `ViewerApp.tsx` |
| Change first-run controls help | `ViewerHelpDialog.tsx`, `ViewerApp.tsx` cookie helpers |
| Change viewer state | `src/viewer-store.ts`, `src/viewer-store.test.ts` |
| Change viewer build/deploy artifact | `vite.config.viewer.ts`, `viewer.html` |

## CONVENTIONS
- Viewer passes `readOnly` to `Scene`; do not render editor handles, labels that mutate state, or store mutation controls.
- Viewer state is intentionally separate from `src/store`; it only accepts decoded track/config, error, and reset.
- Error/help/export strings are German, matching the editor UI.
- First valid viewer load opens help once via `fpv-track-viewer-help-seen` cookie.
- Export uses `serializeTrack(track, config)` so downloaded JSON remains importable by the editor.

## ANTI-PATTERNS
- Do not import `useAppStore` into viewer components.
- Do not add save/load/gallery/editor actions to the viewer.
- Do not parse hash payloads in `ViewerApp`; keep decoding in `viewer-main.tsx` / `shareTrack.ts`.
- Do not bypass `deserializeTrack()` when accepting shared payload data.

## TESTING
- `ViewerApp.test.tsx` mocks `Scene` and asserts `readOnly=true`.
- `viewer-store.test.ts` asserts no editor mutation actions are exposed.
- `shareTrack.test.ts` covers compressed round-trip, legacy payloads, and invalid payloads.
