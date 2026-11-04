/** Bird, pipes, particles, weather, and the collision response. */
import { CONFIG } from './config.js';
import { announce } from './dom.js';
import { hapticPulse, hapticTap } from './haptics.js';
import { hooks } from './hooks.js';
import { cosmeticRng, rng } from './rng.js';
import {
  activeParticles, activeWeather, bird, ground, particlePool, pipes, sim, state, weatherPool,
} from './state.js';

import { getTheme } from './state.js';
import { intersectsPipe } from './collision.js';
import {
  sfxBrake,
  sfxDive,
  sfxFlap,
  sfxNearMiss,
  sfxScore,
  sfxShieldCollect,
  sfxShieldPop,
} from './audio.js';

export const MEADOW_POLLEN_COLORS = Object.freeze(['#fde68a', '#fef3c7', '#facc15']);

export function initObjectPools() {
  particlePool.length = 0;
  activeParticles.length = 0;
  freeParticles.length = 0;
  for (let i = 0; i < CONFIG.PARTICLE_POOL; i++) {
    particlePool.push({
      idx: i,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      color: '',
      size: 0,
      active: false,
    });
    freeParticles.push(i);
  }
  weatherPool.length = 0;
  activeWeather.length = 0;
  freeWeather.length = 0;
  for (let i = 0; i < CONFIG.WEATHER_POOL; i++) {
    weatherPool.push({
      idx: i,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      type: '',
      size: 0,
      length: 0,
      alpha: 0,
      color: '',
      phase: 0,
      active: false,
    });
    freeWeather.push(i);
  }
}

// Explicit free-list (a stack of inactive pool indices) → strict O(1) spawn,
// replacing the previous rotating linear probe (worst case O(pool)). See COMPLEXITY.md 5.1.
export const freeParticles = [];
export function spawnParticles(x, y, count, color, spread = 3) {
  const particleCount = state.reducedMotion ? Math.max(1, Math.ceil(count * 0.35)) : count;
  const particleSpread = state.reducedMotion ? spread * 0.45 : spread;
  // Cosmetic spawner — never consume the seeded gameplay RNG (see cosmeticRng).
  const rng = cosmeticRng;
  for (let spawned = 0; spawned < particleCount; spawned++) {
    const idx = freeParticles.pop();
    if (idx === undefined) break; // pool exhausted
    const p = particlePool[idx];
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = (rng() - 0.5) * particleSpread;
    p.vy = (rng() - 0.5) * particleSpread;
    p.life = 30 + rng() * 20;
    p.maxLife = p.life;
    p.color = color;
    p.size = 2 + rng() * 3;
    activeParticles.push(p);
  }
}

export function updateParticles() {
  const dt = state.dt;
  let write = 0;
  for (let i = 0; i < activeParticles.length; i++) {
    const p = activeParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.03 * dt;
    p.life -= dt;
    if (p.life > 0) {
      activeParticles[write++] = p;
    } else {
      p.active = false;
      freeParticles.push(p.idx); // O(1) reclaim
    }
  }
  activeParticles.length = write;
}

export const freeWeather = [];
export function spawnWeatherParticle(
  x,
  y,
  vx,
  vy,
  type,
  size = 0,
  length = 0,
  alpha = 1,
  color = '',
  phase = 0,
) {
  const idx = freeWeather.pop();
  if (idx === undefined) return; // pool exhausted
  const p = weatherPool[idx];
  p.active = true;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.type = type;
  p.size = size;
  p.length = length;
  p.alpha = alpha;
  p.color = color;
  p.phase = phase;
  activeWeather.push(p);
}

export function spawnWeatherParticles() {
  if (state.reducedMotion || state.phase !== 'play' || state.paused) return;
  const spawnChance = Math.min(0.42 * state.dt, 0.95);
  // Cosmetic spawner — never consume the seeded gameplay RNG (see cosmeticRng).
  const rng = cosmeticRng;

  if (state.theme === 'rain') {
    if (rng() < spawnChance) {
      spawnWeatherParticle(
        rng() * (CONFIG.CANVAS_W + 100) - 50,
        -10,
        -1.2,
        5.5 + rng() * 2.0,
        'rain',
        0,
        7 + rng() * 6,
        1.0,
      );
    }
  } else if (state.theme === 'aurora') {
    if (rng() < Math.min(0.06 * state.dt, 0.95)) {
      spawnWeatherParticle(
        CONFIG.CANVAS_W + 10,
        rng() * (CONFIG.CANVAS_H - 180),
        -(0.2 + rng() * 0.4),
        (rng() - 0.5) * 0.1,
        'dust',
        0.8 + rng() * 1.5,
        0,
        0.25 + rng() * 0.45,
      );
    }
  } else if (state.theme === 'midnight') {
    if (rng() < Math.min(0.08 * state.dt, 0.95)) {
      spawnWeatherParticle(
        rng() * CONFIG.CANVAS_W,
        -10,
        0,
        0.5 + rng() * 0.7,
        'cyber',
        2.2 + rng() * 2.0,
        0,
        0.2 + rng() * 0.35,
      );
    }
  } else if (state.theme === 'meadow') {
    if (rng() < Math.min(0.024 * state.dt, 0.95)) {
      spawnWeatherParticle(
        CONFIG.CANVAS_W + 12,
        22 + rng() * (ground.y - 84),
        -(0.55 + rng() * 0.55),
        0.08 + rng() * 0.18,
        'pollen',
        1.4 + rng() * 1.8,
        0.7 + rng() * 1.4,
        0.28 + rng() * 0.28,
        MEADOW_POLLEN_COLORS[Math.floor(rng() * MEADOW_POLLEN_COLORS.length)],
        rng() * Math.PI * 2,
      );
    }
    // Gentle drifting pollen / petal flecks — calm and alive
    if (rng() < Math.min(0.07 * state.dt, 0.65)) {
      spawnWeatherParticle(
        rng() * CONFIG.CANVAS_W,
        -8,
        (rng() - 0.5) * 0.7,
        0.8 + rng() * 0.9,
        'pollen',
        1.4 + rng() * 1.6,
        0,
        0.28 + rng() * 0.35,
      );
    }
  } else if (state.theme === 'sunset') {
    // Warm golden motes — soft drifting dust in evening light
    if (rng() < Math.min(CONFIG.SUNSET_MOTE_CHANCE * state.dt, 0.6)) {
      spawnWeatherParticle(
        rng() * CONFIG.CANVAS_W,
        -6,
        (rng() - 0.5) * 0.4,
        0.6 + rng() * 0.7,
        'mote',
        1.1 + rng() * 1.1,
        0,
        CONFIG.SUNSET_MOTE_ALPHA + rng() * 0.1,
      );
    }
  }
}

export function updateWeatherParticles() {
  const dt = state.dt;
  let write = 0;
  for (let i = 0; i < activeWeather.length; i++) {
    const p = activeWeather[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    let keep = true;
    if (p.type === 'rain') {
      if (p.y >= ground.y) {
        spawnParticles(p.x, ground.y, 2, 'rgba(150, 220, 255, 0.4)', 1.5);
        keep = false;
      }
    } else if (p.type === 'pollen') {
      p.x += Math.sin(state.time * 0.035 + p.phase) * 0.12 * p.length * dt;
      p.y += Math.cos(state.time * 0.02 + p.phase) * 0.03 * dt;
      if (p.x < -18 || p.y < -18 || p.y >= ground.y - 8) keep = false;
    } else {
      if (p.x < -10 || p.y > CONFIG.CANVAS_H + 10) keep = false;
    }
    if (keep) {
      activeWeather[write++] = p;
    } else {
      p.active = false;
      freeWeather.push(p.idx); // O(1) reclaim
    }
  }
  activeWeather.length = write;
}

export function updateEmotion() {
  const prev = bird.emotion;
  const nearPipe = sim.nearestPipeCache;
  const closeToEdge =
    nearPipe &&
    (Math.abs(bird.y - nearPipe.topHeight) < 40 ||
      Math.abs(bird.y - (nearPipe.topHeight + state.gap)) < 40);

  if (state.phase === 'gameOver') bird.emotion = 'dizzy';
  else if (
    state.score > 0 &&
    state.score % CONFIG.EMOTION_HAPPY_SCORE_STEP === 0 &&
    bird.emotionTimer > 0
  )
    bird.emotion = 'happy';
  else if (closeToEdge) bird.emotion = 'scared';
  else if (bird.velocity > CONFIG.EMOTION_SCARED_VELOCITY) bird.emotion = 'scared';
  else if (state.score >= CONFIG.EMOTION_DETERMINED_SCORE) bird.emotion = 'determined';
  else bird.emotion = 'calm';

  if (bird.emotion === 'happy') bird.blush = Math.min(1, bird.blush + 0.1);
  else bird.blush = Math.max(0, bird.blush - 0.05);

  if (bird.emotion !== prev) bird.emotionTimer = CONFIG.EMOTION_HOLD_SEC * 60; // 60 dt-units = 1 second
  if (bird.emotionTimer > 0) bird.emotionTimer -= state.dt;
}

export function doFlap() {
  bird.velocity = state.flap;
  bird.scaleX = 0.8;
  bird.scaleY = 1.3;
  bird.pupilDilate = 1.0; // transient pupil expansion micro-interaction
  sfxFlap();
  hapticTap();
  spawnParticles(bird.x - 10, bird.y + 8, 3, getTheme().flapParticle, 2);
}

export function updateBird() {
  const dt = state.dt;
  const easing = Math.min(1, 0.16 * dt);

  if (bird.isBraking && bird.velocity > 0) {
    bird.velocity *= Math.pow(0.78, dt);
  }
  if (bird.isDiving) {
    bird.velocity = Math.min(bird.velocity + 0.16 * dt, state.terminalFall);
    if (state.elapsedSec - state.lastDiveAtSec > CONFIG.SFX_DIVE_COOLDOWN_SEC) {
      sfxDive();
      state.lastDiveAtSec = state.elapsedSec;
      state.diveUseCount++;
    }
  }
  if (bird.isBraking && bird.velocity > 0.45) {
    if (state.elapsedSec - state.lastBrakeAtSec > CONFIG.SFX_BRAKE_COOLDOWN_SEC) {
      sfxBrake();
      state.lastBrakeAtSec = state.elapsedSec;
      state.brakeUseCount++;
    }
  }

  const drag = bird.velocity < 0 ? 0.992 : 0.985;
  bird.velocity *= Math.pow(drag, dt);

  bird.velocity += state.gravity * dt;
  bird.velocity = Math.max(state.terminalRise, Math.min(bird.velocity, state.terminalFall));
  bird.y += bird.velocity * dt;

  const targetRotation = Math.max(-0.42, Math.min(bird.velocity * 0.12, 0.34));
  bird.rotation += (targetRotation - bird.rotation) * easing;

  bird.wingAngle += 0.18 * bird.wingDir * dt;
  if (bird.wingAngle > 0.4 || bird.wingAngle < -0.4) bird.wingDir *= -1;

  bird.scaleX += (1 - bird.scaleX) * Math.min(1, 0.14 * dt);
  bird.scaleY += (1 - bird.scaleY) * Math.min(1, 0.14 * dt);
  if (bird.pupilDilate > 0) bird.pupilDilate = Math.max(0, bird.pupilDilate - 0.06 * dt);

  // Living bird — gentle breathing when calmly gliding (no brake/dive, low velocity)
  const calmGlide =
    (bird.emotion === 'calm' || bird.emotion === 'happy') &&
    Math.abs(bird.velocity) < 1.8 &&
    !bird.isBraking &&
    !bird.isDiving &&
    state.phase === 'play';
  bird.breath = calmGlide ? Math.sin(state.time * 0.065) * 0.016 : 0;

  // Living breath flecks — the world gently breathing with a calm glider
  if (calmGlide && !state.reducedMotion && cosmeticRng() < CONFIG.CALM_BREATH_PARTICLE_CHANCE * state.dt) {
    spawnParticles(
      bird.x - 2,
      bird.y + 10,
      CONFIG.CALM_BREATH_PARTICLE_COUNT,
      getTheme().flapParticle || '#fff',
      CONFIG.CALM_BREATH_SPREAD,
    );
  }

  if (!state.reducedMotion) {
    for (let i = bird.trail.length - 1; i > 0; i--) {
      bird.trail[i].x = bird.trail[i - 1].x;
      bird.trail[i].y = bird.trail[i - 1].y;
      bird.trail[i].life = bird.trail[i - 1].life - dt;
    }
    bird.trail[0].x = bird.x;
    bird.trail[0].y = bird.y;
    bird.trail[0].life = CONFIG.BIRD_TRAIL_LIFE;
  } else if (bird.trail[0] && bird.trail[0].life > 0) {
    for (let i = 0; i < bird.trail.length; i++) bird.trail[i].life = 0;
  }

  // Living eyes — the bird looks at the world with intent
  // Priority: active shield bubble > next safe gap. Feels curious and alive.
  let lookX = 18; // default gentle forward gaze
  let lookY = 0;

  const nearPipe = sim.nearestPipeCache;
  let targetX = null;
  let targetY = null;

  // Prefer shield when it's present and ahead (the "prize" moment)
  let shieldTarget = null;
  for (const p of pipes) {
    if (p.shieldBubble && p.x > bird.x - 20) {
      shieldTarget = p;
      break;
    }
  }

  if (shieldTarget && shieldTarget.shieldBubble) {
    targetX = shieldTarget.x;
    targetY = bird.y - 8; // slightly above center of bubble for "hopeful" look
  } else if (nearPipe) {
    targetX = nearPipe.x;
    targetY = nearPipe.topHeight + state.gap / 2;
  }

  if (targetX !== null && targetY !== null) {
    const tx = targetX - bird.x;
    const ty = targetY - bird.y;
    const dist = Math.hypot(tx, ty) || 1;
    const strength = shieldTarget ? 3.2 : 2.4;
    lookX = (tx / dist) * strength;
    lookY = (ty / dist) * (shieldTarget ? 2.8 : 1.8);
  }

  // Brake = focused, determined look forward and slightly down
  if (bird.isBraking) {
    lookX = Math.max(lookX, 2.5);
    lookY = Math.min(lookY + 1.2, 3);
  }

  // Soft easing + tiny organic interest when gliding calm
  const ease = 0.18 * state.dt;
  bird.pupilOffsetX += (lookX - bird.pupilOffsetX) * ease;
  bird.pupilOffsetY += (lookY - bird.pupilOffsetY) * ease;

  // Very subtle idle curiosity when no strong target and calm
  if (!nearPipe && !shieldTarget && (bird.emotion === 'calm' || bird.emotion === 'happy')) {
    const t = state.time * 0.9;
    bird.pupilOffsetX += Math.sin(t) * 0.25 * 0.016 * state.dt;
    bird.pupilOffsetY += Math.cos(t * 0.7) * 0.18 * 0.016 * state.dt;
  }

  if (state.isInvincible) {
    state.invincibilityTimer -= dt;
    if (state.invincibilityTimer <= 0) state.isInvincible = false;
  }
}

export function spawnPipe() {
  const minTop = CONFIG.PIPE_MIN_TOP;
  const maxTop = Math.max(minTop + 1, ground.y - state.gap - 80);
  const topHeight = Math.floor(rng() * (maxTop - minTop + 1)) + minTop;

  const isMoving = state.score >= CONFIG.PIPE_SCORE_FOR_MOVING && rng() < CONFIG.PIPE_MOVING_CHANCE;

  const themePipe = getTheme().pipe;
  const color = `hsl(${themePipe.hue + rng() * 30}, 60%, 35%)`;
  const capColor = `hsl(${themePipe.cap + rng() * 30}, 70%, 20%)`;

  const newPipe = {
    x: CONFIG.CANVAS_W + 30,
    prevX: CONFIG.CANVAS_W + 30,
    topHeight,
    baseTopHeight: topHeight,
    passed: false,
    isMoving,
    movePhase: rng() * Math.PI * 2,
    color,
    capColor,
    nearMissRecorded: false,
    shieldBubble: null,
  };

  pipes.push(newPipe);
  sim.pipeCounter++;

  if (
    sim.pipeCounter % CONFIG.SHIELD_INTERVAL === 0 &&
    !state.shieldActive &&
    !pipes.some((p) => p.shieldBubble)
  ) {
    newPipe.shieldBubble = { radius: CONFIG.SHIELD_RADIUS, pulse: 0 };
  }
}

export function updatePipes() {
  const dt = state.dt;
  state.pipeSpawnTimer += dt;
  if (state.pipeSpawnTimer >= state.pipeSpawnInterval) {
    spawnPipe();
    state.pipeSpawnTimer = 0;
  }
  const speed = state.pipeSpeed * state.speedMultiplier * dt;

  for (const pipe of pipes) {
    pipe.x -= speed;
    if (pipe.isMoving) {
      pipe.movePhase += 0.03 * dt;
      const minTop = 60;
      const maxTop = ground.y - state.gap - 60;
      pipe.topHeight = Math.max(
        minTop,
        Math.min(maxTop, pipe.baseTopHeight + Math.sin(pipe.movePhase) * 14),
      );
    }
    if (!pipe.passed && pipe.x + state.pipeWidth < bird.x) {
      pipe.passed = true;
      state.score += 1;
      onScoreChanged();
      sfxScore();
      bird.emotionTimer = CONFIG.EMOTION_HOLD_SEC * 60;
      spawnParticles(bird.x, bird.y - 20, 6, getTheme().scoreParticle, 3);
      if (state.score % 6 === 0) {
        state.speedMultiplier = Math.min(state.maxSpeedMultiplier, state.speedMultiplier + 0.03);
      }
    }
  }
  while (pipes.length && pipes[0].x + state.pipeWidth < -20) pipes.shift();
}

export function updateShieldBubbles() {
  const dt = state.dt;
  for (const pipe of pipes) {
    if (!pipe.shieldBubble) continue;
    pipe.shieldBubble.pulse += 0.05 * dt;
    const bx = pipe.x + state.pipeWidth / 2;
    const by = pipe.topHeight + state.gap / 2;
    const d = Math.hypot(bird.x - bx, bird.y - by);
    if (d < bird.radius + pipe.shieldBubble.radius + CONFIG.SHIELD_PICKUP_BONUS) {
      state.shieldActive = true;
      sfxShieldCollect();
      hapticPulse(40);
      spawnParticles(bx, by, 18, '#ffd700', 4);
      pipe.shieldBubble = null;
      hooks.persistStatsHot();
      announce('Feather Shield activated.');
    }
  }
}

export function updateNearestPipeCache() {
  sim.nearestPipeCache = null;
  let bestDx = Infinity;
  for (const p of pipes) {
    const dx = p.x - bird.x;
    if (dx > -40 && dx < 120 && dx < bestDx) {
      bestDx = dx;
      sim.nearestPipeCache = p;
    }
  }
}

/** True circle vs rect collision (replaces previous AABB hack). */
export function checkCollisions() {
  if (bird.y + bird.radius >= ground.y) {
    bird.y = ground.y - bird.radius;
    hooks.gameOver();
    return;
  }
  if (bird.y - bird.radius <= 0) {
    bird.y = bird.radius;
    bird.velocity = 0;
  }
  for (const pipe of pipes) {
    if (intersectsPipe(pipe)) {
      if (state.shieldActive) {
        state.shieldActive = false;
        state.isInvincible = true;
        state.invincibilityTimer = CONFIG.SHIELD_INVINCIBILITY_SEC * 60;
        bird.velocity = CONFIG.SHIELD_POP_VELOCITY;
        sfxShieldPop();
        hapticPulse(80);
        spawnParticles(bird.x, bird.y, 25, '#ffd700', 6);
        state.shieldsSavedCount++;
        state.afterglowShieldUsed = true; // per-run flag for the Afterglow reflection
        hooks.persistStatsHot();
        announce('Feather Shield absorbed collision. Invincible.');
        return;
      } else if (state.isInvincible) {
        return;
      } else {
        hooks.gameOver();
        return;
      }
    }
  }
  // Near-miss
  for (const pipe of pipes) {
    if (pipe.passed) continue;
    if (Math.abs(pipe.x - bird.x) > CONFIG.NEAR_MISS_X_WINDOW) continue;
    const gapBottom = pipe.topHeight + state.gap;
    const topProximity = bird.y - bird.radius - pipe.topHeight;
    const botProximity = gapBottom - (bird.y + bird.radius);
    if (
      Math.abs(topProximity) < CONFIG.NEAR_MISS_Y_BAND ||
      Math.abs(botProximity) < CONFIG.NEAR_MISS_Y_BAND
    ) {
      if (!pipe.nearMissRecorded) {
        pipe.nearMissRecorded = true;
        state.nearMissesCount++;
        state.runNearMisses++;
        state.nearMissFlash = 0.6; // seconds
        state.calmMeter = Math.min(1.0, state.calmMeter + 0.05);
        sfxNearMiss();
        hapticTap();
        hooks.persistStatsHot();
      }
    }
  }
}

export function onScoreChanged() {
  if (state.score - state.lastScoreAnnounceAt >= CONFIG.SCORE_ANNOUNCE_EVERY || state.score === 1) {
    state.lastScoreAnnounceAt = state.score;
    announce(`Score ${state.score}.`);
  }
  state.calmMeter = Math.min(1.0, state.calmMeter + 0.04);
}

/** Handle for the delayed game-over "second wave" particle burst (cleared on
 * restart so a quick R-press can't spray the previous death into the new run). */
