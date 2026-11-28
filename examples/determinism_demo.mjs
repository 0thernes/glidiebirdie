#!/usr/bin/env node
/**
 * Minimal runnable example demonstrating GlidieBirdie's deterministic 720 Hz
 * fixed-step simulation parity across 60 Hz and 144 Hz displays.
 *
 * Run: node examples/determinism_demo.mjs
 */

import { installBrowserStub } from '../tests/browser-stub.mjs';

installBrowserStub();

const {
  bird,
  loop,
  mulberry32,
  pipes,
  resetGame,
  scheduleInput,
  setSeededRNG,
  setStepListener,
  startGame,
  state,
} = await import('../src/index.js');

const SEED = 20261125;
const FLAPS_MS = [400, 900, 1400, 1900, 2400];

function simulate(hz) {
  resetGame(true);
  state.audioEnabled = false;
  state.reducedMotion = true;
  startGame();
  setSeededRNG(SEED);
  pipes.length = 0;
  state.clockReady = false;
  for (const t of FLAPS_MS) scheduleInput(t, 'flap');

  const trace = [];
  setStepListener(() => {
    if (trace.length < 180) trace.push(bird.y);
  });
  const dtMs = 1000 / hz;
  for (let f = 0; f <= Math.ceil(hz * 3.1) && trace.length < 180; f++) {
    loop(f * dtMs);
  }
  setStepListener(null);
  return trace;
}

const y60 = simulate(60);
const y144 = simulate(144);
const maxDiff = Math.max(...y60.map((v, i) => Math.abs(v - y144[i])));

const prng = mulberry32(SEED);
const firstUint32 = Math.round(prng() * 4294967296);

console.log(`GlidieBirdie v3.2.0 Determinism Demo (seed=${SEED})`);
console.log(`  60 Hz steps:  ${y60.length}, final y = ${y60[y60.length - 1].toFixed(4)} px`);
console.log(`  144 Hz steps: ${y144.length}, final y = ${y144[y144.length - 1].toFixed(4)} px`);
console.log(`  Max L-inf divergence: ${maxDiff.toFixed(6)} px`);
console.log(`  mulberry32(${SEED}) first UInt32: ${firstUint32} (Lean 4 golden: 1176269751)`);
process.exit(0);
