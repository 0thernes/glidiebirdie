// Headless behavioral tests for the game engine — zero dependencies.
//
// game.js is a single browser script (no exports, must not be split — see
// CONTRIBUTING). To test its real logic without jsdom or a refactor, we boot it
// inside a Node `vm` context backed by a compact DOM/canvas/audio stub, then run
// assertions appended into the SAME script scope so they can see the engine's
// internal `state`, `bird`, and functions directly.
//
// Run: node tests/engine-test.mjs   (also part of `npm run check`)

import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('game.js', 'utf8');

// ── Minimal DOM / canvas / audio stubs ─────────────────────────────────────
// A canvas 2D context that swallows every call. The two methods whose return
// value is used get real-ish shapes; everything else is a no-op.
const ctx2d = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern')
        return () => ({ addColorStop() {} });
      if (prop === 'canvas') return { width: 0, height: 0 };
      return () => {};
    },
    set() {
      return true;
    },
  },
);

function el() {
  return {
    style: {},
    dataset: {},
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    width: 0,
    height: 0,
    children: [],
    firstElementChild: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    removeChild() {},
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; },
    focus() {},
    blur() {},
    contains() { return false; },
    closest() { return null; },
    getContext() { return ctx2d; },
  };
}

const documentStub = {
  getElementById() { return el(); },
  querySelector() { return el(); },
  querySelectorAll() { return []; },
  createElement() { return el(); },
  addEventListener() {},
  removeEventListener() {},
  body: el(),
  documentElement: { ...el(), requestFullscreen() { return Promise.resolve(); } },
  fullscreenElement: null,
  hidden: false,
  readyState: 'complete',
  activeElement: null,
  exitFullscreen() { return Promise.resolve(); },
};

function matchMediaStub() {
  return {
    matches: false,
    media: '',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  };
}

function audioParam() {
  return {
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
    cancelScheduledValues() {},
    setTargetAtTime() {},
  };
}
function audioNode() {
  return {
    gain: audioParam(),
    frequency: audioParam(),
    Q: audioParam(),
    type: '',
    buffer: null,
    connect() { return audioNode(); },
    disconnect() {},
    start() {},
    stop() {},
  };
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {};
    this.state = 'running';
  }
  createOscillator() { return audioNode(); }
  createGain() { return audioNode(); }
  createBiquadFilter() { return audioNode(); }
  createConvolver() { return audioNode(); }
  createBuffer(_channels, length) { return { getChannelData() { return new Float32Array(length); } }; }
  resume() { return Promise.resolve(); }
}

const store = new Map();
const localStorageStub = {
  getItem(k) { return store.has(String(k)) ? store.get(String(k)) : null; },
  setItem(k, v) { store.set(String(k), String(v)); },
  removeItem(k) { store.delete(String(k)); },
  clear() { store.clear(); },
};

// ── Assertion collector (injected as globals) ──────────────────────────────
const results = [];
function __expect(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail });
}

// ── Build the sandbox (this object IS the context's global) ────────────────
const sandbox = {
  document: documentStub,
  matchMedia: matchMediaStub,
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  localStorage: localStorageStub,
  navigator: { vibrate() { return true; }, userAgent: 'node-test', language: 'en' },
  location: { protocol: 'https:', href: 'https://test/', origin: 'https://test', reload() {} },
  performance: { now() { return 0; } },
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame() { return 0; },
  cancelAnimationFrame() {},
  setInterval() { return 0; },
  clearInterval() {},
  setTimeout() { return 0; },
  clearTimeout() {},
  confirm() { return false; },
  devicePixelRatio: 1,
  console,
  __expect,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

const ctx = vm.createContext(sandbox);

// ── Assertions, appended into the engine's own scope ───────────────────────
const assertions = `
;(function () {
  function play() { state.phase = 'play'; state.paused = false; bird.isBraking = false; bird.isDiving = false; }

  // Physics: a flap sets the upward impulse exactly.
  play(); bird.velocity = 4; doFlap();
  __expect('flap sets the upward impulse', bird.velocity === state.flap);

  // Physics: gravity accelerates the bird downward over a frame.
  play(); nearestPipeCache = null; state.dt = 1; bird.velocity = 0;
  var before = bird.velocity; updateBird();
  __expect('gravity accelerates downward', bird.velocity > before);

  // Physics: downward velocity never exceeds terminal fall.
  play(); nearestPipeCache = null; state.dt = 1; bird.velocity = 0;
  for (var i = 0; i < 800; i++) updateBird();
  __expect('respects terminal fall velocity', bird.velocity <= state.terminalFall + 1e-9);

  // Collision: circle-vs-rect primitive.
  __expect('circleHitsRect: clearly inside is a hit', circleHitsRect(50, 50, 10, 0, 0, 100, 100) === true);
  __expect('circleHitsRect: clearly outside is a miss', circleHitsRect(300, 300, 5, 0, 0, 10, 10) === false);
  __expect('circleHitsRect: edge contact is a hit', circleHitsRect(104, 50, 6, 0, 0, 100, 100) === true);

  // Collision: pipe intersection — safe in the gap, fatal in the body.
  var pipe = { x: bird.x - state.pipeWidth / 2, topHeight: 120 };
  bird.y = pipe.topHeight + state.gap / 2;
  __expect('no collision when centered in the gap', intersectsPipe(pipe) === false);
  bird.y = 8;
  __expect('collision when inside the top pipe', intersectsPipe(pipe) === true);

  // Emotion cascade is a pure function of state.
  play(); nearestPipeCache = null; bird.emotionTimer = 0; state.score = 0; bird.velocity = 0; updateEmotion();
  __expect('emotion is calm at rest with low score', bird.emotion === 'calm');
  play(); nearestPipeCache = null; bird.emotionTimer = 0; state.score = 8; bird.velocity = 0; updateEmotion();
  __expect('emotion is determined at score 8', bird.emotion === 'determined');
  play(); nearestPipeCache = null; bird.emotionTimer = 0; state.score = 0; bird.velocity = 3; updateEmotion();
  __expect('emotion is scared when falling fast', bird.emotion === 'scared');

  // RNG: seeded mode is deterministic; daily seed is stable for a date.
  var a = mulberry32(12345), b = mulberry32(12345);
  __expect('seeded RNG is deterministic', a() === b() && a() === b() && a() === b());
  __expect('dateSeed is stable for a given UTC date',
    dateSeed(new Date(Date.UTC(2026, 4, 30))) === dateSeed(new Date(Date.UTC(2026, 4, 30))));

  // Storage helpers: clamping + NaN fallback + persistence round-trip.
  localStorage.setItem('t-clamp', '999');
  __expect('readStoredNumber clamps to the max', readStoredNumber('t-clamp', 0, 0, 10) === 10);
  localStorage.setItem('t-nan', 'not-a-number');
  __expect('readStoredNumber falls back on NaN', readStoredNumber('t-nan', 5, 0, 10) === 5);
  writeStoredValue('t-rt', 7);
  __expect('writeStoredValue persists a value', localStorage.getItem('t-rt') === '7');

  // Invariant: the delta-time clamp that makes collision tunnel-proof exists.
  __expect('dt clamp keeps simulation bounded', CONFIG.DT_MAX >= 1 && CONFIG.DT_MAX <= 3);

  // Particle pool: under heavy churn it never exceeds its fixed capacity and the
  // wrapping free-list never leaks an inactive slot into the active list.
  (function () {
    initObjectPools();
    activeParticles.length = 0;
    for (var k = 0; k < 50; k++) spawnParticles(100, 100, 30, '#fff', 3);
    __expect('particle pool never exceeds capacity under churn',
      activeParticles.length <= CONFIG.PARTICLE_POOL);
    __expect('every particle in the active list is marked active',
      activeParticles.every(function (p) { return p.active === true; }));
  })();

  // Storage corruption recovery: malformed JSON must fall back to safe defaults,
  // never throw on boot.
  localStorage.setItem(SK.playedThemes, '{not valid json');
  __expect('readPlayedThemes recovers from malformed JSON',
    readPlayedThemes() instanceof Set && readPlayedThemes().has('sunset'));
  localStorage.setItem(SK.scoreHistory, 'garbage');
  __expect('readScoreHistory recovers from malformed JSON',
    Array.isArray(readScoreHistory()) && readScoreHistory().length === 0);
  localStorage.setItem(SK.unlocked, '[unterminated');
  __expect('readUnlockedAchievements recovers from malformed JSON',
    readUnlockedAchievements() instanceof Set);

  // Storage migration: legacy keys are namespaced and the schema tag is set.
  __expect('storage keys are namespaced under gb:', SK.best === 'gb:best' && SK.schema === 'gb:schema');
  __expect('legacy map points old best key at the namespaced one',
    LEGACY_KEY_MAP['flappy-best'] === SK.best);

  // Calendar-day streak transition (the retention fix): same day no-ops, the
  // next day increments, a gap resets, and a first-ever play starts at 1.
  __expect('day streak: same day is a no-op', nextDayStreak(3, 20260612, 20260612, 20260611) === 3);
  __expect('day streak: consecutive day increments', nextDayStreak(3, 20260611, 20260612, 20260611) === 4);
  __expect('day streak: a gap resets to 1', nextDayStreak(5, 20260601, 20260612, 20260611) === 1);
  __expect('day streak: first ever play is 1', nextDayStreak(0, 0, 20260612, 20260611) === 1);

  // dt/dtSec stay coupled on a zero-elapsed frame (two RAF callbacks, same timestamp).
  state.lastTimestamp = 1000;
  loop(1000);
  __expect('dtSec stays coupled to dt on a zero-elapsed frame',
    Math.abs(state.dtSec - state.dt / 60) < 1e-9);

  // ── Live gameplay coverage (closes the 500-point inspection's testing fails) ──

  // State machine: start → play → gameOver, with best + isNewBest side effects.
  (function () {
    state.phase = 'start'; state.paused = true; state.runsCount = 0;
    startGame();
    __expect('startGame transitions to play', state.phase === 'play' && state.paused === false);
    __expect('startGame increments the run counter', state.runsCount === 1);
    state.score = 7; state.best = 3; state.reducedMotion = true; state.afterglowActive = false;
    gameOver();
    __expect('gameOver transitions to gameOver', state.phase === 'gameOver');
    __expect('gameOver records a new best', state.best === 7 && state.isNewBest === true);
    state.reducedMotion = false;
  })();

  // Pipe spawning, scoring, and the 6-point speed ramp.
  (function () {
    play(); pipes.length = 0; state.score = 0; state.speedMultiplier = 1;
    state.maxSpeedMultiplier = 1.18; state.dt = 1; state.pipeSpawnTimer = 0;
    for (var i = 0; i < 6; i++) {
      pipes.push({ x: bird.x - state.pipeWidth - 1, topHeight: 100, baseTopHeight: 100,
        passed: false, isMoving: false, movePhase: 0, nearMissRecorded: false, shieldBubble: null });
    }
    updatePipes();
    __expect('passing six pipes scores six points', state.score === 6);
    __expect('speed multiplier ramps on the 6-point boundary', state.speedMultiplier > 1);
  })();

  // Moving pipe: topHeight oscillates within its vertical bounds over time.
  (function () {
    play(); pipes.length = 0; state.dt = 1; state.pipeSpawnTimer = 0;
    var mp = { x: 320, topHeight: 150, baseTopHeight: 150, passed: true, isMoving: true,
      movePhase: 0, nearMissRecorded: false, shieldBubble: null };
    pipes.push(mp);
    var h0 = mp.topHeight;
    for (var i = 0; i < 30; i++) updatePipes();
    __expect('a moving pipe oscillates its topHeight', mp.topHeight !== h0);
    __expect('a moving pipe stays within its vertical bounds',
      mp.topHeight >= 60 && mp.topHeight <= ground.y - state.gap - 60);
  })();

  // Shield bubble: spawns on the interval pipe and activates on contact.
  (function () {
    play(); pipes.length = 0; state.shieldActive = false;
    pipeCounter = CONFIG.SHIELD_INTERVAL - 1;
    spawnPipe();
    var sp = pipes[pipes.length - 1];
    __expect('a shield bubble spawns on the interval pipe', !!sp.shieldBubble);
    bird.x = sp.x + state.pipeWidth / 2;
    bird.y = sp.topHeight + state.gap / 2;
    state.dt = 1;
    updateShieldBubbles();
    __expect('flying into a shield bubble activates the shield', state.shieldActive === true);
    bird.x = CONFIG.BIRD_X;
  })();

  // Achievements: pure-predicate unlock + idempotent membership in the Set.
  (function () {
    play(); state.unlockedAchievements = new Set();
    state.score = 1; checkAchievements();
    __expect('FirstFlight unlocks at score 1', state.unlockedAchievements.has('FirstFlight'));
    __expect('ZenMaster is still locked below 15', !state.unlockedAchievements.has('ZenMaster'));
    state.score = 15; checkAchievements();
    __expect('ZenMaster unlocks at score 15', state.unlockedAchievements.has('ZenMaster'));
  })();

  // Daily-seed determinism (the FAIL #154 fix): the seeded gameplay RNG drives
  // pipe layout ONLY. Cosmetic spawners (particles, weather) draw from an
  // independent stream, so the SAME seed must yield identical pipes regardless of
  // theme or reduced-motion — even though those settings change how many cosmetic
  // draws happen between pipe spawns.
  (function () {
    function layout(seed, theme, reduced) {
      setSeededRNG(seed);
      state.theme = theme; state.reducedMotion = reduced;
      play(); pipes.length = 0; pipeCounter = 0; state.shieldActive = false;
      state.score = 20; state.dt = 1;
      var out = [];
      for (var i = 0; i < 12; i++) {
        spawnPipe();
        var p = pipes[pipes.length - 1];
        out.push(p.topHeight + '|' + (p.isMoving ? 1 : 0) + '|' + p.movePhase.toFixed(4));
        // Cosmetic spawners fire between pipes — they must NOT perturb the seeded stream.
        spawnParticles(100, 100, 8, '#fff', 3);
        spawnWeatherParticles();
      }
      return out.join(',');
    }
    var a = layout(424242, 'sunset', false);
    var b = layout(424242, 'meadow', true);
    __expect('daily-seed pipe layout is identical across theme + reduced-motion', a === b);
    __expect('a different daily seed yields a different pipe layout',
      a !== layout(999001, 'sunset', false));
    setUnseededRNG(); state.reducedMotion = false; state.theme = 'sunset'; pipes.length = 0;
  })();
})();
`;

try {
  vm.runInContext(source + '\n' + assertions, ctx, { filename: 'game.js' });
} catch (err) {
  console.error('Engine test harness failed to boot/execute game.js:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
}

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
}
if (failed.length) {
  console.error(`\nEngine tests FAILED: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`\nEngine tests passed: ${results.length}/${results.length}`);
