# Hooks — Editor Interaction

**Domain:** Keyboard shortcuts, R3F gate selection, active theme resolution. Editor-only; not used by the read-only viewer.

## STRUCTURE
```
hooks/
├── useKeyboardShortcuts.ts       # Global keydown map -> store actions + UI callbacks
├── useKeyboardShortcuts.test.tsx # Shortcut coverage
├── useGateSelection.ts           # R3F click -> selectGate, additive selection guard
└── useTheme.ts                   # config.theme -> getThemeConfig()
```

## WHERE TO LOOK
| Task | File | Notes |
|------|------|-------|
| Change shortcut map | `useKeyboardShortcuts.ts` | S shuffle, Cmd/Ctrl+S save, G gallery, Cmd/Ctrl+Z/Y undo/redo, Escape, Backspace delete, Enter confirm |
| Change gate click/selection | `useGateSelection.ts`, `src/store/trackSlice.ts` | Shift/Meta/Ctrl = additive; ignored while dragging or camera-gesturing |
| Change active theme hook | `useTheme.ts`, `src/utils/themeColors.ts`, `src/types/theme.ts` | Thin selector over `config.theme` |

## CONVENTIONS
- Hooks may read editor state via `useAppStore` (including `@/store`); they are editor shell, not shadcn primitives.
- Shortcuts must early-return when the event target is `INPUT`, `TEXTAREA`, or `isContentEditable`.
- `useKeyboardShortcuts` takes callbacks (`onSave`, `onShuffle`, `onOpenGallery`, `onEscape`) and owns undo/redo/select/delete itself.
- `useTheme` returns a resolved `ThemeConfig`; do not read `config.theme` directly in components that need colors.
- R3F hooks (`useGateSelection`) return handler props (`isSelected`, `handleClick`); camera-control hooks live in `src/components/scene/`.

## ANTI-PATTERNS
- Do not import editor hooks into `src/components/viewer/` or `src/viewer-store.ts`.
- Do not call `preventDefault()` on typing keys before the input-target guard.
- Do not encode shortcut behavior in components; extend `useKeyboardShortcuts`.
- Do not duplicate theme lookup logic outside `useTheme` / `getThemeConfig`.

## TESTING
- `useKeyboardShortcuts.test.tsx` is the shortcut regression suite; extend it when adding/changing keys.
- `useGateSelection` and `useTheme` have no co-located tests; add one if behavior grows beyond a store selector.
