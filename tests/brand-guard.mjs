// Brand guard — the trademark regression tripwire.
//
// The project was renamed off a prior trademarked name. This check fails the
// build if that mark ever reappears in a tracked text file, so the rename can
// never silently regress (a fresh asset, a copy-paste, an AI edit, etc.).
//
// The forbidden pattern is assembled from fragments so THIS file does not match
// itself. We match the retired two-word mark only (the F-word followed by the
// B-word, any separator) — not the bare prefix on its own, because the legacy
// storage migration keys intentionally retain that prefix and must stay allowed.
//
// Run: node tests/brand-guard.mjs   (part of `npm run check`)

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const FORBIDDEN = new RegExp(['flappy', 'bird'].join('[\\s_-]?'), 'i');

const TEXT_EXT = new Set([
  '.md', '.js', '.mjs', '.cjs', '.json', '.html', '.htm', '.css',
  '.yml', '.yaml', '.txt', '.webmanifest', '.xml', '.svg',
]);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

/** @param {string} dir */
async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, out);
    } else if (TEXT_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

const root = process.cwd();
const files = await walk(root);
const offenders = [];

for (const file of files) {
  if ((await stat(file)).size > 2_000_000) continue; // skip anything huge/binary-ish
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (FORBIDDEN.test(line)) {
      offenders.push(`${path.relative(root, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  });
}

if (offenders.length) {
  console.error('Brand guard FAILED — the retired trademark is present:\n');
  for (const o of offenders) console.error('  ' + o);
  console.error(`\n${offenders.length} occurrence(s). Rename to GlidieBirdie and re-run.`);
  process.exit(1);
}

console.log(`Brand guard passed — scanned ${files.length} text files, mark not present.`);
