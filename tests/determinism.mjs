// Same seed and the same timestamped inputs must produce the same trajectory
// at 60 Hz and 144 Hz. Imports the real fixed-step loop.
// Run: node tests/determinism.mjs

import { installBrowserStub } from './browser-stub.mjs';

installBrowserStub();

const {
  CONFIG,
  bird,
  clearInputs,
  control,
  loop,
  pipes,
  resetGame,
  scheduleInput,
  setSeededRNG,
  setStepListener,
  sim,
  state,
} = await import('../src/index.js');

function sample() {
  let pipeHash = 0;
  for (let i = 0; i < pipes.length; i++) {
    pipeHash = (pipeHash * 33 + pipes[i].topHeight) | 0;
    pipeHash = (pipeHash * 33 + Math.round(pipes[i].x * 1000)) | 0;
  }
  return [
    bird.y,
    bird.velocity,
    bird.rotation,
    state.score,
    state.time,
    pipes.length,
    pipeHash,
    sim.pipeCounter,
  ].join(',');
}

function run(hz) {
  resetGame();
  setSeededRNG(424242);
  state.phase = 'play';
  state.paused = false;
  state.reducedMotion = true;
  state.theme = 'sunset';
  state.clockReady = false;
  state.lastTimestamp = 0;
  state.score = 0;
  state.time = 0;
  state.runSec = 0;
  state.speedMultiplier = 1;
  state.pipeSpawnTimer = 0;
  state.shieldActive = false;
  bird.y = CONFIG.CANVAS_H / 2;
  bird.prevY = bird.y;
  bird.velocity = 0;
  bird.rotation = 0;
  bird.prevRotation = 0;
  bird.x = CONFIG.BIRD_X;
  control.scriptBrake = false;
  control.scriptDive = false;
  control.touchBrake = false;
  control.touchDive = false;
  pipes.length = 0;
  sim.pipeCounter = 0;
  clearInputs();
  const trace = [];
  setStepListener(() => {
    trace.push(sample());
  });
  scheduleInput(200, 'flap');
  scheduleInput(480, 'flap');
  scheduleInput(700, 'brake-on');
  scheduleInput(900, 'flap');
  scheduleInput(1100, 'brake-off');
  scheduleInput(1400, 'flap');
  scheduleInput(1800, 'dive-on');
  scheduleInput(2100, 'flap');
  scheduleInput(2400, 'dive-off');
  scheduleInput(2700, 'flap');
  loop(0);
  const frames = Math.round(hz * 3);
  const frameMs = 1000 / hz;
  for (let i = 1; i <= frames; i++) loop(i * frameMs);
  setStepListener(null);
  return trace;
}

const a = run(60);
const b = run(144);
if (a.length === 0) {
  console.error('Determinism test recorded no simulation steps');
  process.exit(1);
}
if (a.length !== b.length || a.some((row, i) => row !== b[i])) {
  let mismatch = -1;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      mismatch = i;
      break;
    }
  }
  console.error(`Trajectory diverged at step ${mismatch} of ${a.length} vs ${b.length}`);
  console.error('60 Hz ', a[mismatch]);
  console.error('144 Hz', b[mismatch]);
  process.exit(1);
}
console.log(`Determinism passed: ${a.length} identical steps at 60 Hz and 144 Hz.`);
