# Viewer — Read-Only Share App

**Domain:** Standalone viewer for shared track links, built as one static HTML file. Reuses `src/scene` and `src/core`; ESLint forbids `@/editor` imports here.

## STRUCTURE
```
viewer/
├── main.tsx              # Decodes window.location.hash via decodeTrackSharePayload, fills the store, mounts ViewerApp
├── store.ts              # useViewerStore: { track, config, error } + setTrackData/setError/reset only
├── ViewerApp.tsx         # <Scene track config /> without interactive props, FPV, export, help, error state
├── ViewerHelpDialog.tsx  # Controls reference
└── *.test.ts(x)          # boot, store shape, UI flows
```

Related: `viewer.html` → `src/viewer/main.tsx`; `vite.config.viewer.ts` inlines everything into `dist-viewer/index.html`; payload formats are documented in `src/core/AGENTS.md`.

## CONVENTIONS
- Read-only means: `Scene` gets no `gateComponent` and no `onGroundClick`.
- Decoding happens in `main.tsx` before mount; `ViewerApp` never parses the hash.
- Export downloads `serializeTrack(track, config, { pretty: true })` so the file imports into the editor. Compact links do not carry snap settings; those fall back to defaults.
- First valid load opens help once (`fpv-track-viewer-help-seen` cookie).

## ANTI-PATTERNS
- No editor store, save/load/gallery or mutation controls.
- No validation outside `src/core/schemas`.

## TESTING
- `ViewerApp.test.tsx` mocks `Scene` and asserts no interactive props are passed.
- `store.test.ts` asserts the store exposes no editor actions.
- `main.test.ts` covers hash decode success/error.
