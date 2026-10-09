# Core — Domain Logic (no React)

**Domain:** Types, gate definitions, track generation, flight path, persistence schemas, share-link codec, theme lookup. Shared by editor and viewer. ESLint forbids imports of React, `@react-three/*`, `@/components`, `@/scene`, `@/editor`, `@/viewer` here.

## STRUCTURE
```
core/
├── types/                 # Domain contracts; barrel `@/core/types`
│   ├── gate.ts            # GATE_TYPES (canonical order), GateType, Gate, GateOpening, PersistedGateOpening
│   ├── track.ts           # Track, GateSequenceItem
│   ├── config.ts          # Config, SNAP_GRID_SIZES
│   └── theme.ts           # THEME_IDS, ThemeColors, ThemeConfig, THEME_PRESETS, DEFAULT_THEME
├── defaultConfig.ts       # First-visit / reset config
├── constants/gateDimensions.ts
├── gates/
│   ├── gateDefinitions.ts # GATE_DEFINITIONS: per-type openings, sequence, poles, flight-path hints, handle height
│   ├── gateOpenings.ts    # normalizeGate(s): geometry from definition, only `reverse` from persisted data
│   ├── gateSequence.ts    # default/fallback sequence, implicit passes, normalization
│   └── poleCount.ts       # pole breakdown in GATE_TYPES order
├── track/
│   ├── generator.ts       # generateTrack(config)
│   ├── generationConfig.ts# config drift that requires regeneration
│   └── flightPath.ts      # calculateFlightPath(gates, sequence)
├── schemas/
│   ├── track.schema.ts    # Zod file/storage format 2.0.0; parseTrackExport, (de)serializeTrack
│   └── compactTrack.schema.ts # positional share-link format
├── share/
│   ├── shareTrack.ts      # `c.` / `z.` / base64 share payloads, viewer URL, shortener client
│   └── qrCode.ts          # share QR PNG/SVG
└── theme/themeColors.ts   # getThemeConfig(), getGateColors()
```

## GATE TYPES
Everything per gate type lives in `gates/gateDefinitions.ts` (`Record<GateType, GateDefinition>`): `createOpenings`, `remapLegacyOpenings`, `sequenceOpeningIds`, `isSideDefinedTransition`, `tunnelOpeningId`, `implicitPass`, `poles`, `isStartFinish`, `topHeight`. Adding a type: extend `GATE_TYPES`, then fix every compile error (definitions, `scene/gates/gateComponents.ts`, `editor/icons/GateIcon.tsx`, theme colors in `types/theme.ts`, labels in `src/i18n.ts`, `defaultConfig.ts`). `gateDefinitions.test.ts` checks each definition for consistency.

Dive exit side and h-gate backrest side derive from the gate id (`getGateIdVariant`, 0–3). Code that recreates ids (share links) must preserve the variant.

## PERSISTENCE FORMAT (`schemas/track.schema.ts`)
- Zod schema is the only trusted boundary for files, localStorage and share links. Errors are `{ field, message }` with paths like `track.gates[0].rotation`.
- Version `2.0.0` stores only user state: gates without opening geometry (only `{ id, reverse: true }` for reversed openings), and no `gateSequence` when it equals the default lap. 1.x files with full openings still load; legacy `asymmetric` maps to `double-h`, legacy `gateSize`/`size` fields are dropped.
- `serializeTrack(track, config)` is minified (storage); file downloads pass `{ pretty: true }`.
- `parseTrackExport(data)` validates and normalizes any parsed object; `deserializeTrack(json)` wraps it.

## SHARE LINKS
- New links: `c.` + lz-string of `encodeCompactTrack()` — positions in cm, whole-degree rotation, gate index instead of ids, sequence omitted when default. ~200 chars for 11 gates.
- `z.` (lz-string full JSON) and prefix-less base64url links must keep decoding.
- Decoded compact payloads are turned into an export object and still pass `trackExportSchema`.

## CONVENTIONS
- Pure functions; no store, DOM side effects only where the API is about the browser (`qrCode` downloads, shortener `fetch`).
- `import type` for type-only imports; constants near the top of each file.
- Tests are co-located; browser API mocks stay local to each test file.

## ANTI-PATTERNS
- Do not branch on gate type strings outside `gateDefinitions.ts`; add a definition field instead.
- Do not validate persisted/shared data anywhere but `schemas/`.
- Do not persist derived data (opening geometry, default sequences).
- No enums/namespaces/parameter properties (`erasableSyntaxOnly`).

## TESTING
- `flightPath.test.ts` is the path-geometry regression suite; keep gate-specific cases.
- `track.schema.test.ts` covers legacy imports, format 2.0.0 size rules and error messages; `compactTrack.schema.test.ts` covers the link codec incl. id variants.
- `generator`, `gateOpenings`, `gateSequence`, `gateDefinitions`, `poleCount`, `shareTrack`, `qrCode` have co-located suites.
