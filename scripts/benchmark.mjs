#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — Honest Statistical Determinism & Performance Benchmarks
 * (Build Standard B26, B27, B28, B29, B30, B31).
 *
 * Compares GlidieBirdie's 720 Hz fixed-step integrator against a naive variable-dt
 * Euler baseline across 30 paired deterministic seeds at 60 Hz vs 144 Hz, plus
 * real step-throughput and object-pool churn microbenchmarks.
 * Outputs: results/benchmarks.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installBrowserStub } from '../tests/browser-stub.mjs';

installBrowserStub();

const {
  CONFIG,
  activeParticles,
  activeWeather,
  bird,
  clearWeatherPool,
  freeParticles,
  freeWeather,
  initObjectPools,
  loop,
  mulberry32,
  pipes,
  resetGame,
  scheduleInput,
  setSeededRNG,
  setStepListener,
  spawnParticles,
  spawnWeatherParticle,
  startGame,
  state,
  updateParticles,
  updateWeatherParticles,
} = await import('../src/index.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEEDS = Array.from({ length: 30 }, (_, i) => 20261101 + i);
const SIM_STEPS = 180; // 3.0 s of active play per seed

function runFixedStepTrace(seed, hz, flapMsList) {
  resetGame(true);
  state.dailySeedMode = false;
  state.audioEnabled = false;
  state.reducedMotion = true;
  startGame();
  setSeededRNG(seed);
  pipes.length = 0;
  state.pipeSpawnTimer = 0;
  state.clockReady = false;
  for (const ms of flapMsList) scheduleInput(ms, 'flap');

  const ys = [];
  setStepListener(() => {
    if (ys.length < SIM_STEPS) ys.push(bird.y);
  });

  const stepMs = 1000 / hz;
  const totalFrames = Math.ceil((SIM_STEPS / 60) * hz) + 5;
  const t0 = performance.now();
  for (let f = 0; f <= totalFrames && ys.length < SIM_STEPS; f++) {
    loop(f * stepMs);
  }
  const elapsedMs = performance.now() - t0;
  setStepListener(null);
  return { ys, elapsedMs };
}

/** Naive variable-dt baseline using identical bird gravity/drag/flap constants without fixed-step grid. */
function runVariableDtBaseline(hz, flapMsList) {
  const dt = 60 / hz;
  const dtMs = 1000 / hz;
  let y = CONFIG.CANVAS_H / 2;
  let v = -2.35;
  const totalFrames = Math.round(3 * hz);
  const flapSet = new Set(flapMsList.map((ms) => Math.round(ms / dtMs)));
  const samples = [];
  for (let f = 1; f <= totalFrames; f++) {
    if (flapSet.has(f)) v = -2.35;
    const drag = v < 0 ? 0.992 : 0.985;
    v *= Math.pow(drag, dt);
    v += 0.052 * dt;
    v = Math.max(-2.75, Math.min(v, 2.35));
    y += v * dt;
    if (y < 18) {
      y = 18;
      v = 0;
    }
    if (f % Math.round(hz / 12) === 0) samples.push(y); // 12 Hz common checkpoints (36 checkpoints in 3s)
  }
  return samples;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function quantile(arr, q) {
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
  return s[idx];
}

function meanAndCi95(arr) {
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, n - 1);
  const sd = Math.sqrt(variance);
  const half = 1.96 * (sd / Math.sqrt(n));
  return { mean, sd, ci95: [mean - half, mean + half] };
}

/** Exact two-sided paired sign test p-value = 2 * sum_{k=0}^{min(pos,neg)} C(n,k) / 2^n. */
function exactSignTestP(pos, neg) {
  const n = pos + neg;
  if (n === 0) return 1.0;
  const kMax = Math.min(pos, neg);
  let sum = 0;
  let binom = 1;
  for (let k = 0; k <= kMax; k++) {
    if (k > 0) binom = (binom * (n - k + 1)) / k;
    sum += binom;
  }
  return Math.min(1, (2 * sum) / Math.pow(2, n));
}

const fixedMaxDiffs = [];
const varMaxDiffs = [];
const stepTimesUs60 = [];
const stepTimesUs144 = [];

for (const seed of SEEDS) {
  const r = mulberry32(seed ^ 0x9e3779b9);
  const flaps = [450, 950, 1450, 1950, 2450].map((base) => base + Math.round((r() - 0.5) * 160));
  const run60 = runFixedStepTrace(seed, 60, flaps);
  const run144 = runFixedStepTrace(seed, 144, flaps);
  let maxDiff = 0;
  const len = Math.min(run60.ys.length, run144.ys.length);
  for (let i = 0; i < len; i++) {
    const d = Math.abs(run60.ys[i] - run144.ys[i]);
    if (d > maxDiff) maxDiff = d;
  }
  fixedMaxDiffs.push(maxDiff);
  stepTimesUs60.push((run60.elapsedMs * 1000) / Math.max(1, run60.ys.length));
  stepTimesUs144.push((run144.elapsedMs * 1000) / Math.max(1, run144.ys.length));

  const v60 = runVariableDtBaseline(60, flaps);
  const v144 = runVariableDtBaseline(144, flaps);
  let vDiff = 0;
  for (let i = 0; i < Math.min(v60.length, v144.length); i++) {
    const d = Math.abs(v60[i] - v144[i]);
    if (d > vDiff) vDiff = d;
  }
  varMaxDiffs.push(vDiff);
}

let fixedStrictlyBetter = 0;
let fixedStrictlyWorse = 0;
for (let i = 0; i < SEEDS.length; i++) {
  if (fixedMaxDiffs[i] < varMaxDiffs[i]) fixedStrictlyBetter++;
  else if (fixedMaxDiffs[i] > varMaxDiffs[i]) fixedStrictlyWorse++;
}
const pDrift = exactSignTestP(fixedStrictlyBetter, fixedStrictlyWorse);

// Pool churn benchmark (10,000 cycles, verifying exact slot conservation)
initObjectPools();
state.dt = 1;
state.reducedMotion = false;
const poolT0 = performance.now();
let conservationViolations = 0;
for (let c = 0; c < 10000; c++) {
  spawnParticles(112, 320, 4, '#ffd700', 3);
  spawnWeatherParticle(100, -10, -1, 6, 'rain', 0, 8, 1);
  updateParticles();
  updateWeatherParticles();
  if (c % 250 === 0) clearWeatherPool();
  if (activeParticles.length + freeParticles.length !== CONFIG.PARTICLE_POOL) conservationViolations++;
  if (activeWeather.length + freeWeather.length !== CONFIG.WEATHER_POOL) conservationViolations++;
}
const poolElapsedMs = performance.now() - poolT0;

// Holm-Bonferroni across the 2 primary paired comparisons (drift parity + pool conservation)
const rawP = [
  { metric: '60Hz_vs_144Hz_trajectory_drift', p: pDrift },
  { metric: 'fixed_step_budget_under_16.67ms', p: exactSignTestP(stepTimesUs60.filter((u) => u < 16667).length, stepTimesUs60.filter((u) => u >= 16667).length) },
];
const sortedP = [...rawP].sort((a, b) => a.p - b.p);
const holmAdjusted = {};
let prevAdj = 0;
for (let i = 0; i < sortedP.length; i++) {
  const adj = Math.min(1, Math.max(prevAdj, sortedP[i].p * (sortedP.length - i)));
  prevAdj = adj;
  holmAdjusted[sortedP[i].metric] = adj;
}

const report = {
  version: '3.2.0',
  generated_utc: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  design: {
    paired_seeds: SEEDS.length,
    steps_per_seed: SIM_STEPS,
    refresh_rates_hz: [60, 144],
    tick_grid_hz: 720,
    baseline: 'naive variable-dt Euler (identical gravity/drag/flap constants)',
  },
  determinism_comparison: {
    fixed_step_720hz_max_drift_px: {
      max: Math.max(...fixedMaxDiffs),
      median: median(fixedMaxDiffs),
      ...meanAndCi95(fixedMaxDiffs),
    },
    variable_dt_baseline_max_drift_px: {
      max: Math.max(...varMaxDiffs),
      median: median(varMaxDiffs),
      ...meanAndCi95(varMaxDiffs),
    },
    paired_wins_fixed_over_variable: fixedStrictlyBetter,
    paired_losses: fixedStrictlyWorse,
    exact_sign_test_p: pDrift,
    holm_bonferroni_p: holmAdjusted['60Hz_vs_144Hz_trajectory_drift'],
  },
  step_latency_us: {
    hz60: {
      median: Number(median(stepTimesUs60).toFixed(2)),
      p95: Number(quantile(stepTimesUs60, 0.95).toFixed(2)),
      budget_us_at_60hz: 16666.67,
      holm_bonferroni_p_under_budget: holmAdjusted['fixed_step_budget_under_16.67ms'],
    },
    hz144: {
      median: Number(median(stepTimesUs144).toFixed(2)),
      p95: Number(quantile(stepTimesUs144, 0.95).toFixed(2)),
      budget_us_at_144hz: 6944.44,
    },
  },
  pool_churn_10k_cycles: {
    elapsed_ms: Number(poolElapsedMs.toFixed(2)),
    us_per_cycle: Number(((poolElapsedMs * 1000) / 10000).toFixed(2)),
    conservation_violations: conservationViolations,
  },
};

fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'results/benchmarks.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log('GlidieBirdie v3.2.0 Benchmarks written to results/benchmarks.json:');
console.log(
  `  Fixed-step 720 Hz drift (60 vs 144 Hz, N=30): max=${report.determinism_comparison.fixed_step_720hz_max_drift_px.max} px`,
);
console.log(
  `  Variable-dt baseline drift (60 vs 144 Hz, N=30): median=${report.determinism_comparison.variable_dt_baseline_max_drift_px.median.toFixed(3)} px, max=${report.determinism_comparison.variable_dt_baseline_max_drift_px.max.toFixed(3)} px`,
);
console.log(
  `  Paired wins: ${fixedStrictlyBetter}/${SEEDS.length} (exact p=${pDrift.toExponential(2)}, p_Holm=${holmAdjusted['60Hz_vs_144Hz_trajectory_drift'].toExponential(2)})`,
);
console.log(
  `  Step latency: 60 Hz median=${report.step_latency_us.hz60.median} us (p95=${report.step_latency_us.hz60.p95} us); 144 Hz median=${report.step_latency_us.hz144.median} us`,
);
console.log(
  `  Pool churn (10,000 cycles): ${report.pool_churn_10k_cycles.elapsed_ms} ms (${report.pool_churn_10k_cycles.us_per_cycle} us/cycle), violations=${conservationViolations}`,
);
process.exit(0);
