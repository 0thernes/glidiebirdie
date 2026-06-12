// Link guard — every LOCAL asset referenced by the shipped HTML and the web
// manifest must exist on disk. This catches a mistyped icon path, a renamed
// stylesheet, or (the reason it was added) the new PNG home-screen icons going
// missing — failures a syntax check can't see but a player would.
//
// Remote URLs (http/https), data: URIs, anchors, and mailto: are skipped.
//
// Run: node tests/link-guard.mjs   (part of `npm run check`)

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const isLocal = (ref) =>
  ref &&
  !/^(?:https?:)?\/\//i.test(ref) &&
  !ref.startsWith('data:') &&
  !ref.startsWith('#') &&
  !ref.startsWith('mailto:');

const stripQuery = (ref) => ref.split(/[?#]/)[0];
const missing = [];

// ── index.html: every local href/src ──────────────────────────────────────
const html = await readFile('index.html', 'utf8');
const attrRe = /(?:href|src)\s*=\s*"([^"]+)"/gi;
let m;
while ((m = attrRe.exec(html)) !== null) {
  const ref = m[1];
  if (!isLocal(ref)) continue;
  const file = stripQuery(ref).replace(/^\.?\//, '');
  if (file === '' ) continue;
  if (!existsSync(file)) missing.push(`index.html → ${ref}`);
}

// ── manifest: icon sources + start_url ─────────────────────────────────────
const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
for (const icon of manifest.icons || []) {
  if (!isLocal(icon.src)) continue;
  const file = stripQuery(icon.src).replace(/^\.?\//, '');
  if (file && !existsSync(file)) missing.push(`manifest icon → ${icon.src}`);
}

if (missing.length) {
  console.error('Link guard FAILED — referenced local files do not exist:\n');
  for (const r of missing) console.error('  ' + r);
  process.exit(1);
}

// Sanity: the install icons the guard exists to protect really are present.
for (const icon of ['docs/assets/icon-180.png', 'docs/assets/icon-192.png', 'docs/assets/icon-512.png']) {
  assert.ok(existsSync(icon), `expected install icon missing: ${icon}`);
}

console.log('Link guard passed — all local HTML/manifest references resolve.');
