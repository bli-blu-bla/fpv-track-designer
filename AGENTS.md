# FPV TRACK DESIGNER - PROJECT KNOWLEDGE BASE

**Generated:** 2026-09-25
**Commit:** 3c85ea4
**Branch:** main

## OVERVIEW
Desktop-only 3D FPV drone racing track designer plus standalone read-only share viewer. React 19 + Vite/Vitest, R3F/Drei scene, Zustand slices, Tailwind v4/shadcn UI, schema-guarded local persistence and compressed share links.

## STRUCTURE
```
fpv-track-designer/
├── index.html                 # editor app HTML entry -> src/main.tsx
├── viewer.html                # share-viewer HTML entry -> src/viewer-main.tsx
├── src/
│   ├── App.tsx                # editor shell: dialogs, first-load flow, scene composition
│   ├── i18n.ts                # typed DE/EN translations + localStorage language store
│   ├── main.tsx               # editor bootstrap, StrictMode + ErrorBoundary
│   ├── viewer-main.tsx        # hash payload decode + viewer bootstrap
│   ├── viewer-store.ts        # viewer-only Zustand store; no editor mutations
│   ├── components/
│   │   ├── gates/             # fixed 3D gate components + handles/opening indicators
│   │   ├── layout/            # TopBar, LeftToolPanel, PoleCounter app shell
│   │   ├── scene/             # single R3F Canvas owner, camera controllers, themes
│   │   ├── ui/                # shadcn primitives + editor panels/dialogs
│   │   ├── viewer/            # read-only share viewer UI
│   │   └── icons/             # gate-type SVG icon
│   ├── hooks/                 # keyboard shortcuts, R3F selection, theme selector
│   ├── schemas/               # track export/import validation boundary
│   ├── store/                 # editor Zustand config + track slices
│   ├── types/                 # domain contracts + theme presets
│   ├── utils/                 # generator, flight path, storage, share links, helpers
│   ├── constants/             # shared gate dimensions
│   └── lib/                   # cn helper for shadcn classes
├── vite.config.ts             # editor build + Vitest config
├── vite.config.viewer.ts      # single-file viewer build to dist-viewer/
├── Dockerfile                 # editor nginx container
├── Dockerfile.viewer          # static viewer nginx container
└── docs/                      # Coolify deploy + share-viewer notes
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Editor app shell / first-load flow | `src/App.tsx`, `src/main.tsx`, `src/AGENTS.md` | StrictMode is enabled; mount effects must be idempotent |
| Translations / language toggle | `src/i18n.ts` | Add DE + EN keys together; consumers use `useTranslation()` |
| Top toolbar / side tools / pole counter | `src/components/layout/`, `src/components/layout/AGENTS.md` | Import/export, FPV toggle, share, shuffle, shell controls |
| Share viewer / read-only links | `src/viewer-main.tsx`, `src/viewer-store.ts`, `src/components/viewer/` | Hash payload -> decoded track/config -> read-only `Scene` |
| Add/change gate visuals | `src/components/gates/`, `src/types/gate.ts` | Fixed gate set; update dispatcher/schema/tests together |
| Change 3D scene/camera/themes | `src/components/scene/`, `src/types/theme.ts`, `src/utils/themeColors.ts` | R3F hooks stay under the single Canvas owner |
| Change panels/dialog UI | `src/components/ui/` | shadcn primitives plus app-specific dialogs/panels |
| Track generation | `src/utils/generator.ts` | Min 3m gate distance, nearest-neighbor order, 30 degree rotation alignment |
| Flight path logic | `src/utils/flightPath.ts` | Dense geometry/avoidance algorithm; test edge cases |
| Store state/actions | `src/store/configSlice.ts`, `src/store/trackSlice.ts` | Slice pattern, history, dirty-state workflow |
| Import/export validation | `src/schemas/track.schema.ts` | Persistence boundary, legacy normalization, error shape |
| Persistence | `src/utils/storage.ts` | Browser `localStorage`; route validation through schemas |
| Share-link payloads | `src/utils/shareTrack.ts` | `lz-string` compressed `z.` payloads + legacy base64 fallback |
| Keyboard/mouse selection | `src/hooks/`, `src/components/gates/GateHandles.tsx` | Desktop mouse/keyboard first; shortcut tests in hooks |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `App` | component | `src/App.tsx` | Editor orchestration, dialogs, first-load generation |
| `useTranslation` / `translateOutsideReact` | functions | `src/i18n.ts` | UI translations plus viewer bootstrap error text |
| `TopBar` / `LeftToolPanel` | components | `src/components/layout/` | Shell controls, import/export, share, shuffle, settings |
| `ViewerApp` | component | `src/components/viewer/ViewerApp.tsx` | Read-only viewer shell, export/help controls |
| `loadTrackFromHash` | function | `src/viewer-main.tsx` | Decodes shared-track hash into viewer store |
| `useAppStore` | Zustand store | `src/store/index.ts` | Combined editor store (config + track slices) with devtools |
| `useViewerStore` | Zustand store | `src/viewer-store.ts` | Viewer-only `{ track, config, error }` state |
| `createTrackSlice` | Zustand slice | `src/store/trackSlice.ts` | Selection, undo/redo, dirty-state, destructive actions |
| `generateTrack` | function | `src/utils/generator.ts` | Random track generation and initial sequence |
| `calculateFlightPath` | function | `src/utils/flightPath.ts` | Path segments, samples, arrows, gate-specific avoidance |
| `GateHandles` | component | `src/components/gates/GateHandles.tsx` | Move/rotate/elevate/insert/delete controls in 3D |
| `Scene` | component | `src/components/scene/Scene.tsx` | Single Canvas owner, theme-specific scene composition |
| `serializeTrack` / `deserializeTrack` | functions | `src/schemas/track.schema.ts` | Export/import shape validation and normalization |
| `encodeTrackSharePayload` / `decodeTrackSharePayload` | functions | `src/utils/shareTrack.ts` | Compressed share link payload boundary |
| `THEME_PRESETS` | constant | `src/types/theme.ts` | Minimal/realistic/night renderer and color presets |
| `downloadTrackQrCodePng` / `createTrackQrCodeSvg` | functions | `src/utils/qrCode.ts` | Share QR PNG/SVG generation |
| `FpvFlyThrough` | component | `src/components/scene/FpvFlyThrough.tsx` | Automated FPV camera flight |

## CONVENTIONS
- Named exports by default. `App.tsx` is the lone default export.
- `import type` for type-only imports. `verbatimModuleSyntax` is enabled.
- `erasableSyntaxOnly` is enabled: no enums, namespaces, or constructor parameter properties.
- `@/*` aliases cross-domain imports; nearby gate/scene/store/type files often use relative imports.
- Tests are co-located as `*.test.ts` or `*.test.tsx`; no shared Vitest setup file.
- Vitest config lives in `vite.config.ts` with `globals: true` and `environment: 'jsdom'`.
- Tailwind v4 is CSS-first via `@tailwindcss/vite`, `@import "tailwindcss"`, `tw-animate-css`, and the vendored `src/styles/shadcn-tailwind.css` (copied from shadcn@4.21.4); no `tailwind.config.js`.
- Zustand editor state uses slice files merged in `src/store/index.ts`; viewer state is a separate tiny store in `src/viewer-store.ts`.
- UI components use shadcn/Radix primitives plus `cn` from `src/lib/utils.ts`.
- Viewer build uses `vite.config.viewer.ts` with the local `inlineViewerBundle()` plugin: inlines JS/CSS from `viewer.html` and emits `dist-viewer/index.html`.
- The inline plugin is single-entry only; keep editor and viewer builds as separate commands/outputs.
- Do not run Playwright/browser QA unless explicitly requested; the user handles visual QA by default.

## ANTI-PATTERNS (THIS PROJECT)
- No `as any`, `@ts-ignore`, or silent type suppression.
- No backend/database/auth scope; persistence is browser `localStorage`, n8n short-link proxy, and share-link hash payloads only.
- No per-gate size adjustment; gate dimensions are shared constants/global config behavior.
- No custom gate type creation; the app has a fixed gate type set.
- No mobile/touch gesture scope expansion unless explicitly requested; desktop mouse/keyboard is primary.
- Do not duplicate schema validation in storage/import/share flows; route through `src/schemas`.
- Do not bypass the unsaved-changes flow for destructive editor actions.
- Do not expose editor mutation actions in the read-only viewer store/UI.

## UNIQUE STYLES
- Gate rotation: UI handles snap in 15 degree steps (`ROTATION_SNAP_STEP_DEGREES`); generator rounds to 30 degrees.
- Gate movement: N/S/E/W, 1m increments; optional snap-grid uses smaller subdivisions during drag.
- Undo/redo: `past`/`future` arrays, `MAX_HISTORY=50`, dirty flag captured in history entries.
- Flight path: gate-sequence visits, Bezier sampling, disjoint native `THREE.Line` segments, arrows along path.
- Camera controls: Space/right-click pan, Shift vertical pan, wheel/middle-click smooth zoom.
- Themes: `minimal`, `realistic`, `night`; night enables bloom/neon emissive gates.
- Import/export schema keeps legacy compatibility explicit, e.g. old `asymmetric` gate type mapping.
- Share links use compressed `z.` payloads and still decode legacy base64-url payloads.
- UI copy is bilingual through `src/i18n.ts`; add DE/EN keys together.

## COMMANDS
```bash
npm run dev            # Vite editor dev server at localhost:5173
npm run build          # tsc -b && vite build
npm run build:viewer   # single-file viewer build to dist-viewer/
npm run build:all      # editor build + viewer build
npm run test           # vitest (watch/default mode)
npm run lint           # eslint .
npm run preview        # preview production editor build only
```

## NOTES
- No in-repo GitHub Actions workflows were found.
- Docker deploys editor and viewer separately; editor nginx proxies `/api/shorten-track`, viewer is static-only.
- Chunk size warning from R3F/Drei bundle is acceptable for MVP.
- There is no gate barrel; `Scene.tsx` and `Gate.tsx` import gate files directly.
- Move/rotate logic lives inline in `trackSlice.ts`.
- Runtime libs are `dependencies`; build/test tooling (Vitest, Testing Library) is `devDependencies`. The shadcn CLI is not installed; add components with `npx shadcn@latest add <name>`. `three` is declared explicitly.
- `shadcn` and `vite-plugin-singlefile` were removed on purpose: both pulled in the unpatched `braces`/`micromatch` advisory. Do not re-add them; `npm audit` should stay at 0.
- Root has generated QA/build artifacts at times (`qa-*.png`, `dist/`, `dist-viewer/`); keep generated artifacts out of commits unless intentionally requested.
- Avoid creating visual QA screenshots unless explicitly requested.
- `docs/coolify-track-sharing.md` documents the two-service Coolify deploy and the n8n short-link proxy.
- `utils/qrCode.ts` generates share QR PNG/SVG via `qrcode`; `ShareTrackDialog` previews via `dangerouslySetInnerHTML`.
- No CI workflows exist; build/test/lint are run manually.
