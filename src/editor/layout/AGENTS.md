# Layout — Editor Shell Controls

**Domain:** Top toolbar, side tool rail, pole counter, import/export/share/shuffle controls around the 3D editor

## STRUCTURE
```
layout/
├── TopBar.tsx              # undo/redo, FPV toggle, import/export, view toggles, language
├── LeftToolPanel.tsx       # shuffle/save/share/gallery/settings/design tool rail
├── PoleCounter.tsx         # pole breakdown popover in TopBar
├── TopBar.test.tsx         # import/export/top-bar behavior
└── LeftToolPanel.test.tsx  # tool rail behavior
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Import/export JSON | `TopBar.tsx`, `src/schemas/track.schema.ts` | Export via `serializeTrack`; import via `deserializeTrack` |
| Undo/redo / view toggles | `TopBar.tsx`, `src/store/trackSlice.ts`, `src/store/configSlice.ts` | Store-driven controls |
| FPV toolbar button | `TopBar.tsx`, `src/App.tsx`, `src/components/scene/Scene.tsx` | App owns active state; scene completes flight |
| Shuffle track | `LeftToolPanel.tsx`, `src/utils/generator.ts` | Wrap with `requestDestructiveAction()` |
| Share link | `LeftToolPanel.tsx`, `src/utils/shareTrack.ts`, `ShareTrackDialog.tsx` | Long URL first, optional n8n shortener fallback |
| Save/gallery/settings/design | `LeftToolPanel.tsx`, `src/App.tsx`, `src/components/ui/` | Panel opens are parent-owned where provided |
| Pole totals | `PoleCounter.tsx`, `src/utils/poleCount.ts` | Dive/tunnel can be marked not buildable |

## CONVENTIONS
- Layout components may read editor state with `useAppStore`; they are app shell, not shadcn primitives.
- Keep destructive actions (`shuffle`, JSON import, gallery loads) behind `requestDestructiveAction()` so dirty tracks prompt first.
- Import/export/share must route through schema/share utilities; never build payloads manually in layout.
- `LeftToolPanel` share dialog shows both the long URL and the short URL; copy uses the short URL when available, else the long one.
- Text comes from `useTranslation()` except stable product labels like `FPV-Track-Designer` and `Beta Version`.
- Keep mobile bottom-rail and desktop side-rail classes together in `LeftToolPanel`; avoid separate duplicated components.

## ANTI-PATTERNS
- Do not call `generateTrack()` directly from UI without preserving dirty-state confirmation.
- Do not read files/import JSON before the destructive-action confirmation has accepted replacement.
- Do not bypass `serializeTrack()` / `deserializeTrack()` for downloads or imports.
- Do not put viewer-only controls here; viewer UI lives in `src/components/viewer/`.
- Do not move pole-count business rules into `PoleCounter`; keep calculations in `src/utils/poleCount.ts`.

## TESTING
- Update `TopBar.test.tsx` for import/export, toggles, language, FPV, and undo/redo behavior.
- Update `LeftToolPanel.test.tsx` for shuffle/save/share/gallery/settings/design interactions.
- Mock browser APIs per test file: `FileReader`, `Blob`, `URL.createObjectURL`, clipboard/shortener fetch as needed.
