# Viewer — Read-Only Share App

**Domain:** Standalone viewer for shared track links, short links and collections, built as one static HTML file. Reuses `src/scene` and `src/core` (incl. the fetch API client); ESLint forbids `@/editor` and `pocketbase` SDK imports here.

## STRUCTURE
```
viewer/
├── main.tsx              # loadViewerRoute(parseViewerRoute(window.location)), then mounts ViewerApp
├── loadViewerRoute.ts    # hash → decodeTrackSharePayload; /s → getShare + decodeCompactTrack; /t → core/api + parseTrackExport; error texts
├── store.ts              # useViewerStore: { status, track, config, entryContext, collection, error } + setLoading/setTrackData/setCollection/setError/reset
├── ViewerApp.tsx         # loading/error states, collection overview, or <Scene track config /> (+ entry context bar), FPV, export, help
├── ViewerCollection.tsx  # /t/<ns>: upcoming/past/undated sections, entry cards, LabelChips
├── collectionSections.ts # groupCollectionEntries(), formatEventDay() (event dates are UTC calendar days)
├── ViewerHelpDialog.tsx  # Controls reference
└── *.test.ts(x)          # boot, store shape, UI flows
```

Related: `viewer.html` → `src/viewer/main.tsx`; `vite.config.viewer.ts` inlines everything into `dist-viewer/index.html` (base `/`); `nginx.viewer.conf` serves it for every path (SPA fallback); payload formats and routes are documented in `src/core/AGENTS.md`.

## CONVENTIONS
- Read-only means: `Scene` gets no `gateComponent` and no `onGroundClick`.
- Loading happens in `loadViewerRoute.ts` (called from `main.tsx`); `ViewerApp` never parses the URL or calls the API. Entry links in the overview are plain `<a href>` navigations.
- Export downloads `serializeTrack(track, config, { pretty: true })` so the file imports into the editor. Compact links do not carry snap settings; those fall back to defaults.
- First valid load opens help once (`fpv-track-viewer-help-seen` cookie).

## ANTI-PATTERNS
- No editor store, save/load/gallery or mutation controls.
- No validation outside `src/core/schemas`.

## TESTING
- `ViewerApp.test.tsx` mocks `Scene` and asserts no interactive props are passed.
- `store.test.ts` asserts the store exposes no editor actions.
- `main.test.ts` covers hash decode success/error through the bootstrap.
- `loadViewerRoute.test.ts` mocks `src/core/api` and covers every route kind and error text.
- `collectionSections.test.ts` covers grouping/sorting and time-zone-independent date formatting.
