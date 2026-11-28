# ADR 0004: Demand-Driven Idle Scheduler, Web Audio Power-Gating, and No-WASM Runtime

- **Date:** 2026-11-26
- **Status:** Accepted

## Context

Browser games often trigger laptop fan spin and battery drain even while sitting paused or in the background. Before blaming JavaScript simulation overhead or reaching for a WebAssembly rewrite, we profiled live headless Chromium (`1280x860@2x` DPR via `scripts/benchmark-browser.mjs`, saved in `results/browser-thermal.json`) and benchmarked the exact `mulberry32` + dual circle-vs-rectangle collision kernel across V8 JavaScript, Zig `wasm32-freestanding` (both per-call JS-to-WASM boundary and single batched call), and native C11 `-O3` (`scripts/benchmark-native.mjs`, saved in `results/native-comparison.json`).

## Findings

1. **Simulation is NOT the browser thermal bottleneck:** Across `2,000,000` kernel iterations (`results/native-comparison.json`, exact `1,394,379` hits parity across all four modes):
   - Pure V8 JavaScript: `16.09 ns/iter` (`32.171 ms` total)
   - Zig WASM batched: `16.96 ns/iter` (`33.925 ms` total, `8,204 B` binary)
   - Zig WASM per-call boundary: `26.58 ns/iter` (`53.163 ms` total — **1.65x slower** than pure JS due to JS-WASM call boundary crossings)
   - Native C11 (`gcc -O3`): `12.01 ns/iter` (`24.022 ms` total)
   Pure simulation takes `< 0.05 ms` per 60 Hz frame (`0.50 us` median individual step); real thermal burn comes from unconditional `requestAnimationFrame` spinning while paused/hidden, always-on full-viewport `backdrop-filter` / `bgShift` CSS animations, redundant DPR resize sprite rebuilds, and an active 2-second stereo `ConvolverNode` FFT running during silence.
2. **Demand-driven scheduling eliminates idle burn:** In `results/browser-thermal.json`, the demand-driven scheduler (`shouldContinueLoop()` + `requestRender()` in `src/loop.js`) achieves **0 frames (0.0 FPS)** and `1.4 ms` total task duration over 2.5 s while paused, while active flight runs smoothly with zero `bgShift` body animation and opaque `{ alpha: false }` canvas compositing.

## Decision

1. **Keep the browser runtime 100% pure native ES2022 JavaScript** (zero WASM build step, zero runtime dependencies).
2. **Keep `native/glidiebirdie_oracle.c` and `native/oracle.zig` strictly offline** as an independent C11 differential verification oracle + 1,000,000-case stress fuzzer (`tests/native-differential.mjs`, ASan/UBSan in CI) and reproducible empirical microbenchmark companion (`scripts/benchmark-native.mjs`).
3. **Gate idle CPU, GPU, and audio power explicitly:**
   - Sleep `requestAnimationFrame` via `shouldContinueLoop()` whenever `document.hidden` or statically paused (`TimestepGrid.lean` proves liveness during active play and thermal sleep on hidden/static pause).
   - Suspend `AudioContext` via `suspendAudio()` on mute, pause, tab hide, and post-reverb game-over (`M16`).
   - Guard `configureCanvasForDPR()` against identical-DPR resize rebuild storms (`M13`), lazily cache bird emotion sprites for the active theme, and apply `backdrop-filter` only to `.customizer-drawer.open` (overridden by unlayered `prefers-reduced-transparency: reduce`).

## Consequences

- **Positive:** Zero browser build pipeline preserved; 0 FPS / deep audio sleep on paused and hidden tabs; independent C11 differential oracle + 1M native fuzz cases + ASan/UBSan verify the discrete mathematical core against a second compiled language without bloating the web app.
- **Trade-off:** Any new state transition that mutates visual output while paused or idle must call `hooks.requestRender()` to wake a single render frame.
