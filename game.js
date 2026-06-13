'use strict';

// ═══════════════════════════════════════════════════════════════════
// GLIDIEBIRDIE (v3.0.0) — a calm, one-tap arcade flyer.
// Single-file engine. Zero dependencies. Mobile-first browser game. MIT licensed.
//
// Section index:
//    1. CONFIG          — all tunable constants
//    2. DOM             — element cache + DPR-aware canvas
//    3. RNG             — seeded random (for daily-seed mode)
//    4. STORAGE         — guarded localStorage helpers
//    5. AUDIO           — Web Audio engine (master gain, reverb, fade,
//                          audio-clock SFX, lowpass)
//    6. STATE           — runtime mutable state
//    7. THEME TABLES    — consolidated palette + music
//    8. SPRITE CACHE    — offscreen-cached sky, clouds, bird
//    9. WORLD           — bird, ground, pipes, pools
//   10. PHYSICS         — bird, pipes, particles, weather, collisions
//   11. RENDER          — frame composition
//   12. UI              — toolbar, mobile controls, drawer, tutorial,
//                          focus trap, fullscreen, haptics
//   13. STATS           — persistent statistics, throttled persistence
//   14. ACHIEVEMENTS    — expanded milestone tracking + progress display
//   15. LIFECYCLE       — reset, start, restart, pause, mute, gameover
//   16. INPUT           — keyboard, pointer, mobile bar, gestures
//   17. LIFECYCLE EVENTS— resize, orientationchange, visibility, blur
//   18. OFFLINE SHELL   — service-worker registration
//   19. CUSTOMIZER      — drawer controls and settings
//   20. LOOP            — main animation loop with error rate-limit
//   21. BOOT            — initial setup
// ═══════════════════════════════════════════════════════════════════

// ─── 1. CONFIG ────────────────────────────────────────────────────
const CONFIG = Object.freeze({
  // Canvas (logical/CSS pixels; DPR-scaled internally)
  CANVAS_W: 420,
  CANVAS_H: 640,

  // Frame timing
  FRAME_MS_60: 1000 / 60,
  DT_MAX: 3, // cap to avoid tunneling after lag spike

  // Bird
  BIRD_X: 112,
  BIRD_RADIUS: 18,
  BIRD_TRAIL_LEN: 10,
  BIRD_TRAIL_LIFE: 10,

  // Ground
  GROUND_HEIGHT: 80,

  // Pipes
  PIPE_WIDTH: 72,
  PIPE_GAP: 184,
  PIPE_MIN_TOP: 80,
  PIPE_SCORE_FOR_MOVING: 14,
  PIPE_MOVING_CHANCE: 0.12,
  PIPE_MAX_SPEED_MULT: 1.18,

  // Shield
  SHIELD_INTERVAL: 3, // every Nth pipe
  SHIELD_RADIUS: 16,
  SHIELD_PICKUP_BONUS: 4, // extra grab radius
  SHIELD_INVINCIBILITY_SEC: 1.5,
  SHIELD_POP_VELOCITY: -1.5,

  // Emotion
  EMOTION_HOLD_SEC: 1.0,
  EMOTION_SCARED_VELOCITY: 1.65,
  EMOTION_DETERMINED_SCORE: 8,
  EMOTION_HAPPY_SCORE_STEP: 5,
  EMOTION_PIPE_PROXIMITY: 40,

  // SFX cooldowns (seconds)
  SFX_DIVE_COOLDOWN_SEC: 0.17,
  SFX_BRAKE_COOLDOWN_SEC: 0.23,

  // Near-miss detection
  NEAR_MISS_X_WINDOW: 40,
  NEAR_MISS_Y_BAND: 12,

  // Stats
  STATS_SYNC_INTERVAL_SEC: 1.0,
  VISIBILITY_SYNC_INTERVAL_MS: 250,
  SCORE_ANNOUNCE_EVERY: 5,

  // Particle pools
  PARTICLE_POOL: 220,
  WEATHER_POOL: 140,

  // Object lookups (level → physics)
  GRAVITY_MAP: { 1: 0.038, 2: 0.052, 3: 0.066, 4: 0.082 },
  FLAP_MAP: { 1: -2.15, 2: -2.35, 3: -2.55, 4: -2.75 },
  SPEED_MAP: { 1: 0.85, 2: 1.15, 3: 1.35, 4: 1.65 },
  SPAWN_INTERVAL_MAP: { 1: 220, 2: 170, 3: 148, 4: 120 },

  // Audio
  AUDIO_MASTER_TARGET_DB: 0,
  MUSIC_LOOKAHEAD: 0.1,
  MUSIC_TICK_MS: 25,
  MUSIC_FADE_SEC: 0.4,
  REVERB_SECONDS: 2.0,
  REVERB_DECAY: 2.4,
  REVERB_MIX: 0.18,

  // Error rate limiting
  FRAME_ERROR_BURST_LIMIT: 8,
  FRAME_ERROR_COOLDOWN_SEC: 3,

  // Meadow "Golden Light" — soft godrays / sunbeams for signature calm delight (v2.2)
  MEADOW_LIGHT_COUNT: 3,
  MEADOW_LIGHT_ALPHA: 0.055,
  MEADOW_LIGHT_WAVE_SPEED: 0.012,
  MEADOW_LIGHT_VERTICAL: 0.18,

  // Living breath flecks — subtle serene atmosphere only when calmly gliding
  CALM_BREATH_PARTICLE_CHANCE: 0.009,
  CALM_BREATH_PARTICLE_COUNT: 1,
  CALM_BREATH_SPREAD: 0.7,

  // Sunset golden motes — warm drifting dust for theme parity
  SUNSET_MOTE_CHANCE: 0.06,
  SUNSET_MOTE_ALPHA: 0.28,
});

const THEMES = Object.freeze(['sunset', 'midnight', 'rain', 'aurora', 'meadow']);
const SETTING_LEVELS = Object.freeze([1, 2, 3, 4]);
const GRAVITY_LABELS = Object.freeze({ 1: 'Ultra-Light', 2: 'Calm', 3: 'Normal', 4: 'Heavy' });
const SPEED_LABELS = Object.freeze({ 1: 'Breeze', 2: 'Chill', 3: 'Cruise', 4: 'Swift' });

// ─── 2. DOM + DPR-AWARE CANVAS ────────────────────────────────────
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const ctx = canvas?.getContext('2d');
if (!canvas || !ctx) throw new Error('Canvas element #game not found or 2D context unavailable.');

/** @returns {number} */
function getDPR() {
  return Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
}

let activeDPR = 1;
function configureCanvasForDPR() {
  activeDPR = getDPR();
  canvas.width = Math.round(CONFIG.CANVAS_W * activeDPR);
  canvas.height = Math.round(CONFIG.CANVAS_H * activeDPR);
  ctx.setTransform(activeDPR, 0, 0, activeDPR, 0, 0);
  // CSS sizing already declares aspect-ratio + width: 100% via style.css.
  rebuildSpriteCaches();
}

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedTransparencyQuery =
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-transparency: reduce)')
    : null;

const dom = {
  pauseToggle: /** @type {HTMLButtonElement | null} */ (document.getElementById('pauseToggle')),
  postcardButton: /** @type {HTMLButtonElement | null} */ (
    document.getElementById('postcardButton')
  ),
  postcardCopyBtn: /** @type {HTMLButtonElement | null} */ (
    document.getElementById('postcardCopyBtn')
  ),
  muteToggle: /** @type {HTMLButtonElement | null} */ (document.getElementById('muteToggle')),
  restartButton: /** @type {HTMLButtonElement | null} */ (document.getElementById('restartButton')),
  fullscreenToggle: /** @type {HTMLButtonElement | null} */ (
    document.getElementById('fullscreenToggle')
  ),
  drawerToggle: /** @type {HTMLButtonElement | null} */ (document.getElementById('drawerToggle')),
  customizerDrawer: /** @type {HTMLElement | null} */ (document.getElementById('customizerDrawer')),
  drawerClose: /** @type {HTMLButtonElement | null} */ (document.getElementById('drawerClose')),
  gravitySlider: /** @type {HTMLInputElement | null} */ (document.getElementById('gravitySlider')),
  speedSlider: /** @type {HTMLInputElement | null} */ (document.getElementById('speedSlider')),
  musicVolumeSlider: /** @type {HTMLInputElement | null} */ (
    document.getElementById('musicVolumeSlider')
  ),
  sfxVolumeSlider: /** @type {HTMLInputElement | null} */ (
    document.getElementById('sfxVolumeSlider')
  ),
  gravityVal: document.getElementById('gravityVal'),
  speedVal: document.getElementById('speedVal'),
  musicVolumeVal: document.getElementById('musicVolumeVal'),
  sfxVolumeVal: document.getElementById('sfxVolumeVal'),
  srStatus: document.getElementById('srStatus'),
  // Stats
  statZenMinutes: document.getElementById('statZenMinutes'),
  statShieldsSaved: document.getElementById('statShieldsSaved'),
  statRunsCompleted: document.getElementById('statRunsCompleted'),
  statNearMisses: document.getElementById('statNearMisses'),
  statLongestSurvival: document.getElementById('statLongestSurvival'),
  statStreak: document.getElementById('statStreak'),
  // Theme buttons
  themeBtns: document.querySelectorAll('.theme-btn'),
  // Mobile control bar
  mobileControls: document.getElementById('mobileControls'),
  mBrake: /** @type {HTMLButtonElement | null} */ (document.getElementById('mBrake')),
  mFlap: /** @type {HTMLButtonElement | null} */ (document.getElementById('mFlap')),
  mDive: /** @type {HTMLButtonElement | null} */ (document.getElementById('mDive')),
  // Tutorial
  tutorialOverlay: document.getElementById('tutorialOverlay'),
  tutorialDismiss: /** @type {HTMLButtonElement | null} */ (
    document.getElementById('tutorialDismiss')
  ),
  // Daily seed
  dailySeedToggle: /** @type {HTMLInputElement | null} */ (
    document.getElementById('dailySeedToggle')
  ),
  dailySeedLabel: document.getElementById('dailySeedLabel'),
  dailySeedStatus: document.getElementById('dailySeedStatus'),
  // Reset stats
  resetStatsBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById('resetStatsBtn')),
  // Audio test
  audioTestBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById('audioTestBtn')),
  // Share
  shareBtn: /** @type {HTMLButtonElement | null} */ (document.getElementById('shareBtn')),
  // FPS toggle
  fpsToggle: /** @type {HTMLInputElement | null} */ (document.getElementById('fpsToggle')),
  // Toast container
  toastContainer: document.getElementById('toastContainer'),
  // Score history sparkline canvas
  sparkline: /** @type {HTMLCanvasElement | null} */ (document.getElementById('sparkline')),
  // Session run number
  sessionRun: document.getElementById('sessionRun'),
  // Surrounding stage panel (tap-to-flap on mobile)
  stagePanel: document.querySelector('.stage'),
};

/** Announce to ATs via the polite live region. Re-asserts text so SRs re-read. */
function announce(message) {
  if (!dom.srStatus) return;
  dom.srStatus.textContent = '';
  requestAnimationFrame(() => {
    if (dom.srStatus) dom.srStatus.textContent = message;
  });
}

// ─── 3. RNG (seeded for daily mode) ────────────────────────────────
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (y * 10000 + m * 100 + day) >>> 0;
}

let _rngFn = Math.random;
function rng() {
  return _rngFn();
}
function setSeededRNG(seed) {
  _rngFn = mulberry32(seed >>> 0);
}
function setUnseededRNG() {
  _rngFn = Math.random;
}

// ─── 4. STORAGE ────────────────────────────────────────────────────
// Namespaced, versioned keys. The `gb:` prefix isolates GlidieBirdie data from
// anything else on the origin, and the schema tag lets a migration run exactly
// once. All persistence MUST go through SK.* — never a bare string — so the
// storage-guard CI check can prove no legacy key leaks back in.
const STORAGE_SCHEMA = '3';
const SK = Object.freeze({
  schema: 'gb:schema',
  best: 'gb:best',
  theme: 'gb:theme',
  gravity: 'gb:gravity',
  speed: 'gb:speed',
  musicVolume: 'gb:music-volume',
  sfxVolume: 'gb:sfx-volume',
  dailySeed: 'gb:daily-seed',
  fps: 'gb:fps',
  tutorialSeen: 'gb:tutorial-seen',
  zenTime: 'gb:zen-time-sec',
  shieldsSaved: 'gb:shields-saved',
  runs: 'gb:runs',
  nearMisses: 'gb:near-misses',
  longest: 'gb:longest-survival-sec',
  streak: 'gb:streak',
  lastPlayedDay: 'gb:last-played-day',
  playedThemes: 'gb:played-themes',
  scoreHistory: 'gb:score-history',
  unlocked: 'gb:unlocked-achievements',
});

// One-time migration from the pre-rebrand key names (flappy-* / zen-* / bare) so
// existing players keep their best score, settings, stats, and achievements
// across the GlidieBirdie rename. Runs before the first read in `state`.
const LEGACY_KEY_MAP = Object.freeze({
  'flappy-best': SK.best,
  'flappy-theme': SK.theme,
  'flappy-gravity': SK.gravity,
  'flappy-speed': SK.speed,
  'flappy-music-volume': SK.musicVolume,
  'flappy-sfx-volume': SK.sfxVolume,
  'flappy-daily-seed': SK.dailySeed,
  'flappy-fps': SK.fps,
  'flappy-tutorial-seen': SK.tutorialSeen,
  'zen-time-sec': SK.zenTime,
  'shields-saved-count': SK.shieldsSaved,
  'runs-count': SK.runs,
  'near-misses-count': SK.nearMisses,
  'longest-survival-sec': SK.longest,
  'current-streak': SK.streak,
  'played-themes': SK.playedThemes,
  'score-history': SK.scoreHistory,
  'unlocked-achievements': SK.unlocked,
});

function migrateLegacyStorage() {
  try {
    if (localStorage.getItem(SK.schema)) return; // already migrated on this device
    for (const oldKey of Object.keys(LEGACY_KEY_MAP)) {
      const newKey = LEGACY_KEY_MAP[oldKey];
      const val = localStorage.getItem(oldKey);
      if (val == null) continue;
      if (localStorage.getItem(newKey) == null) localStorage.setItem(newKey, val);
      localStorage.removeItem(oldKey);
    }
    localStorage.setItem(SK.schema, STORAGE_SCHEMA);
  } catch {
    /* private mode / quota — readers fall back to defaults */
  }
}

/**
 * Pure calendar-day streak transition. `today`/`yesterday` are YYYYMMDD ints
 * from dateSeed(). Same day → unchanged; the day after the last play → +1;
 * any gap (or first ever play) → 1. Unit-tested in tests/engine-test.mjs.
 * @param {number} prevStreak @param {number} lastDay @param {number} today @param {number} yesterday
 */
function nextDayStreak(prevStreak, lastDay, today, yesterday) {
  if (lastDay === today) return prevStreak;
  if (lastDay === yesterday) return prevStreak + 1;
  return 1;
}

/** @param {string} key @param {readonly string[]} choices @param {string} fallback */
function readStoredChoice(key, choices, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored != null && choices.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

/** @param {number} value @param {number} fallback @param {number} min @param {number} max */
function clampNumber(value, fallback, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
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

function readStoredLevel(key, fallback) {
  const value = readStoredNumber(key, fallback, 1, 4);
  return SETTING_LEVELS.includes(value) ? value : fallback;
}

function readStoredBool(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function readPlayedThemes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SK.playedThemes) || '["sunset"]');
    const themes = Array.isArray(parsed) ? parsed.filter((t) => THEMES.includes(t)) : [];
    return new Set(themes.length ? themes : ['sunset']);
  } catch {
    return new Set(['sunset']);
  }
}

function readScoreHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SK.scoreHistory) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0).slice(-50);
  } catch {
    return [];
  }
}

function readUnlockedAchievements() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SK.unlocked) || '[]');
    return Array.isArray(parsed) ? new Set(parsed.filter((s) => typeof s === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* blocked */
  }
}

// Run the legacy→gb: migration once, before `state` performs its first reads.
migrateLegacyStorage();

// ─── 5. AUDIO ─────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
let audioCtx = /** @type {AudioContext | null} */ (null);
let masterGain = /** @type {GainNode | null} */ (null);
let masterLowpass = /** @type {BiquadFilterNode | null} */ (null);
let reverbConvolver = /** @type {ConvolverNode | null} */ (null);
let reverbWetGain = /** @type {GainNode | null} */ (null);

function buildReverbBuffer(ctx, durationSec, decay) {
  const sr = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sr * durationSec));
  const impulse = ctx.createBuffer(2, length, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function buildAudioGraph() {
  if (!audioCtx) return;
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;

  masterLowpass = audioCtx.createBiquadFilter();
  masterLowpass.type = 'lowpass';
  masterLowpass.frequency.value = 6000;
  masterLowpass.Q.value = 0.5;

  reverbConvolver = audioCtx.createConvolver();
  reverbConvolver.buffer = buildReverbBuffer(audioCtx, CONFIG.REVERB_SECONDS, CONFIG.REVERB_DECAY);
  reverbWetGain = audioCtx.createGain();
  reverbWetGain.gain.value = CONFIG.REVERB_MIX;

  // chain: source → masterGain → [masterLowpass → destination] + [reverbConvolver → reverbWet → destination]
  masterGain.connect(masterLowpass);
  masterLowpass.connect(audioCtx.destination);
  masterGain.connect(reverbConvolver);
  reverbConvolver.connect(reverbWetGain);
  reverbWetGain.connect(audioCtx.destination);
}

function ensureAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
      buildAudioGraph();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        /* swallow */
      });
    }
  } catch {
    /* AudioContext unavailable */
  }
}

function audioDestination() {
  return masterGain || audioCtx?.destination || null;
}

/** Schedule a tone at a specific AudioContext time. `volume` already scaled by channel. */
function playToneAt(freq, duration, type, volume, startTime) {
  if (!state.audioEnabled || !audioCtx) return;
  const dest = audioDestination();
  if (!dest) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    /* swallow */
  }
}

function playTone(freq, duration, type = 'square', volume = 0.12) {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  playToneAt(freq, duration, type, volume * state.sfxVolume, audioCtx.currentTime);
}

/** Schedule a tone sequence on the audio clock (drift-free). `notes` = [[freq,dur,type,vol,delay], ...] */
function playSequence(notes) {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  const base = audioCtx.currentTime + 0.005;
  for (const n of notes) {
    const [freq, dur, type, vol, delay] = n;
    playToneAt(freq, dur, type, vol * state.sfxVolume, base + delay);
  }
}

function sfxFlap() {
  playTone(420, 0.1, 'triangle', 0.15);
  playTone(560, 0.08, 'sine', 0.1);
}
function sfxScore() {
  playSequence([
    [660, 0.08, 'sine', 0.1, 0.0],
    [880, 0.1, 'sine', 0.12, 0.08],
    [1100, 0.12, 'sine', 0.1, 0.18],
  ]);
}
function sfxNewBest() {
  playSequence([
    [523, 0.1, 'sine', 0.12, 0.0],
    [659, 0.1, 'sine', 0.12, 0.1],
    [784, 0.12, 'sine', 0.13, 0.2],
    [1047, 0.18, 'sine', 0.14, 0.32],
  ]);
}
function sfxDie() {
  playTone(220, 0.25, 'sawtooth', 0.14);
  playTone(140, 0.35, 'sawtooth', 0.1);
}
function sfxDive() {
  playTone(300, 0.06, 'triangle', 0.08);
}
function sfxBrake() {
  playTone(380, 0.05, 'sine', 0.08);
}
function sfxNearMiss() {
  playTone(820, 0.05, 'sine', 0.06);
}
function sfxAchievement() {
  playSequence([
    [880, 0.15, 'sine', 0.1, 0.0],
    [1320, 0.25, 'sine', 0.09, 0.12],
  ]);
}
function sfxShieldCollect() {
  playSequence([
    [523, 0.1, 'sine', 0.12, 0.0],
    [659, 0.12, 'sine', 0.1, 0.07],
    [784, 0.15, 'sine', 0.12, 0.14],
    [1047, 0.2, 'sine', 0.15, 0.21],
    [392, 0.55, 'sine', 0.07, 0.38], // warm settling tail — "you are held"
  ]);
}
function sfxShieldPop() {
  playTone(880, 0.08, 'triangle', 0.15);
  playTone(1200, 0.12, 'sine', 0.1);
}

// Music (per-theme arpeggios, scheduled on audio clock)
const musicThemes = {
  sunset: {
    notes: [262, 330, 392, 523, 392, 330],
    wave: 'sine',
    subWave: 'triangle',
    interval: 0.5,
  },
  midnight: {
    notes: [293, 370, 440, 587, 440, 370],
    wave: 'square',
    subWave: 'sine',
    interval: 0.44,
  },
  rain: {
    notes: [220, 262, 330, 440, 330, 262],
    wave: 'sine',
    subWave: 'triangle',
    interval: 0.52,
  },
  aurora: { notes: [277, 311, 349, 415, 349, 311], wave: 'sine', subWave: 'sine', interval: 0.5 },
  meadow: {
    notes: [262, 294, 349, 440, 392, 349],
    wave: 'sine',
    subWave: 'triangle',
    interval: 0.48,
  },
};

let musicSchedulerHandle = /** @type {number | null} */ (null);
let musicIdx = 0;
let musicNextNoteTime = 0;

function scheduleMusicAhead() {
  if (!audioCtx) return;
  const theme = musicThemes[state.theme] || musicThemes.sunset;
  if (musicNextNoteTime < audioCtx.currentTime - 0.5) {
    musicNextNoteTime = audioCtx.currentTime + 0.05;
  }
  while (musicNextNoteTime < audioCtx.currentTime + CONFIG.MUSIC_LOOKAHEAD) {
    const notes = theme.notes;
    // Alternate between A and B sections every 12 notes for variation
    const section = Math.floor(musicIdx / 12) % 2;
    const noteIdx = musicIdx % notes.length;
    const transpose = section === 1 ? 1.05 : 1.0; // gentle pitch lift in B
    const baseFreq = notes[noteIdx] * transpose;

    playToneAt(baseFreq, 0.22, theme.wave, 0.045 * state.musicVolume, musicNextNoteTime);
    playToneAt(baseFreq / 2, 0.28, theme.subWave, 0.022 * state.musicVolume, musicNextNoteTime);

    // Ambient pad: slow drone on the tonic, scheduled every 4 notes
    if (musicIdx % 4 === 0) {
      const tonic = notes[0] / 2;
      playToneAt(tonic, theme.interval * 4, 'sine', 0.012 * state.musicVolume, musicNextNoteTime);
    }

    if (state.theme === 'rain' && Math.random() < 0.35) {
      playToneAt(
        Math.random() * 400 + 700,
        0.005,
        'sine',
        0.007 * state.musicVolume,
        musicNextNoteTime,
      );
    }

    musicNextNoteTime += theme.interval;
    musicIdx++;
  }
}

function fadeMaster(target, durationSec) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(t);
  masterGain.gain.setValueAtTime(masterGain.gain.value, t);
  masterGain.gain.linearRampToValueAtTime(
    Math.max(0.0001, target),
    t + Math.max(0.01, durationSec),
  );
}

function startMusic() {
  if (!state.audioEnabled) return;
  ensureAudio();
  if (!audioCtx) return;
  stopMusic(false);
  musicIdx = 0;
  musicNextNoteTime = audioCtx.currentTime + 0.05;
  scheduleMusicAhead();
  musicSchedulerHandle = setInterval(scheduleMusicAhead, CONFIG.MUSIC_TICK_MS);
  fadeMaster(1.0, CONFIG.MUSIC_FADE_SEC);
}

function stopMusic(fade = true) {
  if (musicSchedulerHandle != null) {
    clearInterval(musicSchedulerHandle);
    musicSchedulerHandle = null;
  }
  if (fade) fadeMaster(0.0001, CONFIG.MUSIC_FADE_SEC * 0.5);
}

// ─── 6. STATE ─────────────────────────────────────────────────────
const state = {
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
  reducedMotion: reducedMotionQuery.matches,
  reducedTransparency: reducedTransparencyQuery?.matches ?? false,

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
function updateDerivedPhysics() {
  if (!SETTING_LEVELS.includes(state.gravitySetting)) state.gravitySetting = 2;
  if (!SETTING_LEVELS.includes(state.speedSetting)) state.speedSetting = 2;
  state.gravity = CONFIG.GRAVITY_MAP[state.gravitySetting];
  state.flap = CONFIG.FLAP_MAP[state.gravitySetting];
  state.pipeSpeed = CONFIG.SPEED_MAP[state.speedSetting];
  state.pipeSpawnInterval = CONFIG.SPAWN_INTERVAL_MAP[state.speedSetting];
}

// Held-key tracking (modifier survival across restarts)
const heldKeys = new Set();

// ─── 7. THEME TABLES (consolidated) ────────────────────────────────
const THEME_TABLE = Object.freeze({
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

function getTheme() {
  return THEME_TABLE[state.theme] || THEME_TABLE.sunset;
}

function getPipeScoreHue(score) {
  return (getTheme().pipe.hue + score * 3) % 360;
}

// ─── 8. SPRITE CACHE (offscreen canvases) ──────────────────────────
const SPRITE_CACHE = {
  sky: /** @type {HTMLCanvasElement | null} */ (null),
  skyKey: '',
  clouds: /** @type {HTMLCanvasElement | null} */ (null),
  bird: /** @type {Record<string, HTMLCanvasElement>} */ ({}),
};

function makeOffscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * activeDPR);
  c.height = Math.round(h * activeDPR);
  const cx = c.getContext('2d');
  if (cx) cx.setTransform(activeDPR, 0, 0, activeDPR, 0, 0);
  return c;
}

function rebuildSkyCache() {
  const key = state.theme + '|' + Math.floor(state.score / 5);
  if (SPRITE_CACHE.sky && SPRITE_CACHE.skyKey === key) return;
  const c = makeOffscreen(CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  const cx = c.getContext('2d');
  if (!cx) return;
  const skyCfg = getTheme().sky;
  const hue = skyCfg.h1;
  const grad = cx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
  grad.addColorStop(0, `hsl(${hue}, 80%, 72%)`);
  grad.addColorStop(0.6, `hsl(${hue + 10}, 70%, 82%)`);
  grad.addColorStop(1, `hsl(${hue + 20}, 60%, 90%)`);
  cx.fillStyle = grad;
  cx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  SPRITE_CACHE.sky = c;
  SPRITE_CACHE.skyKey = key;
}

function rebuildCloudCache() {
  const c = makeOffscreen(140, 90);
  const cx = c.getContext('2d');
  if (!cx) return;
  cx.fillStyle = '#ffffff';
  cx.beginPath();
  cx.arc(35, 55, 28, Math.PI * 0.5, Math.PI * 1.5);
  cx.arc(63, 31, 24, Math.PI, 0);
  cx.arc(91, 55, 27, Math.PI * 1.5, Math.PI * 0.5);
  cx.closePath();
  cx.fill();
  SPRITE_CACHE.clouds = c;
}

function rebuildBirdCache() {
  SPRITE_CACHE.bird = {};
  const emotions = ['calm', 'happy', 'scared', 'determined', 'dizzy'];
  for (const theme of THEMES) {
    for (const emotion of emotions) {
      const key = `${theme}|${emotion}`;
      const c = makeOffscreen(60, 60);
      const cx = c.getContext('2d');
      if (!cx) continue;
      cx.translate(30, 30);
      const palette = THEME_TABLE[theme].bird;
      const bodyColor = palette[emotion] || palette.calm;
      // Soft radial shadow underneath
      const shadowGrad = cx.createRadialGradient(2, 5, 1, 2, 5, CONFIG.BIRD_RADIUS + 4);
      shadowGrad.addColorStop(0, 'rgba(0,0,0,0.28)');
      shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = shadowGrad;
      cx.beginPath();
      cx.ellipse(2, 5, CONFIG.BIRD_RADIUS + 4, (CONFIG.BIRD_RADIUS + 4) * 0.55, 0, 0, Math.PI * 2);
      cx.fill();
      // body
      cx.fillStyle = bodyColor;
      cx.beginPath();
      cx.arc(0, 0, CONFIG.BIRD_RADIUS, 0, Math.PI * 2);
      cx.fill();
      // body radial highlight
      const hlGrad = cx.createRadialGradient(-4, -6, 1, -4, -6, CONFIG.BIRD_RADIUS);
      hlGrad.addColorStop(0, palette.hl);
      hlGrad.addColorStop(0.7, palette.hl + '33'); // semi-fade
      hlGrad.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = hlGrad;
      cx.beginPath();
      cx.arc(-4, -6, CONFIG.BIRD_RADIUS * 0.6, 0, Math.PI * 2);
      cx.fill();
      // body rim shading (bottom shadow)
      cx.fillStyle = palette.shadow + '55';
      cx.beginPath();
      cx.arc(2, 5, CONFIG.BIRD_RADIUS * 0.85, 0, Math.PI * 2);
      cx.fill();

      // cute head crest / tuft — extra personality & calm character (cheap, cached)
      cx.fillStyle = palette.hl;
      cx.globalAlpha = 0.65;
      cx.beginPath();
      cx.moveTo(-3, -17);
      cx.quadraticCurveTo(0, -24, 6, -16);
      cx.quadraticCurveTo(1, -19, -3, -17);
      cx.closePath();
      cx.fill();
      cx.globalAlpha = 1;

      // beak (curved)
      cx.fillStyle = palette.beak;
      cx.beginPath();
      cx.moveTo(14, 0);
      cx.quadraticCurveTo(22, 1, 26, 4);
      cx.quadraticCurveTo(22, 7, 14, 9);
      cx.closePath();
      cx.fill();
      // beak highlight
      cx.fillStyle = 'rgba(255,255,255,0.25)';
      cx.beginPath();
      cx.moveTo(15, 1);
      cx.quadraticCurveTo(20, 1.5, 24, 3.5);
      cx.lineTo(15, 3);
      cx.closePath();
      cx.fill();
      SPRITE_CACHE.bird[key] = c;
    }
  }
}

function rebuildSpriteCaches() {
  SPRITE_CACHE.sky = null;
  SPRITE_CACHE.skyKey = '';
  rebuildSkyCache();
  rebuildCloudCache();
  rebuildBirdCache();
}

// ─── 9. WORLD ──────────────────────────────────────────────────────
const bird = {
  x: /** @type {number} */ (CONFIG.BIRD_X), // widen from the frozen literal so postcard mode can reposition
  y: CONFIG.CANVAS_H / 2,
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

const ground = {
  y: CONFIG.CANVAS_H - CONFIG.GROUND_HEIGHT,
  height: CONFIG.GROUND_HEIGHT,
  offset: 0,
};

/** @type {Array<{x:number,topHeight:number,baseTopHeight:number,passed:boolean,isMoving:boolean,movePhase:number,color:string,capColor:string,nearMissRecorded:boolean,shieldBubble?:{radius:number,pulse:number}|null}>} */
const pipes = [];

let pipeCounter = 0;
let nearestPipeCache = /** @type {any} */ (null);

// Particle / weather pools
/** @type {Array<any>} */
const particlePool = [];
/** @type {Array<any>} */
const activeParticles = [];
/** @type {Array<any>} */
const weatherPool = [];
/** @type {Array<any>} */
const activeWeather = [];
const MEADOW_POLLEN_COLORS = Object.freeze(['#fde68a', '#fef3c7', '#facc15']);

function initObjectPools() {
  particlePool.length = 0;
  activeParticles.length = 0;
  for (let i = 0; i < CONFIG.PARTICLE_POOL; i++) {
    particlePool.push({
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
  }
  weatherPool.length = 0;
  activeWeather.length = 0;
  for (let i = 0; i < CONFIG.WEATHER_POOL; i++) {
    weatherPool.push({
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
  }
}

let nextFreeParticle = 0;
function spawnParticles(x, y, count, color, spread = 3) {
  const particleCount = state.reducedMotion ? Math.max(1, Math.ceil(count * 0.35)) : count;
  const particleSpread = state.reducedMotion ? spread * 0.45 : spread;
  let spawned = 0;
  const start = nextFreeParticle;
  for (let scan = 0; scan < particlePool.length; scan++) {
    const idx = (start + scan) % particlePool.length;
    const p = particlePool[idx];
    if (!p.active) {
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
      nextFreeParticle = (idx + 1) % particlePool.length;
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
    if (p.life > 0) activeParticles[write++] = p;
    else p.active = false;
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

let nextFreeWeather = 0;
function spawnWeatherParticle(
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
  const start = nextFreeWeather;
  for (let scan = 0; scan < weatherPool.length; scan++) {
    const idx = (start + scan) % weatherPool.length;
    const p = weatherPool[idx];
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
      p.color = color;
      p.phase = phase;
      activeWeather.push(p);
      nextFreeWeather = (idx + 1) % weatherPool.length;
      return;
    }
  }
}

function spawnWeatherParticles() {
  if (state.reducedMotion || state.phase !== 'play' || state.paused) return;
  const spawnChance = Math.min(0.42 * state.dt, 0.95);

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

function updateWeatherParticles() {
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
    if (keep) activeWeather[write++] = p;
    else p.active = false;
  }
  activeWeather.length = write;
}

function drawWeatherParticles() {
  for (const p of activeWeather) {
    if (p.type === 'rain') {
      ctx.strokeStyle = 'rgba(156, 206, 235, 0.40)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 1.4, p.y + p.vy * 1.4);
      ctx.stroke();
    } else if (p.type === 'dust') {
      ctx.fillStyle = 'rgba(167, 139, 250, 0.65)';
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'cyber') {
      ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    } else if (p.type === 'pollen') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(state.time * 0.025 + p.phase) * 0.5);
      ctx.fillStyle = p.color || '#fde68a';
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, Math.max(0.8, p.size * 0.68), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Soft meadow pollen / petals — warm, organic, calm visual delight (flutter phase)
      ctx.globalAlpha = p.alpha * 0.9;
      const r = p.size * 0.52;
      const phase = (p.x * 0.8 + p.y * 0.6 + state.time * 1.8) * 0.018; // gentle living flutter
      // Core glow
      ctx.fillStyle = 'rgba(249, 199, 79, 0.65)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Four gentle petal lobes with phase rotation for organic meadow life (still cheap)
      ctx.fillStyle = 'rgba(255, 225, 150, 0.38)';
      for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + phase;
        const px = p.x + Math.cos(a) * r * 0.72;
        const py = p.y + Math.sin(a) * r * 0.72;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.58, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tiny bright center spark for premium golden feel
      ctx.fillStyle = 'rgba(255, 250, 220, 0.75)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'mote') {
      // Warm sunset dust motes — soft, glowing, slow drifting
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = 'rgba(255, 210, 130, 0.6)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Subtle highlight for golden light quality
      ctx.fillStyle = 'rgba(255, 245, 200, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x - 0.6, p.y - 0.6, p.size * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1.0;
}

function drawAuroraBands() {
  if (state.theme !== 'aurora' || state.reducedMotion) return;
  ctx.save();
  const t = state.time * 0.005;
  for (let i = 0; i < 3; i++) {
    const shiftX = Math.sin(t + i * 1.7) * (50 + i * 18);
    const grad = ctx.createLinearGradient(0, 0, CONFIG.CANVAS_W, 0);
    grad.addColorStop(0, 'rgba(74, 222, 128, 0)');
    grad.addColorStop(
      0.3 + i * 0.15,
      `rgba(${74 + i * 20}, ${222 - i * 30}, ${128 + i * 40}, 0.06)`,
    );
    grad.addColorStop(0.6 + i * 0.15, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(CONFIG.CANVAS_W, 0);
    ctx.lineTo(CONFIG.CANVAS_W + shiftX, CONFIG.CANVAS_H - 180);
    ctx.lineTo(shiftX, CONFIG.CANVAS_H - 180);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Meadow signature "Golden Light" godrays — warm, drifting sunbeams for the calmest theme.
// Cheap canvas gradients, time-based drift, fully respects reduced-motion and CONFIG.
function drawMeadowLight() {
  if (state.theme !== 'meadow' || state.reducedMotion) return;
  ctx.save();
  const t = state.time * CONFIG.MEADOW_LIGHT_WAVE_SPEED;
  for (let i = 0; i < CONFIG.MEADOW_LIGHT_COUNT; i++) {
    const shift = Math.sin(t + i * 1.3) * (28 + i * 11);
    const a = CONFIG.MEADOW_LIGHT_ALPHA * (0.65 + i * 0.18);
    const grad = ctx.createLinearGradient(
      CONFIG.CANVAS_W * (0.62 + i * 0.07),
      0,
      CONFIG.CANVAS_W * 0.18,
      CONFIG.CANVAS_H * CONFIG.MEADOW_LIGHT_VERTICAL,
    );
    grad.addColorStop(0, `rgba(255, 232, 155, ${a})`);
    grad.addColorStop(0.45, `rgba(255, 218, 125, ${a * 0.55})`);
    grad.addColorStop(1, 'rgba(255, 205, 90, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(CONFIG.CANVAS_W * (0.58 + i * 0.06), 0);
    ctx.lineTo(CONFIG.CANVAS_W + 8, 0);
    ctx.lineTo(CONFIG.CANVAS_W * (1.02 + shift * 0.009), CONFIG.CANVAS_H * 0.52);
    ctx.lineTo(CONFIG.CANVAS_W * (0.32 + shift * 0.007), CONFIG.CANVAS_H * 0.46);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ─── 10. PHYSICS ──────────────────────────────────────────────────
function updateEmotion() {
  const prev = bird.emotion;
  const nearPipe = nearestPipeCache;
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

function doFlap() {
  bird.velocity = state.flap;
  bird.scaleX = 0.8;
  bird.scaleY = 1.3;
  bird.pupilDilate = 1.0; // transient pupil expansion micro-interaction
  sfxFlap();
  hapticTap();
  spawnParticles(bird.x - 10, bird.y + 8, 3, getTheme().flapParticle, 2);
}

function updateBird() {
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
  if (calmGlide && !state.reducedMotion && rng() < CONFIG.CALM_BREATH_PARTICLE_CHANCE * state.dt) {
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

  const nearPipe = nearestPipeCache;
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

function spawnPipe() {
  const minTop = CONFIG.PIPE_MIN_TOP;
  const maxTop = Math.max(minTop + 1, ground.y - state.gap - 80);
  const topHeight = Math.floor(rng() * (maxTop - minTop + 1)) + minTop;

  const isMoving = state.score >= CONFIG.PIPE_SCORE_FOR_MOVING && rng() < CONFIG.PIPE_MOVING_CHANCE;

  const themePipe = getTheme().pipe;
  const color = `hsl(${themePipe.hue + rng() * 30}, 60%, 35%)`;
  const capColor = `hsl(${themePipe.cap + rng() * 30}, 70%, 20%)`;

  const newPipe = {
    x: CONFIG.CANVAS_W + 30,
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
  pipeCounter++;

  if (
    pipeCounter % CONFIG.SHIELD_INTERVAL === 0 &&
    !state.shieldActive &&
    !pipes.some((p) => p.shieldBubble)
  ) {
    newPipe.shieldBubble = { radius: CONFIG.SHIELD_RADIUS, pulse: 0 };
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

function updateShieldBubbles() {
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
      persistStatsHot();
      announce('Feather Shield activated.');
    }
  }
}

function updateNearestPipeCache() {
  nearestPipeCache = null;
  let bestDx = Infinity;
  for (const p of pipes) {
    const dx = p.x - bird.x;
    if (dx > -40 && dx < 120 && dx < bestDx) {
      bestDx = dx;
      nearestPipeCache = p;
    }
  }
}

/** True circle vs rect collision (replaces previous AABB hack). */
function circleHitsRect(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

function intersectsPipe(pipe) {
  const r = bird.radius * 0.82; // slightly forgiving
  // top pipe
  if (circleHitsRect(bird.x, bird.y, r, pipe.x, 0, state.pipeWidth, pipe.topHeight)) return true;
  // bottom pipe
  const gapBottom = pipe.topHeight + state.gap;
  return circleHitsRect(
    bird.x,
    bird.y,
    r,
    pipe.x,
    gapBottom,
    state.pipeWidth,
    ground.y - gapBottom,
  );
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
        state.invincibilityTimer = CONFIG.SHIELD_INVINCIBILITY_SEC * 60;
        bird.velocity = CONFIG.SHIELD_POP_VELOCITY;
        sfxShieldPop();
        hapticPulse(80);
        spawnParticles(bird.x, bird.y, 25, '#ffd700', 6);
        state.shieldsSavedCount++;
        state.afterglowShieldUsed = true; // per-run flag for the Afterglow reflection
        persistStatsHot();
        announce('Feather Shield absorbed collision. Invincible.');
        return;
      } else if (state.isInvincible) {
        return;
      } else {
        gameOver();
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
        persistStatsHot();
      }
    }
  }
}

// ─── 11. RENDER ────────────────────────────────────────────────────
function drawBackground() {
  // Cached sky
  if (SPRITE_CACHE.sky) {
    ctx.drawImage(SPRITE_CACHE.sky, 0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  } else {
    ctx.fillStyle = '#7bd8ff';
    ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  }

  drawAuroraBands();
  drawMeadowLight();

  // Parallax clouds — multiple depths
  const skyCfg = getTheme().sky;
  const co = state.time * (state.reducedMotion ? 0.08 : 0.22);
  const wrap = (offset, speed) =>
    ((((offset - co * speed) % (CONFIG.CANVAS_W + 200)) + CONFIG.CANVAS_W + 200) %
      (CONFIG.CANVAS_W + 200)) -
    60;

  // Far layer (smallest, slowest, faintest)
  ctx.globalAlpha = skyCfg.cAlpha * 0.45;
  drawCachedCloud(wrap(40, 0.05), 60, 0.45);
  drawCachedCloud(wrap(220, 0.06), 110, 0.4);
  drawCachedCloud(wrap(360, 0.04), 80, 0.5);
  // Mid layer
  ctx.globalAlpha = skyCfg.cAlpha * 0.75;
  drawCachedCloud(wrap(285, 0.15), 150, 0.78);
  drawCachedCloud(wrap(180, 0.1), 190, 0.55);
  // Near layer (largest, fastest, most opaque)
  ctx.globalAlpha = skyCfg.cAlpha;
  drawCachedCloud(wrap(70, 0.2), 100, 1.0);
  drawCachedCloud(wrap(460, 0.25), 70, 0.72);
  ctx.globalAlpha = 1.0;

  // Stars
  if (state.score >= 10 || state.theme === 'midnight') {
    for (let i = 0; i < 14; i++) {
      const sx = (i * 97 + state.time * 0.5) % CONFIG.CANVAS_W;
      const sy = 30 + ((i * 53 + state.time * 0.3) % 120);
      const tw = 0.3 + 0.4 * Math.sin(state.time * 0.1 + i);
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawCachedCloud(x, y, scale = 1) {
  if (!SPRITE_CACHE.clouds) return;
  const w = 140 * scale,
    h = 90 * scale;
  ctx.drawImage(SPRITE_CACHE.clouds, x, y - h * 0.4, w, h);
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
  const hueValue = getPipeScoreHue(state.score);
  grad.addColorStop(0.4, `hsl(${hueValue}, 60%, 48%)`);
  grad.addColorStop(1, pipe.capColor);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, state.pipeWidth, height);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 10, y + 4, 8, Math.max(0, height - 8));

  const capH = 20;
  const capY = isTop ? y + height - capH : y;
  ctx.fillStyle = pipe.capColor;
  ctx.fillRect(x - 4, capY, state.pipeWidth + 8, capH);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x - 2, capY + 2, state.pipeWidth + 4, 4);

  if (pipe.isMoving) {
    ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
    ctx.beginPath();
    ctx.arc(x + state.pipeWidth / 2, capY + capH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // a small icon to differentiate by shape (color-blind redundancy)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + state.pipeWidth / 2 - 5, capY + capH / 2);
    ctx.lineTo(x + state.pipeWidth / 2 + 5, capY + capH / 2);
    ctx.stroke();
  }
}

function drawGround() {
  const g = getTheme().ground;
  ctx.fillStyle = g.sand;
  ctx.fillRect(0, ground.y, CONFIG.CANVAS_W, ground.height);
  const grassGrad = ctx.createLinearGradient(0, ground.y, 0, ground.y + 14);
  grassGrad.addColorStop(0, g.grass1);
  grassGrad.addColorStop(1, g.grass2);
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, ground.y, CONFIG.CANVAS_W, 14);

  // Meadow ground delight — sparse living grass tufts + tiny warm flecks (calm, low cost)
  if (state.theme === 'meadow') {
    const reduced = state.reducedMotion;
    ctx.globalAlpha = reduced ? 0.18 : 0.26;
    ctx.fillStyle = '#f4d35e';
    const tuftCount = reduced ? 5 : 9;
    for (let i = 0; i < tuftCount; i++) {
      const x =
        22 +
        i * (CONFIG.CANVAS_W / (tuftCount + 1)) +
        (reduced ? 0 : Math.sin(state.time * 0.018 + i) * 1.8);
      const h = 3.5 + (i % 3);
      ctx.fillRect(x, ground.y + 3, 1.8, h);
      if (!reduced && i % 3 === 0) {
        ctx.fillStyle = '#81b29a';
        ctx.fillRect(x + 2.2, ground.y + 5, 1.2, 2.5);
        ctx.fillStyle = '#f4d35e';
      }
    }
    ctx.globalAlpha = 1.0;
  }

  ctx.fillStyle = g.dirt;
  for (let i = -32; i < CONFIG.CANVAS_W + 64; i += 32) {
    const ox = i - ground.offset;
    ctx.fillRect(ox, ground.y + 22, 16, 8);
    ctx.fillRect(ox + 14, ground.y + 42, 12, 8);
  }
}

function drawBirdTrail() {
  if (state.reducedMotion) return;
  let trailColor = getTheme().trail;
  if (bird.emotion === 'happy') trailColor = '#ffd700';
  if (bird.emotion === 'scared') trailColor = '#ff9999';
  for (const t of bird.trail) {
    if (t.life <= 0) continue;
    const alpha = t.life / CONFIG.BIRD_TRAIL_LIFE;
    ctx.globalAlpha = alpha * 0.25;
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
  // Living bird breathing (subtle, only when calm gliding — feels alive)
  const breathX = bird.scaleX + (bird.breath || 0) * 0.7;
  const breathY = bird.scaleY - (bird.breath || 0);
  ctx.scale(breathX, breathY);

  const r = bird.radius;
  if (state.isInvincible) {
    ctx.globalAlpha = 0.45 + Math.sin(state.time * 0.35) * 0.35;
  }

  const palette = getTheme().bird;

  // Cached body+highlight+beak
  const cacheKey = `${state.theme}|${bird.emotion}`;
  const cached = SPRITE_CACHE.bird[cacheKey];
  if (cached) {
    ctx.drawImage(cached, -30, -30, 60, 60);
  }

  // Dynamic wing
  ctx.save();
  ctx.translate(-4, 4);
  ctx.rotate(bird.wingAngle);
  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eye white
  const eyeX = 6,
    eyeY = -6;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2);
  ctx.fill();

  let pupilR = 3.5;
  if (bird.emotion === 'scared') pupilR = 4.5;
  if (bird.emotion === 'dizzy') pupilR = 2.5;
  if (bird.emotion === 'determined') pupilR = 3;
  pupilR += bird.pupilDilate * 1.2; // micro-interaction

  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(eyeX + bird.pupilOffsetX, eyeY + bird.pupilOffsetY, pupilR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(eyeX + bird.pupilOffsetX + 1, eyeY + bird.pupilOffsetY - 1, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrow
  ctx.strokeStyle = '#664400';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (bird.emotion === 'scared') {
    ctx.moveTo(eyeX - 6, eyeY - 10);
    ctx.lineTo(eyeX + 4, eyeY - 12);
  } else if (bird.emotion === 'determined') {
    ctx.moveTo(eyeX - 6, eyeY - 12);
    ctx.lineTo(eyeX + 4, eyeY - 8);
  } else if (bird.emotion === 'dizzy') {
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

  // Smile
  if (bird.emotion === 'happy') {
    ctx.strokeStyle = '#ff6b1d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(14, 6, 5, 0, Math.PI * 0.8);
    ctx.stroke();
  }

  // Dizzy
  if (bird.emotion === 'dizzy') {
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 1.5;
    for (let s = 0; s < 3; s++) {
      const angle = state.time * 0.15 + s * ((Math.PI * 2) / 3);
      const sx = Math.cos(angle) * 22;
      const sy = Math.sin(angle) * 22 - 8;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 1.5);
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
    // Outer glow ring (replaces shadowBlur — cheaper on mobile)
    ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
    ctx.beginPath();
    ctx.arc(bx, by, pulseR + 4, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(bx, by, 2, bx, by, pulseR);
    grad.addColorStop(0, 'rgba(255, 235, 120, 0.88)');
    grad.addColorStop(0.6, 'rgba(255, 215, 0, 0.45)');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0.05)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, pulseR, 0, Math.PI * 2);
    ctx.fill();
    // ring (color-blind redundancy: icon-glyph + ring shape)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', bx, by);
    ctx.restore();
  }
}

function drawBirdShield() {
  if (!state.shieldActive) return;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(state.time * 0.04);
  // Layered fills instead of shadowBlur (mobile-friendly)
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius + 12, 0, Math.PI * 2);
  ctx.stroke();
  // 4 rotating energy nodes
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      Math.cos(a) * (bird.radius + 12),
      Math.sin(a) * (bird.radius + 12),
      3.2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawScore() {
  let glowColor =
    bird.emotion === 'happy' ? '#ffd700' : bird.emotion === 'determined' ? '#ff8800' : '#ffffff';
  if (state.newBestFlash > 0) glowColor = '#ffd700';

  ctx.fillStyle = glowColor;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 3;
  ctx.font = 'bold 44px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeText(String(state.score), CONFIG.CANVAS_W / 2, 65);
  ctx.fillText(String(state.score), CONFIG.CANVAS_W / 2, 65);

  if (state.phase === 'play') {
    ctx.font = '13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const emo = { calm: '😌', happy: '😄', scared: '😰', determined: '😎', dizzy: '😵' };
    ctx.fillText(emo[bird.emotion] || '', CONFIG.CANVAS_W / 2, 85);
  }
}

let fpsFrames = 0;
let fpsAccum = 0;
let fpsDisplay = 0;
function updateFpsCounter(dtSec) {
  fpsAccum += dtSec;
  fpsFrames++;
  if (fpsAccum >= 0.5) {
    fpsDisplay = Math.round(fpsFrames / fpsAccum);
    fpsAccum = 0;
    fpsFrames = 0;
  }
}
function drawFpsCounter() {
  if (!state.showFps) return;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(CONFIG.CANVAS_W - 56, 6, 50, 18);
  ctx.fillStyle = fpsDisplay >= 50 ? '#4ade80' : fpsDisplay >= 30 ? '#facc15' : '#f87171';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(`${fpsDisplay} fps`, CONFIG.CANVAS_W - 31, 19);
}

function drawVignette() {
  if (state.reducedTransparency) return;
  const grad = ctx.createRadialGradient(
    CONFIG.CANVAS_W / 2,
    CONFIG.CANVAS_H / 2,
    CONFIG.CANVAS_W * 0.35,
    CONFIG.CANVAS_W / 2,
    CONFIG.CANVAS_H / 2,
    CONFIG.CANVAS_W * 0.75,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
}

function drawNearMissFlash() {
  if (state.nearMissFlash <= 0) return;
  const alpha = Math.min(0.35, state.nearMissFlash * 0.6);
  ctx.fillStyle = `rgba(125, 211, 252, ${alpha})`;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
}

function drawCalmMeter() {
  if (state.phase !== 'play') return;
  const x = 14,
    y = 14,
    w = 8,
    h = 100;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, y, w, h);
  const filled = Math.max(0, Math.min(1, state.calmMeter));
  ctx.fillStyle = `hsl(${160 + filled * 60}, 70%, 60%)`;
  ctx.fillRect(x, y + h - h * filled, w, h * filled);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawPanel(title, subtitle, extra, options = /** @type {{newBest?:boolean}} */ ({})) {
  const pw = 320,
    ph = 210;
  const px = (CONFIG.CANVAS_W - pw) / 2;
  const py = 160;

  ctx.fillStyle = 'rgba(12, 20, 35, 0.88)';
  ctx.strokeStyle = options.newBest ? 'rgba(255, 215, 0, 0.6)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth = options.newBest ? 3 : 2;
  roundRect(px, py, pw, ph, 22);
  ctx.fill();
  ctx.stroke();

  if (options.newBest) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🌟 NEW BEST 🌟', CONFIG.CANVAS_W / 2, py + 22);
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(title, CONFIG.CANVAS_W / 2, py + (options.newBest ? 60 : 50));

  ctx.font = '17px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  wrapText(subtitle, CONFIG.CANVAS_W / 2, py + (options.newBest ? 92 : 86), 280, 22);

  if (state.best > 0) {
    ctx.font = 'bold 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffd24d';
    ctx.fillText(`Best: ${state.best}`, CONFIG.CANVAS_W / 2, py + 155);
  }

  if (extra) {
    ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    wrapText(extra, CONFIG.CANVAS_W / 2, py + 180, 285, 15);
  }
}

/** Serene Postcard — beautiful, shareable calm moment (extends existing render primitives). */
function drawPostcard() {
  const w = CONFIG.CANVAS_W;
  const h = CONFIG.CANVAS_H;
  const theme = getTheme();
  const themeName = state.theme.charAt(0).toUpperCase() + state.theme.slice(1);

  // Soft serene overlay (calm, not opaque)
  ctx.fillStyle = 'rgba(8, 17, 32, 0.55)';
  ctx.fillRect(0, 0, w, h);

  // Gentle theme-tinted vignette
  const grad = ctx.createRadialGradient(w / 2, h / 2.2, 80, w / 2, h / 2, Math.max(w, h) * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(4, 10, 22, 0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Draw a larger, centered, calm bird (reuse palette, no trail/shield for serenity)
  const bx = w / 2;
  const by = h * 0.42;
  const prevX = bird.x;
  const prevY = bird.y;
  const prevRot = bird.rotation;
  bird.x = bx;
  bird.y = by;
  bird.rotation = 0; // serene, level flight

  // Draw bird larger by temporarily scaling context around center
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(1.35, 1.35);
  ctx.translate(-bx, -by);
  drawBird();
  ctx.restore();

  // Restore bird state
  bird.x = prevX;
  bird.y = prevY;
  bird.rotation = prevRot;

  // Gentle theme-colored floating particles (slow, peaceful)
  if (!state.reducedMotion) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 7; i++) {
      const px = w * (0.28 + ((i * 0.07) % 0.44));
      const py = h * 0.58 + Math.sin(Date.now() / 1400 + i) * 18;
      ctx.fillStyle = theme.scoreParticle || theme.flapParticle || '#a5d8ff';
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + (i % 3) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Elegant centered typography
  ctx.textAlign = 'center';

  ctx.fillStyle = '#f1f7ff';
  ctx.font = 'bold 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Serene Postcard', w / 2, h * 0.68);

  ctx.fillStyle = 'rgba(238, 247, 255, 0.85)';
  ctx.font = '18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${themeName} • Score ${state.score}`, w / 2, h * 0.68 + 32);

  ctx.fillStyle = 'rgba(238, 247, 255, 0.55)';
  ctx.font = '13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('P or Esc to close  •  Screenshot to share', w / 2, h * 0.68 + 58);

  // Subtle bottom accent line
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.68 + 72);
  ctx.lineTo(w * 0.68, h * 0.68 + 72);
  ctx.stroke();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, cy);
      line = `${word} `;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line.trim(), x, cy);
}

function roundRect(x, y, w, h, r) {
  // Use native ctx.roundRect when available (Chrome 99+, Safari 16+, Firefox 113+).
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
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
  drawCalmMeter();
  drawNearMissFlash();
  drawVignette();
  drawFpsCounter();
  ctx.restore();

  // Pick subtitle by score bracket for game-over
  if (state.phase === 'start') {
    drawPanel(
      'The air is waiting.',
      'Tap or press Space. Brake (Shift) softens the fall. Dive (↓) for control. On phones the buttons are always there.',
      'Esc Pause • M Mute • R Restart',
    );
  } else if (state.paused && state.postcardMode) {
    drawPostcard();
  } else if (state.paused) {
    drawPanel(
      'Paused',
      `Score: ${state.score}. Take a breath. The wind will still be here when you return.`,
      'Esc or Pause to resume • M for sound',
    );
  } else if (state.afterglowActive && state.phase === 'gameOver') {
    // The beautiful Afterglow reflection moment — world is frozen, bird calm, gentle particles linger
    drawPanel(
      'You flew well.',
      state.afterglowReflection || 'The wind remembers this one.',
      'Any tap or key to continue',
      { newBest: state.isNewBest },
    );
  } else if (state.phase === 'gameOver') {
    const title = state.isNewBest ? 'A quiet record.' : pickGameOverTitle(state.score);
    const sub = state.isNewBest
      ? `New best: ${state.score}. The wind noticed. Take this calm into the next one.`
      : state.best > 0
        ? `Score: ${state.score}. ${state.best - state.score} from your best. The air is kind. Tap or press Space.`
        : `Score: ${state.score}. The air is kind. Tap or press Space to glide again.`;
    drawPanel(title, sub, 'Esc Pause • M Mute • R Restart', { newBest: state.isNewBest });
  }
}

function pickGameOverTitle(score) {
  if (score >= 35) return 'The wind carried you.';
  if (score >= 25) return 'Beautiful run.';
  if (score >= 18) return 'You found the rhythm.';
  if (score >= 12) return 'Steady glide.';
  if (score >= 6) return 'Soft landing.';
  return 'The air welcomed you.';
}

// ─── 12. UI: drawer, mobile bar, focus trap, fullscreen, haptics ──
let drawerWasPlaying = false;

function isDrawerOpen() {
  return Boolean(dom.customizerDrawer?.classList.contains('open'));
}

function setCustomizerOpen(isOpen, restoreFocus = true) {
  if (!dom.customizerDrawer) return;
  dom.customizerDrawer.classList.toggle('open', isOpen);
  dom.customizerDrawer.setAttribute('aria-hidden', String(!isOpen));
  if (isOpen) dom.customizerDrawer.removeAttribute('inert');
  else dom.customizerDrawer.setAttribute('inert', '');
  try {
    /** @type {any} */ (dom.customizerDrawer).inert = !isOpen;
  } catch {
    /* unsupported */
  }

  dom.drawerToggle?.setAttribute('aria-expanded', String(isOpen));
  dom.drawerToggle?.setAttribute('aria-pressed', String(isOpen));

  if (isOpen) drawSparkline(); // refresh now that the drawer (and its canvas) is visible

  if (isOpen && state.phase === 'play' && !state.paused) {
    drawerWasPlaying = true;
    togglePause(true);
  } else if (!isOpen && drawerWasPlaying) {
    drawerWasPlaying = false;
    if (state.paused && state.phase === 'play') togglePause(false);
  }

  if (restoreFocus) {
    requestAnimationFrame(() => {
      setTimeout(
        () => {
          if (isOpen) {
            if (
              document.activeElement instanceof HTMLElement &&
              !dom.customizerDrawer?.contains(document.activeElement)
            ) {
              document.activeElement.blur();
            }
            focusElement(dom.drawerClose || getDrawerFocusable()[0] || dom.customizerDrawer);
          } else {
            focusElement(dom.drawerToggle);
          }
        },
        isOpen ? 80 : 0,
      );
    });
  }
}

function focusElement(element) {
  if (!element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

function getDrawerFocusable() {
  const drawer = dom.customizerDrawer;
  if (!drawer) return [];
  return Array.from(
    /** @type {NodeListOf<HTMLElement>} */ (
      drawer.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
    ),
  );
}

function trapDrawerFocus(e) {
  if (e.key !== 'Tab' || !isDrawerOpen()) return;
  const drawer = dom.customizerDrawer;
  if (!drawer) return;
  const focusable = getDrawerFocusable();
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!drawer.contains(document.activeElement)) {
    focusElement(first);
    e.preventDefault();
    return;
  }
  if (e.shiftKey && document.activeElement === first) {
    focusElement(last);
    e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    focusElement(first);
    e.preventDefault();
  }
}

function applyTheme(theme) {
  const nextTheme = THEMES.includes(theme) ? theme : 'sunset';
  document.body.classList.remove(...THEMES.map((n) => `theme-${n}`));
  document.body.classList.add(`theme-${nextTheme}`);
  // theme-color meta for mobile chrome
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const palette = {
      sunset: '#180927',
      midnight: '#020206',
      rain: '#0a0f1d',
      aurora: '#030f0c',
      meadow: '#0d1710',
    };
    metaTheme.setAttribute('content', palette[nextTheme] || '#081120');
  }
  dom.themeBtns.forEach((btn) => {
    const isActive = btn.getAttribute('data-theme') === nextTheme;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
  SPRITE_CACHE.sky = null;
  SPRITE_CACHE.skyKey = '';
  rebuildSkyCache();
}

function syncUiState() {
  if (dom.pauseToggle) {
    const canPause = state.phase === 'play';
    dom.pauseToggle.disabled = !canPause;
    dom.pauseToggle.textContent = state.paused ? 'Resume' : 'Pause';
    dom.pauseToggle.setAttribute('aria-pressed', String(state.paused));
  }
  if (dom.postcardButton) {
    const canPostcard = state.phase === 'play';
    dom.postcardButton.disabled = !canPostcard;
    dom.postcardButton.setAttribute('aria-pressed', String(state.postcardMode));
    // Visual hint when active
    dom.postcardButton.style.borderColor = state.postcardMode ? 'rgba(244, 211, 94, 0.6)' : '';
  }
  if (dom.postcardCopyBtn) {
    const showCopy = state.postcardMode && state.phase === 'play';
    dom.postcardCopyBtn.style.display = showCopy ? 'inline-flex' : 'none';
  }
  if (dom.muteToggle) {
    dom.muteToggle.textContent = state.audioEnabled ? '🔊 Sound' : '🔇 Muted';
    dom.muteToggle.setAttribute('aria-pressed', String(!state.audioEnabled));
  }
  if (dom.fullscreenToggle) {
    const fs = document.fullscreenElement != null;
    dom.fullscreenToggle.textContent = fs ? 'Exit FS' : 'Fullscreen';
    dom.fullscreenToggle.setAttribute('aria-pressed', String(fs));
  }
  if (dom.dailySeedToggle) {
    dom.dailySeedToggle.checked = state.dailySeedMode;
    dom.dailySeedToggle.setAttribute('aria-checked', String(state.dailySeedMode));
  }
  if (dom.fpsToggle) {
    dom.fpsToggle.checked = state.showFps;
    dom.fpsToggle.setAttribute('aria-checked', String(state.showFps));
  }
  if (dom.dailySeedStatus) {
    dom.dailySeedStatus.textContent = state.dailySeedMode
      ? `On — shared seed #${dateSeed()}`
      : 'Off — random pipes each run';
  }
}

function togglePause(forceValue) {
  if (state.phase !== 'play') return;
  const target = typeof forceValue === 'boolean' ? forceValue : !state.paused;
  if (state.paused === target) return;
  state.paused = target;
  if (state.paused) {
    stopMusic();
  } else {
    bird.isBraking = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight');
    bird.isDiving = heldKeys.has('ArrowDown');
    startMusic();
  }
  if (state.postcardMode) state.postcardMode = false; // exiting pause exits postcard too
  syncUiState();
  announce(state.paused ? 'Game paused.' : 'Game resumed.');
}

/** Toggle the Serene Postcard overlay (beautiful shareable moment). Only while paused in play. */
function togglePostcard() {
  if (state.phase !== 'play') return;
  if (!state.paused) {
    // Auto-pause when entering postcard for a calm capture
    togglePause(true);
  }
  state.postcardMode = !state.postcardMode;
  syncUiState();
  if (state.postcardMode) {
    announce('Serene postcard mode. Press P or Escape to exit.');
  } else {
    announce('Postcard closed.');
  }
}

function toggleMute() {
  state.audioEnabled = !state.audioEnabled;
  if (!state.audioEnabled) stopMusic();
  else if (state.phase === 'play' && !state.paused) startMusic();
  syncUiState();
  announce(state.audioEnabled ? 'Sound on.' : 'Sound muted.');
}

function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      const root = document.documentElement;
      root.requestFullscreen?.().catch(() => {});
    }
  } catch {
    /* unsupported */
  }
}

// Haptics (Android Chrome only; iOS Safari ignores)
function hapticTap() {
  if (state.reducedMotion) return;
  try {
    navigator.vibrate?.(10);
  } catch {
    /* swallow */
  }
}
function hapticPulse(ms) {
  if (state.reducedMotion) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* swallow */
  }
}

/** Universal serene moment capture — works anytime the canvas is beautiful */
function captureSereneScreenshot() {
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `flappy-calm-serene-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast('Serene moment captured.', 'default');
    announce('Serene screenshot saved. The beautiful moment is yours.');
    hapticPulse(30);
  } catch {
    showToast('Could not capture (browser restriction).', 'default');
  }
}

// ─── 13. STATS ────────────────────────────────────────────────────
function pushScoreHistory(score) {
  state.scoreHistory.push(score);
  if (state.scoreHistory.length > 50) state.scoreHistory.shift();
}

function syncStatsAndAchievements(saveToStorage = false) {
  if (saveToStorage) {
    writeStoredValue(SK.zenTime, Math.floor(state.zenTimeSec));
    writeStoredValue(SK.shieldsSaved, state.shieldsSavedCount);
    writeStoredValue(SK.runs, state.runsCount);
    writeStoredValue(SK.nearMisses, state.nearMissesCount);
    writeStoredValue(SK.longest, Math.floor(state.longestSurvivalSec));
    writeStoredValue(SK.streak, state.currentStreak);
    writeStoredValue(SK.lastPlayedDay, state.lastPlayedDay);
    writeStoredValue(SK.playedThemes, JSON.stringify(Array.from(state.playedThemes)));
    writeStoredValue(SK.scoreHistory, JSON.stringify(state.scoreHistory.slice(-50)));
    writeStoredValue(SK.unlocked, JSON.stringify(Array.from(state.unlockedAchievements)));
  }
  if (dom.statZenMinutes) dom.statZenMinutes.textContent = (state.zenTimeSec / 60).toFixed(1);
  if (dom.statShieldsSaved) dom.statShieldsSaved.textContent = String(state.shieldsSavedCount);
  if (dom.statRunsCompleted) dom.statRunsCompleted.textContent = String(state.runsCount);
  if (dom.statNearMisses) dom.statNearMisses.textContent = String(state.nearMissesCount);
  if (dom.statLongestSurvival) {
    const s = state.longestSurvivalSec;
    dom.statLongestSurvival.textContent = s < 60 ? `${Math.floor(s)}s` : `${(s / 60).toFixed(1)}m`;
  }
  if (dom.statStreak) dom.statStreak.textContent = String(state.currentStreak);
  if (dom.sessionRun) dom.sessionRun.textContent = `Run #${state.runsCount}`;
  drawSparkline();
  checkAchievements();
}

let lastHotPersistAtSec = -1e9;
/**
 * Hot-path stats persistence used during active play (near-miss, shield events).
 * Always refreshes the DOM + achievement checks, but throttles the synchronous
 * localStorage write to avoid per-event jank. One-shot events (game over, theme
 * change, achievement unlock, reset) still persist immediately via (true).
 */
function persistStatsHot() {
  if (state.elapsedSec - lastHotPersistAtSec > 0.5) {
    lastHotPersistAtSec = state.elapsedSec;
    syncStatsAndAchievements(true);
  } else {
    syncStatsAndAchievements(false);
  }
}

function resetStats() {
  state.zenTimeSec = 0;
  state.shieldsSavedCount = 0;
  state.runsCount = 0;
  state.nearMissesCount = 0;
  state.longestSurvivalSec = 0;
  state.currentStreak = 0;
  state.lastPlayedDay = 0;
  state.scoreHistory = [];
  state.unlockedAchievements = new Set();
  state.playedThemes = new Set([state.theme]);
  // wipe persisted stats + best (settings/theme are intentionally preserved)
  [
    SK.zenTime,
    SK.shieldsSaved,
    SK.runs,
    SK.nearMisses,
    SK.longest,
    SK.streak,
    SK.lastPlayedDay,
    SK.scoreHistory,
    SK.unlocked,
    SK.playedThemes,
    SK.best,
  ].forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
  state.best = 0;
  syncStatsAndAchievements(true);
  // un-mark all achievement DOMs
  document.querySelectorAll('.achievement-item').forEach((el) => el.classList.remove('unlocked'));
  document.querySelectorAll('.achievement-progress').forEach((el) => {
    el.textContent = '';
  });
  announce('All stats and achievements reset.');
}

// ─── 14. ACHIEVEMENTS ──────────────────────────────────────────────
/** Expanded set: definitions are pure functions over state. */
const ACHIEVEMENTS = [
  {
    id: 'FirstFlight',
    name: 'First Flight',
    check: () => state.score >= 1,
    progress: () => `${Math.min(state.score, 1)}/1`,
  },
  {
    id: 'ZenMaster',
    name: 'Zen Master',
    check: () => state.score >= 15,
    progress: () => `${Math.min(state.score, 15)}/15`,
  },
  {
    id: 'ShieldSavior',
    name: 'Shield Savior',
    check: () => state.shieldsSavedCount >= 1,
    progress: () => `${Math.min(state.shieldsSavedCount, 1)}/1`,
  },
  {
    id: 'ThemeExplorer',
    name: 'Theme Explorer',
    check: () => state.playedThemes.size >= THEMES.length,
    progress: () => `${Math.min(state.playedThemes.size, THEMES.length)}/${THEMES.length}`,
  },
  {
    id: 'CalmMarathon',
    name: 'Calm Marathon',
    check: () => state.zenTimeSec >= 300,
    progress: () => `${Math.min(Math.floor(state.zenTimeSec / 60), 5)}/5 min`,
  },
  {
    id: 'Featherweight',
    name: 'Featherweight',
    check: () => state.score >= 30,
    progress: () => `${Math.min(state.score, 30)}/30`,
  },
  {
    id: 'Featherlight',
    name: 'Featherlight',
    check: () => state.score >= 50,
    progress: () => `${Math.min(state.score, 50)}/50`,
  },
  {
    id: 'StreakKeeper',
    name: 'Streak Keeper',
    check: () => state.runNearMisses >= 5,
    progress: () => `${Math.min(state.runNearMisses, 5)}/5`,
  },
  {
    id: 'BrakeMaster',
    name: 'Brake Master',
    check: () => state.brakeUseCount >= 10,
    progress: () => `${Math.min(state.brakeUseCount, 10)}/10`,
  },
  {
    id: 'Diver',
    name: 'Diver',
    check: () => state.diveUseCount >= 10,
    progress: () => `${Math.min(state.diveUseCount, 10)}/10`,
  },
  {
    id: 'IronCalm',
    name: 'Iron Calm',
    check: () => state.currentStreak >= 3,
    progress: () => `${Math.min(state.currentStreak, 3)}/3`,
  },
  {
    id: 'LongHaul',
    name: 'Long Haul',
    check: () => state.longestSurvivalSec >= 60,
    progress: () => `${Math.min(Math.floor(state.longestSurvivalSec), 60)}/60s`,
  },
];

// Cache the achievement DOM nodes once. checkAchievements() runs several times a
// second (periodic stats sync + hot near-miss/shield events); the previous code
// did 12 getElementById + 12 querySelector lookups *per call* — O(A) DOM hits on
// a hot path. Building the lookup once turns each later call into O(A) Map reads
// with zero DOM traversal. Lazy so it works regardless of markup-load timing.
/** @type {Map<string, { el: HTMLElement, progressEl: Element | null }> | null} */
let achElCache = null;
function getAchievementEls() {
  if (achElCache) return achElCache;
  achElCache = new Map();
  for (const ach of ACHIEVEMENTS) {
    const el = document.getElementById(`ach${ach.id}`);
    if (el) achElCache.set(ach.id, { el, progressEl: el.querySelector('.achievement-progress') });
  }
  return achElCache;
}

function checkAchievements() {
  const els = getAchievementEls();
  for (const ach of ACHIEVEMENTS) {
    const refs = els.get(ach.id);
    if (refs?.progressEl) refs.progressEl.textContent = ach.progress();
    if (!refs) continue;
    const el = refs.el;
    const wasUnlocked = state.unlockedAchievements.has(ach.id);
    const isUnlocked = ach.check();
    if (isUnlocked && !wasUnlocked) {
      state.unlockedAchievements.add(ach.id);
      el.classList.add('unlocked');
      sfxAchievement();
      hapticPulse(60);
      const isThemeExplorer = ach.id === 'ThemeExplorer';
      spawnParticles(
        bird.x,
        bird.y - 30,
        isThemeExplorer ? 26 : 18,
        isThemeExplorer ? '#f4d35e' : '#10b981',
        isThemeExplorer ? 7 : 4,
      );
      const unlockText = isThemeExplorer
        ? `Achievement unlocked: ${ach.name}. The full palette is yours.`
        : `Achievement unlocked: ${ach.name}.`;
      announce(unlockText);
      showToast(`🎉 ${ach.name}`, 'achievement');
      syncStatsAndAchievements(true);
    } else if (isUnlocked) {
      el.classList.add('unlocked');
    }
  }
}

/** Lightweight visible toast (separate from the SR live region). */
function showToast(text, type = 'default') {
  if (!dom.toastContainer) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = text;
  dom.toastContainer.appendChild(el);
  // Auto-remove
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 400);
  }, 2400);
  // Cap to 4 visible toasts to avoid stacking
  while (dom.toastContainer.children.length > 4) {
    dom.toastContainer.firstElementChild?.remove();
  }
}

/** Draw the score-history sparkline into the drawer's mini canvas. */
function drawSparkline() {
  const c = dom.sparkline;
  if (!c) return;
  // The sparkline is only visible inside the open drawer. Skipping it while closed
  // avoids a getBoundingClientRect() forced layout on the gameplay hot path.
  if (!isDrawerOpen()) return;
  const cx = c.getContext('2d');
  if (!cx) return;
  // Adapt buffer to displayed size + DPR
  const rect = c.getBoundingClientRect();
  const dpr = activeDPR;
  const w = Math.max(80, Math.floor(rect.width));
  const h = Math.max(28, Math.floor(rect.height));
  if (c.width !== Math.round(w * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, w, h);
  const data = state.scoreHistory.slice(-30);
  if (data.length === 0) {
    cx.fillStyle = 'rgba(255,255,255,0.4)';
    cx.font = '10px system-ui';
    cx.fillText('No runs yet', 8, h / 2 + 3);
    return;
  }
  const maxV = Math.max(1, ...data);
  const step = data.length > 1 ? (w - 8) / (data.length - 1) : 0;
  // Area fill
  cx.beginPath();
  cx.moveTo(4, h - 4);
  for (let i = 0; i < data.length; i++) {
    const x = 4 + i * step;
    const y = h - 4 - (data[i] / maxV) * (h - 10);
    cx.lineTo(x, y);
  }
  cx.lineTo(w - 4, h - 4);
  cx.closePath();
  cx.fillStyle = 'rgba(125, 211, 252, 0.15)';
  cx.fill();
  // Line
  cx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = 4 + i * step;
    const y = h - 4 - (data[i] / maxV) * (h - 10);
    if (i === 0) cx.moveTo(x, y);
    else cx.lineTo(x, y);
  }
  cx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
  cx.lineWidth = 1.5;
  cx.stroke();
  // Best dot
  const bestIdx = data.indexOf(Math.max(...data));
  if (bestIdx >= 0) {
    const x = 4 + bestIdx * step;
    const y = h - 4 - (data[bestIdx] / maxV) * (h - 10);
    cx.fillStyle = '#facc15';
    cx.beginPath();
    cx.arc(x, y, 2.5, 0, Math.PI * 2);
    cx.fill();
  }
}

// ─── 15. LIFECYCLE ─────────────────────────────────────────────────
function onScoreChanged() {
  if (state.score - state.lastScoreAnnounceAt >= CONFIG.SCORE_ANNOUNCE_EVERY || state.score === 1) {
    state.lastScoreAnnounceAt = state.score;
    announce(`Score ${state.score}.`);
  }
  state.calmMeter = Math.min(1.0, state.calmMeter + 0.04);
}

/** Handle for the delayed game-over "second wave" particle burst (cleared on
 * restart so a quick R-press can't spray the previous death into the new run). */
let deathWaveTimer = 0;

function resetGame() {
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

  pipeCounter = 0;

  bird.y = CONFIG.CANVAS_H / 2;
  bird.velocity = 0;
  bird.rotation = 0;
  bird.emotion = 'calm';
  bird.emotionTimer = 0;
  bird.scaleX = 1;
  bird.scaleY = 1;
  for (const t of bird.trail) {
    t.x = 0;
    t.y = 0;
    t.life = 0;
  }
  bird.isBraking = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight');
  bird.isDiving = heldKeys.has('ArrowDown');
  bird.blush = 0;
  bird.pupilOffsetX = 0;
  bird.pupilOffsetY = 0;

  ground.offset = 0;
  pipes.length = 0;
  nearestPipeCache = null;

  initObjectPools();
  nextFreeParticle = 0;
  nextFreeWeather = 0;
  stopMusic(false);

  if (state.dailySeedMode) setSeededRNG(dateSeed());
  else setUnseededRNG();

  syncUiState();
  syncStatsAndAchievements(true);
  announce('Ready to glide. Relax and start when you like.');
}

function startGame() {
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

function restartRun() {
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

function gameOver() {
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

function enterAfterglow() {
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
function handleAction(event) {
  event?.preventDefault?.();
  if (state.audioEnabled) ensureAudio();

  // Graceful exit from the beautiful Afterglow reflection on any intentional input
  if (state.afterglowActive) {
    state.afterglowActive = false;
    state.afterglowTimer = 0;
    syncUiState();
    // Fall through to normal gameOver behavior below
  }

  if (state.paused) {
    togglePause(false);
    return;
  }
  if (state.phase === 'gameOver') {
    startGame();
    return;
  }
  if (state.phase === 'start') {
    startGame();
    return;
  }
  doFlap();
}

function shouldIgnoreGlobalShortcut(event) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (dom.customizerDrawer?.contains(target)) return true;
  return (
    Boolean(
      target.closest('button, input, select, textarea, [contenteditable="true"], [role="slider"]'),
    ) && target !== canvas
  );
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;

  // Drawer focus trap
  if (isDrawerOpen() && e.key === 'Tab') {
    trapDrawerFocus(e);
    return;
  }

  if (e.code === 'Escape') {
    if (isDrawerOpen()) setCustomizerOpen(false);
    else togglePause();
    return;
  }

  if (shouldIgnoreGlobalShortcut(e)) return;
  if (isDrawerOpen()) return;

  heldKeys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();

  if (e.code === 'KeyM') {
    toggleMute();
    return;
  }
  if (e.code === 'KeyR') {
    restartRun();
    return;
  }
  if (e.code === 'KeyF') {
    toggleFullscreen();
    return;
  }
  if (e.code === 'KeyP') {
    togglePostcard();
    return;
  }
  if (e.code === 'KeyC') {
    captureSereneScreenshot();
    return;
  }
  if (e.code === 'Space' || e.code === 'ArrowUp') handleAction(e);

  if (state.phase !== 'play' || state.paused) return;
  if (e.code === 'ArrowDown') bird.isDiving = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') bird.isBraking = true;
});

window.addEventListener('keyup', (e) => {
  heldKeys.delete(e.code);
  if (e.code === 'ArrowDown') bird.isDiving = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') bird.isBraking = false;
});

canvas.addEventListener(
  'pointerdown',
  (e) => {
    ensureAudio();
    handleAction(e);
  },
  { passive: false },
);

// Tap anywhere on the surrounding stage panel (outside the mobile controls)
// also flaps — gives mobile players a bigger forgiving hit zone.
dom.stagePanel?.addEventListener('pointerdown', (e) => {
  const target = e.target;
  if (target === canvas) return; // canvas has its own handler
  if (!(target instanceof Element)) return;
  if (target.closest('.mobile-controls, .toolbar, .stage-topbar, .tutorial-overlay')) return;
  if (state.phase === 'play' && !state.paused) {
    ensureAudio();
    handleAction(e);
  }
});

// Mobile control bar
function bindMobileControls() {
  const press = (el, onDown, onUp) => {
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      ensureAudio();
      onDown();
    };
    const up = (e) => {
      e?.preventDefault?.();
      onUp();
    };
    el.addEventListener('pointerdown', down, { passive: false });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('touchend', up, { passive: false });
  };
  press(
    dom.mFlap,
    () => handleAction(null),
    () => {},
  );
  press(
    dom.mBrake,
    () => {
      bird.isBraking = true;
    },
    () => {
      bird.isBraking = false;
    },
  );
  press(
    dom.mDive,
    () => {
      bird.isDiving = true;
    },
    () => {
      bird.isDiving = false;
    },
  );
}

// ─── 17. LIFECYCLE EVENTS ──────────────────────────────────────────
function pauseForPageLifecycle() {
  heldKeys.clear();
  bird.isBraking = false;
  bird.isDiving = false;
  if (state.phase === 'play' && !state.paused) togglePause(true);
  else syncUiState();
}

window.addEventListener('blur', pauseForPageLifecycle);

let lastVisibilitySync = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseForPageLifecycle();
    const now = Date.now();
    if (now - lastVisibilitySync > CONFIG.VISIBILITY_SYNC_INTERVAL_MS) {
      syncStatsAndAchievements(true);
      lastVisibilitySync = now;
    }
  } else {
    // Re-arm audio context (iOS suspends it on tab hide)
    if (state.audioEnabled) ensureAudio();
  }
});

window.addEventListener('beforeunload', () => {
  syncStatsAndAchievements(true);
});

function onResize() {
  configureCanvasForDPR();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);
document.addEventListener('fullscreenchange', () => {
  onResize();
  syncUiState();
});

if (typeof reducedMotionQuery.addEventListener === 'function') {
  reducedMotionQuery.addEventListener('change', (e) => {
    state.reducedMotion = e.matches;
    if (e.matches) {
      state.shakeAmount = 0;
      activeWeather.length = 0;
      for (const p of weatherPool) p.active = false;
    }
  });
}
if (reducedTransparencyQuery && typeof reducedTransparencyQuery.addEventListener === 'function') {
  reducedTransparencyQuery.addEventListener('change', (e) => {
    state.reducedTransparency = e.matches;
  });
}

// ─── 18. OFFLINE APP SHELL ─────────────────────────────────────────
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const register = () => {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

// ─── 19. CUSTOMIZER & DRAWER BINDINGS ──────────────────────────────
function bindDrawerControls() {
  if (dom.gravitySlider) {
    dom.gravitySlider.value = String(state.gravitySetting);
    if (dom.gravityVal) dom.gravityVal.textContent = GRAVITY_LABELS[state.gravitySetting];
  }
  if (dom.speedSlider) {
    dom.speedSlider.value = String(state.speedSetting);
    if (dom.speedVal) dom.speedVal.textContent = SPEED_LABELS[state.speedSetting];
  }
  if (dom.musicVolumeSlider) {
    dom.musicVolumeSlider.value = String(Math.round(state.musicVolume * 100));
    if (dom.musicVolumeVal)
      dom.musicVolumeVal.textContent = `${Math.round(state.musicVolume * 100)}%`;
  }
  if (dom.sfxVolumeSlider) {
    dom.sfxVolumeSlider.value = String(Math.round(state.sfxVolume * 100));
    if (dom.sfxVolumeVal) dom.sfxVolumeVal.textContent = `${Math.round(state.sfxVolume * 100)}%`;
  }

  applyTheme(state.theme);
  setCustomizerOpen(false, false);

  dom.drawerToggle?.addEventListener('click', () => setCustomizerOpen(!isDrawerOpen()));
  dom.drawerClose?.addEventListener('click', () => setCustomizerOpen(false));

  dom.gravitySlider?.addEventListener('input', (e) => {
    state.gravitySetting = Math.round(
      clampNumber(Number(/** @type {HTMLInputElement} */ (e.target).value), 2, 1, 4),
    );
    if (dom.gravityVal) dom.gravityVal.textContent = GRAVITY_LABELS[state.gravitySetting];
    updateDerivedPhysics();
    writeStoredValue(SK.gravity, state.gravitySetting);
  });

  dom.speedSlider?.addEventListener('input', (e) => {
    state.speedSetting = Math.round(
      clampNumber(Number(/** @type {HTMLInputElement} */ (e.target).value), 2, 1, 4),
    );
    if (dom.speedVal) dom.speedVal.textContent = SPEED_LABELS[state.speedSetting];
    updateDerivedPhysics();
    writeStoredValue(SK.speed, state.speedSetting);
  });

  dom.musicVolumeSlider?.addEventListener('input', (e) => {
    const percent = Math.round(
      clampNumber(Number(/** @type {HTMLInputElement} */ (e.target).value), 60, 0, 100),
    );
    state.musicVolume = percent / 100;
    if (dom.musicVolumeVal) dom.musicVolumeVal.textContent = `${percent}%`;
    writeStoredValue(SK.musicVolume, state.musicVolume);
    // adjust live without restarting the scheduler (volume is read each note)
  });

  dom.sfxVolumeSlider?.addEventListener('input', (e) => {
    const percent = Math.round(
      clampNumber(Number(/** @type {HTMLInputElement} */ (e.target).value), 80, 0, 100),
    );
    state.sfxVolume = percent / 100;
    if (dom.sfxVolumeVal) dom.sfxVolumeVal.textContent = `${percent}%`;
    writeStoredValue(SK.sfxVolume, state.sfxVolume);
  });

  dom.themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const prevTheme = state.theme;
      const requested = btn.getAttribute('data-theme') || '';
      state.theme = THEMES.includes(requested) ? requested : 'sunset';
      applyTheme(state.theme);
      state.playedThemes.add(state.theme);
      syncStatsAndAchievements(true);
      writeStoredValue(SK.theme, state.theme);
      if (state.theme !== prevTheme) {
        activeWeather.length = 0;
        for (const p of weatherPool) p.active = false;
        if (state.phase === 'play' && !state.paused) startMusic();
        playTone(523, 0.12, 'sine', 0.08);
        setTimeout(() => playTone(659, 0.15, 'sine', 0.06), 80);
      }
    });
  });

  dom.dailySeedToggle?.addEventListener('change', (e) => {
    state.dailySeedMode = /** @type {HTMLInputElement} */ (e.target).checked;
    writeStoredValue(SK.dailySeed, state.dailySeedMode);
    syncUiState();
    if (state.dailySeedMode) setSeededRNG(dateSeed());
    else setUnseededRNG();
    announce(state.dailySeedMode ? 'Daily Seed mode on.' : 'Daily Seed mode off.');
  });

  dom.resetStatsBtn?.addEventListener('click', () => {
    if (confirm('Reset all stats and achievements?')) resetStats();
  });

  dom.audioTestBtn?.addEventListener('click', () => {
    ensureAudio();
    playSequence([
      [523, 0.12, 'sine', 0.1, 0.0],
      [659, 0.12, 'sine', 0.1, 0.12],
      [784, 0.16, 'sine', 0.1, 0.24],
    ]);
  });

  dom.shareBtn?.addEventListener('click', async () => {
    const score = state.best > 0 ? state.best : state.score;
    // In Daily Seed mode, link the exact seed so a friend plays the same run.
    const seedTag = state.dailySeedMode ? ` · daily seed #${dateSeed()}` : '';
    const text = `GlidieBirdie — my calm best is ${score}.${seedTag} 🐦`;
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'GlidieBirdie', text, url });
        showToast('Shared.', 'default');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast('Copied to clipboard.', 'default');
      } else {
        showToast('Sharing unavailable.', 'default');
      }
    } catch {
      // user cancelled or share failed silently
    }
  });

  dom.fpsToggle?.addEventListener('change', (e) => {
    state.showFps = /** @type {HTMLInputElement} */ (e.target).checked;
    writeStoredValue(SK.fps, state.showFps);
  });
}

// Tutorial overlay — a real modal: focus moves in on show, Escape dismisses, and
// Tab is pinned to the single action so keyboard/SR users can't wander into the
// (visually obscured) background behind it.
function bindTutorial() {
  const overlay = dom.tutorialOverlay;
  if (!overlay) return;

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
      focusElement(canvas);
    } else if (e.key === 'Tab') {
      // Single-control modal → keep focus on the dismiss button (focus trap).
      e.preventDefault();
      focusElement(dom.tutorialDismiss);
    }
  }

  function dismiss() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', onKeydown, true);
    writeStoredValue(SK.tutorialSeen, true);
  }

  if (!readStoredBool(SK.tutorialSeen, false)) {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', onKeydown, true);
    focusElement(dom.tutorialDismiss); // move focus into the modal
  } else {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
  }

  dom.tutorialDismiss?.addEventListener('click', (e) => {
    dismiss();
    focusElement(canvas);
    handleAction(e);
  });
}

// ─── 20. MAIN LOOP ─────────────────────────────────────────────────
let frameErrorCount = 0;
let frameErrorCooldownAt = 0;

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

  // Rebuild sky cache lazily on score bracket change
  rebuildSkyCache();
}

function loop(timestamp = performance.now()) {
  if (state.lastTimestamp === 0) state.lastTimestamp = timestamp;
  const elapsedMs = timestamp - state.lastTimestamp;
  const rawDt = elapsedMs / CONFIG.FRAME_MS_60;
  state.dt = rawDt > 0 ? Math.min(rawDt, CONFIG.DT_MAX) : 1;
  // Keep dtSec consistent with dt on zero/negative-elapsed frames (two RAF callbacks
  // at an identical timestamp). Otherwise dt would advance (=1) while dtSec froze (=0),
  // drifting state.time vs state.elapsedSec and stalling second-based cooldowns/afterglow.
  state.dtSec = elapsedMs > 0 ? Math.min(elapsedMs / 1000, CONFIG.DT_MAX / 60) : state.dt / 60;
  state.elapsedSec += state.dtSec;
  state.lastTimestamp = timestamp;

  // Afterglow timer — the calm reflection window (dt-safe)
  if (state.afterglowActive) {
    state.afterglowTimer -= state.dt;
    if (state.afterglowTimer <= 0) {
      state.afterglowActive = false;
      state.afterglowTimer = 0;
      // Now the normal gameOver panel will show on next draw
      syncUiState();
    }
  }

  // Error rate limit: if many frames throw, sleep briefly.
  if (state.elapsedSec < frameErrorCooldownAt) {
    requestAnimationFrame(loop);
    return;
  }
  updateFpsCounter(state.dtSec);
  try {
    update();
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

  if (state.phase === 'start') {
    bird.y = CONFIG.CANVAS_H / 2 + Math.sin(timestamp * 0.0025) * 10;
  }

  requestAnimationFrame(loop);
}

// ─── 21. BOOT ──────────────────────────────────────────────────────
configureCanvasForDPR();
updateDerivedPhysics();
resetGame();
bindDrawerControls();
bindMobileControls();
bindTutorial();
registerServiceWorker();
syncUiState();

dom.pauseToggle?.addEventListener('click', () => togglePause());
dom.postcardButton?.addEventListener('click', () => togglePostcard());
dom.postcardCopyBtn?.addEventListener('click', () => captureSereneScreenshot());
dom.muteToggle?.addEventListener('click', () => toggleMute());
dom.restartButton?.addEventListener('click', () => restartRun());
dom.fullscreenToggle?.addEventListener('click', () => toggleFullscreen());

requestAnimationFrame(loop);
