/** Guarded localStorage. All persistence goes through these helpers. */
import { SETTING_LEVELS, THEMES } from './config.js';

export const STORAGE_SCHEMA = '3';
export const SK = Object.freeze({
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
export const LEGACY_KEY_MAP = Object.freeze({
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

export function migrateLegacyStorage() {
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
export function nextDayStreak(prevStreak, lastDay, today, yesterday) {
  if (lastDay === today) return prevStreak;
  if (lastDay === yesterday) return prevStreak + 1;
  return 1;
}

/** @param {string} key @param {readonly string[]} choices @param {string} fallback */
export function readStoredChoice(key, choices, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored != null && choices.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

/** @param {number} value @param {number} fallback @param {number} min @param {number} max */
export function clampNumber(value, fallback, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function readStoredNumber(key, fallback, min = -Infinity, max = Infinity) {
  try {
    const stored = localStorage.getItem(key);
    const value = stored === null ? fallback : Number(stored);
    return clampNumber(value, fallback, min, max);
  } catch {
    return fallback;
  }
}

export function readStoredLevel(key, fallback) {
  const value = readStoredNumber(key, fallback, 1, 4);
  return SETTING_LEVELS.includes(value) ? value : fallback;
}

export function readStoredBool(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

export function readPlayedThemes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SK.playedThemes) || '["sunset"]');
    const themes = Array.isArray(parsed) ? parsed.filter((t) => THEMES.includes(t)) : [];
    return new Set(themes.length ? themes : ['sunset']);
  } catch {
    return new Set(['sunset']);
  }
}

export function readScoreHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SK.scoreHistory) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0).slice(-50);
  } catch {
    return [];
  }
}

export function readUnlockedAchievements() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SK.unlocked) || '[]');
    return Array.isArray(parsed) ? new Set(parsed.filter((s) => typeof s === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* blocked */
  }
}

// Run the legacy→gb: migration once, before `state` performs its first reads.
migrateLegacyStorage();
