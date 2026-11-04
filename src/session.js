/** Run lifecycle: reset, start, game over, afterglow. */
import { CONFIG } from './config.js';
import { dateSeed, setSeededRNG, setUnseededRNG } from './rng.js';
import { SK, nextDayStreak, writeStoredValue } from './storage.js';
import { bird, control, getTheme, ground, heldKeys, pipes, sim, state } from './state.js';
import { clearInputs } from './input-queue.js';
import { doFlap, initObjectPools, spawnParticles } from './physics.js';
import { sfxDie, sfxNewBest, startMusic, stopMusic } from './audio.js';
import { hapticPulse } from './haptics.js';
import { announce } from './dom.js';
import { syncUiState } from './ui.js';
import { pushScoreHistory, syncStatsAndAchievements } from './achievements.js';
import { hooks } from './hooks.js';

export let deathWaveTimer = 0;

export function resetGame() {
  if (deathWaveTimer) {
    clearTimeout(deathWaveTimer);
    deathWaveTimer = 0;
  }
  state.phase = 'start';
  state.score = 0;
  state.frames = 0;
  state.time = 0;
  state.runSec = 0;
  state.speedMultiplier = 1.0;
  state.paused = false;
  state.shakeAmount = 0;
  state.pipeSpawnTimer = 0;
  state.lastDiveAtSec = -1e9;
  state.lastBrakeAtSec = -1e9;
  state.lastScoreAnnounceAt = -1e9;
  state.shieldActive = false;
  state.isInvincible = false;
  state.invincibilityTimer = 0;
  state.brakeUseCount = 0;
  state.diveUseCount = 0;
  state.runNearMisses = 0;
  state.calmMeter = 0;
  state.isNewBest = false;
  state.newBestFlash = 0;
  state.nearMissFlash = 0;

  // Afterglow
  state.afterglowActive = false;
  state.afterglowTimer = 0;
  state.afterglowReflection = '';
  state.afterglowShieldUsed = false;
  state.afterglowBrakeHeavy = false;

  sim.pipeCounter = 0;

  bird.y = CONFIG.CANVAS_H / 2;
  bird.prevY = bird.y;
  bird.velocity = 0;
  bird.rotation = 0;
  bird.prevRotation = 0;
  bird.emotion = 'calm';
  bird.emotionTimer = 0;
  bird.scaleX = 1;
  bird.scaleY = 1;
  for (const t of bird.trail) {
    t.x = 0;
    t.y = 0;
    t.life = 0;
  }
  bird.isBraking = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight') || control.touchBrake || control.padBrake || control.scriptBrake;
  bird.isDiving = heldKeys.has('ArrowDown') || control.touchDive || control.padDive || control.scriptDive;
  bird.blush = 0;
  bird.pupilOffsetX = 0;
  bird.pupilOffsetY = 0;

  ground.offset = 0;
  ground.prevOffset = 0;
  control.scriptBrake = false;
  control.scriptDive = false;
  clearInputs();
  pipes.length = 0;
  sim.nearestPipeCache = null;

  initObjectPools();
  stopMusic(false);

  if (state.dailySeedMode) setSeededRNG(dateSeed());
  else setUnseededRNG();

  syncUiState();
  syncStatsAndAchievements(true);
  announce('Ready to glide. Relax and start when you like.');
}

export function startGame() {
  if (state.phase === 'play' && !state.paused) {
    doFlap();
    return;
  }
  resetGame();
  state.phase = 'play';
  state.paused = false;
  state.runsCount++;
  syncStatsAndAchievements();
  startMusic();
  doFlap();
  syncUiState();
  syncStatsAndAchievements(true);
  announce('Run started.');
}

export function restartRun() {
  resetGame();
  state.phase = 'play';
  state.paused = false;
  state.runsCount++;
  syncStatsAndAchievements();
  startMusic();
  doFlap();
  syncUiState();
  syncStatsAndAchievements(true);
  announce('Run restarted.');
}

export function gameOver() {
  state.phase = 'gameOver';
  state.paused = false;

  const prevBest = state.best;
  state.best = Math.max(state.best, state.score);
  if (state.score > prevBest) {
    state.isNewBest = true;
    state.newBestFlash = 4.0;
    sfxNewBest();
    hapticPulse(120);
    spawnParticles(bird.x, bird.y, 25, '#ffd700', 6);
    // Extra theme-tinted celebration flecks for a more special quiet record
    spawnParticles(bird.x - 6, bird.y - 12, 9, getTheme().scoreParticle || '#ffd700', 4);
  }
  writeStoredValue(SK.best, state.best);

  pushScoreHistory(state.score);
  state.longestSurvivalSec = Math.max(state.longestSurvivalSec, state.runSec);

  // Calendar-day streak: a real "came back another day" loyalty signal, not the
  // old per-session score gate. Increment only when today is the day after the
  // last play; reset to 1 on any gap; no-op for extra runs the same day.
  const today = dateSeed();
  if (state.lastPlayedDay !== today) {
    const yesterday = dateSeed(new Date(Date.now() - 86400000));
    state.currentStreak = nextDayStreak(state.currentStreak, state.lastPlayedDay, today, yesterday);
    state.lastPlayedDay = today;
  }

  // Capture run qualities for the Afterglow reflection.
  // afterglowShieldUsed is set true in checkCollisions when a shield is consumed this run;
  // resetGame clears it. (Previously a no-op self-comparison that was always false.)
  state.afterglowBrakeHeavy = state.brakeUseCount >= 6;

  state.shakeAmount = state.reducedMotion ? 0 : 6.0;
  sfxDie();
  stopMusic();
  spawnParticles(bird.x, bird.y, 18, '#ff4444', 5);
  spawnParticles(bird.x, bird.y, 12, '#ffaa00', 4);
  // Second wave of particles, slightly delayed. Tracked + cleared on restart so a
  // fast R-press never sprays the previous death into the fresh run (latent leak).
  if (deathWaveTimer) clearTimeout(deathWaveTimer);
  deathWaveTimer = setTimeout(() => {
    deathWaveTimer = 0;
    if (state.phase !== 'gameOver') return;
    spawnParticles(bird.x, bird.y, 10, '#ffffff', 3);
    spawnParticles(bird.x, bird.y, 8, '#ff6666', 2.5);
  }, 180);

  // Enter the beautiful Afterglow reflection for worthy flights (not on reduced motion to keep it special)
  const worthy =
    state.isNewBest || state.score >= 14 || state.afterglowBrakeHeavy || state.runSec > 22;
  if (!state.reducedMotion && worthy && !state.afterglowActive) {
    enterAfterglow();
  } else {
    syncUiState();
    syncStatsAndAchievements(true);
    announce(
      `Game over. Score ${state.score}. Best ${state.best}.${state.isNewBest ? ' New best.' : ''}`,
    );
  }
}

export function enterAfterglow() {
  state.afterglowActive = true;
  state.afterglowTimer = 4.2; // gentle, calm duration (dt normalized)

  // Poetic, specific reflections based on how the player flew
  let reflection = 'You moved with the wind.';
  if (state.isNewBest) {
    reflection = 'A quiet record. The sky noticed.';
    // Extra serene particles for the special new best afterglow
    spawnParticles(bird.x, bird.y - 10, 7, getTheme().scoreParticle || '#ffd700', 3);
  } else if (state.afterglowShieldUsed) {
    reflection = 'You protected the feather. It protected you back.';
  } else if (state.afterglowBrakeHeavy && state.score >= 10) {
    reflection = 'Patience in the brakes. The wind trusts steady wings.';
  } else if (state.score >= 20) {
    reflection = 'You rode it all the way. Well flown.';
  } else if (state.dailySeedMode) {
    reflection = 'The same wind. A different flight. Beautiful.';
  } else if (state.runSec > 28) {
    reflection = 'Time dissolved. Only the glide remained.';
  }
  state.afterglowReflection = reflection;

  // Soften the bird into a calm, settled pose for the reflection moment
  bird.emotion = 'calm';
  bird.velocity *= 0.4;
  bird.rotation *= 0.5;

  // Extra gentle celebratory particles (gold + theme)
  const themeColor = getTheme().scoreParticle || '#ffd700';
  spawnParticles(bird.x, bird.y - 10, 22, themeColor, 3.5);
  spawnParticles(bird.x - 8, bird.y + 6, 12, themeColor, 2.2);

  syncUiState();
  announce(`Afterglow. ${reflection}`);
}

// ─── 16. INPUT ─────────────────────────────────────────────────────

hooks.gameOver = gameOver;
