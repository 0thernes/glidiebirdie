/** Canvas, cached DOM nodes, and the screen-reader live region. */
import { CONFIG } from './config.js';
import { hooks } from './hooks.js';

export const dprState = { value: 1 };
let canvasConfigured = false;
let afterDpr = () => {};
/** @param {() => void} fn */
export function onDprChange(fn) {
  afterDpr = fn;
}

export const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
export const ctx = canvas?.getContext('2d', { alpha: false }) || canvas?.getContext('2d');
if (!canvas || !ctx) throw new Error('Canvas element #game not found or 2D context unavailable.');

/** @returns {number} */
export function getDPR() {
  return Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
}

/** @param {boolean} [force] */
export function configureCanvasForDPR(force = false) {
  const nextDpr = getDPR();
  const nextW = Math.round(CONFIG.CANVAS_W * nextDpr);
  const nextH = Math.round(CONFIG.CANVAS_H * nextDpr);
  if (
    !force &&
    canvasConfigured &&
    dprState.value === nextDpr &&
    canvas.width === nextW &&
    canvas.height === nextH
  ) {
    return false;
  }
  canvasConfigured = true;
  dprState.value = nextDpr;
  canvas.width = nextW;
  canvas.height = nextH;
  ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
  // CSS sizing already declares aspect-ratio + width: 100% via style.css.
  afterDpr();
  hooks.requestRender();
  return true;
}
export const dom = {
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
  scoreSummary: document.getElementById('scoreSummary'),
  // Surrounding stage panel (tap-to-flap on mobile)
  stagePanel: document.querySelector('.stage'),
};

/** Announce to ATs via the polite live region. Re-asserts text so SRs re-read. */
export function announce(message) {
  if (!dom.srStatus) return;
  dom.srStatus.textContent = '';
  requestAnimationFrame(() => {
    if (dom.srStatus) dom.srStatus.textContent = message;
  });
}
