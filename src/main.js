/** Browser entry. Wires modules and starts the frame loop. No boot on import. */
import { configureCanvasForDPR, dom, onDprChange } from './dom.js';
import { rebuildSpriteCaches } from './render.js';
import { updateDerivedPhysics } from './state.js';
import {
  bindDrawerControls,
  bindTutorial,
  captureSereneScreenshot,
  registerServiceWorker,
  syncUiState,
  toggleFullscreen,
  toggleMute,
  togglePause,
  togglePostcard,
} from './ui.js';
import { bindMobileControls } from './input.js';
import { resetGame, restartRun } from './session.js';
import { loop } from './loop.js';

export function boot() {
  onDprChange(rebuildSpriteCaches);
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
}
