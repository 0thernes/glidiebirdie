# Honest Performance & Determinism Benchmarks (`docs/benchmarks.md`)

All numbers below come directly from a live run of `node scripts/benchmark.mjs` saved with full raw per-seed observations in [`results/benchmarks.json`](../results/benchmarks.json) (Build Standard B26–B31).

## Hardware & Execution Environment

- **Version:** GlidieBirdie `v3.2.0`
- **CPU:** `Intel(R) Core(TM) Ultra 9 275HX` (`24` logical cores)
- **OS & Architecture:** Windows `win32` `10.0.29704` (`x64`)
- **Runtime & Flags:** Node `v25.8.2`, `none (default V8 flags)`
- **Command:** `node scripts/benchmark.mjs`
- **Design:** `5` untimed warmup seeds + `N = 30` measured paired deterministic seeds (`20261101`–`20261130`), `180` fixed `60 Hz` simulation steps (`3.0 s` hitch-free gameplay) per seed on the `720 Hz` integer tick grid, counterbalanced (`60_then_144` on even seeds, `144_then_60` on odd seeds), paired against a naive variable-`dt` Euler baseline using identical gravity (`0.052`), drag (`0.992`/`0.985`), and flap (`-2.35`) constants. Pre-registered in [`docs/preregistration.md`](preregistration.md).

## Primary Results

| Metric | GlidieBirdie 60 Hz Fixed-Step (720 Hz Grid) | Comparison / Budget | Paired Wins | Exact $p$ | $p_{\text{Holm}}$ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Max 60 Hz vs 144 Hz vertical drift (px) | **0.000** | Naive variable-`dt`: **4.783** | **30 / 30** | $1.86 \times 10^{-9}$ | $3.73 \times 10^{-9}$ |
| Median 60 Hz vs 144 Hz vertical drift (px) | **0.000** | Naive variable-`dt`: **3.855** | — | — | — |
| Mean drift ± 95% CI (px) | **0.000 `[0, 0]`** | Naive: **3.944 `[3.820, 4.069]`** | — | — | — |
| Pure simulation step latency (`N = 5,400` individual `stepSimulation()` calls) | **0.50 µs median / 2.10 µs p95 / 5.30 µs p99 / 316.40 µs max** | 60 Hz budget: `16,666.67 µs` (`0` violations) | **30 / 30** seeds under budget | $1.86 \times 10^{-9}$ | $3.73 \times 10^{-9}$ |
| Amortized whole-loop cost (incl. input poll & headless `present()`/`draw()`, 30 run averages) | **60 Hz: 3.92 µs median (10.15 µs p95)** · **144 Hz: 10.31 µs median (13.14 µs p95)** | 144 Hz budget: `6,944.44 µs` | — | — | — |
| 10,000-cycle pool churn (`5` independent reps after 1,000-cycle warmup) | **17.02 ms median (`1.70 µs/cycle`, 95% CI `[15.47, 19.62]` ms)** | `0` slot conservation violations | — | — | — |

## Performance Budgets (Build Standard A37)

| Budget | Target Ceiling | Measured (`v3.2.0`) | Headroom |
| --- | ---: | ---: | ---: |
| Pure individual simulation step (`stepSimulation()`) | `< 2,000 µs` (12% of 16.67 ms 60 Hz frame) | `0.50 µs` median (`2.10 µs` p95, `316.40 µs` max) | `> 950x` at p95 |
| Amortized whole-loop cost @ 60 Hz (incl. headless draw) | `< 2,000 µs/step` | `3.92 µs` median (`10.15 µs` p95) | `> 197x` at p95 |
| Amortized whole-loop cost @ 144 Hz (incl. headless draw) | `< 1,000 µs/step` | `10.31 µs` median (`13.14 µs` p95) | `> 76x` at p95 |
| Hitch-free 60 Hz vs 144 Hz deterministic drift | `0.000 px` | `0.000 px` across all 30 seeds | Exact |
| Pool churn slot conservation error | `0` | `0` across `5 × 10,000` cycles | Exact |

## Browser Thermal Profile & JS vs. Zig-WASM vs. Native C11 Comparison

To test whether browser laptop heat is caused by JavaScript simulation overhead or rendering/idle loops (see [ADR 0004](adr/0004-thermal-idle-scheduler-and-no-wasm-runtime.md)), we ran:

1. **Chromium CDP thermal & frame profiler (`scripts/benchmark-browser.mjs` -> [`results/browser-thermal.json`](../results/browser-thermal.json)):** At `1280x860@2x` DPR, `idle_paused_2.5s` executes **0 frames (0.0 FPS)** and `1.40 ms` total task duration over 2.5 s (demand-driven sleep), with `bodyBeforeAnimation: "none"` and only 1 `backdrop-filter` element (`.customizer-drawer.open` when opened).
2. **Kernel comparison (`scripts/benchmark-native.mjs` -> [`results/native-comparison.json`](../results/native-comparison.json)):** Across `2,000,000` `mulberry32` + dual circle-vs-rect collision iterations (`1,394,379` exact hits across all 4 modes): pure JS V8 runs at `16.09 ns/iter` (`32.171 ms`), Zig `wasm32-freestanding` batched runs at `16.96 ns/iter` (`33.925 ms`), Zig WASM per-call boundary crossing drops to `26.58 ns/iter` (`53.163 ms`), and native C11 `-O3` runs at `12.01 ns/iter` (`24.022 ms`). Consequently, porting leaf simulation math to WASM would add a build pipeline without fixing idle browser heat.

*Caveats:* `pure_simulation_step_latency_us` isolates `stepSimulation()` directly across 5,400 individual steps; `amortized_whole_loop_us_per_step` reports quantiles across 30 per-seed run averages including headless stubbed `present()`/`draw()` (which executes 2.4× as many presentations at 144 Hz as at 60 Hz). Real GPU canvas rasterization cost depends on browser compositor and device DPR.
