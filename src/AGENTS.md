# Src — Layers & Entry Points

## LAYERS
```
src/
├── main.tsx             # editor bootstrap: StrictMode + ErrorBoundary + editor/App
├── i18n.ts              # DE/EN translations, language store, useTranslation(), translateOutsideReact()
├── index.css, styles/   # Tailwind v4 CSS-first tokens; vendored shadcn tailwind.css
├── lib/utils.ts         # cn()
├── components/          # ErrorBoundary + shadcn primitives (ui/)
├── core/                # domain logic, no React            → core/AGENTS.md
├── scene/               # shared R3F rendering               → scene/AGENTS.md
├── editor/              # editor app, store, panels, handles → editor/AGENTS.md
└── viewer/              # read-only share viewer             → viewer/AGENTS.md
```

Import direction is enforced by ESLint (`no-restricted-imports` in `eslint.config.js`):

```
core  ←  scene  ←  editor
  ↑        ↑
  └──── viewer        (viewer must not import editor; scene must not import editor/viewer; core imports no app layer or React)
```

`components/`, `lib/` and `i18n.ts` are shared by everything above `core`.

## CONVENTIONS
- Named exports; `editor/App.tsx` is the only default export.
- `@/…` alias across directories; `./x` within the same directory.
- Both bootstraps wrap UI in `StrictMode` and `ErrorBoundary`; mount effects must be idempotent.
- `i18n.ts` is the only translation source; every key exists in `de` and `en`; placeholders use `{name}`. `TranslationKey` is exported for typed key maps.

## ANTI-PATTERNS
- No second `<Canvas>` outside `scene/Scene.tsx`.
- No parsing of share hashes or imported JSON outside `core/schemas` / `core/share`.
- No ad-hoc per-component translation constants.
