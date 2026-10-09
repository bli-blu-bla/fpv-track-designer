# FPV TRACK DESIGNER - PROJECT KNOWLEDGE BASE

**Updated:** 2026-10-09 (architecture refactor: core/scene/editor/viewer layers)

## OVERVIEW
Desktop-only 3D FPV drone racing track designer plus standalone read-only share viewer. React 19 + Vite/Vitest, R3F/Drei scene, Zustand slices, Tailwind v4/shadcn UI, Zod-validated local persistence and compact share links.

## STRUCTURE
```
fpv-track-designer/
├── index.html                 # editor HTML entry -> src/main.tsx
├── viewer.html                # share-viewer HTML entry -> src/viewer/main.tsx
├── src/
│   ├── main.tsx               # editor bootstrap
│   ├── i18n.ts                # typed DE/EN translations + localStorage language store
│   ├── components/            # ErrorBoundary + shadcn primitives (ui/)
│   ├── core/                  # domain logic, no React: types, gate definitions, generator, flight path, schemas, share codec
│   ├── scene/                 # shared R3F Canvas, camera, themes, gate meshes (no store access)
│   ├── editor/                # App, Zustand store, storage, shortcuts, layout, panels, edit handles
│   ├── viewer/                # read-only viewer entry, store, UI
│   ├── styles/                # vendored shadcn tailwind.css
│   └── lib/                   # cn helper
├── vite.config.ts             # editor build + Vitest config
├── vite.config.viewer.ts      # single-file viewer build to dist-viewer/ (local inline plugin)
├── eslint.config.js           # incl. layer import boundaries
├── Dockerfile / Dockerfile.viewer
└── docs/                      # user docs (DE), Coolify deploy + share notes
```
Layer rules and per-layer details: `src/AGENTS.md`, `src/core/AGENTS.md`, `src/scene/AGENTS.md`, `src/editor/AGENTS.md`, `src/editor/store/AGENTS.md`, `src/viewer/AGENTS.md`, `src/components/ui/AGENTS.md`.

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Editor shell / first-load flow | `src/editor/App.tsx`, `src/main.tsx` | StrictMode is enabled; mount effects must be idempotent |
| Translations / language toggle | `src/i18n.ts` | Add DE + EN keys together; consumers use `useTranslation()` |
| Add/change a gate type | `src/core/gates/gateDefinitions.ts`, `src/scene/gates/` | Extend `GATE_TYPES`, then fix compile errors |
| 3D scene/camera/look | `src/scene/`, `src/core/types/theme.ts`, `src/core/theme/themeColors.ts` | Scene is prop-driven; resolved look via `useSceneTheme()` |
| Toolbar / side rail / pole counter | `src/editor/layout/` | Import/export, FPV toggle, share, shuffle |
| Panels and dialogs | `src/editor/panels/` | Primitives stay in `src/components/ui/` |
| Gate selection / drag handles | `src/editor/gates/` | `gateHandleMath.ts` is pure and tested |
| Store state/actions | `src/editor/store/` | Slices, `applyEdit()`, history, destructive-action flow |
| Track generation | `src/core/track/generator.ts` | Min 3m gate distance, nearest-neighbor order, 30 degree rotation alignment |
| Flight path logic | `src/core/track/flightPath.ts` | Dense geometry/avoidance algorithm; test edge cases |
| Import/export/storage validation | `src/core/schemas/track.schema.ts` | Zod, format 2.1.0, legacy 1.x/2.0 support |
| Share-link payloads | `src/core/schemas/compactTrack.schema.ts`, `src/core/share/shareTrack.ts` | `c.` compact, `z.`/base64 legacy |
| Persistence | `src/editor/storage.ts` | Browser `localStorage`; schema does validation |
| Share viewer | `src/viewer/` | Hash payload -> decoded track/config -> read-only `Scene` |

## CODE MAP
| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `App` | component | `src/editor/App.tsx` | Editor orchestration, dialogs, first-load generation |
| `useTranslation` / `translateOutsideReact` | functions | `src/i18n.ts` | UI translations plus viewer bootstrap error text |
| `GATE_TYPES` / `GATE_DEFINITIONS` | constants | `src/core/types/gate.ts`, `src/core/gates/gateDefinitions.ts` | Canonical gate list and all per-type behavior |
| `GATE_COMPONENTS` | constant | `src/scene/gates/gateComponents.ts` | Gate type -> 3D component |
| `Scene` | component | `src/scene/Scene.tsx` | Single Canvas owner; `track`, `config`, optional `gateComponent`/`onGroundClick` |
| `EditableGate` / `GateHandles` | components | `src/editor/gates/` | Selection, direction/sequence editing, drag/insert/delete handles |
| `useAppStore` / `createEditorStore` | Zustand store | `src/editor/store/index.ts` | Editor store (config, track, selection, editor UI, unsaved-changes slices) |
| `requestDestructiveAction` | store action | `src/editor/store/unsavedChangesSlice.ts` | `await` before replacing the track; resolves `true` to proceed |
| `useViewerStore` | Zustand store | `src/viewer/store.ts` | Viewer-only `{ track, config, error }` |
| `generateTrack` | function | `src/core/track/generator.ts` | Random track generation and initial sequence |
| `calculateFlightPath` | function | `src/core/track/flightPath.ts` | Path segments, samples, arrows, gate-specific avoidance |
| `serializeTrack` / `deserializeTrack` / `parseTrackExport` | functions | `src/core/schemas/track.schema.ts` | Persistence boundary |
| `encodeTrackSharePayload` / `decodeTrackSharePayload` | functions | `src/core/share/shareTrack.ts` | Share link payload boundary |
| `SKY_PRESETS` / `GROUND_PRESETS` / `QUALITY_PRESETS` / `getSceneLook` | constants / function | `src/core/types/theme.ts`, `src/core/theme/themeColors.ts` | Scene look = sky × ground × quality, resolved to one `ThemeConfig` |
| `FpvFlyThrough` | component | `src/scene/FpvFlyThrough.tsx` | Automated FPV camera flight |

## CONVENTIONS
- Named exports by default. `src/editor/App.tsx` is the lone default export.
- `import type` for type-only imports. `verbatimModuleSyntax` is enabled.
- `erasableSyntaxOnly` is enabled: no enums, namespaces, or constructor parameter properties.
- `@/*` aliases across directories; `./x` within a directory.
- Layer import direction `core <- scene <- editor/viewer` is enforced by ESLint; the viewer bundle must not contain editor code.
- Tests are co-located as `*.test.ts` or `*.test.tsx`; no shared Vitest setup file.
- Vitest config lives in `vite.config.ts` with `globals: true` and `environment: 'jsdom'`.
- Tailwind v4 is CSS-first via `@tailwindcss/vite`, `@import "tailwindcss"`, `tw-animate-css`, and the vendored `src/styles/shadcn-tailwind.css` (copied from shadcn@4.21.4); no `tailwind.config.js`.
- Editor state uses slice files composed in `src/editor/store/index.ts`; viewer state is a separate tiny store in `src/viewer/store.ts`.
- UI components use shadcn/Radix primitives plus `cn` from `src/lib/utils.ts`.
- Viewer build uses `vite.config.viewer.ts` with the local `inlineViewerBundle()` plugin: inlines JS/CSS from `viewer.html` and emits `dist-viewer/index.html`. Single-entry only; keep editor and viewer builds separate.
- Do not run Playwright/browser QA unless explicitly requested; the user handles visual QA by default.

## ANTI-PATTERNS (THIS PROJECT)
- No `as any`, `@ts-ignore`, or silent type suppression.
- No backend/database/auth scope; persistence is browser `localStorage`, n8n short-link proxy, and share-link hash payloads only.
- No per-gate size adjustment; gate dimensions are shared constants.
- No custom gate type creation; the app has a fixed gate type set.
- No gate-type `switch`/`if` chains outside `gateDefinitions.ts`; add a definition field.
- No mobile/touch gesture scope expansion unless explicitly requested; desktop mouse/keyboard is primary.
- Do not validate persisted/shared data outside `src/core/schemas`; do not persist derived data (opening geometry, default sequences).
- Do not bypass `requestDestructiveAction()` for actions that replace the current track.
- Do not read app stores in `src/scene`; do not expose editor mutations in the viewer.

## UNIQUE STYLES
- Gate rotation: UI handles snap in 15 degree steps (`ROTATION_SNAP_STEP_DEGREES`, `src/editor/gates/gateHandleMath.ts`) when grid snapping is on; generator rounds to 30 degrees.
- Gate movement: N/S/E/W, 1m increments; optional snap-grid uses smaller subdivisions during drag.
- Undo/redo: `past`/`future` arrays, `MAX_HISTORY=50`, dirty flag captured in history entries.
- Flight path: gate-sequence visits, Bezier sampling, disjoint native `THREE.Line` segments, arrows along path.
- Camera controls: Space/right-click pan, Shift vertical pan, wheel/middle-click smooth zoom.
- Scene look: `config.sky` (day/dusk/night/studio), `config.ground` (grass/hall/asphalt), `config.quality` (simple/realistic). Night sky enables lazily loaded bloom (`NightBloom.tsx`), neon emissive gates and an unlit, darkened ground. Legacy `config.theme` values are mapped in the schema (`LEGACY_THEME_LOOKS`).
- Import/export schema keeps legacy compatibility explicit, e.g. 1.x files with full openings and the old `asymmetric` gate type.
- Share links use compact `c.` payloads (~200 chars for 11 gates) and still decode `z.` and legacy base64-url payloads.
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
- There is no gate barrel; `GATE_COMPONENTS` in `src/scene/gates/gateComponents.ts` is the type -> component map.
- Runtime libs are `dependencies`; build/test tooling (Vitest, Testing Library) is `devDependencies`. The shadcn CLI is not installed; add components with `npx shadcn@latest add <name>`. `three` is declared explicitly.
- `shadcn` and `vite-plugin-singlefile` were removed on purpose: both pulled in the unpatched `braces`/`micromatch` advisory. Do not re-add them; `npm audit` should stay at 0.
- Root has generated QA/build artifacts at times (`qa-*.png`, `dist/`, `dist-viewer/`); keep generated artifacts out of commits unless intentionally requested.
- Avoid creating visual QA screenshots unless explicitly requested.
- `docs/coolify-track-sharing.md` documents the two-service Coolify deploy and the n8n short-link proxy.
- `src/core/share/qrCode.ts` generates share QR PNG/SVG via `qrcode`; `ShareTrackDialog` previews via `dangerouslySetInnerHTML`.
- Zod adds ~27 kB to the viewer bundle; `zod/mini` would be smaller if bundle size becomes a concern.
- No CI workflows exist; build/test/lint are run manually.
