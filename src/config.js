/** Tunable constants. No DOM. */

export const CONFIG = Object.freeze({
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

export const THEMES = Object.freeze(['sunset', 'midnight', 'rain', 'aurora', 'meadow']);
export const SETTING_LEVELS = Object.freeze([1, 2, 3, 4]);
export const GRAVITY_LABELS = Object.freeze({ 1: 'Ultra-Light', 2: 'Calm', 3: 'Normal', 4: 'Heavy' });
export const SPEED_LABELS = Object.freeze({ 1: 'Breeze', 2: 'Chill', 3: 'Cruise', 4: 'Swift' });
