// Behavioral tests against the real ES modules (no re-implemented physics).
// Run: node tests/engine-test.mjs

import { installBrowserStub } from './browser-stub.mjs';

installBrowserStub();

const api = await import('../src/index.js');
const {
  CONFIG,
  LEGACY_KEY_MAP,
  SK,
  activeParticles,
  bird,
  checkAchievements,
  circleHitsRect,
  dateSeed,
  doFlap,
  gameOver,
  ground,
  initObjectPools,
  intersectsPipe,
  loop,
  mulberry32,
  nextDayStreak,
  pipes,
  readPlayedThemes,
  readScoreHistory,
  readStoredNumber,
  readUnlockedAchievements,
  setSeededRNG,
  setUnseededRNG,
  sim,
  spawnParticles,
  spawnPipe,
  spawnWeatherParticles,
  startGame,
  state,
  updateBird,
  updateEmotion,
  updatePipes,
  updateShieldBubbles,
  writeStoredValue,
} = api;

const results = [];
function expect(name, pass, detail = '') {
  results.push({ name, pass: Boolean(pass), detail });
}

function play() {
  state.phase = 'play';
  state.paused = false;
  bird.isBraking = false;
  bird.isDiving = false;
}

api.resetGame();

play();
bird.velocity = 4;
doFlap();
expect('flap sets the upward impulse', bird.velocity === state.flap);

play();
sim.nearestPipeCache = null;
state.dt = 1;
bird.velocity = 0;
const before = bird.velocity;
updateBird();
expect('gravity accelerates downward', bird.velocity > before);

play();
sim.nearestPipeCache = null;
state.dt = 1;
bird.velocity = 0;
for (let i = 0; i < 800; i++) updateBird();
expect('respects terminal fall velocity', bird.velocity <= state.terminalFall + 1e-9);

expect('circleHitsRect: clearly inside is a hit', circleHitsRect(50, 50, 10, 0, 0, 100, 100) === true);
expect('circleHitsRect: clearly outside is a miss', circleHitsRect(300, 300, 5, 0, 0, 10, 10) === false);
expect('circleHitsRect: edge contact is a hit', circleHitsRect(104, 50, 6, 0, 0, 100, 100) === true);

{
  const pipe = { x: bird.x - state.pipeWidth / 2, topHeight: 120 };
  bird.y = pipe.topHeight + state.gap / 2;
  expect('no collision when centered in the gap', intersectsPipe(pipe) === false);
  bird.y = 8;
  expect('collision when inside the top pipe', intersectsPipe(pipe) === true);
}

play();
sim.nearestPipeCache = null;
bird.emotionTimer = 0;
state.score = 0;
bird.velocity = 0;
updateEmotion();
expect('emotion is calm at rest with low score', bird.emotion === 'calm');
play();
sim.nearestPipeCache = null;
bird.emotionTimer = 0;
state.score = 8;
bird.velocity = 0;
updateEmotion();
expect('emotion is determined at score 8', bird.emotion === 'determined');
play();
sim.nearestPipeCache = null;
bird.emotionTimer = 0;
state.score = 0;
bird.velocity = 3;
updateEmotion();
expect('emotion is scared when falling fast', bird.emotion === 'scared');

{
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  expect('seeded RNG is deterministic', a() === b() && a() === b() && a() === b());
  expect(
    'dateSeed is stable for a given UTC date',
    dateSeed(new Date(Date.UTC(2026, 4, 30))) === dateSeed(new Date(Date.UTC(2026, 4, 30))),
  );
}

localStorage.setItem('t-clamp', '999');
expect('readStoredNumber clamps to the max', readStoredNumber('t-clamp', 0, 0, 10) === 10);
localStorage.setItem('t-nan', 'not-a-number');
expect('readStoredNumber falls back on NaN', readStoredNumber('t-nan', 5, 0, 10) === 5);
writeStoredValue('t-rt', 7);
expect('writeStoredValue persists a value', localStorage.getItem('t-rt') === '7');

expect('dt clamp keeps simulation bounded', CONFIG.DT_MAX >= 1 && CONFIG.DT_MAX <= 3);

initObjectPools();
activeParticles.length = 0;
for (let k = 0; k < 50; k++) spawnParticles(100, 100, 30, '#fff', 3);
expect('particle pool never exceeds capacity under churn', activeParticles.length <= CONFIG.PARTICLE_POOL);
expect(
  'every particle in the active list is marked active',
  activeParticles.every((p) => p.active === true),
);

localStorage.setItem(SK.playedThemes, '{not valid json');
expect('readPlayedThemes recovers from malformed JSON', readPlayedThemes() instanceof Set && readPlayedThemes().has('sunset'));
localStorage.setItem(SK.scoreHistory, 'garbage');
expect('readScoreHistory recovers from malformed JSON', Array.isArray(readScoreHistory()) && readScoreHistory().length === 0);
localStorage.setItem(SK.unlocked, '[unterminated');
expect('readUnlockedAchievements recovers from malformed JSON', readUnlockedAchievements() instanceof Set);

expect('storage keys are namespaced under gb:', SK.best === 'gb:best' && SK.schema === 'gb:schema');
expect('legacy map points old best key at the namespaced one', LEGACY_KEY_MAP['flappy-best'] === SK.best);

expect('day streak: same day is a no-op', nextDayStreak(3, 20260612, 20260612, 20260611) === 3);
expect('day streak: consecutive day increments', nextDayStreak(3, 20260611, 20260612, 20260611) === 4);
expect('day streak: a gap resets to 1', nextDayStreak(5, 20260601, 20260612, 20260611) === 1);
expect('day streak: first ever play is 1', nextDayStreak(0, 0, 20260612, 20260611) === 1);

state.lastTimestamp = 1000;
state.clockReady = false;
loop(1000);
expect('dtSec stays coupled to dt on a zero-elapsed frame', Math.abs(state.dtSec - state.dt / 60) < 1e-9);

state.phase = 'start';
state.paused = true;
state.runsCount = 0;
startGame();
expect('startGame transitions to play', state.phase === 'play' && state.paused === false);
expect('startGame increments the run counter', state.runsCount === 1);
state.score = 7;
state.best = 3;
state.reducedMotion = true;
state.afterglowActive = false;
gameOver();
expect('gameOver transitions to gameOver', state.phase === 'gameOver');
expect('gameOver records a new best', state.best === 7 && state.isNewBest === true);
state.reducedMotion = false;

play();
pipes.length = 0;
state.score = 0;
state.speedMultiplier = 1;
state.maxSpeedMultiplier = 1.18;
state.dt = 1;
state.pipeSpawnTimer = 0;
for (let i = 0; i < 6; i++) {
  pipes.push({
    x: bird.x - state.pipeWidth - 1,
    topHeight: 100,
    baseTopHeight: 100,
    passed: false,
    isMoving: false,
    movePhase: 0,
    nearMissRecorded: false,
    shieldBubble: null,
  });
}
updatePipes();
expect('passing six pipes scores six points', state.score === 6);
expect('speed multiplier ramps on the 6-point boundary', state.speedMultiplier > 1);

play();
pipes.length = 0;
state.dt = 1;
state.pipeSpawnTimer = 0;
const mp = {
  x: 320,
  topHeight: 150,
  baseTopHeight: 150,
  passed: true,
  isMoving: true,
  movePhase: 0,
  nearMissRecorded: false,
  shieldBubble: null,
};
pipes.push(mp);
const h0 = mp.topHeight;
for (let i = 0; i < 30; i++) updatePipes();
expect('a moving pipe oscillates its topHeight', mp.topHeight !== h0);
expect('a moving pipe stays within its vertical bounds', mp.topHeight >= 60 && mp.topHeight <= ground.y - state.gap - 60);

play();
pipes.length = 0;
state.shieldActive = false;
sim.pipeCounter = CONFIG.SHIELD_INTERVAL - 1;
spawnPipe();
const sp = pipes[pipes.length - 1];
expect('a shield bubble spawns on the interval pipe', !!sp.shieldBubble);
bird.x = sp.x + state.pipeWidth / 2;
bird.y = sp.topHeight + state.gap / 2;
state.dt = 1;
updateShieldBubbles();
expect('flying into a shield bubble activates the shield', state.shieldActive === true);
bird.x = CONFIG.BIRD_X;

play();
state.unlockedAchievements = new Set();
state.score = 1;
checkAchievements();
expect('FirstFlight unlocks at score 1', state.unlockedAchievements.has('FirstFlight'));
expect('ZenMaster is still locked below 15', !state.unlockedAchievements.has('ZenMaster'));
state.score = 15;
checkAchievements();
expect('ZenMaster unlocks at score 15', state.unlockedAchievements.has('ZenMaster'));

function layout(seed, theme, reduced) {
  setSeededRNG(seed);
  state.theme = theme;
  state.reducedMotion = reduced;
  play();
  pipes.length = 0;
  sim.pipeCounter = 0;
  state.shieldActive = false;
  state.score = 20;
  state.dt = 1;
  const out = [];
  for (let i = 0; i < 12; i++) {
    spawnPipe();
    const p = pipes[pipes.length - 1];
    out.push(p.topHeight + '|' + (p.isMoving ? 1 : 0) + '|' + p.movePhase.toFixed(4));
    spawnParticles(100, 100, 8, '#fff', 3);
    spawnWeatherParticles();
  }
  return out.join(',');
}
const layoutA = layout(424242, 'sunset', false);
const layoutB = layout(424242, 'meadow', true);
expect('daily-seed pipe layout is identical across theme + reduced-motion', layoutA === layoutB);
expect('a different daily seed yields a different pipe layout', layoutA !== layout(999001, 'sunset', false));
setUnseededRNG();
state.reducedMotion = false;
state.theme = 'sunset';
pipes.length = 0;

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
}
if (failed.length) {
  console.error(`\nEngine tests FAILED: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`\nEngine tests passed: ${results.length}/${results.length}`);
