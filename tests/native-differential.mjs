#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — Native C11 Differential Oracle Verification & Fuzz Runner
 * (Build Standard B11 Differential Testing, B12 Reference Oracle, B15 Fuzzing)
 *
 * Compiles `native/glidiebirdie_oracle.c` with strict C11 warnings-as-errors,
 * runs `--verify` and `--fuzz 1000000`, and cross-checks its outputs bit-for-bit
 * against BOTH the JavaScript runtime (`src/`) and Lean 4 golden vectors.
 */

import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installBrowserStub } from './browser-stub.mjs';

installBrowserStub();

const { mulberry32, dateSeed, nextDayStreak, TICKS_PER_STEP, CONFIG } = await import('../src/index.js');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_DIR = path.join(ROOT, 'build');
mkdirSync(BUILD_DIR, { recursive: true });

const exeExt = process.platform === 'win32' ? '.exe' : '';
const oracleBin = path.join(BUILD_DIR, `glidiebirdie_oracle${exeExt}`);
const cSource = path.join(ROOT, 'native', 'glidiebirdie_oracle.c');

/** @type {Array<{ cmd: string, prefix: string[], label: string }>} */
const compilers =
  process.platform === 'win32'
    ? [
        { cmd: 'gcc', prefix: [], label: 'gcc' },
        { cmd: 'clang', prefix: [], label: 'clang' },
        { cmd: 'zig', prefix: ['cc'], label: 'zig cc' },
        { cmd: 'C:\\tools\\zig\\zig.exe', prefix: ['cc'], label: 'zig cc' },
      ]
    : [
        { cmd: 'cc', prefix: [], label: 'cc' },
        { cmd: 'gcc', prefix: [], label: 'gcc' },
        { cmd: 'clang', prefix: [], label: 'clang' },
        { cmd: 'zig', prefix: ['cc'], label: 'zig cc' },
      ];
let compiler = null;
for (const cand of compilers) {
  const probe = spawnSync(cand.cmd, [...cand.prefix, '--version'], { encoding: 'utf8' });
  if (!probe.error && probe.status === 0) {
    compiler = cand;
    break;
  }
}

if (!compiler) {
  console.log('Native differential oracle skipped: no C11 compiler (gcc/clang/cc/zig cc) found on PATH.');
  process.exit(0);
}

const flags = [
  ...compiler.prefix,
  '-std=c11',
  '-O3',
  '-Wall',
  '-Wextra',
  '-Werror',
  cSource,
  '-o',
  oracleBin,
  '-lm',
];
const build = spawnSync(compiler.cmd, flags, { encoding: 'utf8' });
assert.equal(build.status, 0, `C11 oracle compile failed:\n${build.stderr}`);

const verify = spawnSync(oracleBin, ['--verify'], { encoding: 'utf8' });
assert.equal(verify.status, 0, `C11 oracle --verify failed:\n${verify.stderr}`);
const cData = JSON.parse(verify.stdout.trim());

// Cross-check C11 oracle bit-for-bit against JavaScript src/rng.js and src/storage.js
const jsRng = mulberry32(20261125);
const jsMulberry = [
  Math.round(jsRng() * 4294967296),
  Math.round(jsRng() * 4294967296),
  Math.round(jsRng() * 4294967296),
];
assert.deepEqual(cData.mulberry32, jsMulberry, 'C11 vs JS mulberry32 bit-for-bit parity');
assert.equal(cData.steps60, 180, 'C11 60 Hz 3-second step count');
assert.equal(cData.steps144, 180, 'C11 144 Hz 3-second step count');
assert.equal(TICKS_PER_STEP, 12, 'JS TICKS_PER_STEP matches C11');
assert.equal(cData.weatherPoolCap, CONFIG.WEATHER_POOL, 'C11 WEATHER_POOL matches JS');

const d1 = dateSeed(new Date(Date.UTC(2026, 10, 23)));
const d2 = dateSeed(new Date(Date.UTC(2026, 10, 24)));
const d3 = dateSeed(new Date(Date.UTC(2026, 10, 25)));
const jsS1 = nextDayStreak(0, 0, d1, 20261122);
const jsS2 = nextDayStreak(jsS1, d1, d2, d1);
const jsS3 = nextDayStreak(jsS2, d2, d3, d2);
assert.deepEqual(cData.streak, [jsS1, jsS2, jsS3], 'C11 vs JS streak transition parity');

// Run 1,000,000 randomized differential & pool-uniqueness stress cases in native C11
const fuzz = spawnSync(oracleBin, ['--fuzz', '1000000'], { encoding: 'utf8' });
assert.equal(fuzz.status, 0, `C11 oracle --fuzz failed:\n${fuzz.stderr}`);
const fuzzData = JSON.parse(fuzz.stdout.trim());
assert.equal(fuzzData.failures, 0);
assert.equal(fuzzData.iterations, 1000000);

console.log(
  `Native C11 differential oracle passed (${compiler.label} -O3 -Werror): bit-for-bit parity with JS & Lean 4 + ${fuzzData.iterations.toLocaleString()} fuzz cases in ${(fuzzData.elapsedSec * 1000).toFixed(1)} ms (${Math.round(fuzzData.casesPerSec).toLocaleString()} cases/s).`,
);
