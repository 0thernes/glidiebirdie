# Pre-Registration of Benchmark Hypotheses (`docs/preregistration.md`)

**Version:** `3.2.0` · **Date:** `2026-11-25` · **Script:** `scripts/benchmark.mjs` (Build Standard B32)

## Hypotheses

- **H1 (Refresh-Rate Determinism):** On 30 paired deterministic seeds (`20261101`–`20261130`, 180 fixed steps = 3.0 s per run with randomized 5-flap schedules), GlidieBirdie's 720 Hz fixed-step integrator produces strictly smaller maximum vertical trajectory divergence between 60 Hz and 144 Hz than a naive variable-`dt` Euler baseline using identical physics constants (`maxDrift_fixed === 0 < maxDrift_variable`).
- **H2 (Frame-Budget Margin):** Across all 30 seeds at 60 Hz, per-step simulation latency remains strictly below the 16,666.67 µs frame budget (target `< 2,000 µs`).
- **H3 (Zero Pool Drift):** Across 10,000 continuous particle + weather spawn/update/clear cycles, `active + free === cap` holds on every cycle (`conservation_violations === 0`).

## Statistical Analysis Plan

- **Sample size:** `N = 30` paired seeds (fixed a priori; no peeking or optional stopping).
- **Primary test:** Exact two-sided paired sign test on win/loss counts ($p = 2 \sum_{k=0}^{\min(w,l)} \binom{N}{k} 2^{-N}$).
- **Multiple-comparison correction:** Holm–Bonferroni step-down adjustment across both primary statistical tests (`alpha = 0.01`).
- **Effect reporting:** Report raw win/loss ratio, median, mean, SD, max, and 95% confidence intervals in `results/benchmarks.json`.
- **Falsification rule:** Any single seed showing `fixed_step_720hz_max_drift_px.max > 0`, `p_Holm >= 0.01`, or `conservation_violations > 0` refutes the corresponding hypothesis.
