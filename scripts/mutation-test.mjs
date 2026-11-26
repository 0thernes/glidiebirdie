#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — Surgical Mutation Testing Harness (Build Standard B13)
 *
 * Plants 10 single-line mutants across core engine modules, runs the full behavioral
 * & property test suite, verifies every mutant is KILLED (non-zero exit), and restores
 * the exact original file contents unconditionally in `finally`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MUTANTS = [
  {
    id: 'M01',
    file: 'src/collision.js',
    desc: 'Remove non-positive radius guard (allows negative radius collisions)',
    find: '!(cr > 0) ||',
    replace: 'false ||',
    suite: 'tests/property-and-metamorphic.mjs',
  },
  {
    id: 'M02',
    file: 'src/collision.js',
    desc: 'Invert circle-vs-rect squared distance inequality (< -> >)',
    find: 'return dx * dx + dy * dy < cr * cr;',
    replace: 'return dx * dx + dy * dy > cr * cr;',
    suite: 'tests/engine-test.mjs',
  },
  {
    id: 'M03',
    file: 'src/timestep.js',
    desc: 'Corrupt TICKS_PER_STEP away from exact LCM(60,144)/60=12',
    find: 'export const TICKS_PER_STEP = TICK_HZ / SIM_HZ;',
    replace: 'export const TICKS_PER_STEP = 10;',
    suite: 'tests/determinism.mjs',
  },
  {
    id: 'M04',
    file: 'src/storage.js',
    desc: 'Corrupt nextDayStreak consecutive-day increment (+1 -> +2)',
    find: 'if (lastDay === yesterday) return safePrev + 1;',
    replace: 'if (lastDay === yesterday) return safePrev + 2;',
    suite: 'tests/engine-test.mjs',
  },
  {
    id: 'M05',
    file: 'src/storage.js',
    desc: 'Remove ACHIEVEMENT_IDS allowlist filter in readUnlockedAchievements()',
    find: "typeof s === 'string' && ACHIEVEMENT_IDS.includes(s)",
    replace: "typeof s === 'string'",
    suite: 'tests/property-and-metamorphic.mjs',
  },
  {
    id: 'M06',
    file: 'src/input-queue.js',
    desc: 'Relax INPUT_QUEUE_CAP eviction guard (allows overflow beyond 64)',
    find: 'while (queue.length >= CONFIG.INPUT_QUEUE_CAP) queue.shift();',
    replace: 'while (queue.length >= CONFIG.INPUT_QUEUE_CAP + 20) queue.shift();',
    suite: 'tests/property-and-metamorphic.mjs',
  },
  {
    id: 'M07',
    file: 'src/physics.js',
    desc: 'Re-introduce clearWeatherPool free-list leak (drop freeWeather.push)',
    find: '    freeWeather.push(p.idx);\n  }\n  activeWeather.length = 0;',
    replace: '    /* leaked */\n  }\n  activeWeather.length = 0;',
    suite: 'tests/engine-test.mjs',
  },
  {
    id: 'M08',
    file: 'src/loop.js',
    desc: 'Re-introduce afterglowTimer frame-unit bug (state.dtSec -> state.dt)',
    find: '    state.afterglowTimer -= state.dtSec;',
    replace: '    state.afterglowTimer -= state.dt;',
    suite: 'tests/engine-test.mjs',
  },
  {
    id: 'M09',
    file: 'src/achievements.js',
    desc: 'Re-introduce resetStats immediate achievement re-grant (allowGrant=false -> true)',
    find: '  syncStatsAndAchievements(true, false);',
    replace: '  syncStatsAndAchievements(true, true);',
    suite: 'tests/engine-test.mjs',
  },
  {
    id: 'M10',
    file: 'src/audio.js',
    desc: 'Disable playToneAt zero-volume guard (allows RangeError scheduling)',
    find: 'if (!state.audioEnabled || !audioCtx || volume <= 0.0001) return;',
    replace: 'if (!state.audioEnabled || !audioCtx || volume < -1) return;',
    suite: 'tests/engine-test.mjs',
  },
];

let killed = 0;
let survived = 0;

console.log('========================================================================');
console.log(' GlidieBirdie v3.2.0 — SURGICAL MUTATION TESTING HARNESS (10 MUTANTS)');
console.log('========================================================================');

for (const m of MUTANTS) {
  const fullPath = path.join(ROOT, m.file);
  const original = fs.readFileSync(fullPath, 'utf8');
  if (!original.includes(m.find)) {
    console.error(`  [ERROR]    ${m.id}: Target pattern not found in ${m.file}`);
    survived++;
    continue;
  }
  const mutated = original.replace(m.find, m.replace);
  const t0 = performance.now();
  try {
    fs.writeFileSync(fullPath, mutated, 'utf8');
    const res = spawnSync(process.execPath, [path.join(ROOT, m.suite)], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000,
    });
    const dt = (performance.now() - t0).toFixed(0);
    if (res.status !== 0) {
      killed++;
      console.log(`  [KILLED]   ${m.id} (${m.file}): ${m.desc} (${dt} ms)`);
    } else {
      survived++;
      console.error(`  [SURVIVED] ${m.id} (${m.file}): ${m.desc} (${dt} ms)`);
    }
  } finally {
    fs.writeFileSync(fullPath, original, 'utf8');
  }
}

const pct = ((100 * killed) / MUTANTS.length).toFixed(1);
console.log('========================================================================');
console.log(` Mutation score: ${killed}/${MUTANTS.length} (${pct}%) killed, ${survived} survived.`);
console.log('========================================================================');

if (survived > 0) process.exit(1);
