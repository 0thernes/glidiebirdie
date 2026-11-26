#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — Honest Statistical Determinism & Performance Benchmarks
 * (Build Standard B26, B27, B28, B29, B30, B31).
 *
 * Compares GlidieBirdie's 60 Hz fixed-step integrator (quantized on a 720 Hz tick grid)
 * against a naive variable-dt Euler baseline across 30 paired deterministic seeds at
 * 60 Hz vs 144 Hz with untimed warmup, counterbalanced execution order, separated
 * pure-simulation individual-step timing vs amortized whole-loop timing, 5 independent
 * 10,000-cycle pool-churn repetitions, and full raw per-seed observations.
 * Outputs: results/benchmarks.json
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installBrowserStub } from '../tests/browser-stub.mjs';

installBrowserStub();

const {
  CONFIG,
  TICKS_PER_STEP,
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
  stepSimulation,
  updateParticles,
  updateWeatherParticles,
} = await import('../src/index.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEEDS = Array.from({ length: 30 }, (_, i) => 20261101 + i);
const WARMUP_SEEDS = [20261001, 20261002, 20261003, 20261004, 20261005];
const SIM_STEPS = 180; // 3.0 s of 60 Hz simulation per seed
const POOL_REPS = 5;
const POOL_CYCLES = 10000;
const BUDGET_60HZ_US = 16666.67;
const BUDGET_144HZ_US = 6944.44;

function makeFlapSchedule(seed) {
  const r = mulberry32(seed ^ 0x9e3779b9);
  return [450, 950, 1450, 1950, 2450].map((base) => base + Math.round((r() - 0.5) * 160));
}

/** Runs full engine loop() (simulation + input poll + present/draw) at display rate `hz`. */
function runWholeLoopTrace(seed, hz, flapMsList) {
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
  const t0 = process.hrtime.bigint();
  for (let f = 0; f <= totalFrames && ys.length < SIM_STEPS; f++) {
    loop(f * stepMs);
  }
  const elapsedUs = Number(process.hrtime.bigint() - t0) / 1000;
  setStepListener(null);
  return { ys, elapsedUs, meanUsPerStep: elapsedUs / Math.max(1, ys.length) };
}

/** Measures PURE simulation stepSimulation() duration for each individual step (excludes present()/draw()). */
function runPureSimStepSamples(seed, flapMsList) {
  resetGame(true);
  state.dailySeedMode = false;
  state.audioEnabled = false;
  state.reducedMotion = true;
  startGame();
  setSeededRNG(seed);
  pipes.length = 0;
  state.pipeSpawnTimer = 0;
  for (const ms of flapMsList) scheduleInput(ms, 'flap');

  const stepUs = [];
  for (let s = 1; s <= SIM_STEPS; s++) {
    const t0 = process.hrtime.bigint();
    stepSimulation(s * TICKS_PER_STEP);
    const dtUs = Number(process.hrtime.bigint() - t0) / 1000;
    stepUs.push(dtUs);
  }
  return stepUs;
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

function round(n, digits = 3) {
  return Number(n.toFixed(digits));
}

// 1. Untimed warmup (JIT stabilization before measurement)
for (const wSeed of WARMUP_SEEDS) {
  const wFlaps = makeFlapSchedule(wSeed);
  runWholeLoopTrace(wSeed, 60, wFlaps);
  runWholeLoopTrace(wSeed, 144, wFlaps);
  runPureSimStepSamples(wSeed, wFlaps);
}
initObjectPools();
state.dt = 1;
state.reducedMotion = false;
for (let c = 0; c < 1000; c++) {
  spawnParticles(112, 320, 4, '#ffd700', 3);
  spawnWeatherParticle(100, -10, -1, 6, 'rain', 0, 8, 1);
  updateParticles();
  updateWeatherParticles();
  if (c % 250 === 0) clearWeatherPool();
}

// 2. Measured 30-seed paired experiment with counterbalanced 60/144 Hz execution order
const fixedMaxDiffs = [];
const varMaxDiffs = [];
const wholeLoopMeanUs60 = [];
const wholeLoopMeanUs144 = [];
const allIndividualPureSimStepUs = [];
const seedPureSimMaxUs = [];
const rawSeedObservations = [];

for (let idx = 0; idx < SEEDS.length; idx++) {
  const seed = SEEDS[idx];
  const flaps = makeFlapSchedule(seed);
  const order = idx % 2 === 0 ? '60_then_144' : '144_then_60';

  let run60;
  let run144;
  if (order === '60_then_144') {
    run60 = runWholeLoopTrace(seed, 60, flaps);
    run144 = runWholeLoopTrace(seed, 144, flaps);
  } else {
    run144 = runWholeLoopTrace(seed, 144, flaps);
    run60 = runWholeLoopTrace(seed, 60, flaps);
  }

  let maxDiff = 0;
  const len = Math.min(run60.ys.length, run144.ys.length);
  for (let i = 0; i < len; i++) {
    const d = Math.abs(run60.ys[i] - run144.ys[i]);
    if (d > maxDiff) maxDiff = d;
  }
  fixedMaxDiffs.push(maxDiff);
  wholeLoopMeanUs60.push(run60.meanUsPerStep);
  wholeLoopMeanUs144.push(run144.meanUsPerStep);

  const pureSteps = runPureSimStepSamples(seed, flaps);
  for (const s of pureSteps) allIndividualPureSimStepUs.push(s);
  const seedPureMax = Math.max(...pureSteps);
  seedPureSimMaxUs.push(seedPureMax);

  const v60 = runVariableDtBaseline(60, flaps);
  const v144 = runVariableDtBaseline(144, flaps);
  let vDiff = 0;
  for (let i = 0; i < Math.min(v60.length, v144.length); i++) {
    const d = Math.abs(v60[i] - v144[i]);
    if (d > vDiff) vDiff = d;
  }
  varMaxDiffs.push(vDiff);

  rawSeedObservations.push({
    seed,
    execution_order: order,
    flap_ms: flaps,
    fixed_max_drift_px: round(maxDiff, 6),
    variable_dt_max_drift_px: round(vDiff, 6),
    pure_sim_step_median_us: round(median(pureSteps), 3),
    pure_sim_step_p95_us: round(quantile(pureSteps, 0.95), 3),
    pure_sim_step_max_us: round(seedPureMax, 3),
    whole_loop_60hz_mean_us_per_step: round(run60.meanUsPerStep, 3),
    whole_loop_144hz_mean_us_per_step: round(run144.meanUsPerStep, 3),
  });
}

let fixedStrictlyBetter = 0;
let fixedStrictlyWorse = 0;
for (let i = 0; i < SEEDS.length; i++) {
  if (fixedMaxDiffs[i] < varMaxDiffs[i]) fixedStrictlyBetter++;
  else if (fixedMaxDiffs[i] > varMaxDiffs[i]) fixedStrictlyWorse++;
}
const pDrift = exactSignTestP(fixedStrictlyBetter, fixedStrictlyWorse);

// Directional H2 check: individual-step violations + per-seed max under 60 Hz budget
const pureStepBudgetViolations = allIndividualPureSimStepUs.filter((u) => u >= BUDGET_60HZ_US).length;
const seedsUnderBudget = seedPureSimMaxUs.filter((u) => u < BUDGET_60HZ_US).length;
const seedsOverBudget = seedPureSimMaxUs.length - seedsUnderBudget;
const pBudget = exactSignTestP(seedsUnderBudget, seedsOverBudget);

// 3. Five independent 10,000-cycle pool churn repetitions
const poolRepElapsedMs = [];
let conservationViolations = 0;
for (let rep = 0; rep < POOL_REPS; rep++) {
  initObjectPools();
  state.dt = 1;
  state.reducedMotion = false;
  const poolT0 = process.hrtime.bigint();
  for (let c = 0; c < POOL_CYCLES; c++) {
    spawnParticles(112, 320, 4, '#ffd700', 3);
    spawnWeatherParticle(100, -10, -1, 6, 'rain', 0, 8, 1);
    updateParticles();
    updateWeatherParticles();
    if (c % 250 === 0) clearWeatherPool();
    if (activeParticles.length + freeParticles.length !== CONFIG.PARTICLE_POOL) conservationViolations++;
    if (activeWeather.length + freeWeather.length !== CONFIG.WEATHER_POOL) conservationViolations++;
  }
  poolRepElapsedMs.push(Number(process.hrtime.bigint() - poolT0) / 1e6);
}
const poolStats = meanAndCi95(poolRepElapsedMs);

// 4. Holm-Bonferroni adjustment across the 2 primary paired statistical tests
const rawP = [
  { metric: '60Hz_vs_144Hz_trajectory_drift', p: pDrift },
  { metric: 'pure_sim_step_under_16666.67us_budget', p: pBudget },
];
const sortedP = [...rawP].sort((a, b) => a.p - b.p);
const holmAdjusted = {};
let prevAdj = 0;
for (let i = 0; i < sortedP.length; i++) {
  const adj = Math.min(1, Math.max(prevAdj, sortedP[i].p * (sortedP.length - i)));
  prevAdj = adj;
  holmAdjusted[sortedP[i].metric] = adj;
}

const cpus = os.cpus();
const pureSimStats = meanAndCi95(allIndividualPureSimStepUs);

const report = {
  version: '3.2.0',
  generated_utc: new Date().toISOString(),
  command: 'node scripts/benchmark.mjs',
  environment: {
    cpu_model: cpus[0]?.model || 'unknown',
    cpu_cores: cpus.length,
    platform: process.platform,
    os_release: os.release(),
    arch: process.arch,
    node_version: process.version,
    node_flags: process.execArgv.length ? process.execArgv.join(' ') : 'none (default V8 flags)',
  },
  design: {
    warmup_seeds: WARMUP_SEEDS.length,
    paired_seeds: SEEDS.length,
    steps_per_seed: SIM_STEPS,
    total_individual_sim_steps: allIndividualPureSimStepUs.length,
    counterbalancing: 'alternating 60_then_144 (even seeds) vs 144_then_60 (odd seeds)',
    simulation_hz: 60,
    tick_grid_hz: 720,
    refresh_rates_hz: [60, 144],
    pool_churn_repetitions: POOL_REPS,
    pool_churn_cycles_per_rep: POOL_CYCLES,
    baseline: 'naive variable-dt Euler (identical gravity/drag/flap constants)',
  },
  determinism_comparison: {
    fixed_step_60hz_on_720hz_grid_max_drift_px: {
      max: round(Math.max(...fixedMaxDiffs), 6),
      median: round(median(fixedMaxDiffs), 6),
      ...meanAndCi95(fixedMaxDiffs),
    },
    variable_dt_baseline_max_drift_px: {
      max: round(Math.max(...varMaxDiffs), 6),
      median: round(median(varMaxDiffs), 6),
      ...meanAndCi95(varMaxDiffs),
    },
    paired_wins_fixed_over_variable: fixedStrictlyBetter,
    paired_losses: fixedStrictlyWorse,
    exact_sign_test_p: pDrift,
    holm_bonferroni_p: holmAdjusted['60Hz_vs_144Hz_trajectory_drift'],
  },
  pure_simulation_step_latency_us: {
    sample_count: allIndividualPureSimStepUs.length,
    median: round(median(allIndividualPureSimStepUs), 3),
    p95: round(quantile(allIndividualPureSimStepUs, 0.95), 3),
    p99: round(quantile(allIndividualPureSimStepUs, 0.99), 3),
    max: round(Math.max(...allIndividualPureSimStepUs), 3),
    mean: round(pureSimStats.mean, 3),
    ci95: [round(pureSimStats.ci95[0], 3), round(pureSimStats.ci95[1], 3)],
    budget_us_at_60hz: BUDGET_60HZ_US,
    budget_us_at_144hz: BUDGET_144HZ_US,
    individual_step_budget_violations_60hz: pureStepBudgetViolations,
    seeds_all_steps_under_60hz_budget: seedsUnderBudget,
    holm_bonferroni_p_under_budget: holmAdjusted['pure_sim_step_under_16666.67us_budget'],
  },
  amortized_whole_loop_us_per_step: {
    note: 'Includes input polling and headless present()/draw() calls at display refresh rate; quantiles are across 30 per-seed run averages.',
    hz60_run_averages: {
      median: round(median(wholeLoopMeanUs60), 2),
      p95: round(quantile(wholeLoopMeanUs60, 0.95), 2),
      max: round(Math.max(...wholeLoopMeanUs60), 2),
    },
    hz144_run_averages: {
      median: round(median(wholeLoopMeanUs144), 2),
      p95: round(quantile(wholeLoopMeanUs144, 0.95), 2),
      max: round(Math.max(...wholeLoopMeanUs144), 2),
    },
  },
  pool_churn_10k_cycles: {
    repetitions: POOL_REPS,
    raw_elapsed_ms: poolRepElapsedMs.map((ms) => round(ms, 2)),
    median_elapsed_ms: round(median(poolRepElapsedMs), 2),
    mean_elapsed_ms: round(poolStats.mean, 2),
    ci95_elapsed_ms: [round(poolStats.ci95[0], 2), round(poolStats.ci95[1], 2)],
    median_us_per_cycle: round((median(poolRepElapsedMs) * 1000) / POOL_CYCLES, 2),
    conservation_violations: conservationViolations,
  },
  raw_seed_observations: rawSeedObservations,
};

fs.mkdirSync(path.join(ROOT, 'results'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'results/benchmarks.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log('GlidieBirdie v3.2.0 Benchmarks written to results/benchmarks.json:');
console.log(
  `  Environment: ${report.environment.cpu_model} (${report.environment.cpu_cores} cores), ${report.environment.platform} ${report.environment.os_release} ${report.environment.arch}, Node ${report.environment.node_version}`,
);
console.log(
  `  Fixed-step 60 Hz (720 Hz grid) drift (N=30): max=${report.determinism_comparison.fixed_step_60hz_on_720hz_grid_max_drift_px.max} px`,
);
console.log(
  `  Variable-dt baseline drift (N=30): median=${report.determinism_comparison.variable_dt_baseline_max_drift_px.median.toFixed(3)} px, max=${report.determinism_comparison.variable_dt_baseline_max_drift_px.max.toFixed(3)} px`,
);
console.log(
  `  Paired wins: ${fixedStrictlyBetter}/${SEEDS.length} (exact p=${pDrift.toExponential(2)}, p_Holm=${holmAdjusted['60Hz_vs_144Hz_trajectory_drift'].toExponential(2)})`,
);
console.log(
  `  Pure sim individual step (N=${allIndividualPureSimStepUs.length}): median=${report.pure_simulation_step_latency_us.median} us, p95=${report.pure_simulation_step_latency_us.p95} us, max=${report.pure_simulation_step_latency_us.max} us (violations=${pureStepBudgetViolations})`,
);
console.log(
  `  Amortized whole-loop (incl. present/draw): 60 Hz median=${report.amortized_whole_loop_us_per_step.hz60_run_averages.median} us/step; 144 Hz median=${report.amortized_whole_loop_us_per_step.hz144_run_averages.median} us/step`,
);
console.log(
  `  Pool churn (10,000 cycles x ${POOL_REPS} reps): median=${report.pool_churn_10k_cycles.median_elapsed_ms} ms (${report.pool_churn_10k_cycles.median_us_per_cycle} us/cycle), violations=${conservationViolations}`,
);
process.exit(0);
