# Utils — Core Logic

**Domain:** Track generation, flight path, gate operations/openings/sequence, storage, share links, QR codes, config drift, pole counts, theme helpers

## STRUCTURE
```
utils/
├── generator.ts          # Random track generation with collision detection
├── flightPath.ts         # Path segments, avoidance curves, samples, arrows
├── gateOpenings.ts       # Opening geometry, normalizeGates, H-gate backrest side
├── gateSequence.ts       # Sequence ordering, legacy expansion, normalization
├── storage.ts            # localStorage CRUD for saved tracks
├── shareTrack.ts         # Compressed share-link payload encode/decode
├── qrCode.ts             # Share QR PNG/SVG generation via `qrcode`
├── generationConfig.ts   # Detect settings that require regeneration
├── poleCount.ts          # Gate/pole totals for buildability reporting
├── gateTypeOptions.ts    # Canonical gate type order/labels for UI + metrics
└── themeColors.ts        # Theme lookup and gate material color helpers
```

## CONVENTIONS
- Pure functions by default: no store imports, no hidden UI side effects.
- Tests are co-located; add behavior-heavy edge cases near changed utilities.
- Constants stay near the top (`MIN_DISTANCE`, `MAX_ATTEMPTS`, clearance/sample values, payload prefixes).
- Use `import type` for type-only imports.
- Normalize gates/sequences before persistence, path calculation, or share-link serialization.
- Treat `gateTypeOptions.ts` ordering as canonical for UI lists and pole-count reporting.

## WHERE TO LOOK
| Task | File | Key Functions |
|------|------|---------------|
| Change generation algorithm | `generator.ts` | `generateTrack(config)` |
| Modify flight path | `flightPath.ts` | `calculateFlightPath(gates, sequence)` |
| Change gate movement | `src/store/trackSlice.ts` | `moveGate()`, `rotateGate()` actions |
| Modify gate openings | `gateOpenings.ts` | `createDefaultGateOpenings()`, `normalizeGates()` |
| Modify gate sequence | `gateSequence.ts` | `buildDefaultGateSequenceEntries()`, `normalizeGateSequence()` |
| Modify persistence | `storage.ts` | `saveTrack()`, `loadTrack()`, `listTracks()`, `deleteTrack()` |
| Modify share links | `shareTrack.ts` | `encodeTrackSharePayload()`, `decodeTrackSharePayload()`, `createTrackShareUrl()` |
| Share QR codes | `qrCode.ts`, `components/ui/ShareTrackDialog.tsx` | `downloadTrackQrCodePng()`, `createTrackQrCodeSvg()`, `downloadTrackQrCodeSvg()` |
| Change regen prompts | `generationConfig.ts` | generation-relevant config diff helpers |
| Change pole totals | `poleCount.ts`, `gateTypeOptions.ts` | pole count/grouping logic and display order |
| Change theme material colors | `themeColors.ts`, `src/types/theme.ts` | `getThemeConfig()`, `getGateColors()` |

## KEY CONSTRAINTS
- Min gate distance: 3m (`MIN_DISTANCE`).
- Max placement attempts: 100 per gate.
- Flight-path curve sampling is dense and gate-specific; preserve same-gate, dive, H-gate, double-H, and octagonal tunnel cases.
- Share payload prefix: `z.` for compressed payloads; keep legacy base64-url decode fallback.
- Storage key prefix: `fpv-track-`.
- Storage/import/share code must call schema helpers, not trust raw JSON.

## TESTING
- `flightPath.test.ts` is the path-geometry regression suite; preserve gate-specific cases.
- `generator.test.ts`, `gateOpenings.test.ts`, `gateSequence.test.ts`, and `storage.test.ts` cover core invariants.
- `shareTrack.test.ts`, `generationConfig.test.ts`, and `poleCount.test.ts` cover newer helpers.
- `qrCode.test.ts` covers PNG/SVG download helpers; mock `URL.createObjectURL`/`revokeObjectURL` locally.
- Browser API mocks, such as `localStorage`, `Blob`, URL, or hash payloads, stay local to each test file.
- No co-located tests currently cover `themeColors.ts` or `gateTypeOptions.ts`; add tests if behavior grows beyond lookup/order constants.
