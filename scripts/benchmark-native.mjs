#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — Empirical JS V8 vs Zig-WASM vs Native C11 Microbenchmark
 *
 * Tests the exact same mulberry32 + 2x circle-vs-rect pipe collision kernel over
 * 2,000,000 iterations across four execution modes:
 *   1. Pure JavaScript (Node V8 JIT, zero bridge overhead)
 *   2. Zig -> wasm32-freestanding called per-iteration across the JS<->WASM boundary
 *   3. Zig -> wasm32-freestanding called in a single batched WASM loop
 *   4. Native C11 compiled with gcc/cc -O3
 *
 * Produces honest empirical data (results/native-comparison.json) answering whether
 * porting simulation logic to WASM/Zig/C/Rust solves browser laptop heat (ADR 0004).
 */

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD_DIR = path.join(ROOT, 'build');
const RESULTS_DIR = path.join(ROOT, 'results');
mkdirSync(BUILD_DIR, { recursive: true });
mkdirSync(RESULTS_DIR, { recursive: true });

const ITERS = 2_000_000;

function jsCircleHitsRect(cx, cy, cr, rx, ry, rw, rh) {
  if (!(cr > 0) || !(rw > 0) || !(rh > 0)) return 0;
  const closestX = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
  const closestY = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr ? 1 : 0;
}

function runJsKernel(iterations) {
  let st = 20261125 >>> 0;
  let hits = 0;
  for (let i = 0; i < iterations; i++) {
    st = (st + 0x6d2b79f5) >>> 0;
    let t = Math.imul(st ^ (st >>> 15), 1 | st) >>> 0;
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), 61 | t))) >>> 0;
    const r = (t ^ (t >>> 14)) >>> 0;
    const cy = r & 511;
    const topH = 60 + ((r >>> 9) & 255);
    hits += jsCircleHitsRect(112.0, cy, 14.76, 100.0, 0.0, 72.0, topH);
    hits += jsCircleHitsRect(112.0, cy, 14.76, 100.0, topH + 184.0, 72.0, 560.0 - (topH + 184.0));
  }
  return hits;
}

// Warmup JIT
runJsKernel(50_000);
const tJs0 = performance.now();
const jsHits = runJsKernel(ITERS);
const jsMs = performance.now() - tJs0;

const report = {
  iterations: ITERS,
  jsV8: {
    hits: jsHits,
    totalMs: Number(jsMs.toFixed(3)),
    nsPerIter: Number(((jsMs * 1e6) / ITERS).toFixed(2)),
  },
  zigWasmPerCallBoundary: null,
  zigWasmBatched: null,
  nativeC11: null,
};

// 2 & 3. Zig -> wasm32-freestanding (if zig installed)
const zigProbe = spawnSync('zig', ['version'], { encoding: 'utf8' });
if (!zigProbe.error && zigProbe.status === 0) {
  const wasmPath = path.join(BUILD_DIR, 'oracle.wasm');
  const zigBuild = spawnSync(
    'zig',
    [
      'build-exe',
      path.join(ROOT, 'native', 'oracle.zig'),
      '-target',
      'wasm32-freestanding',
      '-O',
      'ReleaseFast',
      '-fno-entry',
      '-rdynamic',
      `-femit-bin=${wasmPath}`,
    ],
    { encoding: 'utf8' },
  );
  if (zigBuild.status === 0) {
    const wasmBytes = readFileSync(wasmPath);
    const { instance } = await WebAssembly.instantiate(wasmBytes);
    const exportsObj = /** @type {any} */ (instance.exports);

    // Warmup
    exportsObj.bench_batch(50_000);

    // Batched WASM (zero per-call boundary crossing)
    const tWb0 = performance.now();
    const wbHits = exportsObj.bench_batch(ITERS) >>> 0;
    const wbMs = performance.now() - tWb0;
    assert.equal(wbHits, jsHits, 'Zig WASM batched hits must match JS exactly');
    report.zigWasmBatched = {
      zigVersion: zigProbe.stdout.trim(),
      wasmBytes: wasmBytes.length,
      hits: wbHits,
      totalMs: Number(wbMs.toFixed(3)),
      nsPerIter: Number(((wbMs * 1e6) / ITERS).toFixed(2)),
    };

    // Per-call JS <-> WASM boundary crossing (what happens if you only port leaf helpers)
    let st = 20261125 >>> 0;
    let wcHits = 0;
    const tWc0 = performance.now();
    for (let i = 0; i < ITERS; i++) {
      const r = exportsObj.mulberry32_step(st) >>> 0;
      st = (st + 0x6d2b79f5) >>> 0;
      const cy = r & 511;
      const topH = 60 + ((r >>> 9) & 255);
      wcHits += exportsObj.circle_hits_rect(112.0, cy, 14.76, 100.0, 0.0, 72.0, topH);
      wcHits += exportsObj.circle_hits_rect(112.0, cy, 14.76, 100.0, topH + 184.0, 72.0, 560.0 - (topH + 184.0));
    }
    const wcMs = performance.now() - tWc0;
    assert.equal(wcHits, jsHits, 'Zig WASM per-call hits must match JS exactly');
    report.zigWasmPerCallBoundary = {
      hits: wcHits,
      totalMs: Number(wcMs.toFixed(3)),
      nsPerIter: Number(((wcMs * 1e6) / ITERS).toFixed(2)),
    };
  }
}

// 4. Native C11 -O3 (if gcc/cc installed)
const exeExt = process.platform === 'win32' ? '.exe' : '';
const oracleBin = path.join(BUILD_DIR, `glidiebirdie_oracle${exeExt}`);
const cc = process.platform === 'win32' ? 'gcc' : 'cc';
const cBuild = spawnSync(
  cc,
  ['-std=c11', '-O3', '-Wall', '-Wextra', '-Werror', path.join(ROOT, 'native', 'glidiebirdie_oracle.c'), '-o', oracleBin, '-lm'],
  { encoding: 'utf8' },
);
if (!cBuild.error && cBuild.status === 0) {
  const cRun = spawnSync(oracleBin, ['--bench', String(ITERS)], { encoding: 'utf8' });
  if (cRun.status === 0) {
    const parsed = JSON.parse(cRun.stdout.trim());
    assert.equal(parsed.hits, jsHits, 'Native C11 hits must match JS exactly');
    report.nativeC11 = {
      compiler: cc,
      hits: parsed.hits,
      totalMs: parsed.totalMs,
      nsPerIter: parsed.nsPerIter,
    };
  }
}

writeFileSync(path.join(RESULTS_DIR, 'native-comparison.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
