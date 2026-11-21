# Architecture Guide

This document explains how GlidieBirdie is actually built today. It is meant to help maintainers and AI assistants make safe changes without guessing.

## Design Boundaries

These are the rules the runtime is built around:

- No build step.
- No runtime dependencies.
- No backend or remote storage.
- Native ES modules only. `game.js` is the browser entry; the engine lives in `src/`. No bundler.
- Static hosting must remain enough to run the project.
- Accessibility, mobile play, and calm pacing are product requirements, not optional polish.

## System Overview

| Layer | File | Responsibility |
| --- | --- | --- |
| Document shell | `index.html` | Semantic structure, canvas host, toolbar, drawer, tutorial, install metadata |
| Styling | `style.css` | Theme tokens, responsive layout, accessibility media queries, components |
| Runtime entry | `game.js` | Imports `src/main.js` and boots. GitHub Pages serves it as a module |
| Engine modules | `src/*.js` | Physics, collision, input, audio, rendering, storage, UI, and the fixed-step loop |
| Offline shell | `service-worker.js` | Cache the small app shell for localhost and HTTPS installs |
| Install metadata | `manifest.webmanifest` | PWA name, icons, display mode, colors |
| Validation | `tests/smoke-test.mjs` | Protect the public surface and repo promises |

## Runtime Layout Across `src/`

The engine is split into small native ES modules under `src/` (loaded via `game.js` with no bundler):

| Module | Purpose |
| --- | --- |
| `src/config.js` | Central frozen tuning constants (`CONFIG`) and labels |
| `src/rng.js` | Seeded `mulberry32` gameplay RNG and independent cosmetic RNG |
| `src/storage.js` | Guarded `localStorage` helpers (`SK` `gb:` map + legacy migration) |
| `src/timestep.js`, `src/input-queue.js` | 720 Hz tick grid and timestamped input queue |
| `src/state.js` | Shared mutable runtime state, `THEME_TABLE`, bird/ground/pipe/pool state |
| `src/dom.js`, `src/haptics.js`, `src/hooks.js` | Cached DOM handles, DPR canvas setup, haptics, cycle-breaking hooks |
| `src/audio.js` | Web Audio graph (`masterGain`, `musicGain`, lowpass, reverb) and scheduler |
| `src/collision.js`, `src/physics.js` | Circle-vs-rect collision, bird/pipe/shield/pool updates |
| `src/render.js` | Offscreen sprite caches, interpolated world rendering, HUD, postcard |
| `src/achievements.js`, `src/ui.js` | Stats, 12 milestones, toasts, sparkline, drawer, tutorial, theme switching |
| `src/session.js`, `src/input.js` | Run lifecycle (`resetGame`, `startGame`, `gameOver`, afterglow) and keyboard/touch/gamepad input |
| `src/loop.js`, `src/main.js` | Fixed 60 Hz simulation loop with interpolation and `boot()` wiring |

## Boot Sequence

The runtime starts in a predictable order inside `src/main.js`:

1. Register `onDprChange(rebuildSpriteCaches)` and configure the canvas with `configureCanvasForDPR()`.
2. Derive physics constants with `updateDerivedPhysics()` and initialize a clean start state via `resetGame()`.
3. Bind drawer controls, mobile controls, and tutorial modal behavior.
4. Register the service worker when served over HTTP(S).
5. Sync initial UI state, wire toolbar buttons, and start the `requestAnimationFrame(loop)` loop.

This matters because several systems expect derived physics, canvas size, and DOM references to exist before the first frame.

## Main Loop

`loop()` in `src/loop.js` is the heart of the runtime.

- It maps `performance.now()` timestamps onto a 720 Hz integer tick grid (the LCM of 60 and 144).
- It advances simulation in exact 1/60 s steps (`dt = 1`, `dtSec = 1/60`), capped at `MAX_FRAME_STEPS = 5` per frame to prevent lag-spike tunneling.
- It computes a clamped interpolation factor `view.alpha` in `[0, 1]` for smooth rendering between ticks.
- It keeps gameplay deterministic and identical across 60 Hz, 120 Hz, 144 Hz, and 240 Hz displays.

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

- syntax for `game.js`, `service-worker.js`, and every module in `src/`
- static checks (`tests/static-checks.mjs`)
- brand, link, and license guards (`tests/brand-guard.mjs`, `tests/link-guard.mjs`, `tests/license-guard.mjs`)
- headless engine behavioral invariants (`tests/engine-test.mjs`)
- 60 Hz / 144 Hz trajectory determinism (`tests/determinism.mjs`)
- repo promises through `tests/smoke-test.mjs`

CI additionally runs ESLint (`npm run lint`), TypeScript `checkJs` (`npm run typecheck`), and Playwright + axe-core WCAG 2.2 AA browser tests (`npm run test:browser`). Documentation quality is validated with markdownlint and cspell.

## Safe Extension Checklist

Before adding or changing behavior:

1. Put new tuning values in `CONFIG`.
2. Keep persistent data behind the storage helpers.
3. Respect `state.dt` and `state.dtSec`.
4. Verify mobile controls still make sense.
5. Verify reduced-motion and keyboard behavior still work.
6. Update `README.md` and this guide when the public shape of the project changes.

## Recommended Reading Order

If you are new to the repo, read these files in order:

1. `README.md`
2. `docs/architecture_master_blueprint.md`
3. `CONTRIBUTING.md`
4. `CLAUDE.md`
5. `tests/smoke-test.mjs`
