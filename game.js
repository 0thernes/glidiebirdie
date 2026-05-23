// ═══════════════════════════════════════════════════════════════════
// FLAPPY BIRD — Masterclass Upgrade with Dynamic Theme Synthesizer,
// Customizer Controls, Feather Shield Power-up, Visual Weather Particle Arrays,
// Stats Dashboard, Achievement Checklists, and GPU-Optimized Pools.
// ═══════════════════════════════════════════════════════════════════

"use strict";

const canvas = document.getElementById("game");
const ctx = canvas?.getContext("2d");
if (!canvas || !ctx)
  throw new Error("Canvas element #game not found or 2D context unavailable.");

const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

// DOM Elements Cache
const dom = {
  pauseToggle: document.getElementById("pauseToggle"),
  muteToggle: document.getElementById("muteToggle"),
  restartButton: document.getElementById("restartButton"),
  drawerToggle: document.getElementById("drawerToggle"),
  customizerDrawer: document.getElementById("customizerDrawer"),
  drawerClose: document.getElementById("drawerClose"),
  gravitySlider: document.getElementById("gravitySlider"),
  speedSlider: document.getElementById("speedSlider"),
  musicVolumeSlider: document.getElementById("musicVolumeSlider"),
  sfxVolumeSlider: document.getElementById("sfxVolumeSlider"),
  gravityVal: document.getElementById("gravityVal"),
  speedVal: document.getElementById("speedVal"),
  musicVolumeVal: document.getElementById("musicVolumeVal"),
  sfxVolumeVal: document.getElementById("sfxVolumeVal"),
  srStatus: document.getElementById("srStatus"),
  // Stats Card selectors
  statZenMinutes: document.getElementById("statZenMinutes"),
  statShieldsSaved: document.getElementById("statShieldsSaved"),
  statRunsCompleted: document.getElementById("statRunsCompleted"),
  statNearMisses: document.getElementById("statNearMisses"),
  // Theme Cluster Buttons
  themeBtns: document.querySelectorAll(".theme-btn"),
};

function announce(message) {
  if (!dom.srStatus) return;
  dom.srStatus.textContent = "";
  requestAnimationFrame(() => {
    if (dom.srStatus) dom.srStatus.textContent = message;
  });
}

function handleReducedMotionChange(event) {
  state.reducedMotion = event.matches;
  if (event.matches) {
    state.shakeAmount = 0;
    activeWeather.length = 0;
    for (const p of weatherPool) p.active = false;
  }
}

// Tracks physically-held keys so modifier holds (Shift / ArrowDown) survive a restart —
// the browser will not re-fire keydown for an already-pressed key.
const heldKeys = new Set();

const THEMES = Object.freeze(["sunset", "midnight", "rain", "aurora"]);
const SETTING_LEVELS = Object.freeze([1, 2, 3, 4]);
const GRAVITY_LABELS = Object.freeze({
  1: "Ultra-Light",
  2: "Calm",
  3: "Normal",
  4: "Heavy",
});
const SPEED_LABELS = Object.freeze({
  1: "Breeze",
  2: "Chill",
  3: "Cruise",
  4: "Swift",
});

function readStoredChoice(key, choices, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return choices.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

function readStoredNumber(key, fallback, min = -Infinity, max = Infinity) {
  try {
    const stored = localStorage.getItem(key);
    const value = stored === null ? fallback : Number(stored);
    return clampNumber(value, fallback, min, max);
  } catch {
    return fallback;
  }
}

function clampNumber(value, fallback, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readStoredLevel(key, fallback) {
  const value = readStoredNumber(key, fallback, 1, 4);
  return SETTING_LEVELS.includes(value) ? value : fallback;
}

function readPlayedThemes() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem("played-themes") || '["sunset"]',
    );
    const themes = Array.isArray(parsed)
      ? parsed.filter((theme) => THEMES.includes(theme))
      : [];
    return new Set(themes.length ? themes : ["sunset"]);
  } catch {
    return new Set(["sunset"]);
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Storage blocked */
  }
}

// ── Audio Engine (Web Audio API Synthesizer) ──────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    /* AudioContext blocked or unavailable */
  }
}

// Schedule a tone at a specific AudioContext time. Volume is taken AS-IS — the caller
// is responsible for applying the appropriate channel scaling (sfxVolume or musicVolume),
// so the music and SFX channels stay independent.
function playToneAt(freq, duration, type, volume, startTime) {
  if (!state.audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    /* tone creation failed — swallow gracefully */
  }
}

// SFX convenience: play immediately, scaled by the SFX channel volume.
function playTone(freq, duration, type = "square", volume = 0.12) {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  playToneAt(
    freq,
    duration,
    type,
    volume * state.sfxVolume,
    audioCtx.currentTime,
  );
}

function sfxFlap() {
  playTone(420, 0.1, "triangle", 0.15);
  playTone(560, 0.08, "sine", 0.1);
}

function sfxScore() {
  playTone(660, 0.08, "square", 0.1);
  playTone(880, 0.1, "square", 0.12);
  setTimeout(() => playTone(1100, 0.12, "square", 0.1), 80);
}

function sfxDie() {
  playTone(220, 0.25, "sawtooth", 0.14);
  playTone(140, 0.35, "sawtooth", 0.1);
}

function sfxDive() {
  playTone(300, 0.06, "triangle", 0.08);
}
function sfxBrake() {
  playTone(380, 0.05, "sine", 0.08);
}

function sfxShieldCollect() {
  playTone(523, 0.1, "sine", 0.12);
  setTimeout(() => playTone(659, 0.12, "sine", 0.1), 70);
  setTimeout(() => playTone(784, 0.15, "sine", 0.12), 140);
  setTimeout(() => playTone(1047, 0.2, "sine", 0.15), 210);
}

function sfxShieldPop() {
  playTone(880, 0.08, "triangle", 0.15);
  playTone(1200, 0.12, "sine", 0.1);
}

// Background music: per-theme arpeggios scheduled on the AudioContext sample clock.
// Drift-free vs setInterval — pattern from Chris Wilson's "A Tale of Two Clocks."
// Music notes go through playToneAt directly (scaled by musicVolume only) so the
// music channel stays independent from the SFX channel.
const musicThemes = {
  sunset: {
    notes: [262, 330, 392, 523, 392, 330],
    wave: "sine",
    subWave: "triangle",
    interval: 0.42,
  }, // C-Major Cozy
  midnight: {
    notes: [293, 370, 440, 587, 440, 370],
    wave: "square",
    subWave: "sine",
    interval: 0.38,
  }, // Lydian cyber
  rain: {
    notes: [220, 262, 330, 440, 330, 262],
    wave: "sine",
    subWave: "triangle",
    interval: 0.46,
  }, // Soothing minor
  aurora: {
    notes: [277, 311, 349, 415, 349, 311],
    wave: "sine",
    subWave: "sine",
    interval: 0.45,
  }, // Whole-tone cluster
};

const MUSIC_LOOKAHEAD = 0.1; // seconds of audio scheduled ahead each tick
const MUSIC_TICK_MS = 25; // scheduler wake interval (ms)
let musicSchedulerHandle = null;
let musicIdx = 0;
let musicNextNoteTime = 0;

function scheduleMusicAhead() {
  if (!audioCtx) return;
  const theme = musicThemes[state.theme] || musicThemes.sunset;
  // If we fell far behind (e.g. tab was throttled), skip the backlog instead of dumping it.
  if (musicNextNoteTime < audioCtx.currentTime - 0.5) {
    musicNextNoteTime = audioCtx.currentTime + 0.05;
  }
  while (musicNextNoteTime < audioCtx.currentTime + MUSIC_LOOKAHEAD) {
    const baseFreq = theme.notes[musicIdx % theme.notes.length];
    playToneAt(
      baseFreq,
      0.22,
      theme.wave,
      0.045 * state.musicVolume,
      musicNextNoteTime,
    );
    playToneAt(
      baseFreq / 2,
      0.28,
      theme.subWave,
      0.02 * state.musicVolume,
      musicNextNoteTime,
    );

    // Procedural rain droplets under the Rain theme
    if (state.theme === "rain" && Math.random() < 0.35) {
      playToneAt(
        Math.random() * 900 + 350,
        0.005,
        "sine",
        0.007 * state.musicVolume,
        musicNextNoteTime,
      );
    }

    musicNextNoteTime += theme.interval;
    musicIdx++;
  }
}

function startMusic() {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  stopMusic();
  musicIdx = 0;
  musicNextNoteTime = audioCtx.currentTime + 0.05;
  scheduleMusicAhead();
  musicSchedulerHandle = setInterval(scheduleMusicAhead, MUSIC_TICK_MS);
}

function stopMusic() {
  if (musicSchedulerHandle) {
    clearInterval(musicSchedulerHandle);
    musicSchedulerHandle = null;
  }
}

// ── State Management ──────────────────────────────────────────────
const state = {
  phase: "start", // 'start' | 'play' | 'gameOver'
  score: 0,
  best: readStoredNumber("flappy-best", 0, 0),
  frames: 0,
  time: 0,

  // Customizer Configuration loaded directly from localStorage
  theme: readStoredChoice("flappy-theme", THEMES, "sunset"),
  gravitySetting: readStoredLevel("flappy-gravity", 2),
  speedSetting: readStoredLevel("flappy-speed", 2),
  musicVolume: readStoredNumber("flappy-music-volume", 0.6, 0, 1),
  sfxVolume: readStoredNumber("flappy-sfx-volume", 0.8, 0, 1),

  // Physics (calculated dynamically based on customizer sliders)
  gravity: 0.052,
  flap: -2.35,
  terminalRise: -2.75,
  terminalFall: 2.35,
  pipeSpeed: 1.15,
  gap: 184,
  pipeWidth: 72,
  pipeSpawnTimer: 0,
  pipeSpawnInterval: 170,
  speedMultiplier: 1.0,
  maxSpeedMultiplier: 1.18,

  paused: false,
  audioEnabled: true,
  reducedMotion: reducedMotionQuery.matches,
  collisionInset: 6,
  lastDiveToneAt: -Infinity,
  lastBrakeToneAt: -Infinity,

  // Screen shake
  shakeAmount: 0,
  hueShift: 0,

  // Delta time
  lastTimestamp: 0,
  dt: 1.0,

  // Feather Shield Spawning Systems
  shieldActive: false,
  isInvincible: false,
  invincibilityTimer: 0,

  // Persistent Statistics Logging
  zenTimeSec: readStoredNumber("zen-time-sec", 0, 0),
  shieldsSavedCount: readStoredNumber("shields-saved-count", 0, 0),
  runsCount: readStoredNumber("runs-count", 0, 0),
  nearMissesCount: readStoredNumber("near-misses-count", 0, 0),
  playedThemes: readPlayedThemes(),
};

// Physics Constants Mappings
const gravityMap = { 1: 0.038, 2: 0.052, 3: 0.066, 4: 0.082 };
const flapMap = { 1: -2.15, 2: -2.35, 3: -2.55, 4: -2.75 };
const speedMap = { 1: 0.85, 2: 1.15, 3: 1.35, 4: 1.65 };
const spawnIntervalMap = { 1: 220, 2: 170, 3: 148, 4: 120 };

function updateDerivedPhysics() {
  if (!SETTING_LEVELS.includes(state.gravitySetting)) state.gravitySetting = 2;
  if (!SETTING_LEVELS.includes(state.speedSetting)) state.speedSetting = 2;

  state.gravity = gravityMap[state.gravitySetting];
  state.flap = flapMap[state.gravitySetting];
  state.pipeSpeed = speedMap[state.speedSetting];
  state.pipeSpawnInterval = spawnIntervalMap[state.speedSetting];
}

const bird = {
  x: 112,
  y: canvas.height / 2,
  radius: 18,
  velocity: 0,
  rotation: 0,
  emotion: "calm", // calm | happy | scared | determined | dizzy
  emotionTimer: 0,
  wingAngle: 0,
  wingDir: 1,
  scaleX: 1,
  scaleY: 1,
  trail: [],
  isBraking: false,
  isDiving: false,
  blush: 0,
  pupilOffsetX: 0,
  pupilOffsetY: 0,
};

const ground = {
  y: canvas.height - 80,
  height: 80,
  offset: 0,
};

const pipes = [];

// ── Theme Graphics Palette Constants (Zero-GC Rendering Pools) ───
const BIRD_THEME_COLORS = {
  sunset: {
    calm: "#ffd44f",
    happy: "#ffdd44",
    scared: "#ffcc44",
    determined: "#ffaa22",
    dizzy: "#ddbb44",
    beak: "#ff8b2d",
    hl: "#ffe680",
    shadow: "#f2b638",
  },
  midnight: {
    calm: "#f472b6",
    happy: "#ff77cc",
    scared: "#c084fc",
    determined: "#ec4899",
    dizzy: "#a21caf",
    beak: "#38bdf8",
    hl: "#fbcfe8",
    shadow: "#db2777",
  },
  rain: {
    calm: "#94a3b8",
    happy: "#38bdf8",
    scared: "#475569",
    determined: "#1e293b",
    dizzy: "#64748b",
    beak: "#2dd4bf",
    hl: "#cbd5e1",
    shadow: "#475569",
  },
  aurora: {
    calm: "#4ade80",
    happy: "#a78bfa",
    scared: "#10b981",
    determined: "#047857",
    dizzy: "#34d399",
    beak: "#facc15",
    hl: "#bbf7d0",
    shadow: "#059669",
  },
};

const GROUND_THEME_COLORS = {
  sunset: {
    sand: "#c8a24c",
    grass1: "#5cb85c",
    grass2: "#3d8b3d",
    dirt: "#a6893a",
  },
  midnight: {
    sand: "#1e0b36",
    grass1: "#ec4899",
    grass2: "#9d174d",
    dirt: "#3c0d63",
  },
  rain: {
    sand: "#475569",
    grass1: "#64748b",
    grass2: "#334155",
    dirt: "#1e293b",
  },
  aurora: {
    sand: "#0c2e26",
    grass1: "#10b981",
    grass2: "#047857",
    dirt: "#064e3b",
  },
};

const SKY_THEME_COLORS = {
  sunset: { h1: 195, h2: 215, cAlpha: 0.55 },
  midnight: { h1: 240, h2: 260, cAlpha: 0.15 },
  rain: { h1: 205, h2: 220, cAlpha: 0.25 },
  aurora: { h1: 165, h2: 185, cAlpha: 0.2 },
};

function getPipeScoreHue(theme, score) {
  if (theme === "sunset") return 130 + score * 3;
  if (theme === "midnight") return 320 + score * 3;
  if (theme === "rain") return 200 + score * 2;
  if (theme === "aurora") return 150 + score * 2;
  return 130 + score * 3;
}

// ── Object Pooling System (Optimized Flat Allocation) ─────────────
const particlePool = [];
const activeParticles = [];
const weatherPool = [];
const activeWeather = [];

function initObjectPools() {
  particlePool.length = 0;
  activeParticles.length = 0;
  for (let i = 0; i < 220; i++) {
    particlePool.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      color: "",
      size: 0,
      active: false,
    });
  }

  weatherPool.length = 0;
  activeWeather.length = 0;
  for (let i = 0; i < 120; i++) {
    weatherPool.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      type: "",
      size: 0,
      length: 0,
      alpha: 0,
      active: false,
    });
  }
}

function spawnParticles(x, y, count, color, spread = 3) {
  const particleCount = state.reducedMotion
    ? Math.max(1, Math.ceil(count * 0.35))
    : count;
  const particleSpread = state.reducedMotion ? spread * 0.45 : spread;

  let spawned = 0;
  for (let i = 0; i < particlePool.length; i++) {
    const p = particlePool[i];
    if (!p.active) {
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.5) * particleSpread;
      p.vy = (Math.random() - 0.5) * particleSpread;
      p.life = 30 + Math.random() * 20;
      p.maxLife = p.life; // tie maxLife to actual initial life so alpha starts at 1.0
      p.color = color;
      p.size = 2 + Math.random() * 3;

      activeParticles.push(p);
      spawned++;
      if (spawned >= particleCount) break;
    }
  }
}

function updateParticles() {
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
    }
  }
  activeParticles.length = write;
}

function drawParticles() {
  for (const p of activeParticles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Environmental & Weather Subsystems ────────────────────────────
function spawnWeatherParticle(
  x,
  y,
  vx,
  vy,
  type,
  size = 0,
  length = 0,
  alpha = 1,
) {
  for (let i = 0; i < weatherPool.length; i++) {
    const p = weatherPool[i];
    if (!p.active) {
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.type = type;
      p.size = size;
      p.length = length;
      p.alpha = alpha;
      activeWeather.push(p);
      break;
    }
  }
}

function spawnWeatherParticles() {
  if (state.reducedMotion || state.phase !== "play" || state.paused) return;

  // Cap spawn probability to prevent burst after lag spikes (large dt)
  const spawnChance = Math.min(0.42 * state.dt, 0.95);

  if (state.theme === "rain") {
    if (Math.random() < spawnChance) {
      spawnWeatherParticle(
        Math.random() * (canvas.width + 100) - 50,
        -10,
        -1.2,
        5.5 + Math.random() * 2.0,
        "rain",
        0,
        7 + Math.random() * 6,
        1.0,
      );
    }
  } else if (state.theme === "aurora") {
    if (Math.random() < Math.min(0.06 * state.dt, 0.95)) {
      spawnWeatherParticle(
        canvas.width + 10,
        Math.random() * (canvas.height - 180),
        -(0.2 + Math.random() * 0.4),
        (Math.random() - 0.5) * 0.1,
        "dust",
        0.8 + Math.random() * 1.5,
        0,
        0.25 + Math.random() * 0.45,
      );
    }
  } else if (state.theme === "midnight") {
    if (Math.random() < Math.min(0.08 * state.dt, 0.95)) {
      spawnWeatherParticle(
        Math.random() * canvas.width,
        -10,
        0,
        0.5 + Math.random() * 0.7,
        "cyber",
        2.2 + Math.random() * 2.0,
        0,
        0.2 + Math.random() * 0.35,
      );
    }
  }
}

function updateWeatherParticles() {
  const dt = state.dt;
  let write = 0;
  for (let i = 0; i < activeWeather.length; i++) {
    const p = activeWeather[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    let keep = true;
    if (p.type === "rain") {
      if (p.y >= ground.y) {
        spawnParticles(p.x, ground.y, 2, "rgba(150, 220, 255, 0.4)", 1.5);
        keep = false;
      }
    } else {
      if (p.x < -10 || p.y > canvas.height + 10) keep = false;
    }

    if (keep) {
      activeWeather[write++] = p;
    } else {
      p.active = false;
    }
  }
  activeWeather.length = write;
}

function drawWeatherParticles() {
  for (const p of activeWeather) {
    if (p.type === "rain") {
      ctx.strokeStyle = "rgba(156, 206, 235, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 1.4, p.y + p.vy * 1.4);
      ctx.stroke();
    } else if (p.type === "dust") {
      ctx.fillStyle = "rgba(167, 139, 250, 0.65)";
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "cyber") {
      ctx.fillStyle = "rgba(244, 114, 182, 0.55)";
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1.0;
}

function drawAuroraBands() {
  if (state.theme !== "aurora" || state.reducedMotion) return;
  ctx.save();
  const time = state.time * 0.005;
  for (let i = 0; i < 3; i++) {
    const shiftX = Math.sin(time + i * 2.0) * 50;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, "rgba(74, 222, 128, 0)");
    grad.addColorStop(
      0.3 + i * 0.15,
      `rgba(${74 + i * 20}, ${222 - i * 30}, ${128 + i * 40}, 0.06)`,
    );
    grad.addColorStop(0.6 + i * 0.15, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(canvas.width + shiftX, canvas.height - 180);
    ctx.lineTo(shiftX, canvas.height - 180);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ── Statistics & Achievements Synchronization ─────────────────────
function syncStatsAndAchievements(saveToStorage = false) {
  if (saveToStorage) {
    writeStoredValue("zen-time-sec", Math.floor(state.zenTimeSec));
    writeStoredValue("shields-saved-count", state.shieldsSavedCount);
    writeStoredValue("runs-count", state.runsCount);
    writeStoredValue("near-misses-count", state.nearMissesCount);
    writeStoredValue(
      "played-themes",
      JSON.stringify(Array.from(state.playedThemes)),
    );
  }

  if (dom.statZenMinutes)
    dom.statZenMinutes.textContent = (state.zenTimeSec / 60).toFixed(1);
  if (dom.statShieldsSaved)
    dom.statShieldsSaved.textContent = String(state.shieldsSavedCount);
  if (dom.statRunsCompleted)
    dom.statRunsCompleted.textContent = String(state.runsCount);
  if (dom.statNearMisses)
    dom.statNearMisses.textContent = String(state.nearMissesCount);

  checkAchievements();
}

function checkAchievements() {
  const achievementStates = {
    FirstFlight: state.score >= 1,
    ZenMaster: state.score >= 15,
    ShieldSavior: state.shieldsSavedCount >= 1,
    ThemeExplorer: state.playedThemes.size >= 4,
  };

  Object.keys(achievementStates).forEach((key) => {
    const el = document.getElementById(`ach${key}`);
    if (el && achievementStates[key]) {
      if (!el.classList.contains("unlocked")) {
        el.classList.add("unlocked");
        if (state.phase === "play") {
          // Persistence: Immediate save on achievement unlock
          syncStatsAndAchievements(true);
          playTone(880, 0.15, "sine", 0.1);
          setTimeout(() => playTone(1320, 0.25, "sine", 0.08), 120);
          spawnParticles(bird.x, bird.y - 30, 15, "#10b981", 4);
          announce(`Cozy Milestone unlocked!`);
        }
      }
    }
  });
}

// ── Emotion Logic ────────────────────────────────────────────────
function updateEmotion() {
  const prevEmotion = bird.emotion;

  const nearPipe = pipes.find((p) => p.x > bird.x - 40 && p.x < bird.x + 80);
  const closeToPipeEdge =
    nearPipe &&
    (Math.abs(bird.y - nearPipe.topHeight) < 40 ||
      Math.abs(bird.y - (nearPipe.topHeight + state.gap)) < 40);

  if (state.phase === "gameOver") {
    bird.emotion = "dizzy";
  } else if (
    state.score > 0 &&
    state.score % 5 === 0 &&
    bird.emotionTimer > 0
  ) {
    bird.emotion = "happy";
  } else if (closeToPipeEdge) {
    bird.emotion = "scared";
  } else if (bird.velocity > 1.65) {
    bird.emotion = "scared";
  } else if (state.score >= 8) {
    bird.emotion = "determined";
  } else {
    bird.emotion = "calm";
  }

  if (bird.emotion === "happy") bird.blush = Math.min(1, bird.blush + 0.1);
  else bird.blush = Math.max(0, bird.blush - 0.05);

  if (bird.emotion !== prevEmotion) bird.emotionTimer = 60;
  if (bird.emotionTimer > 0) bird.emotionTimer -= state.dt;
}

// ── Reset & Lifecycle ────────────────────────────────────────────
function resetGame() {
  state.phase = "start";
  state.score = 0;
  state.frames = 0;
  state.time = 0;
  state.speedMultiplier = 1.0;
  state.paused = false;
  state.shakeAmount = 0;
  state.pipeSpawnTimer = 0;
  state.lastDiveToneAt = -Infinity;
  state.lastBrakeToneAt = -Infinity;

  // Reset shield and temporary collision immunity state.
  state.shieldActive = false;
  state.isInvincible = false;
  state.invincibilityTimer = 0;
  pipeCounter = 0;

  bird.y = canvas.height / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  bird.emotion = "calm";
  bird.emotionTimer = 0;
  bird.scaleX = 1;
  bird.scaleY = 1;
  // Pre-allocate 10 array slots with static object targets to avoid frame-level allocations
  bird.trail = Array.from({ length: 10 }, () => ({ x: 0, y: 0, life: 0 }));
  // Carry over any physically-held modifier keys so a fresh run honors what the player is holding now.
  bird.isBraking = heldKeys.has("ShiftLeft") || heldKeys.has("ShiftRight");
  bird.isDiving = heldKeys.has("ArrowDown");
  bird.blush = 0;
  bird.pupilOffsetX = 0;
  bird.pupilOffsetY = 0;

  ground.offset = 0;
  pipes.length = 0;

  initObjectPools();
  stopMusic();
  syncUiState();
  syncStatsAndAchievements(true); // Persist resets immediately
  announce("Ready to glide. Relax and start when you like.");
}

function startGame() {
  if (state.phase === "play" && !state.paused) {
    doFlap();
    return;
  }
  resetGame();
  state.phase = "play";
  state.paused = false;

  state.runsCount++;
  syncStatsAndAchievements();

  startMusic();
  doFlap();
  syncUiState();
  syncStatsAndAchievements(true); // Save starting count immediately
  announce("Run started. Gentle pacing enabled.");
}

function restartRun() {
  resetGame();
  state.phase = "play";
  state.paused = false;

  state.runsCount++;
  syncStatsAndAchievements();

  startMusic();
  doFlap();
  syncUiState();
  syncStatsAndAchievements(true); // Save restart count immediately
  announce("Run restarted. Take it easy and glide.");
}

function syncUiState() {
  if (dom.pauseToggle) {
    const canPause = state.phase === "play";
    dom.pauseToggle.disabled = !canPause;
    dom.pauseToggle.textContent = state.paused ? "Resume" : "Pause";
    dom.pauseToggle.setAttribute("aria-pressed", String(state.paused));
  }

  if (dom.muteToggle) {
    dom.muteToggle.textContent = state.audioEnabled ? "Sound on" : "Muted";
    dom.muteToggle.setAttribute("aria-pressed", String(!state.audioEnabled));
  }
}

function togglePause(forceValue) {
  if (state.phase !== "play") return;

  const targetState = typeof forceValue === "boolean" ? forceValue : !state.paused;
  if (state.paused === targetState) return;

  state.paused = targetState;

  if (state.paused) {
    stopMusic();
  } else {
    // Resume: re-sync hold flags so a key pressed during pause takes effect immediately.
    // (keydown sets the flag *after* its paused early-return, so without this the flag
    // would stay stale until the user released and re-pressed.)
    bird.isBraking = heldKeys.has("ShiftLeft") || heldKeys.has("ShiftRight");
    bird.isDiving = heldKeys.has("ArrowDown");
    startMusic();
  }

  syncUiState();
  announce(state.paused ? "Game paused." : "Game resumed.");
}

function toggleMute() {
  state.audioEnabled = !state.audioEnabled;

  if (!state.audioEnabled) stopMusic();
  else if (state.phase === "play" && !state.paused) startMusic();

  syncUiState();
  announce(state.audioEnabled ? "Sound on." : "Sound muted.");
}

function gameOver() {
  state.phase = "gameOver";
  state.paused = false;
  state.best = Math.max(state.best, state.score);
  writeStoredValue("flappy-best", state.best);
  state.shakeAmount = state.reducedMotion ? 0 : 4.5;
  sfxDie();
  stopMusic();
  spawnParticles(bird.x, bird.y, 15, "#ff4444", 5);
  spawnParticles(bird.x, bird.y, 10, "#ffaa00", 4);
  syncUiState();
  syncStatsAndAchievements(true); // Save high scores and status immediately on crash
  announce(`Game over. Score ${state.score}. Best ${state.best}.`);
}

function doFlap() {
  bird.velocity = state.flap;
  bird.scaleX = 0.8;
  bird.scaleY = 1.3;
  sfxFlap();

  // Theme matching flap particles
  const particleColorMap = {
    sunset: "#ffe680",
    midnight: "#f472b6",
    rain: "#cbd5e1",
    aurora: "#4ade80",
  };
  spawnParticles(
    bird.x - 10,
    bird.y + 8,
    3,
    particleColorMap[state.theme] || "#ffe680",
    2,
  );
}

// ── Pipe & Shield Spawning ────────────────────────────────────────
let pipeCounter = 0;

function spawnPipe() {
  const minTop = 80;
  const maxTop = ground.y - state.gap - 80;
  const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

  const isMoving = state.score >= 14 && Math.random() < 0.12;

  const pipeColorMap = {
    sunset: {
      color: `hsl(${120 + Math.random() * 30}, 60%, 35%)`,
      cap: `hsl(${120 + Math.random() * 30}, 70%, 20%)`,
    },
    midnight: { color: "hsl(320, 75%, 45%)", cap: "hsl(280, 80%, 25%)" },
    rain: { color: "hsl(200, 55%, 35%)", cap: "hsl(200, 60%, 20%)" },
    aurora: { color: "hsl(150, 65%, 32%)", cap: "hsl(160, 70%, 18%)" },
  };
  const themeColors = pipeColorMap[state.theme] || pipeColorMap.sunset;

  const newPipe = {
    x: canvas.width + 30,
    topHeight,
    baseTopHeight: topHeight,
    passed: false,
    isMoving,
    movePhase: Math.random() * Math.PI * 2,
    color: themeColors.color,
    capColor: themeColors.cap,
    nearMissRecorded: false,
  };

  pipes.push(newPipe);
  pipeCounter++;

  // Spawn Feather Shield Bubble every 3 pipes if shield is inactive and no active shield bubbles exist
  if (
    pipeCounter % 3 === 0 &&
    !state.shieldActive &&
    !pipes.some((p) => p.shieldBubble)
  ) {
    newPipe.shieldBubble = {
      radius: 16,
      pulse: 0,
    };
  }
}

// ── Update Calculations ───────────────────────────────────────────
function updateBird() {
  const dt = state.dt;
  const easing = Math.min(1, 0.16 * dt);

  // Braking: Glide feather controls
  if (bird.isBraking && bird.velocity > 0) {
    bird.velocity *= Math.pow(0.78, dt);
  }

  // Diving overrides
  if (bird.isDiving) {
    bird.velocity = Math.min(bird.velocity + 0.16 * dt, state.terminalFall);
  }

  if (bird.isDiving && state.time - state.lastDiveToneAt > 10) {
    sfxDive();
    state.lastDiveToneAt = state.time;
  }

  if (
    bird.isBraking &&
    bird.velocity > 0.45 &&
    state.time - state.lastBrakeToneAt > 14
  ) {
    sfxBrake();
    state.lastBrakeToneAt = state.time;
  }

  const drag = bird.velocity < 0 ? 0.992 : 0.985;
  bird.velocity *= Math.pow(drag, dt);

  bird.velocity += state.gravity * dt;
  bird.velocity = Math.max(
    state.terminalRise,
    Math.min(bird.velocity, state.terminalFall),
  );
  bird.y += bird.velocity * dt;

  const targetRotation = Math.max(-0.42, Math.min(bird.velocity * 0.12, 0.34));
  bird.rotation += (targetRotation - bird.rotation) * easing;

  bird.wingAngle += 0.18 * bird.wingDir * dt;
  if (bird.wingAngle > 0.4 || bird.wingAngle < -0.4) bird.wingDir *= -1;

  bird.scaleX += (1 - bird.scaleX) * Math.min(1, 0.14 * dt);
  bird.scaleY += (1 - bird.scaleY) * Math.min(1, 0.14 * dt);

  // GC-Free trail: shifts values down the pre-allocated ring. Skipped entirely under
  // reduced motion (drawBirdTrail short-circuits there, so the work would be wasted).
  if (!state.reducedMotion) {
    for (let i = bird.trail.length - 1; i > 0; i--) {
      bird.trail[i].x = bird.trail[i - 1].x;
      bird.trail[i].y = bird.trail[i - 1].y;
      bird.trail[i].life = bird.trail[i - 1].life - dt;
    }
    bird.trail[0].x = bird.x;
    bird.trail[0].y = bird.y;
    bird.trail[0].life = 10;
  } else if (bird.trail[0] && bird.trail[0].life > 0) {
    // Reduced motion: zero out any residue so a toggle mid-run doesn't draw a stale trail.
    for (let i = 0; i < bird.trail.length; i++) bird.trail[i].life = 0;
  }

  // Eye tracking nearest obstacle columns
  const nearPipe = pipes.find((p) => p.x > bird.x - 20 && p.x < bird.x + 120);
  if (nearPipe) {
    const tx = nearPipe.x - bird.x;
    const gapCenter = nearPipe.topHeight + state.gap / 2;
    const ty = gapCenter - bird.y;
    const dist = Math.sqrt(tx * tx + ty * ty) || 1;
    bird.pupilOffsetX = (tx / dist) * 2;
    bird.pupilOffsetY = (ty / dist) * 1.5;
  } else {
    bird.pupilOffsetX *= 0.9;
    bird.pupilOffsetY *= 0.9;
  }

  // Invincibility frame timer decay
  if (state.isInvincible) {
    state.invincibilityTimer -= dt;
    if (state.invincibilityTimer <= 0) {
      state.isInvincible = false;
    }
  }
}

function updatePipes() {
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
      announce(`Score ${state.score}.`);
      sfxScore();
      bird.emotionTimer = 60;

      const scoreColorMap = {
        sunset: "#ffd700",
        midnight: "#38bdf8",
        rain: "#2dd4bf",
        aurora: "#a78bfa",
      };
      spawnParticles(
        bird.x,
        bird.y - 20,
        6,
        scoreColorMap[state.theme] || "#ffd700",
        3,
      );

      if (state.score % 6 === 0) {
        state.speedMultiplier = Math.min(
          state.maxSpeedMultiplier,
          state.speedMultiplier + 0.03,
        );
      }
    }
  }

  while (pipes.length && pipes[0].x + state.pipeWidth < -20) {
    pipes.shift();
  }
}

function updateShieldBubbles() {
  const dt = state.dt;
  for (const pipe of pipes) {
    if (!pipe.shieldBubble) continue;

    // Pulse animation
    pipe.shieldBubble.pulse += 0.05 * dt;

    // Bubble coordinates derived directly from the parent pipe!
    const bx = pipe.x + state.pipeWidth / 2;
    const by = pipe.topHeight + state.gap / 2;

    // Axis-aligned bounding-box intersection check.
    const dx = bird.x - bx;
    const dy = bird.y - by;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < bird.radius + pipe.shieldBubble.radius) {
      state.shieldActive = true;
      sfxShieldCollect();
      spawnParticles(bx, by, 18, "#ffd700", 4);
      pipe.shieldBubble = null;
      syncStatsAndAchievements(true); // Save collected shield count immediately
      announce("Feather Shield activated!");
    }
  }
}

function intersectsPipe(pipe) {
  const bL = bird.x - bird.radius + state.collisionInset;
  const bR = bird.x + bird.radius - state.collisionInset;
  const bT = bird.y - bird.radius + state.collisionInset;
  const bB = bird.y + bird.radius - state.collisionInset;
  const gapBottom = pipe.topHeight + state.gap;

  const inX = bR > pipe.x && bL < pipe.x + state.pipeWidth;
  return inX && (bT < pipe.topHeight || bB > gapBottom);
}

function checkCollisions() {
  if (bird.y + bird.radius >= ground.y) {
    bird.y = ground.y - bird.radius;
    gameOver();
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
        state.invincibilityTimer = 95; // 1.5 seconds at 60fps
        bird.velocity = -1.5; // soft upward pop
        sfxShieldPop();
        spawnParticles(bird.x, bird.y, 25, "#ffd700", 6);
        state.shieldsSavedCount++;
        syncStatsAndAchievements(true); // Save absorbed collision immediately
        announce("Feather Shield absorbed collision! Invincible.");
        return;
      } else if (state.isInvincible) {
        return;
      } else {
        gameOver();
        return;
      }
    }
  }

  // Near Miss calculations
  for (const pipe of pipes) {
    if (!pipe.passed && Math.abs(pipe.x - bird.x) < 40) {
      const gapBottom = pipe.topHeight + state.gap;
      if (
        (bird.y - bird.radius < pipe.topHeight + 10 &&
          bird.y - bird.radius > pipe.topHeight - 10) ||
        (bird.y + bird.radius > gapBottom - 10 &&
          bird.y + bird.radius < gapBottom + 10)
      ) {
        if (!pipe.nearMissRecorded) {
          pipe.nearMissRecorded = true;
          state.nearMissesCount++;
          syncStatsAndAchievements(true); // Save near misses immediately
        }
      }
    }
  }
}

function update() {
  if (state.phase !== "play" || state.paused) return;

  state.frames++;
  state.time += state.dt;
  state.hueShift = (state.hueShift + 0.08 * state.dt) % 360;

  // Zen minute calculations (Only update DOM labels, defer disk I/O)
  state.zenTimeSec += state.dt / 60;
  if (state.frames % 60 === 0) syncStatsAndAchievements(false);

  ground.offset =
    (ground.offset + state.pipeSpeed * state.speedMultiplier * state.dt) % 32;

  if (state.shakeAmount > 0) state.shakeAmount *= Math.pow(0.82, state.dt);

  updateBird();
  updateEmotion();
  updatePipes();
  updateShieldBubbles();
  spawnWeatherParticles();
  updateWeatherParticles();
  updateParticles();
  checkCollisions();
}

// ── Draw Functions ───────────────────────────────────────────────
function drawBackground() {
  const skyConfig = SKY_THEME_COLORS[state.theme] || SKY_THEME_COLORS.sunset;

  const hue = skyConfig.h1 + Math.sin(state.hueShift * 0.01) * 15;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, `hsl(${hue}, 80%, 72%)`);
  sky.addColorStop(0.6, `hsl(${hue + 10}, 70%, 82%)`);
  sky.addColorStop(1, `hsl(${hue + 20}, 60%, 90%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Aurora Shimmer veil
  drawAuroraBands();

  // Animated clouds
  ctx.fillStyle = `rgba(255,255,255,${skyConfig.cAlpha})`;
  const co = state.time * (state.reducedMotion ? 0.08 : 0.22);
  drawCloud(
    ((((70 - co * 0.2) % (canvas.width + 200)) + canvas.width + 200) %
      (canvas.width + 200)) -
      60,
    100,
    28,
  );
  drawCloud(
    ((((285 - co * 0.15) % (canvas.width + 200)) + canvas.width + 200) %
      (canvas.width + 200)) -
      60,
    150,
    22,
  );
  drawCloud(
    ((((460 - co * 0.25) % (canvas.width + 200)) + canvas.width + 200) %
      (canvas.width + 200)) -
      60,
    70,
    20,
  );
  drawCloud(
    ((((180 - co * 0.1) % (canvas.width + 200)) + canvas.width + 200) %
      (canvas.width + 200)) -
      60,
    190,
    16,
  );

  // Stars at high score or Cyber Mode
  if (state.score >= 10 || state.theme === "midnight") {
    for (let i = 0; i < 5; i++) {
      const sx = (i * 97 + state.time * 0.5) % canvas.width;
      const sy = 30 + ((i * 53 + state.time * 0.3) % 120);
      const tw = 0.3 + 0.4 * Math.sin(state.time * 0.1 + i);
      ctx.globalAlpha = tw;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + size, y - size * 0.45, size * 0.85, Math.PI, 0);
  ctx.arc(x + size * 2, y, size * 0.95, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawPipes() {
  for (const pipe of pipes) {
    const gapBottom = pipe.topHeight + state.gap;
    drawPipe(pipe.x, 0, pipe.topHeight, true, pipe);
    drawPipe(pipe.x, gapBottom, ground.y - gapBottom, false, pipe);
  }
}

function drawPipe(x, y, height, isTop, pipe) {
  if (height <= 0) return;

  const grad = ctx.createLinearGradient(x, y, x + state.pipeWidth, y);
  grad.addColorStop(0, pipe.color);

  const hueValue = getPipeScoreHue(state.theme, state.score);
  grad.addColorStop(0.4, `hsl(${hueValue}, 60%, 48%)`);
  grad.addColorStop(1, pipe.capColor);

  ctx.fillStyle = grad;
  ctx.fillRect(x, y, state.pipeWidth, height);

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + 10, y + 4, 8, Math.max(0, height - 8));

  // Cap
  const capH = 20;
  const capY = isTop ? y + height - capH : y;
  ctx.fillStyle = pipe.capColor;
  ctx.fillRect(x - 4, capY, state.pipeWidth + 8, capH);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x - 2, capY + 2, state.pipeWidth + 4, 4);

  if (pipe.isMoving) {
    ctx.fillStyle = "rgba(255, 100, 100, 0.6)";
    ctx.beginPath();
    ctx.arc(x + state.pipeWidth / 2, capY + capH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGround() {
  const gConfig =
    GROUND_THEME_COLORS[state.theme] || GROUND_THEME_COLORS.sunset;

  ctx.fillStyle = gConfig.sand;
  ctx.fillRect(0, ground.y, canvas.width, ground.height);

  // Grass strip
  const grassGrad = ctx.createLinearGradient(0, ground.y, 0, ground.y + 14);
  grassGrad.addColorStop(0, gConfig.grass1);
  grassGrad.addColorStop(1, gConfig.grass2);
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, ground.y, canvas.width, 14);

  // Ground dirt stripes
  ctx.fillStyle = gConfig.dirt;
  for (let i = -32; i < canvas.width + 64; i += 32) {
    const ox = i - ground.offset;
    ctx.fillRect(ox, ground.y + 22, 16, 8);
    ctx.fillRect(ox + 14, ground.y + 42, 12, 8);
  }
}

function drawBirdTrail() {
  if (state.reducedMotion) return;

  for (const t of bird.trail) {
    if (t.life <= 0) continue;
    const alpha = t.life / 10;
    ctx.globalAlpha = alpha * 0.25;

    let trailColor = "#ffe680";
    if (bird.emotion === "happy") trailColor = "#ffd700";
    if (bird.emotion === "scared") trailColor = "#ff9999";
    if (state.theme === "midnight") trailColor = "#c084fc";
    if (state.theme === "rain") trailColor = "#94a3b8";

    ctx.fillStyle = trailColor;
    ctx.beginPath();
    ctx.arc(t.x, t.y, bird.radius * 0.5 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBird() {
  ctx.save();

  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  ctx.scale(bird.scaleX, bird.scaleY);

  const r = bird.radius;

  // Invincibility visual frames flash
  if (state.isInvincible) {
    ctx.globalAlpha = 0.45 + Math.sin(state.time * 0.35) * 0.35;
  }

  // Theme bird color overrides loaded from global zero-GC constants
  const themeColors =
    BIRD_THEME_COLORS[state.theme] || BIRD_THEME_COLORS.sunset;

  let bodyColor = themeColors.calm;
  let bodyHL = themeColors.hl;

  if (bird.emotion === "happy") {
    bodyColor = themeColors.happy;
  }
  if (bird.emotion === "scared") {
    bodyColor = themeColors.scared;
  }
  if (bird.emotion === "determined") {
    bodyColor = themeColors.determined;
  }
  if (bird.emotion === "dizzy") {
    bodyColor = themeColors.dizzy;
  }

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.arc(2, 3, r, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = bodyHL;
  ctx.beginPath();
  ctx.arc(-4, -6, r * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  ctx.save();
  ctx.translate(-4, 4);
  ctx.rotate(bird.wingAngle);
  ctx.fillStyle = themeColors.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eye white
  const eyeX = 6,
    eyeY = -6;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Pupil
  let pupilR = 3.5;
  if (bird.emotion === "scared") pupilR = 4.5;
  if (bird.emotion === "dizzy") pupilR = 2.5;
  if (bird.emotion === "determined") pupilR = 3;

  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(
    eyeX + bird.pupilOffsetX,
    eyeY + bird.pupilOffsetY,
    pupilR,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Pupil highlight
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(
    eyeX + bird.pupilOffsetX + 1,
    eyeY + bird.pupilOffsetY - 1,
    1.2,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  // Eyebrow (emotion-driven)
  ctx.strokeStyle = "#664400";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (bird.emotion === "scared") {
    ctx.moveTo(eyeX - 6, eyeY - 10);
    ctx.lineTo(eyeX + 4, eyeY - 12);
  } else if (bird.emotion === "determined") {
    ctx.moveTo(eyeX - 6, eyeY - 12);
    ctx.lineTo(eyeX + 4, eyeY - 8);
  } else if (bird.emotion === "dizzy") {
    ctx.moveTo(eyeX - 5, eyeY - 10);
    ctx.quadraticCurveTo(eyeX, eyeY - 13, eyeX + 5, eyeY - 10);
  } else {
    ctx.moveTo(eyeX - 5, eyeY - 10);
    ctx.lineTo(eyeX + 5, eyeY - 10);
  }
  ctx.stroke();

  // Blush
  if (bird.blush > 0) {
    ctx.fillStyle = `rgba(255, 120, 120, ${bird.blush * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(-6, 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Beak
  ctx.fillStyle = themeColors.beak;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(26, 4);
  ctx.lineTo(14, 9);
  ctx.closePath();
  ctx.fill();

  // Smile
  if (bird.emotion === "happy") {
    ctx.strokeStyle = "#ff6b1d";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(14, 6, 5, 0, Math.PI * 0.8);
    ctx.stroke();
  }

  // Dizzy swirls
  if (bird.emotion === "dizzy") {
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 1.5;
    for (let s = 0; s < 2; s++) {
      const angle = state.time * 0.15 + s * Math.PI;
      const sx = Math.cos(angle) * 22;
      const sy = Math.sin(angle) * 22 - 8;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1.0;
}

function drawShieldBubbles() {
  for (const pipe of pipes) {
    if (!pipe.shieldBubble) continue;
    const b = pipe.shieldBubble;
    const bx = pipe.x + state.pipeWidth / 2;
    const by = pipe.topHeight + state.gap / 2;
    const pulseR = b.radius + Math.sin(b.pulse) * 3;

    ctx.save();
    const grad = ctx.createRadialGradient(bx, by, 2, bx, by, pulseR);
    grad.addColorStop(0, "rgba(255, 235, 120, 0.85)");
    grad.addColorStop(0.6, "rgba(255, 215, 0, 0.45)");
    grad.addColorStop(1, "rgba(255, 215, 0, 0.05)");
    ctx.fillStyle = grad;

    ctx.shadowColor = "#ffd700";
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(bx, by, pulseR, 0, Math.PI * 2);
    ctx.fill();

    // Draw golden feather icon inside bubble
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🛡️", bx, by);
    ctx.restore();
  }
}

function drawBirdShield() {
  if (!state.shieldActive) return;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(state.time * 0.04);

  ctx.strokeStyle = "rgba(255, 215, 0, 0.65)";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(0, 0, bird.radius + 12, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating energy nodes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(bird.radius + 12, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawScore() {
  const glowColor =
    bird.emotion === "happy"
      ? "#ffd700"
      : bird.emotion === "determined"
        ? "#ff8800"
        : "#ffffff";

  ctx.fillStyle = glowColor;
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 5;
  ctx.font =
    "bold 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.strokeText(String(state.score), canvas.width / 2, 65);
  ctx.fillText(String(state.score), canvas.width / 2, 65);

  if (state.phase === "play") {
    ctx.font = "13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    const emo = {
      calm: "😌",
      happy: "😄",
      scared: "😰",
      determined: "😎",
      dizzy: "😵",
    };
    ctx.fillText(emo[bird.emotion] || "", canvas.width / 2, 85);
  }
}

function drawPanel(title, subtitle, extra) {
  const pw = 300,
    ph = 190;
  const px = (canvas.width - pw) / 2,
    py = 170;

  ctx.fillStyle = "rgba(12, 20, 35, 0.85)";
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  roundRect(px, py, pw, ph, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font =
    "bold 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(title, canvas.width / 2, py + 44);

  ctx.font = "17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  wrapText(subtitle, canvas.width / 2, py + 80, 250, 22);

  ctx.font =
    "bold 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillStyle = "#ffd24d";
  ctx.fillText(`Best: ${state.best}`, canvas.width / 2, py + 135);

  if (extra) {
    ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    wrapText(extra, canvas.width / 2, py + 158, 248, 15);
  }
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, currentY);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Main Render & Loop ───────────────────────────────────────────
function draw() {
  ctx.save();

  if (!state.reducedMotion && state.shakeAmount > 0.5) {
    ctx.translate(
      (Math.random() - 0.5) * state.shakeAmount,
      (Math.random() - 0.5) * state.shakeAmount,
    );
  }

  drawBackground();
  drawPipes();
  drawShieldBubbles();
  drawGround();
  drawBirdTrail();
  drawBird();
  drawBirdShield();
  drawWeatherParticles();
  drawParticles();
  drawScore();

  ctx.restore();

  if (state.phase === "start") {
    drawPanel(
      "Ready to glide?",
      "Gentle physics, bigger gaps, slower pacing. Press Space, click, or tap whenever you are ready.",
      "Esc Pause • M Mute • R Restart",
    );
  } else if (state.paused) {
    drawPanel(
      "Paused",
      "Take a breath. Resume whenever you like.",
      "Esc or the Pause button resumes • M toggles sound",
    );
  } else if (state.phase === "gameOver") {
    drawPanel(
      "Soft landing?",
      `Score: ${state.score}. Tap or press Space to try another calm run.`,
      "Esc Pause • M Mute • R Restart",
    );
  }
}

function loop(timestamp = performance.now()) {
  if (state.lastTimestamp === 0) state.lastTimestamp = timestamp;
  const rawDt = (timestamp - state.lastTimestamp) / 16.667;
  state.dt = rawDt > 0 ? Math.min(rawDt, 3) : 1;
  state.lastTimestamp = timestamp;

  try {
    update();
    draw();
  } catch (err) {
    console.error("[Flappy] Frame error:", err);
  }

  // Bobbing animation on start
  if (state.phase === "start") {
    bird.y = canvas.height / 2 + Math.sin(timestamp * 0.0025) * 10;
  }

  requestAnimationFrame(loop);
}

// ── Input Handling ───────────────────────────────────────────────
function handleAction(event) {
  event?.preventDefault?.();
  if (state.audioEnabled) ensureAudio();

  if (state.paused) {
    togglePause(false);
    return;
  }

  if (state.phase === "gameOver") {
    startGame();
    return;
  }
  if (state.phase === "start") {
    startGame();
    return;
  }
  doFlap();
}

function isDrawerOpen() {
  return Boolean(dom.customizerDrawer?.classList.contains("open"));
}

function setCustomizerOpen(isOpen, restoreFocus = true) {
  if (!dom.customizerDrawer) return;

  dom.customizerDrawer.classList.toggle("open", isOpen);
  dom.customizerDrawer.setAttribute("aria-hidden", String(!isOpen));

  if (isOpen) {
    dom.customizerDrawer.removeAttribute("inert");
  } else {
    dom.customizerDrawer.setAttribute("inert", "");
  }

  try {
    dom.customizerDrawer.inert = !isOpen;
  } catch {
    /* inert property unsupported */
  }

  dom.drawerToggle?.setAttribute("aria-expanded", String(isOpen));
  dom.drawerToggle?.setAttribute("aria-pressed", String(isOpen));

  if (isOpen && state.phase === "play" && !state.paused) {
    togglePause(true);
  }

  if (restoreFocus) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (isOpen) dom.customizerDrawer?.focus({ preventScroll: true });
        else dom.drawerToggle?.focus();
      }, 0);
    });
  }
}

function applyTheme(theme) {
  const nextTheme = THEMES.includes(theme) ? theme : "sunset";

  document.body.classList.remove(...THEMES.map((name) => `theme-${name}`));
  document.body.classList.add(`theme-${nextTheme}`);

  dom.themeBtns.forEach((btn) => {
    const isActive = btn.getAttribute("data-theme") === nextTheme;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

function shouldIgnoreGlobalShortcut(event) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (dom.customizerDrawer?.contains(target)) return true;
  return (
    Boolean(
      target.closest(
        'button, input, select, textarea, [contenteditable="true"], [role="slider"]',
      ),
    ) && target !== canvas
  );
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;

  if (e.code === "Escape") {
    if (isDrawerOpen()) {
      setCustomizerOpen(false);
    } else {
      togglePause();
    }
    return;
  }

  if (shouldIgnoreGlobalShortcut(e)) return;
  if (isDrawerOpen()) return;

  heldKeys.add(e.code);

  // Block default viewport scrolling for crucial action keys
  if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) {
    e.preventDefault();
  }

  if (e.code === "KeyM") {
    toggleMute();
    return;
  }

  if (e.code === "KeyR") {
    restartRun();
    return;
  }

  if (e.code === "Space" || e.code === "ArrowUp") handleAction(e);

  if (state.phase !== "play" || state.paused) return;

  if (e.code === "ArrowDown") bird.isDiving = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") bird.isBraking = true;
});

window.addEventListener("keyup", (e) => {
  heldKeys.delete(e.code);
  if (e.code === "ArrowDown") bird.isDiving = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") bird.isBraking = false;
});

canvas.addEventListener("pointerdown", handleAction, { passive: false });

function pauseForPageLifecycle() {
  // Held keys may never get a matching keyup when focus is lost. Clear the tracking
  // set so a stale "held" state can't get re-applied on the next restart/resume.
  heldKeys.clear();
  bird.isBraking = false;
  bird.isDiving = false;
  if (state.phase === "play" && !state.paused) {
    togglePause(true);
  } else {
    syncUiState();
  }
}

window.addEventListener("blur", pauseForPageLifecycle);

// ── Customizer & Drawer Control Bindings ──────────────────────────
function bindDrawerControls() {
  // Sync initial loaded state from localStorage to customizer DOM controls
  if (dom.gravitySlider) {
    dom.gravitySlider.value = String(state.gravitySetting);
    if (dom.gravityVal)
      dom.gravityVal.textContent = GRAVITY_LABELS[state.gravitySetting];
  }
  if (dom.speedSlider) {
    dom.speedSlider.value = String(state.speedSetting);
    if (dom.speedVal)
      dom.speedVal.textContent = SPEED_LABELS[state.speedSetting];
  }
  if (dom.musicVolumeSlider) {
    dom.musicVolumeSlider.value = String(Math.round(state.musicVolume * 100));
    if (dom.musicVolumeVal)
      dom.musicVolumeVal.textContent = `${Math.round(state.musicVolume * 100)}%`;
  }
  if (dom.sfxVolumeSlider) {
    dom.sfxVolumeSlider.value = String(Math.round(state.sfxVolume * 100));
    if (dom.sfxVolumeVal)
      dom.sfxVolumeVal.textContent = `${Math.round(state.sfxVolume * 100)}%`;
  }

  // Apply initial theme styles on body and mark button as active.
  applyTheme(state.theme);
  setCustomizerOpen(false, false);

  dom.drawerToggle?.addEventListener("click", () => {
    setCustomizerOpen(!isDrawerOpen());
  });

  dom.drawerClose?.addEventListener("click", () => {
    setCustomizerOpen(false);
  });

  // Physics Overseer Sliders
  dom.gravitySlider?.addEventListener("input", (e) => {
    state.gravitySetting = Math.round(
      clampNumber(Number(e.target.value), 2, 1, 4),
    );
    if (dom.gravityVal)
      dom.gravityVal.textContent = GRAVITY_LABELS[state.gravitySetting];
    updateDerivedPhysics();
    writeStoredValue("flappy-gravity", state.gravitySetting);
  });

  dom.speedSlider?.addEventListener("input", (e) => {
    state.speedSetting = Math.round(
      clampNumber(Number(e.target.value), 2, 1, 4),
    );
    if (dom.speedVal)
      dom.speedVal.textContent = SPEED_LABELS[state.speedSetting];
    updateDerivedPhysics();
    writeStoredValue("flappy-speed", state.speedSetting);
  });

  // Volume Overseer Sliders
  dom.musicVolumeSlider?.addEventListener("input", (e) => {
    const percent = Math.round(clampNumber(Number(e.target.value), 60, 0, 100));
    state.musicVolume = percent / 100;
    if (dom.musicVolumeVal) dom.musicVolumeVal.textContent = `${percent}%`;
    if (state.phase === "play" && !state.paused) startMusic();
    writeStoredValue("flappy-music-volume", state.musicVolume);
  });

  dom.sfxVolumeSlider?.addEventListener("input", (e) => {
    const percent = Math.round(clampNumber(Number(e.target.value), 80, 0, 100));
    state.sfxVolume = percent / 100;
    if (dom.sfxVolumeVal) dom.sfxVolumeVal.textContent = `${percent}%`;
    writeStoredValue("flappy-sfx-volume", state.sfxVolume);
  });

  // Dynamic Theme Cluster Buttons
  dom.themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const prevTheme = state.theme;
      const requestedTheme = btn.getAttribute("data-theme");
      state.theme = THEMES.includes(requestedTheme) ? requestedTheme : "sunset";

      applyTheme(state.theme);

      state.playedThemes.add(state.theme);
      syncStatsAndAchievements(true); // Save to disk immediately

      writeStoredValue("flappy-theme", state.theme);

      if (state.theme !== prevTheme) {
        activeWeather.length = 0;
        for (const p of weatherPool) p.active = false;
        if (state.phase === "play" && !state.paused) {
          startMusic();
        }
        playTone(523, 0.12, "sine", 0.08);
        setTimeout(() => playTone(659, 0.15, "sine", 0.06), 80);
      }
    });
  });
}

// ── Kick Off Game Engine ──────────────────────────────────────────
resetGame();
updateDerivedPhysics();
bindDrawerControls();
syncUiState();

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
} else if (typeof reducedMotionQuery.addListener === "function") {
  reducedMotionQuery.addListener(handleReducedMotionChange);
}

dom.pauseToggle?.addEventListener("click", () => togglePause());
dom.muteToggle?.addEventListener("click", () => toggleMute());
dom.restartButton?.addEventListener("click", () => restartRun());

// Secure final stats on tab unload or page transition
window.addEventListener("beforeunload", () => {
  syncStatsAndAchievements(true);
});

// Hidden tabs pause through the same idempotent path as focus loss. Persistence is
// throttled so rapid tab switching cannot spam localStorage.
let lastVisibilitySync = 0;
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  pauseForPageLifecycle();
  const now = Date.now();
  if (now - lastVisibilitySync > 250) {
    syncStatsAndAchievements(true);
    lastVisibilitySync = now;
  }
});

requestAnimationFrame(loop);
