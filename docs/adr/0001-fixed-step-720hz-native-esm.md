# ADR 0001: Fixed-Step 720 Hz Tick Grid and Native ES2022 Modules

- **Date:** 2026-11-04 (hardened 2026-11-25)
- **Status:** Accepted

## Context

Monolithic variable-`dt` `requestAnimationFrame` loops drift across 60 Hz and 144 Hz displays (3.855 px median drift over 3 s in paired 30-seed benchmarks) and resist targeted unit testing or formal specification. Introducing a bundler (Vite/Webpack) violates the zero-build-step durability goal.

## Decision

1. Split the engine into 18 strictly acyclic native ES2022 modules under `src/` loaded directly by `game.js` (breaking the `ui <-> input` cycle via `src/state.js` and `src/hooks.js`).
2. Advance physics at fixed `SIM_HZ = 60` on a `TICK_HZ = 720` integer grid ($\mathrm{lcm}(60, 144) = 720$), clamping hitch catch-up to `MAX_FRAME_STEPS = 5` and render interpolation `view.alpha` to `[0, 1]`.

## Consequences

- **Positive:** Exact `0.000 px` 60/144 Hz divergence across all 30 paired seeds; direct Node ES module import for headless testing; zero build pipeline to maintain.
- **Trade-off:** Native ES modules require serving over HTTP/HTTPS (`npm run serve`) rather than opening `index.html` via `file://`.
