#!/usr/bin/env node
/**
 * GlidieBirdie v3.2.0 — AMS-LaTeX Citation & BibTeX Hygiene Verifier
 *
 * Ensures every \cite{...} key in paper/main.tex exists in paper/references.bib,
 * zero duplicate BibTeX keys exist, zero unused BibTeX entries drift, and every entry
 * includes required author/title/year fields.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tex = fs.readFileSync(path.join(ROOT, 'paper/main.tex'), 'utf8');
const bib = fs.readFileSync(path.join(ROOT, 'paper/references.bib'), 'utf8');

const cited = new Set();
for (const m of tex.matchAll(/\\cite(?:\[[^\]]*\])?\{([^}]+)\}/g)) {
  for (const key of m[1].split(',').map((k) => k.trim()).filter(Boolean)) {
    cited.add(key);
  }
}

const defined = new Map();
for (const m of bib.matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n\}/g)) {
  const [, type, key, body] = m;
  assert.equal(defined.has(key), false, `Duplicate BibTeX entry key: ${key}`);
  assert.match(body, /\bauthor\s*=/i, `BibTeX entry ${key} missing author`);
  assert.match(body, /\btitle\s*=/i, `BibTeX entry ${key} missing title`);
  assert.match(body, /\byear\s*=/i, `BibTeX entry ${key} missing year`);
  defined.set(key, type);
}

assert.ok(cited.size > 0, 'paper/main.tex contains no citations');
for (const key of cited) {
  assert.ok(defined.has(key), `Missing BibTeX entry for cited key: ${key}`);
}
for (const key of defined.keys()) {
  assert.ok(cited.has(key), `Unused BibTeX entry in paper/references.bib: ${key}`);
}

console.log(`Citation hygiene passed: ${cited.size}/${defined.size} BibTeX keys resolved, 0 missing, 0 unused, 0 duplicates.`);
