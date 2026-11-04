/** Mutable world, theme tables, and the fixed-step render blend factor. */
import { CONFIG, SETTING_LEVELS, THEMES } from './config.js';
import {
  SK,
  readPlayedThemes,
  readScoreHistory,
  readStoredBool,
  readStoredChoice,
  readStoredLevel,
  readStoredNumber,
  readUnlockedAchievements,
} from './storage.js';

export const state = {
  phase: 'start', // 'start' | 'play' | 'gameOver'
  score: 0,
  best: readStoredNumber(SK.best, 0, 0),
  frames: 0,
  time: 0, // 60-fps-normalized accumulated dt
  elapsedSec: 0, // wall-clock seconds since boot (resets on game start)
  runSec: 0, // wall-clock seconds in current run

  // Customizer
  theme: readStoredChoice(SK.theme, THEMES, 'sunset'),
  gravitySetting: readStoredLevel(SK.gravity, 2),
  speedSetting: readStoredLevel(SK.speed, 2),
  musicVolume: readStoredNumber(SK.musicVolume, 0.6, 0, 1),
  sfxVolume: readStoredNumber(SK.sfxVolume, 0.8, 0, 1),
  dailySeedMode: readStoredBool(SK.dailySeed, false),
  showFps: readStoredBool(SK.fps, false),

  // Derived physics
  gravity: 0.052,
  flap: -2.35,
  terminalRise: -2.75,
  terminalFall: 2.35,
  pipeSpeed: 1.15,
  gap: CONFIG.PIPE_GAP,
  pipeWidth: CONFIG.PIPE_WIDTH,
  pipeSpawnTimer: 0,
  pipeSpawnInterval: 170,
  speedMultiplier: 1.0,
  maxSpeedMultiplier: CONFIG.PIPE_MAX_SPEED_MULT,

  paused: false,
  postcardMode: false,
  audioEnabled: true,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  reducedTransparency: window.matchMedia('(prefers-reduced-transparency: reduce)').matches,

  // Run timers
  lastDiveAtSec: -1e9,
  lastBrakeAtSec: -1e9,
  lastScoreAnnounceAt: -1e9,
  lastStatsSyncAtSec: 0,

  // Effects
  shakeAmount: 0,
  hueShift: 0,
  newBestFlash: 0, // counts seconds remaining
  nearMissFlash: 0,
  calmMeter: 0,

  // Delta time
  lastTimestamp: 0,
  dt: 1.0,
  dtSec: 1 / 60,
  clockReady: false,

  // Shield + invuln
  shieldActive: false,
  isInvincible: false,
  invincibilityTimer: 0,

  // Persistent stats
  zenTimeSec: readStoredNumber(SK.zenTime, 0, 0),
  shieldsSavedCount: readStoredNumber(SK.shieldsSaved, 0, 0),
  runsCount: readStoredNumber(SK.runs, 0, 0),
  nearMissesCount: readStoredNumber(SK.nearMisses, 0, 0),
  longestSurvivalSec: readStoredNumber(SK.longest, 0, 0),
  currentStreak: readStoredNumber(SK.streak, 0, 0),
  // Calendar-day streak bookkeeping: YYYYMMDD of the last day a run ended.
  lastPlayedDay: readStoredNumber(SK.lastPlayedDay, 0, 0),
  playedThemes: readPlayedThemes(),
  scoreHistory: readScoreHistory(),
  unlockedAchievements: readUnlockedAchievements(),

  // Run-scoped counters (reset per run)
  brakeUseCount: 0,
  diveUseCount: 0,
  runNearMisses: 0,

  // Game over / new best
  isNewBest: false,

  // Afterglow — the quiet, beautiful reflection after a meaningful flight
  // (short graceful pause that makes the end of a good run feel special)
  afterglowActive: false,
  afterglowTimer: 0,
  afterglowReflection: '',
  afterglowShieldUsed: false,
  afterglowBrakeHeavy: false,
};

/** Convert level settings into actual physics constants. */
export function updateDerivedPhysics() {
  if (!SETTING_LEVELS.includes(state.gravitySetting)) state.gravitySetting = 2;
  if (!SETTING_LEVELS.includes(state.speedSetting)) state.speedSetting = 2;
  state.gravity = CONFIG.GRAVITY_MAP[state.gravitySetting];
  state.flap = CONFIG.FLAP_MAP[state.gravitySetting];
  state.pipeSpeed = CONFIG.SPEED_MAP[state.speedSetting];
  state.pipeSpawnInterval = CONFIG.SPAWN_INTERVAL_MAP[state.speedSetting];
}

// Held-key tracking (modifier survival across restarts)
export const heldKeys = new Set();

export const control = {
  touchBrake: false,
  touchDive: false,
  padBrake: false,
  padDive: false,
  scriptBrake: false,
  scriptDive: false,
};

export const view = { alpha: 1 };

export const sim = {
  pipeCounter: 0,
  nearestPipeCache: /** @type {any} */ (null),
};


// ─── 7. THEME TABLES (consolidated) ────────────────────────────────
export const THEME_TABLE = Object.freeze({
  sunset: {
    bird: {
      calm: '#ffd44f',
      happy: '#ffdd44',
      scared: '#ffcc44',
      determined: '#ffaa22',
      dizzy: '#ddbb44',
      beak: '#ff8b2d',
      hl: '#ffe680',
      shadow: '#f2b638',
    },
    ground: { sand: '#c8a24c', grass1: '#5cb85c', grass2: '#3d8b3d', dirt: '#a6893a' },
    sky: { h1: 195, h2: 215, cAlpha: 0.55 },
    pipe: { hue: 130, cap: 70 },
    trail: '#ffe680',
    flapParticle: '#ffe680',
    scoreParticle: '#ffd700',
  },
  midnight: {
    bird: {
      calm: '#f472b6',
      happy: '#ff77cc',
      scared: '#c084fc',
      determined: '#ec4899',
      dizzy: '#a21caf',
      beak: '#38bdf8',
      hl: '#fbcfe8',
      shadow: '#db2777',
    },
    ground: { sand: '#1e0b36', grass1: '#ec4899', grass2: '#9d174d', dirt: '#3c0d63' },
    sky: { h1: 240, h2: 260, cAlpha: 0.15 },
    pipe: { hue: 320, cap: 280 },
    trail: '#c084fc',
    flapParticle: '#f472b6',
    scoreParticle: '#38bdf8',
  },
  rain: {
    bird: {
      calm: '#94a3b8',
      happy: '#38bdf8',
      scared: '#475569',
      determined: '#1e293b',
      dizzy: '#64748b',
      beak: '#2dd4bf',
      hl: '#cbd5e1',
      shadow: '#475569',
    },
    ground: { sand: '#475569', grass1: '#64748b', grass2: '#334155', dirt: '#1e293b' },
    sky: { h1: 205, h2: 220, cAlpha: 0.25 },
    pipe: { hue: 200, cap: 200 },
    trail: '#94a3b8',
    flapParticle: '#cbd5e1',
    scoreParticle: '#2dd4bf',
  },
  aurora: {
    bird: {
      calm: '#4ade80',
      happy: '#a78bfa',
      scared: '#10b981',
      determined: '#047857',
      dizzy: '#34d399',
      beak: '#facc15',
      hl: '#bbf7d0',
      shadow: '#059669',
    },
    ground: { sand: '#0c2e26', grass1: '#10b981', grass2: '#047857', dirt: '#064e3b' },
    sky: { h1: 165, h2: 185, cAlpha: 0.2 },
    pipe: { hue: 150, cap: 160 },
    trail: '#4ade80',
    flapParticle: '#4ade80',
    scoreParticle: '#a78bfa',
  },
  meadow: {
    bird: {
      calm: '#f4d35e',
      happy: '#f9c74f',
      scared: '#e8b923',
      determined: '#d4a017',
      dizzy: '#c9a227',
      beak: '#e07a3d',
      hl: '#fff3b0',
      shadow: '#d4a017',
    },
    ground: { sand: '#d4a373', grass1: '#588157', grass2: '#3a5a40', dirt: '#a67c52' },
    sky: { h1: 85, h2: 105, cAlpha: 0.35 },
    pipe: { hue: 95, cap: 75 },
    trail: '#f4d35e',
    flapParticle: '#f9c74f',
    scoreParticle: '#81b29a',
  },
});

export function getTheme() {
  return THEME_TABLE[state.theme] || THEME_TABLE.sunset;
}

export function getPipeScoreHue(score) {
  return (getTheme().pipe.hue + score * 3) % 360;
}

// ─── 8. SPRITE CACHE (offscreen canvases) ──────────────────────────
export const bird = {
  x: /** @type {number} */ (CONFIG.BIRD_X), // widen from the frozen literal so postcard mode can reposition
  y: CONFIG.CANVAS_H / 2,
  prevY: CONFIG.CANVAS_H / 2,
  prevRotation: 0,
  radius: CONFIG.BIRD_RADIUS,
  velocity: 0,
  rotation: 0,
  emotion: 'calm',
  emotionTimer: 0,
  wingAngle: 0,
  wingDir: 1,
  scaleX: 1,
  scaleY: 1,
  /** @type {{x:number,y:number,life:number}[]} */
  trail: [],
  isBraking: false,
  isDiving: false,
  blush: 0,
  pupilOffsetX: 0,
  pupilOffsetY: 0,
  pupilDilate: 0, // 0..1 transient expansion on flap
  breath: 0, // living bird subtle breathing scale offset (calm glide only)
};

// Pre-allocate trail once.
for (let i = 0; i < CONFIG.BIRD_TRAIL_LEN; i++) {
  bird.trail.push({ x: 0, y: 0, life: 0 });
}

export const ground = {
  y: CONFIG.CANVAS_H - CONFIG.GROUND_HEIGHT,
  height: CONFIG.GROUND_HEIGHT,
  offset: 0,
  prevOffset: 0,
};

/** @type {Array<{x:number,prevX?:number,topHeight:number,baseTopHeight:number,passed:boolean,isMoving:boolean,movePhase:number,color:string,capColor:string,nearMissRecorded:boolean,shieldBubble?:{radius:number,pulse:number}|null,_hue?:number,_grad?:CanvasGradient}>} */
export const pipes = [];


// Particle / weather pools
/** @type {Array<any>} */
export const particlePool = [];
/** @type {Array<any>} */
export const activeParticles = [];
/** @type {Array<any>} */
export const weatherPool = [];
/** @type {Array<any>} */
export const activeWeather = [];
