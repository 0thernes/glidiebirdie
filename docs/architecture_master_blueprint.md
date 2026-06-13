# Architecture Guide

This document explains how GlidieBirdie is actually built today. It is meant to help maintainers and AI assistants make safe changes without guessing.

## Design Boundaries

These are the rules the runtime is built around:

- No build step.
- No runtime dependencies.
- No backend or remote storage.
- No module split for the game engine. `game.js` is intentionally the whole runtime.
- Static hosting must remain enough to run the project.
- Accessibility, mobile play, and calm pacing are product requirements, not optional polish.

## System Overview

| Layer | File | Responsibility |
| --- | --- | --- |
| Document shell | `index.html` | Semantic structure, canvas host, toolbar, drawer, tutorial, install metadata |
| Styling | `style.css` | Theme tokens, responsive layout, accessibility media queries, components |
| Runtime engine | `game.js` | Physics, rendering, audio, input, persistence, UI state, achievements |
| Offline shell | `service-worker.js` | Cache the small app shell for localhost and HTTPS installs |
| Install metadata | `manifest.webmanifest` | PWA name, icons, display mode, colors |
| Validation | `tests/smoke-test.mjs` | Protect the public surface and repo promises |

## Runtime Layout Inside `game.js`

The engine is organized in numbered sections. That ordering matters because later systems depend on earlier setup.

| Section | Purpose |
| --- | --- |
| `1. CONFIG` | Central tuning constants and limits |
| `2. DOM + DPR-AWARE CANVAS` | DOM references, canvas context, device-pixel-ratio setup |
| `3. RNG` | Seeded random support for daily mode |
| `4. STORAGE` | Guarded `localStorage` read and write helpers |
| `5. AUDIO` | Web Audio graph, effects, and scheduler |
| `6. STATE` | Shared mutable runtime state |
| `7-9` | Theme tables, sprite caches, world object pools |
| `10-11` | Physics update and rendering |
| `12-19` | Drawer logic, stats, achievements, lifecycle, input, service worker, bindings |
| `20-21` | Main loop and boot |

## Boot Sequence

The runtime starts in a predictable order:

1. Resolve DOM references and configure the canvas with `configureCanvasForDPR()`.
2. Load stored preferences and stats through the guarded storage helpers.
3. Rebuild cached art and theme-derived values.
4. Bind drawer controls, tutorial behavior, keyboard input, and mobile controls.
5. Register the service worker when the environment allows it.
6. Start the requestAnimationFrame loop through `loop()`.

This matters because several systems expect derived physics, canvas size, and DOM references to exist before the first frame.

## Main Loop

`loop()` is the heart of the runtime.

- It computes frame timing from `performance.now()`.
- It normalizes frame cost into `state.dt` and `state.dtSec`.
- It calls `update()` before `draw()`.
- It keeps gameplay consistent across 60Hz, 120Hz, 144Hz, and 240Hz displays.

The project uses normalized delta time on purpose. New time-based behavior should use `state.dt` or `state.dtSec`, not raw frame assumptions.

## State Model

Two structures drive most behavior:

- `CONFIG` holds static tuning values.
- `state` holds live runtime data such as score, theme, physics multipliers, pause status, weather state, and achievement progress.

The rule of thumb is simple:

- If a value is a product constant, keep it in `CONFIG`.
- If a value changes during play, keep it in `state`.

## Rendering Pipeline

Rendering is immediate-mode Canvas 2D with a few important optimizations:

- The canvas backing store is sized with device pixel ratio awareness.
- Expensive art is rebuilt into offscreen caches with `rebuildSpriteCaches()`.
- Weather, particles, and shield effects use pre-allocated pools.
- `draw()` composes the frame in layers: background, weather, pipes, bird, HUD, overlays.

This keeps the runtime dependency-free while still producing crisp output on high-density displays.

## Physics And World Simulation

Gameplay is updated in `update()` through helpers such as:

- `updateBird()`
- `spawnPipe()`
- `updatePipes()`
- `checkCollisions()`
- `updateNearestPipeCache()`

Important design choices:

- Semi-implicit Euler updates keep motion stable enough for the project scale.
- Pipe generation is driven by timers, not frame counts.
- Collision checks use circle-vs-rectangle logic for a softer, more believable hitbox.
- Difficulty ramps gradually and is capped.
- The Feather Shield is handled as part of the collision and recovery flow, not as a detached subsystem.

## Input And UI Coordination

The game supports mouse, touch, keyboard, and on-screen controls without splitting the engine into separate apps.

Key entry points:

- `handleAction()` for primary play actions
- `bindMobileControls()` for coarse-pointer devices
- `bindDrawerControls()` for the customizer
- `setCustomizerOpen()` and `trapDrawerFocus()` for modal behavior
- `togglePause()`, `toggleMute()`, and `toggleFullscreen()` for utility controls

The mobile control bar is part of the core product. Any gameplay change should still work with the on-screen Brake, Flap, and Dive controls.

## Audio Architecture

GlidieBirdie generates all sound locally with Web Audio.

The audio system is built around:

- `buildAudioGraph()` for the shared graph
- `ensureAudio()` for user-gesture unlock
- `playTone()` and `playToneAt()` for basic synthesis
- `scheduleMusicAhead()` for clock-based music timing
- `startMusic()` and `stopMusic()` for session-level control

The scheduler runs ahead on the AudioContext clock so the music stays stable even when the tab is under load.

## Persistence And Daily Mode

All storage flows through guarded helpers:

- `readStoredChoice()`
- `readStoredNumber()`
- `readStoredLevel()`
- `readStoredBool()`
- `writeStoredValue()`

This protects the runtime from malformed local data and private-mode failures.

Daily mode uses the seeded random utilities:

- `dateSeed()`
- `mulberry32()`
- `setSeededRNG()`

That keeps pipe generation deterministic for a given day without changing the core engine shape.

## Accessibility And Resilience

Accessibility is woven into the same runtime, not bolted on with a separate mode.

Important behavior includes:

- `announce()` for screen-reader updates
- focus-managed drawer open and close flow
- reduced-motion handling that scales down weather, particles, and shake
- semantic HTML landmarks and button labeling in `index.html`
- pause-on-visibility and pause-on-blur lifecycle handling

When adding UI, assume keyboard access and reduced-motion behavior are required.

## Offline And PWA Model

The PWA layer stays intentionally small.

- `manifest.webmanifest` defines install metadata.
- `registerServiceWorker()` handles registration.
- `service-worker.js` caches the app shell only.

The service worker is not a data layer, sync layer, analytics layer, or network abstraction. Keep it small and predictable.

## Validation And Release Flow

The repo relies on lightweight checks instead of heavy tooling.

`npm run check` currently validates:

- syntax for `game.js`
- syntax for `service-worker.js`
- repo promises through `tests/smoke-test.mjs`

Documentation quality is validated separately with markdownlint and cspell.

## Safe Extension Checklist

Before adding or changing behavior:

1. Put new tuning values in `CONFIG`.
2. Keep persistent data behind the storage helpers.
3. Respect `state.dt` and `state.dtSec`.
4. Verify mobile controls still make sense.
5. Verify reduced-motion and keyboard behavior still work.
6. Update `README.md` and this guide when the public shape of the project changes.

## Companion Documents

This guide is the prose reference. Its visual and structured companions:

- [`DIAGRAMS.md`](DIAGRAMS.md) — Mermaid component, game-phase state machine, frame-loop sequence, audio graph, and persistence/daily-seed flow.
- [`DATA-MODEL.md`](DATA-MODEL.md) — ERM/ERD of the persisted (`gb:*`) and runtime entities, plus the storage migration contract.
- [`COMPLEXITY.md`](COMPLEXITY.md) — time/space complexity of every hot path (the DSA rationale behind the engine).
- [`ROADMAP.md`](ROADMAP.md) — Now/Next/Later Kanban, shipped work, and the rejected-ideas icebox.
- [`../AUDIT-500.md`](../AUDIT-500.md) — the 500-point / 25-section inspection.

## Recommended Reading Order

If you are new to the repo, read these files in order:

1. `README.md`
2. `docs/architecture_master_blueprint.md` (this file) → then its companions above
3. `CONTRIBUTING.md`
4. `CLAUDE.md`
5. `tests/smoke-test.mjs`
