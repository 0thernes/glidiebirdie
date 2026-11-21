/** Keyboard, pointer, mobile bar, and gamepad. Listeners bind on import. */
import { CONFIG } from './config.js';
import { scheduleInput } from './input-queue.js';
import { canvas, configureCanvasForDPR, dom } from './dom.js';
import { bird, control, heldKeys, state, syncLocomotion } from './state.js';
import { clearWeatherPool } from './physics.js';
import { ensureAudio } from './audio.js';
import { syncStatsAndAchievements } from './achievements.js';
import { hooks } from './hooks.js';
import {
  captureSereneScreenshot,
  isDrawerOpen,
  isTutorialOpen,
  setCustomizerOpen,
  syncUiState,
  toggleFullscreen,
  toggleMute,
  togglePause,
  togglePostcard,
  trapDrawerFocus,
} from './ui.js';
import { restartRun, startGame } from './session.js';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedTransparencyQuery =
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-transparency: reduce)')
    : null;

export function handleAction(event) {
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
  scheduleInput(performance.now(), 'flap');
}

export function shouldIgnoreGlobalShortcut(event) {
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
  if (isTutorialOpen()) return;

  // Drawer focus trap
  if (isDrawerOpen() && e.key === 'Tab') {
    trapDrawerFocus(e);
    return;
  }

  if (e.code === 'Escape') {
    if (isDrawerOpen()) setCustomizerOpen(false);
    else if (state.postcardMode) togglePostcard();
    else if (state.afterglowActive) {
      state.afterglowActive = false;
      state.afterglowTimer = 0;
      syncUiState();
    } else togglePause();
    return;
  }

  // Never hijack browser/OS shortcuts (Ctrl+C, Ctrl+R, Ctrl+F, Cmd+P, etc.)
  if (e.ctrlKey || e.metaKey || e.altKey) return;

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
  if (e.code === 'Enter' && state.afterglowActive) {
    state.afterglowActive = false;
    state.afterglowTimer = 0;
    syncUiState();
    return;
  }
  if (e.code === 'Space' || e.code === 'ArrowUp') handleAction(e);

  if (state.phase !== 'play' || state.paused) return;
  if (e.code === 'ArrowDown') bird.isDiving = true;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') bird.isBraking = true;
});

window.addEventListener('keyup', (e) => {
  heldKeys.delete(e.code);
  syncLocomotion();
});

canvas.addEventListener(
  'pointerdown',
  (e) => {
    if (isTutorialOpen() || isDrawerOpen()) return;
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
export function bindMobileControls() {
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
      control.touchBrake = true;
      syncLocomotion();
    },
    () => {
      control.touchBrake = false;
      syncLocomotion();
    },
  );
  press(
    dom.mDive,
    () => {
      control.touchDive = true;
      syncLocomotion();
    },
    () => {
      control.touchDive = false;
      syncLocomotion();
    },
  );
}

// ─── 17. LIFECYCLE EVENTS ──────────────────────────────────────────
export function pauseForPageLifecycle() {
  heldKeys.clear();
  control.touchBrake = false;
  control.touchDive = false;
  control.padBrake = false;
  control.padDive = false;
  bird.isBraking = false;
  bird.isDiving = false;
  if (state.phase === 'play' && !state.paused) togglePause(true);
  else syncUiState();
}

window.addEventListener('blur', pauseForPageLifecycle);

export let lastVisibilitySync = 0;
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

export function onResize() {
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
      clearWeatherPool();
    }
  });
}
if (reducedTransparencyQuery && typeof reducedTransparencyQuery.addEventListener === 'function') {
  reducedTransparencyQuery.addEventListener('change', (e) => {
    state.reducedTransparency = e.matches;
  });
}

hooks.handleAction = handleAction;

export const padDown = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];

/** @param {number} timeMs */
export function pollGamepad(timeMs) {
  control.padBrake = false;
  control.padDive = false;
  if (typeof navigator.getGamepads !== 'function') return;
  const pads = navigator.getGamepads();
  if (!pads) return;
  let flap = false;
  let pause = false;
  let mute = false;
  for (let i = 0; i < pads.length; i++) {
    const pad = pads[i];
    if (!pad || !pad.buttons) continue;
    const buttons = pad.buttons;
    const down = (idx) => idx < buttons.length && !!buttons[idx] && !!buttons[idx].pressed;
    if (down(0) || down(1) || down(12)) flap = true;
    if (down(4) || down(6)) control.padBrake = true;
    if (down(5) || down(7) || down(13)) control.padDive = true;
    if (down(9)) pause = true;
    if (down(8)) mute = true;
    const axes = pad.axes;
    if (axes && axes.length > 1 && axes[1] > 0.55) control.padDive = true;
  }
  const modalOpen = isTutorialOpen() || isDrawerOpen();
  if (modalOpen) {
    control.padBrake = false;
    control.padDive = false;
  } else {
    if (flap && !padDown[0]) {
      if (state.phase === 'play' && !state.paused && !state.afterglowActive) {
        if (state.audioEnabled) ensureAudio();
        scheduleInput(timeMs, 'flap');
      } else {
        handleAction(null);
      }
    }
    if (pause && !padDown[9]) {
      if (state.postcardMode) togglePostcard();
      else togglePause();
    }
    if (mute && !padDown[8]) toggleMute();
  }
  padDown[0] = flap;
  padDown[8] = mute;
  padDown[9] = pause;
}
