# Honest Performance & Determinism Benchmarks (`docs/benchmarks.md`)

All numbers below come directly from a real run of `node scripts/benchmark.mjs` saved in [`results/benchmarks.json`](../results/benchmarks.json) (Build Standard B26–B31).

## Test Environment

- **Version:** GlidieBirdie `v3.2.0`
- **Runtime:** Node `v25.8.2`, `win32` `x64`
- **Design:** `N = 30` paired deterministic seeds (`20261101`–`20261130`), `180` simulation steps (`3.0 s` gameplay) per seed at `60 Hz` and `144 Hz`, paired against a naive variable-`dt` Euler baseline using identical gravity (`0.052`), drag (`0.992`/`0.985`), and flap (`-2.35`) constants. Pre-registered in [`docs/preregistration.md`](preregistration.md).

## Primary Results

| Metric | GlidieBirdie 720 Hz Fixed-Step | Naive Variable-`dt` Baseline | Paired Wins | Exact $p$ | $p_{\text{Holm}}$ |
| --- | ---: | ---: | ---: | ---: | ---: |
| Max 60 Hz vs 144 Hz vertical drift (px) | **0.000** | 4.783 | **30 / 30** | $1.86 \times 10^{-9}$ | $3.73 \times 10^{-9}$ |
| Median 60 Hz vs 144 Hz vertical drift (px) | **0.000** | 3.855 | — | — | — |
| Mean drift ± 95% CI (px) | **0.000 `[0, 0]`** | 3.944 `[3.820, 4.069]` | — | — | — |
| 60 Hz simulation step latency (median / p95) | **8.82 µs / 15.88 µs** | Frame budget: 16,666.67 µs | **30 / 30** | $1.86 \times 10^{-9}$ | $3.73 \times 10^{-9}$ |
| 144 Hz simulation step latency (median / p95) | **14.79 µs / 31.86 µs** | Frame budget: 6,944.44 µs | — | — | — |
| 10,000-cycle pool churn (`particlePool` + `weatherPool`) | **28.91 ms (2.89 µs/cycle)** | `0` slot conservation violations | — | — | — |

## Performance Budgets (Build Standard A37)

| Budget | Target Ceiling | Measured (`v3.2.0`) | Headroom |
| --- | ---: | ---: | ---: |
| Simulation step time @ 60 Hz | `< 2,000 µs` (12% of 16.67 ms frame) | `8.82 µs` median (`15.88 µs` p95) | `> 125x` |
| Simulation step time @ 144 Hz | `< 1,000 µs` (14% of 6.94 ms frame) | `14.79 µs` median (`31.86 µs` p95) | `> 31x` |
| 60 Hz vs 144 Hz deterministic drift | `0.000 px` | `0.000 px` | Exact |
| Pool churn slot conservation error | `0` | `0` across 10,000 cycles | Exact |

*Caveat:* Headless Node timings measure pure simulation/pool CPU cost without GPU canvas rasterization; browser rendering overhead depends on user hardware and DPR.
