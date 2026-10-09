# Scene — Shared R3F Rendering

**Domain:** The single `<Canvas>`, theme environments, camera controls, flight path, FPV fly-through and all gate meshes. Used by editor and viewer. ESLint forbids `@/editor` and `@/viewer` imports here.

## STRUCTURE
```
scene/
├── Scene.tsx              # Single Canvas owner; props: track, config, gateComponent?, onGroundClick?, fpv flags
├── SceneTheme.tsx         # SceneThemeContext + useSceneTheme(); provided inside the Canvas
├── pointer.ts             # isCameraTouchGesture()
├── Grid.tsx               # Ground, field boundary, grid lines; optional onGroundClick
├── FlightPath.tsx         # One native THREE.Line per sampled segment + arrows
├── FpvFlyThrough.tsx      # Automated first-person flight along sampled path
├── NightBloom.tsx         # Bloom postprocessing, lazy-loaded for the night theme
├── SkyDome.tsx            # Shader sky dome
├── CameraPan.tsx          # Space+left-drag / right-drag pan
├── CameraVerticalPan.tsx  # Shift+left-drag vertical pan
├── SmoothZoom.tsx         # Wheel / middle-drag / pinch smooth zoom
└── gates/
    ├── Gate.tsx           # Read-only gate wrapper (shadows, optional callbacks + children overlay); SceneGateProps
    ├── gateComponents.ts  # GATE_COMPONENTS: Record<GateType, component>
    ├── gateComponentProps.ts
    ├── GateOpeningIndicators.tsx / GateEntryIndicator.tsx
    └── StandardGate, HGate, DoubleHGate, HurdleGate, DiveGate, DoubleGate, LadderGate,
        StartFinishGate, Flag, FlagSmall, OctagonalTunnelGate (.tsx)
```

## CONVENTIONS
- `Scene` renders exactly what it receives and reads no app store. Interactivity is injected: the editor passes `gateComponent={EditableGate}` and `onGroundClick`; the viewer passes neither.
- Colors come from `useSceneTheme()`, never from a store. The provider sits inside `<Canvas>` and is derived from `config.theme`.
- Gate meshes use `meshStandardMaterial` with solid colors from `getGateColors()`; selection is an emissive highlight.
- Camera controllers are imperative (`useThree`, refs, DOM listeners, `useFrame`) and return `null`.
- Per-type, non-visual data (openings, heights, poles) belongs in `src/core/gates/gateDefinitions.ts`, not here.
- `src/editor/icons/GateIcon.tsx` mirrors each gate's silhouette; keep it in sync with geometry changes.

## ANTI-PATTERNS
- No second `<Canvas>` anywhere in the app.
- No store reads or editor imports; pass data through props/context.
- No per-gate sizing or custom gate types.

## TESTING
- No direct R3F component suites; geometry/path logic is tested in `src/core`, handle math in `src/editor/gates`.
- `src/viewer/ViewerApp.test.tsx` mocks `Scene` and asserts the viewer passes no interactive props.
