# Types — Domain Contracts

**Domain:** Pure TypeScript domain contracts and theme presets. No runtime logic, no store, no React imports.

## STRUCTURE
```
types/
├── gate.ts      # GateType union, Gate, GateOpening
├── track.ts     # Track, GateSequenceItem
├── config.ts    # Config, SnapGridSize + SNAP_GRID_SIZES
├── theme.ts     # ThemeId, ThemeColors, ThemeConfig, THEME_PRESETS, DEFAULT_THEME
└── index.ts     # `export *` barrel (complete; consumed via `@/types` / `../types`)
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Add/change gate kind | `gate.ts` | `GateType` union is the canonical fixed set; update gates dispatcher + schema together |
| Track/gate-sequence shape | `track.ts` | `Track` includes `gates`, `gateSequence`, `fieldSize`, timestamps |
| Config settings | `config.ts` | `Config` + `SNAP_GRID_SIZES` (0.3/0.5/1) |
| Themes/colors | `theme.ts`, `src/utils/themeColors.ts` | `THEME_PRESETS` keyed by `ThemeId`; `DEFAULT_THEME = 'minimal'` |
| Import contract | `index.ts` | Re-exports gate/track/config/theme; add new type files here |

## CONVENTIONS
- `import type` for type-only imports (`verbatimModuleSyntax` is on).
- Named exports only; no default exports.
- Interfaces/type aliases only — no enums, classes, or runtime values except documented constants (`SNAP_GRID_SIZES`, `THEME_PRESETS`, `DEFAULT_THEME`) — `erasableSyntaxOnly` is on.
- `index.ts` is a complete `export *` barrel; import contracts from `@/types` rather than deep paths in cross-domain code.
- Keep color values here; keep their rendering consumers noted in `theme.ts` (Scene sky/fog/light, Grid ground, `themeColors.ts` gates).

## ANTI-PATTERNS
- Do not add enums, namespaces, or constructor parameter properties (banned by `erasableSyntaxOnly`).
- Do not put store actions, hooks, or helper functions in this directory.
- Do not change `GateType` without updating `gates/Gate.tsx`, `schemas/track.schema.ts`, and `utils/gateTypeOptions.ts`.
- Do not duplicate `Config`/`ThemeId` shapes elsewhere; import from here.
