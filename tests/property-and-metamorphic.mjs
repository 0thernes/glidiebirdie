// Property-based (prop_check), differential, metamorphic, negative, failure-injection,
// and concurrent HTTP contract tests (Build Standard B03, B05, B06, B09, B10, B11, B12, B14, B19, B20, B21).
// Pure zero-dependency Node ES module. Run: node tests/property-and-metamorphic.mjs

import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installBrowserStub } from './browser-stub.mjs';

installBrowserStub();

const {
  ACHIEVEMENT_IDS,
  CONFIG,
  SK,
  circleHitsRect,
  clampNumber,
  clearInputs,
  consumeInputs,
  dateSeed,
  getInputQueueLength,
  msToTicks,
  mulberry32,
  nextDayStreak,
  readPlayedThemes,
  readScoreHistory,
  readStoredNumber,
  readUnlockedAchievements,
  scheduleInput,
  writeStoredValue,
} = await import('../src/index.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function check(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (err) {
    results.push({ name, pass: false, detail: err instanceof Error ? err.message : String(err) });
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
  } catch (err) {
    results.push({ name, pass: false, detail: err instanceof Error ? err.message : String(err) });
  }
}

/** Lightweight seeded property-based runner (`prop_check`, Build Standard B10). */
function prop_check(trials, seed, body) {
  const rand = mulberry32(seed);
  for (let i = 0; i < trials; i++) {
    body(rand, i);
  }
}

// 1. Differential exactness: JS mulberry32 vs Lean 4.35.0 PhysicsBounds.mulberry32_golden_20261125
check('differential: JS mulberry32(20261125) matches Lean 4 UInt32 golden outputs bit-for-bit', () => {
  const r = mulberry32(20261125);
  const expected = [1176269751, 1461114176, 3047578727];
  for (const exp of expected) {
    const got = Math.round(r() * 4294967296);
    assert.equal(got, exp);
  }
});

// 2. Property-based + metamorphic + oracle geometry tests for circleHitsRect
check('prop_check (1000 trials): circleHitsRect matches exact reference oracle + translation & axis-swap invariance', () => {
  const oracle = (cx, cy, cr, rx, ry, rw, rh) => {
    if (!(cr > 0) || !(rw > 0) || !(rh > 0)) return false;
    const qx = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
    const qy = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
    return (cx - qx) ** 2 + (cy - qy) ** 2 < cr ** 2;
  };
  prop_check(1000, 0x51a70001, (rand) => {
    const cx = Math.floor((rand() - 0.5) * 600);
    const cy = Math.floor((rand() - 0.5) * 600);
    const cr = Math.floor((rand() - 0.15) * 60);
    const rx = Math.floor((rand() - 0.5) * 400);
    const ry = Math.floor((rand() - 0.5) * 400);
    const rw = Math.floor((rand() - 0.15) * 160);
    const rh = Math.floor((rand() - 0.15) * 160);
    const actual = circleHitsRect(cx, cy, cr, rx, ry, rw, rh);
    assert.equal(actual, oracle(cx, cy, cr, rx, ry, rw, rh));
    // Metamorphic translation invariance
    const dx = Math.floor((rand() - 0.5) * 500);
    const dy = Math.floor((rand() - 0.5) * 500);
    assert.equal(circleHitsRect(cx + dx, cy + dy, cr, rx + dx, ry + dy, rw, rh), actual);
    // Metamorphic 90-degree reflection / axis-swap symmetry
    assert.equal(circleHitsRect(cy, cx, cr, ry, rx, rh, rw), actual);
  });
});

// 3. Negative & floating-point stability tests (B06, B20)
check('negative & numeric stability: circleHitsRect rejects negative/zero radius, degenerate rect, and NaN/Inf', () => {
  assert.equal(circleHitsRect(50, 50, -10, 40, 40, 20, 20), false);
  assert.equal(circleHitsRect(50, 50, 0, 40, 40, 20, 20), false);
  assert.equal(circleHitsRect(50, 50, 10, 40, 40, 0, 20), false);
  assert.equal(circleHitsRect(50, 50, 10, 40, 40, -5, 20), false);
  assert.equal(circleHitsRect(50, 50, 10, 40, 40, 20, 0), false);
  assert.equal(circleHitsRect(NaN, 50, 10, 40, 40, 20, 20), false);
  assert.equal(circleHitsRect(50, Infinity, 10, 40, 40, 20, 20), false);
  assert.equal(circleHitsRect(50, 50, NaN, 40, 40, 20, 20), false);
});

// 4. Property-based clampNumber & msToTicks
check('prop_check (1000 trials): clampNumber bounds, idempotence, and non-finite / inverted-bound safety', () => {
  prop_check(1000, 0x51a70002, (rand) => {
    const lo = (rand() - 0.5) * 200;
    const hi = lo + rand() * 200;
    const v = (rand() - 0.5) * 1000;
    const fb = lo + (hi - lo) * 0.5;
    const c1 = clampNumber(v, fb, lo, hi);
    assert.ok(c1 >= lo && c1 <= hi);
    assert.equal(clampNumber(c1, fb, lo, hi), c1);
    assert.equal(clampNumber(NaN, fb, lo, hi), fb);
    assert.equal(clampNumber(Infinity, fb, lo, hi), fb);
    if (lo < hi) assert.equal(clampNumber(v, fb, hi, lo), fb);
  });
  assert.equal(msToTicks(NaN), 0);
  assert.equal(msToTicks(Infinity), 0);
  assert.equal(msToTicks(-Infinity), 0);
  prop_check(500, 0x51a70003, (rand) => {
    const a = rand() * 100000;
    const b = a + rand() * 1000;
    assert.ok(msToTicks(a) <= msToTicks(b));
  });
});

// 5. Exhaustive calendar dateSeed injectivity + prop_check nextDayStreak
check('exhaustive & prop_check: dateSeed injective over full leap year (366 days) & nextDayStreak invariants', () => {
  const seen = new Set();
  const base = Date.UTC(2024, 0, 1);
  for (let d = 0; d < 366; d++) {
    const seed = dateSeed(new Date(base + d * 86400000));
    assert.equal(seen.has(seed), false, `duplicate dateSeed ${seed}`);
    seen.add(seed);
  }
  assert.equal(seen.size, 366);
  prop_check(500, 0x51a70004, (rand) => {
    const prev = Math.floor((rand() - 0.2) * 50);
    const sSame = nextDayStreak(prev, 20261125, 20261125, 20261124);
    assert.ok(Number.isInteger(sSame) && sSame >= 0);
    const sNext = nextDayStreak(prev, 20261124, 20261125, 20261124);
    assert.equal(sNext, (prev >= 0 ? prev : 0) + 1);
    const sGap = nextDayStreak(prev, 20261120, 20261125, 20261124);
    assert.equal(sGap, 1);
  });
  assert.equal(nextDayStreak(NaN, 20261124, 20261125, 20261124), 1);
  assert.equal(nextDayStreak(-5, 20261125, 20261125, 20261124), 0);
});

// 6. Input queue cap + NaN rejection (locks Cycle 1 bug #2)
check('prop_check: scheduleInput strictly enforces INPUT_QUEUE_CAP (64) and rejects NaN timestamps', () => {
  clearInputs();
  scheduleInput(NaN, 'flap');
  scheduleInput(Infinity, 'flap');
  assert.equal(getInputQueueLength(), 0);
  for (let i = 0; i < 200; i++) {
    scheduleInput(1000 + i * 5, 'flap');
    assert.ok(getInputQueueLength() <= CONFIG.INPUT_QUEUE_CAP);
  }
  assert.equal(getInputQueueLength(), CONFIG.INPUT_QUEUE_CAP);
  let consumed = 0;
  consumeInputs(msToTicks(5000), () => consumed++);
  assert.equal(consumed, CONFIG.INPUT_QUEUE_CAP);
  assert.equal(getInputQueueLength(), 0);
});

// 7. Storage allowlist & failure injection (B06, B21)
check('failure injection & allowlist: readUnlockedAchievements strips unknown IDs and survives QuotaExceededError', () => {
  localStorage.setItem(
    SK.unlocked,
    JSON.stringify(['FirstFlight', '__proto__', 'EvilInjectedId', 42, null, 'ZenMaster']),
  );
  const loaded = readUnlockedAchievements();
  assert.equal(loaded.size, 2);
  assert.ok(loaded.has('FirstFlight') && loaded.has('ZenMaster'));
  for (const id of loaded) assert.ok(ACHIEVEMENT_IDS.includes(id));

  const origGet = localStorage.getItem;
  const origSet = localStorage.setItem;
  try {
    localStorage.getItem = () => {
      throw new Error('QuotaExceededError');
    };
    localStorage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    assert.equal(readStoredNumber(SK.best, 7, 0, 100), 7);
    assert.deepEqual(Array.from(readPlayedThemes()), ['sunset']);
    assert.deepEqual(readScoreHistory(), []);
    assert.equal(readUnlockedAchievements().size, 0);
    writeStoredValue(SK.best, 99);
  } finally {
    localStorage.getItem = origGet;
    localStorage.setItem = origSet;
  }
});

// 8. Concurrent HTTP contract & security tests against tools/static-server.mjs (B09, B19)
function rawRequest(port, method, rawPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: rawPath }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

await checkAsync('HTTP contract, allowlist & concurrency: static-server /healthz, private blocks, traversal 403, 16x GETs', async () => {
  const port = 18000 + Math.floor(Math.random() * 10000);
  const child = spawn(process.execPath, [path.join(ROOT, 'tools/static-server.mjs'), String(port)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('static-server startup timeout')), 5000);
      child.stdout.on('data', (chunk) => {
        if (chunk.toString('utf8').includes('Static server listening')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`static-server exited prematurely (${code})`));
      });
    });

    const health = await rawRequest(port, 'GET', '/healthz');
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).status, 'ok');
    assert.equal(health.headers['x-content-type-options'], 'nosniff');
    assert.equal(health.headers['x-frame-options'], 'DENY');

    const postResp = await rawRequest(port, 'POST', '/index.html');
    assert.equal(postResp.status, 405);

    const trav1 = await rawRequest(port, 'GET', '/%2e%2e%2fpackage.json');
    assert.equal(trav1.status, 403);
    const trav2 = await rawRequest(port, 'GET', '/..%5cpackage.json');
    assert.equal(trav2.status, 403);
    const nullByte = await rawRequest(port, 'GET', '/index.html%00.txt');
    assert.equal(nullByte.status, 400);

    // Devin security regression checks: non-public checkout files & dotfiles MUST return 403
    for (const priv of ['/.git/HEAD', '/.env', '/package.json', '/tools/static-server.mjs', '/.github/workflows/ci.yml']) {
      const privResp = await rawRequest(port, 'GET', priv);
      assert.equal(privResp.status, 403, `Expected 403 for private path ${priv}, got ${privResp.status}`);
    }

    // Allowed public directories serve cleanly, missing public file returns 404
    const bpResp = await rawRequest(port, 'GET', '/blueprint/index.html');
    assert.equal(bpResp.status, 200);
    const missing = await rawRequest(port, 'GET', '/src/nonexistent-404-file.js');
    assert.equal(missing.status, 404);

    // 16x concurrent requests across core app-shell assets
    const urls = ['/index.html', '/game.js', '/src/main.js', '/style.css', '/manifest.webmanifest', '/healthz'];
    const concurrent = await Promise.all(
      Array.from({ length: 16 }, (_, i) => rawRequest(port, 'GET', urls[i % urls.length])),
    );
    for (const r of concurrent) {
      assert.equal(r.status, 200);
      assert.equal(r.headers['x-content-type-options'], 'nosniff');
    }
  } finally {
    child.kill();
  }
});

const failed = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
}
if (failed.length) {
  console.error(`\nProperty/metamorphic/contract tests FAILED: ${failed.length}/${results.length}`);
  process.exit(1);
}
console.log(`\nProperty/metamorphic/contract tests passed: ${results.length}/${results.length}`);
process.exit(0);
