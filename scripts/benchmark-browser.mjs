#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — Reproducible Chromium CDP Browser Thermal & Frame Profiler
 *
 * Launches a local static-server against a target directory (default: repo root),
 * runs real headless Chromium (DPR 2, 1280x860) with DevTools Performance metrics
 * + rAF frame counting across four realistic states:
 *   1. idle_start (start overlay with gentle bird bob)
 *   2. idle_paused (paused run — verifies demand-driven 0 FPS sleep)
 *   3. active_rain (live flight in Rain theme with rain streaks)
 *   4. active_meadow (live flight in Meadow theme with sunbeams & pollen)
 *
 * Usage:
 *   node scripts/benchmark-browser.mjs [targetDir] [outputJson]
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDir = path.resolve(process.argv[2] || ROOT);
const outJson = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, 'results', 'browser-thermal.json');

const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('@playwright/test');

const port = 4200 + Math.floor(Math.random() * 500);
const serverScript = path.join(ROOT, 'tools', 'static-server.mjs');
const server = spawn(process.execPath, [serverScript, String(port)], {
  cwd: targetDir,
  stdio: ['ignore', 'pipe', 'pipe'],
});

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('static-server startup timeout')), 8000);
  server.stdout.on('data', (chunk) => {
    if (String(chunk).includes('Static server listening')) {
      clearTimeout(timer);
      resolve();
    }
  });
  server.on('error', (err) => {
    clearTimeout(timer);
    reject(err);
  });
});

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    localStorage.setItem('gb:tutorial-seen', 'true');
    localStorage.setItem('gb:schema', '3');
    /** @type {any} */ (window).__gbRafCalls = 0;
    const origRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) =>
      origRaf((ts) => {
        /** @type {any} */ (window).__gbRafCalls++;
        cb(ts);
      });
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');

  const getMetrics = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
  };

  const measure = async (label, durationMs = 2500, actionFn = null) => {
    await page.evaluate(() => {
      /** @type {any} */ (window).__gbRafCalls = 0;
    });
    const m0 = await getMetrics();
    if (actionFn) await actionFn();
    else await page.waitForTimeout(durationMs);
    const m1 = await getMetrics();
    const frames = await page.evaluate(() => /** @type {any} */ (window).__gbRafCalls);
    const taskMs = (m1.TaskDuration - m0.TaskDuration) * 1000;
    const scriptMs = (m1.ScriptDuration - m0.ScriptDuration) * 1000;
    const recalcStyleMs = (m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000;
    const layoutMs = (m1.LayoutDuration - m0.LayoutDuration) * 1000;
    return {
      label,
      durationMs,
      frames,
      fps: Number((frames / (durationMs / 1000)).toFixed(1)),
      taskMs: Number(taskMs.toFixed(2)),
      scriptMs: Number(scriptMs.toFixed(2)),
      recalcStyleMs: Number(recalcStyleMs.toFixed(2)),
      layoutMs: Number(layoutMs.toFixed(2)),
      taskMsPerFrame: frames > 0 ? Number((taskMs / frames).toFixed(3)) : 0,
      scriptMsPerFrame: frames > 0 ? Number((scriptMs / frames).toFixed(3)) : 0,
      recalcStyleCount: m1.RecalcStyleCount - m0.RecalcStyleCount,
      layoutCount: m1.LayoutCount - m0.LayoutCount,
      jsHeapMB: Number((m1.JSHeapUsedSize / (1024 * 1024)).toFixed(2)),
    };
  };

  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const cssAudit = await page.evaluate(() => {
    const backdropCount = [...document.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      return (
        (s.backdropFilter && s.backdropFilter !== 'none') ||
        (/** @type {any} */ (s).webkitBackdropFilter && /** @type {any} */ (s).webkitBackdropFilter !== 'none')
      );
    }).length;
    const bodyBeforeAnim = getComputedStyle(document.body, '::before').animationName;
    const canvasWillChange = getComputedStyle(document.getElementById('game')).willChange;
    return { backdropFilterElements: backdropCount, bodyBeforeAnimation: bodyBeforeAnim, canvasWillChange };
  });

  const idleStart = await measure('idle_start_2.5s', 2500);

  await page.locator('#game').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.click('#pauseToggle');
  await page.waitForTimeout(250);
  const idlePaused = await measure('idle_paused_2.5s', 2500);

  await page.click('#drawerToggle');
  await page.waitForTimeout(100);
  await page.click('.theme-btn[data-theme="rain"]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.locator('#game').focus();
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(300);
  const activeRain = await measure('active_rain_2.5s', 2500, async () => {
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(416);
      await page.keyboard.press('Space');
    }
  });

  await page.click('#drawerToggle');
  await page.waitForTimeout(100);
  await page.click('.theme-btn[data-theme="meadow"]');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.locator('#game').focus();
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(300);
  const activeMeadow = await measure('active_meadow_2.5s', 2500, async () => {
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(416);
      await page.keyboard.press('Space');
    }
  });

  const relTarget = path.relative(ROOT, targetDir).replaceAll('\\', '/') || '.';
  const result = {
    targetDir: relTarget,
    viewport: '1280x860@2x',
    cssAudit,
    idleStart,
    idlePaused,
    activeRain,
    activeMeadow,
  };
  mkdirSync(path.dirname(outJson), { recursive: true });
  writeFileSync(outJson, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
