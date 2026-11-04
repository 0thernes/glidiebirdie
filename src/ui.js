/** Toolbar, drawer, tutorial, and theme application. */
import { GRAVITY_LABELS, SPEED_LABELS, THEMES } from './config.js';
import { dateSeed, setSeededRNG, setUnseededRNG } from './rng.js';
import { SK, clampNumber, readStoredBool, writeStoredValue } from './storage.js';
import { announce, canvas, dom } from './dom.js';
import { activeWeather, bird, heldKeys, state, updateDerivedPhysics, weatherPool } from './state.js';
import { ensureAudio, playSequence, playTone, startMusic, stopMusic } from './audio.js';
import { SPRITE_CACHE, rebuildSkyCache } from './render.js';
import { drawSparkline, resetStats, showToast, syncStatsAndAchievements } from './achievements.js';
import { hapticPulse } from './haptics.js';
import { handleAction } from './input.js';

export let drawerWasPlaying = false;

export function isDrawerOpen() {
  return Boolean(dom.customizerDrawer?.classList.contains('open'));
}

export function setCustomizerOpen(isOpen, restoreFocus = true) {
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
  const shell = document.querySelector('.shell');
  if (shell) {
    if (isOpen) shell.setAttribute('inert', '');
    else shell.removeAttribute('inert');
  }

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

export function focusElement(element) {
  if (!element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

export function getDrawerFocusable() {
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

export function trapDrawerFocus(e) {
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

export function applyTheme(theme) {
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

export function syncUiState() {
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

export function togglePause(forceValue) {
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
export function togglePostcard() {
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

export function toggleMute() {
  state.audioEnabled = !state.audioEnabled;
  if (!state.audioEnabled) stopMusic();
  else if (state.phase === 'play' && !state.paused) startMusic();
  syncUiState();
  announce(state.audioEnabled ? 'Sound on.' : 'Sound muted.');
}

export function toggleFullscreen() {
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
export function captureSereneScreenshot() {
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
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const register = () => {
    navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

// ─── 19. CUSTOMIZER & DRAWER BINDINGS ──────────────────────────────
export function bindDrawerControls() {
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
export function bindTutorial() {
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

  function setTutorialBackgroundInert(on) {
    const nodes = [
      document.getElementById('heroPanel'),
      document.querySelector('.meta-grid'),
      document.querySelector('.stage-topbar'),
      document.getElementById('mobileControls'),
      canvas,
    ];
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) continue;
      if (on) node.setAttribute('inert', '');
      else node.removeAttribute('inert');
    }
  }

  function dismiss() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    setTutorialBackgroundInert(false);
    document.removeEventListener('keydown', onKeydown, true);
    writeStoredValue(SK.tutorialSeen, true);
  }

  if (!readStoredBool(SK.tutorialSeen, false)) {
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    setTutorialBackgroundInert(true);
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

