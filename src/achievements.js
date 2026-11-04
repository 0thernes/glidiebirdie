/** Stats persistence, achievement predicates, toasts, and the score sparkline. */
import { THEMES } from './config.js';
import { SK, writeStoredValue } from './storage.js';
import { announce, dom, dprState } from './dom.js';
import { bird, state } from './state.js';
import { hapticPulse } from './haptics.js';
import { sfxAchievement } from './audio.js';
import { spawnParticles } from './physics.js';
import { hooks } from './hooks.js';

export function pushScoreHistory(score) {
  state.scoreHistory.push(score);
  if (state.scoreHistory.length > 50) state.scoreHistory.shift();
}

export function syncStatsAndAchievements(saveToStorage = false) {
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
  if (dom.scoreSummary) {
    const hist = state.scoreHistory;
    dom.scoreSummary.textContent = hist.length
      ? 'Recent scores: ' + hist.slice(-8).join(', ') + '.'
      : 'No completed runs yet.';
  }
  drawSparkline();
  checkAchievements();
}

export let lastHotPersistAtSec = -1e9;
/**
 * Hot-path stats persistence used during active play (near-miss, shield events).
 * Always refreshes the DOM + achievement checks, but throttles the synchronous
 * localStorage write to avoid per-event jank. One-shot events (game over, theme
 * change, achievement unlock, reset) still persist immediately via (true).
 */
export function persistStatsHot() {
  if (state.elapsedSec - lastHotPersistAtSec > 0.5) {
    lastHotPersistAtSec = state.elapsedSec;
    syncStatsAndAchievements(true);
  } else {
    syncStatsAndAchievements(false);
  }
}

export function resetStats() {
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
export const ACHIEVEMENTS = [
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
export let achElCache = null;
export function getAchievementEls() {
  if (achElCache) return achElCache;
  achElCache = new Map();
  for (const ach of ACHIEVEMENTS) {
    const el = document.getElementById(`ach${ach.id}`);
    if (el) achElCache.set(ach.id, { el, progressEl: el.querySelector('.achievement-progress') });
  }
  return achElCache;
}

export function checkAchievements() {
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
export function showToast(text, type = 'default') {
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
export function drawSparkline() {
  const c = dom.sparkline;
  if (!c) return;
  // The sparkline is only visible inside the open drawer. Skipping it while closed
  // avoids a getBoundingClientRect() forced layout on the gameplay hot path.
  if (!dom.customizerDrawer?.classList.contains('open')) return;
  const cx = c.getContext('2d');
  if (!cx) return;
  // Adapt buffer to displayed size + DPR
  const rect = c.getBoundingClientRect();
  const dpr = dprState.value;
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

hooks.persistStatsHot = persistStatsHot;
