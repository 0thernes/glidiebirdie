#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — Structured Adversarial Fuzzer (Build Standard B15)
 *
 * Executes 2,000 deterministic seeded fuzz cases across:
 *   1. tools/static-server.mjs HTTP request paths, encodings, dotfiles, private paths & methods
 *   2. src/storage.js JSON/achievement/number parsers, src/collision.js, src/timestep.js, src/input-queue.js
 *
 * Guarantees: zero 500 errors, zero private-file leaks (200 outside public allowlist),
 * zero uncaught parser exceptions, and unbroken invariants across all 2,000 adversarial inputs.
 */

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
  getInputQueueLength,
  msToTicks,
  mulberry32,
  nextDayStreak,
  readPlayedThemes,
  readScoreHistory,
  readStoredNumber,
  readUnlockedAchievements,
  scheduleInput,
} = await import('../src/index.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 0xf0222026;
const rand = mulberry32(SEED);

function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function rawRequest(port, method, rawPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: rawPath }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Part 1: 1,500 adversarial in-process engine/storage/collision/queue fuzz cases
const WEIRD_STRINGS = [
  '',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  '-Infinity',
  '{}',
  '[]',
  '[[[[[[[[[',
  '{"__proto__":{"polluted":true}}',
  '["FirstFlight","__proto__","constructor","toString",null,123,{}]',
  '"\\u0000\\uFFFF"',
  '1e309',
  '-1e309',
  '0xdeadbeef',
];

const WEIRD_NUMS = [NaN, Infinity, -Infinity, -0, 0, -1, 1, -1e12, 1e12, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 1e-308];

let engineCases = 0;
for (let i = 0; i < 1500; i++) {
  const payload =
    rand() < 0.5
      ? pick(WEIRD_STRINGS)
      : JSON.stringify(
          Array.from({ length: Math.floor(rand() * 8) }, () =>
            rand() < 0.3 ? pick(ACHIEVEMENT_IDS) : `fuzz_${Math.floor(rand() * 1e6)}`,
          ),
        );
  localStorage.setItem(SK.unlocked, payload);
  localStorage.setItem(SK.playedThemes, payload);
  localStorage.setItem(SK.scoreHistory, payload);
  localStorage.setItem(SK.best, payload);

  const unlocked = readUnlockedAchievements();
  for (const id of unlocked) assert.ok(ACHIEVEMENT_IDS.includes(id));
  const themes = readPlayedThemes();
  assert.ok(themes.size >= 1);
  const hist = readScoreHistory();
  assert.ok(Array.isArray(hist));
  const best = readStoredNumber(SK.best, 0, 0, 999999);
  assert.ok(Number.isFinite(best) && best >= 0 && best <= 999999);

  const v = rand() < 0.35 ? pick(WEIRD_NUMS) : (rand() - 0.5) * 1e6;
  const lo = rand() < 0.25 ? pick(WEIRD_NUMS) : (rand() - 0.5) * 1e4;
  const hi = rand() < 0.25 ? pick(WEIRD_NUMS) : (rand() - 0.5) * 1e4;
  const clamped = clampNumber(v, 0, lo, hi);
  assert.ok(Number.isFinite(clamped));

  const ticks = msToTicks(v);
  assert.ok(Number.isFinite(ticks));

  const hit = circleHitsRect(
    rand() < 0.2 ? pick(WEIRD_NUMS) : (rand() - 0.5) * 1000,
    rand() < 0.2 ? pick(WEIRD_NUMS) : (rand() - 0.5) * 1000,
    rand() < 0.3 ? pick(WEIRD_NUMS) : (rand() - 0.4) * 80,
    (rand() - 0.5) * 1000,
    (rand() - 0.5) * 1000,
    (rand() - 0.4) * 200,
    (rand() - 0.4) * 200,
  );
  assert.equal(typeof hit, 'boolean');

  const streak = nextDayStreak(
    rand() < 0.3 ? pick(WEIRD_NUMS) : Math.floor((rand() - 0.3) * 100),
    20261124 + Math.floor(rand() * 3),
    20261126,
    20261125,
  );
  assert.ok(Number.isInteger(streak) && streak >= 0);

  scheduleInput(rand() < 0.3 ? pick(WEIRD_NUMS) : rand() * 1e6, 'flap');
  assert.ok(getInputQueueLength() <= CONFIG.INPUT_QUEUE_CAP);
  if (i % 100 === 0) clearInputs();
  engineCases++;
}
clearInputs();

// Part 2: 500 adversarial HTTP fuzz requests against tools/static-server.mjs
const PRIVATE_TARGETS = [
  '/.git/HEAD',
  '/.git/config',
  '/.env',
  '/.env.example',
  '/.gitleaks.toml',
  '/.zenodo.json',
  '/.github/workflows/ci.yml',
  '/package.json',
  '/package-lock.json',
  '/tools/static-server.mjs',
  '/scripts/mutation-test.mjs',
  '/tests/engine-test.mjs',
  '/lean/Solution.lean',
  '/paper/main.tex',
  '/src/.hidden',
  '/dist/..%2fpackage.json',
  '/%2e%2e/%2e%2e/etc/passwd',
  '/..%5c..%5cpackage.json',
  '/src/%2e%2e/package.json',
  '/index.html%00.js',
  '/%ZZinvalid-percent',
  '/src//..//package.json',
  '/../glidiebirdie/package.json',
];
const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];

const port = 19000 + Math.floor(rand() * 9000);
const child = spawn(process.execPath, [path.join(ROOT, 'tools/static-server.mjs'), String(port)], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let httpCases = 0;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('fuzz static-server startup timeout')), 5000);
    child.stdout.on('data', (chunk) => {
      if (chunk.toString('utf8').includes('Static server listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`fuzz static-server exited prematurely (${code})`));
    });
  });

  // Deterministic pass over every private target first
  for (const target of PRIVATE_TARGETS) {
    const resp = await rawRequest(port, 'GET', target);
    assert.ok(
      resp.status === 400 || resp.status === 403 || resp.status === 404,
      `Private/adversarial path ${target} returned unexpected status ${resp.status}`,
    );
    assert.notEqual(resp.status, 200, `SECURITY LEAK: ${target} returned 200!`);
    httpCases++;
  }

  // Randomized adversarial HTTP fuzzing up to 500 total HTTP cases
  const segments = ['..', '%2e%2e', '.git', '.env', 'src', 'dist', 'tools', 'tests', '%00', '%5c', 'a'.repeat(64)];
  while (httpCases < 500) {
    const method = rand() < 0.75 ? 'GET' : pick(METHODS);
    const depth = 1 + Math.floor(rand() * 4);
    const rawPath =
      rand() < 0.35
        ? pick(PRIVATE_TARGETS)
        : '/' + Array.from({ length: depth }, () => pick(segments)).join('/');
    const resp = await rawRequest(port, method, rawPath);
    assert.ok(resp.status < 500, `Server 5xx on ${method} ${rawPath}: ${resp.status}`);
    if (method !== 'GET' && method !== 'HEAD') {
      assert.equal(resp.status, 405, `Non-GET/HEAD ${method} returned ${resp.status}`);
    } else {
      assert.notEqual(resp.status, 200, `Adversarial path ${rawPath} unexpectedly returned 200`);
    }
    httpCases++;
  }

  // Confirm server remains completely healthy after 500 adversarial requests
  const health = await rawRequest(port, 'GET', '/healthz');
  assert.equal(health.status, 200);
} finally {
  child.kill();
}

console.log(
  `Fuzzing passed: ${engineCases + httpCases} adversarial cases (${engineCases} parser/engine + ${httpCases} HTTP static-server), 0 crashes, 0 leaks.`,
);
process.exit(0);
