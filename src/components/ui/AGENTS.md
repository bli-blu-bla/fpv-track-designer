# UI Primitives — shadcn/Radix

**Domain:** Store-agnostic UI building blocks shared by editor and viewer. App-specific dialogs/panels live in `src/editor/panels/`.

## STRUCTURE
```
components/
├── ErrorBoundary.tsx      # used by both entry points
└── ui/
    ├── button, dialog, input, label, popover, scroll-area, select, separator,
    │   sheet, slider, tabs, toggle, toggle-group, tooltip, badge, card, collapsible (.tsx)
    ├── directional-pad.tsx  # N/S/E/W pad
    ├── icon-button.tsx      # Tooltip + Button
    └── *-variants.ts        # cva class maps
```

## CONVENTIONS
- `components.json` aliases point here (`@/components/ui`, `@/lib/utils`); add primitives with `npx shadcn@latest add <name>`.
- Primitives import `cn` from `@/lib/utils`, keep Radix composition, and never read app stores.
- Variant files own `cva` maps (`button-variants.ts`, `badge-variants.ts`, `tabs-variants.ts`, `toggle-variants.ts`).
- Visual language: dark cockpit surfaces, sky-blue/slate panels, warm yellow primary accents.

## TESTING
- No direct suites; behavior is tested through editor/viewer components. Do not snapshot shadcn output.
