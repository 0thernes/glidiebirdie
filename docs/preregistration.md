# Pre-Registration of Benchmark Hypotheses (`docs/preregistration.md`)

**Version:** `3.2.0` · **Date:** `2026-11-26` · **Script:** `scripts/benchmark.mjs` (Build Standard B32)

## Hypotheses

- **H1 (Refresh-Rate Determinism):** On 30 paired deterministic seeds (`20261101`–`20261130`, 180 fixed 60 Hz steps = 3.0 s per hitch-free run with randomized 5-flap schedules, preceded by 5 untimed warmup seeds and counterbalanced `60_then_144` / `144_then_60` execution order), GlidieBirdie's 60 Hz fixed-step integrator quantized on a 720 Hz tick grid produces strictly smaller maximum vertical trajectory divergence between 60 Hz and 144 Hz than a naive variable-`dt` Euler baseline using identical physics constants (`maxDrift_fixed === 0 < maxDrift_variable`).
- **H2 (Pure Simulation Step Budget Margin):** Across all 5,400 individual simulation steps (`30 seeds × 180 steps`) timed directly via `stepSimulation()` (excluding `present()`/`draw()`), every individual step completes strictly below the 60 Hz frame budget (`16,666.67 µs`), with median `< 2,000 µs` and `individual_step_budget_violations_60hz === 0`.
- **H3 (Zero Pool Drift):** Across 5 independent repetitions of 10,000 continuous particle + weather spawn/update/clear cycles (after a 1,000-cycle warmup), `active + free === cap` holds on every cycle (`conservation_violations === 0`).

## Statistical Analysis Plan

- **Sample size:** `N = 30` paired seeds (fixed a priori; no peeking or optional stopping; 5,400 individual pure-simulation step samples; 5 independent 10,000-cycle pool repetitions).
- **Order control:** Even-indexed seeds run `60 Hz -> 144 Hz`; odd-indexed seeds run `144 Hz -> 60 Hz`. Execution order and all raw per-seed observations are saved in `results/benchmarks.json`.
- **Primary test:** Exact two-sided paired sign test on win/loss counts ($p = 2 \sum_{k=0}^{\min(w,l)} \binom{N}{k} 2^{-N}$).
- **Multiple-comparison correction:** Holm–Bonferroni step-down adjustment across both primary statistical tests (`alpha = 0.01`).
- **Effect reporting:** Report raw win/loss ratio, median, p95, p99, max, mean, SD, and 95% confidence intervals plus every per-seed raw observation in `results/benchmarks.json`.
- **Explicit directional falsification rules:**
  - **Refutes H1:** Any single seed showing `fixed_step_60hz_on_720hz_grid_max_drift_px.max > 0` or `p_Holm >= 0.01`.
  - **Refutes H2:** Either `pure_simulation_step_latency_us.median >= 2000` OR any single individual simulation step reaching or exceeding `16,666.67 µs` (`individual_step_budget_violations_60hz > 0` or `pure_simulation_step_latency_us.max >= 16666.67`) — **independently of two-sided sign-test significance** (preventing a small p-value in the wrong direction from passing H2).
  - **Refutes H3:** Any single cycle showing `conservation_violations > 0`.
