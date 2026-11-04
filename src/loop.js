/** Fixed-step loop. Simulation advances in 1/60 s ticks; rendering interpolates. */
import { CONFIG } from './config.js';
import { bird, control, ground, pipes, state, view } from './state.js';
import { MAX_FRAME_STEPS, TICKS_PER_STEP, msToTicks } from './timestep.js';
import { consumeInputs } from './input-queue.js';
import { pollGamepad, syncLocomotion } from './input.js';
import { doFlap, updateBird, updateEmotion, updateParticles, updatePipes, updateShieldBubbles, updateWeatherParticles, spawnWeatherParticles, updateNearestPipeCache, checkCollisions } from './physics.js';
import { draw, updateFpsCounter } from './render.js';
import { syncStatsAndAchievements } from './achievements.js';
import { syncUiState } from './ui.js';
import { rebuildSkyCache } from './render.js';

let frameErrorCount = 0;
let frameErrorCooldownAt = 0;
/** @type {null | (() => void)} */
let stepListener = null;

/** @param {null | (() => void)} fn */
export function setStepListener(fn) {
  stepListener = fn;
}

function snapshotPrev() {
  bird.prevY = bird.y;
  bird.prevRotation = bird.rotation;
  ground.prevOffset = ground.offset;
  for (let i = 0; i < pipes.length; i++) pipes[i].prevX = pipes[i].x;
}

/** @param {{type:string}} ev */
function applyScheduled(ev) {
  if (ev.type === 'flap') {
    if (state.phase === 'play' && !state.paused) doFlap();
    return;
  }
  if (ev.type === 'brake-on') control.scriptBrake = true;
  else if (ev.type === 'brake-off') control.scriptBrake = false;
  else if (ev.type === 'dive-on') control.scriptDive = true;
  else if (ev.type === 'dive-off') control.scriptDive = false;
}

/** One 60 Hz simulation step. dt is exactly 1 (one 60 fps frame of the tuned physics). */
function stepSimulation(stepEndTick) {
  snapshotPrev();
  consumeInputs(stepEndTick, applyScheduled);
  syncLocomotion();
  state.dt = 1;
  state.dtSec = 1 / 60;
  state.elapsedSec += state.dtSec;
  if (state.afterglowActive) {
    state.afterglowTimer -= state.dt;
    if (state.afterglowTimer <= 0) {
      state.afterglowActive = false;
      state.afterglowTimer = 0;
      syncUiState();
    }
  }
  update();
  if (stepListener) stepListener();
}

function update() {
  if (state.phase !== 'play' || state.paused) return;
  state.frames++;
  state.time += state.dt;
  state.runSec += state.dtSec;
  state.hueShift = (state.hueShift + 0.08 * state.dt) % 360;
  state.zenTimeSec += state.dtSec;
  if (state.elapsedSec - state.lastStatsSyncAtSec > CONFIG.STATS_SYNC_INTERVAL_SEC) {
    state.lastStatsSyncAtSec = state.elapsedSec;
    syncStatsAndAchievements(false);
  }
  ground.offset = (ground.offset + state.pipeSpeed * state.speedMultiplier * state.dt) % 32;
  if (state.shakeAmount > 0) state.shakeAmount *= Math.pow(0.82, state.dt);
  if (state.newBestFlash > 0) state.newBestFlash = Math.max(0, state.newBestFlash - state.dtSec);
  if (state.nearMissFlash > 0) state.nearMissFlash = Math.max(0, state.nearMissFlash - state.dtSec);
  state.calmMeter = Math.max(0, state.calmMeter - 0.03 * state.dtSec);
  updateNearestPipeCache();
  updateBird();
  updateEmotion();
  updatePipes();
  updateShieldBubbles();
  spawnWeatherParticles();
  updateWeatherParticles();
  updateParticles();
  checkCollisions();
  rebuildSkyCache();
}

/** @param {number} timestamp @param {number} wallSec */
function present(timestamp, wallSec) {
  if (state.phase === 'start') {
    const base = CONFIG.CANVAS_H / 2;
    bird.y = state.reducedMotion ? base : base + Math.sin(timestamp * 0.0025) * 10;
    bird.prevY = bird.y;
    bird.prevRotation = bird.rotation;
  }
  if (state.elapsedSec < frameErrorCooldownAt) return;
  updateFpsCounter(wallSec);
  try {
    draw();
  } catch (err) {
    frameErrorCount++;
    if (frameErrorCount === 1 || frameErrorCount % 60 === 0) {
      console.error('[GlidieBirdie] Frame error:', err);
    }
    if (frameErrorCount > CONFIG.FRAME_ERROR_BURST_LIMIT) {
      console.warn('[GlidieBirdie] Frame errors burst — cooling down');
      frameErrorCooldownAt = state.elapsedSec + CONFIG.FRAME_ERROR_COOLDOWN_SEC;
      frameErrorCount = 0;
    }
  }
}

/** @param {number} [timestamp] */
export function loop(timestamp = performance.now()) {
  const wallSec = state.clockReady ? Math.max(0, (timestamp - state.lastTimestamp) / 1000) : 0;
  try {
    if (!state.clockReady) {
      state.clockReady = true;
      state.lastTimestamp = timestamp;
      view.alpha = 1;
      pollGamepad(timestamp);
      present(timestamp, wallSec);
      return;
    }
    pollGamepad(timestamp);
    const prevTick = msToTicks(state.lastTimestamp);
    const frameTick = msToTicks(timestamp);
    const simulating = (state.phase === 'play' && !state.paused) || state.afterglowActive;
    if (!simulating || frameTick <= prevTick) {
      state.lastTimestamp = timestamp;
      view.alpha = 1;
      present(timestamp, wallSec);
      return;
    }
    let stepIndex = Math.floor(prevTick / TICKS_PER_STEP);
    const target = Math.floor(frameTick / TICKS_PER_STEP);
    let guard = 0;
    while (stepIndex < target && guard < MAX_FRAME_STEPS) {
      stepIndex++;
      stepSimulation(stepIndex * TICKS_PER_STEP);
      guard++;
    }
    state.lastTimestamp = timestamp;
    const into = frameTick - stepIndex * TICKS_PER_STEP;
    // On an exact step (60 Hz) show the state just integrated. Between steps, blend.
    view.alpha = into <= 0 ? 1 : into / TICKS_PER_STEP;
    present(timestamp, wallSec);
  } finally {
    requestAnimationFrame(loop);
  }
}
