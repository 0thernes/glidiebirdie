// Zero-dependency static checks for game.js.
//
// Catches the exact bug classes that have slipped past `node --check` (which
// accepts ES6 duplicate keys) and the presence-only smoke test:
//   1. Duplicate keys inside the same object literal   (e.g. the meadow merge collision)
//   2. Duplicate achievement ids across array elements (e.g. two `id: 'ThemeExplorer'`)
//   3. Degenerate self-comparisons                     (e.g. `x > (x || 0)`, `x === x`)
//
// Pure Node, no packages — runs in the existing CI with no install step.
// Run: node tests/static-checks.mjs

import { readFile } from 'node:fs/promises';

const FILE = 'game.js';
const src = await readFile(FILE, 'utf8');

// Cached line-offset index: precompute newline positions once per source (O(n)),
// then resolve any offset → line number with a binary search (O(log n)) instead of
// the previous O(offset) re-scan. Behavior-identical to the old linear version;
// the cache key (`text`) makes it correct even if called with different sources.
let _lineSrc = null;
let _lineStarts = [0];

/** Convert a character offset to a 1-based line number (O(log n) via binary search). */
function lineAt(text, index) {
  if (text !== _lineSrc) {
    _lineSrc = text;
    _lineStarts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') _lineStarts.push(i + 1);
    }
  }
  // Largest line-start offset that is <= index.
  let lo = 0;
  let hi = _lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (_lineStarts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/**
 * Replace the contents of strings, template literals and comments with spaces,
 * preserving length and newlines so offsets/line numbers stay aligned.
 * This leaves only structural code: braces, identifiers, operators.
 */
function stripNonCode(text) {
  const out = text.split('');
  let i = 0;
  const n = text.length;
  const blank = (a, b) => {
    for (let k = a; k < b && k < n; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < n) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      let j = i + 2;
      while (j < n && text[j] !== '\n') j++;
      blank(i, j);
      i = j;
    } else if (c === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(text[j] === '*' && text[j + 1] === '/')) j++;
      blank(i, Math.min(n, j + 2));
      i = j + 2;
    } else if (c === "'" || c === '"' || c === '`') {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (text[j] === '\\') {
          j += 2;
          continue;
        }
        if (text[j] === quote) break;
        j++;
      }
      blank(i + 1, j); // keep the quote chars themselves
      i = j + 1;
    } else {
      i++;
    }
  }
  return out.join('');
}

const errors = [];

// ── Check 1 + helper: duplicate keys within an object literal ──────────────
// Walk the stripped source tracking brace scopes. A `{` is treated as an object
// literal when the previous non-space char is one of ( , = : [ or part of `=>`.
function checkDuplicateKeys(stripped, original) {
  /** @type {{isObject:boolean, keys:Map<string,number>}[]} */
  const stack = [];
  let prevNonSpace = '';
  let prevPrevNonSpace = '';

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') continue;

    if (ch === '{') {
      const isObject = ['(', ',', '=', ':', '[', '?'].includes(prevNonSpace) ||
        (prevNonSpace === '>' && prevPrevNonSpace === '='); // `=>` body (harmless: blocks rarely carry `ident:`)
      stack.push({ isObject, keys: new Map() });
    } else if (ch === '}') {
      stack.pop();
    } else if (ch === ':') {
      const top = stack[stack.length - 1];
      if (top && top.isObject) {
        // Look backwards for an identifier or numeric key immediately before the colon.
        let j = i - 1;
        while (j >= 0 && /\s/.test(stripped[j])) j--;
        let end = j + 1;
        while (j >= 0 && /[A-Za-z0-9_$]/.test(stripped[j])) j--;
        const key = stripped.slice(j + 1, end);
        // Only count when the char before the key is a structural boundary
        // ({ , or start) — avoids ternaries (`cond ? a : b`) and labels.
        let b = j;
        while (b >= 0 && /\s/.test(stripped[b])) b--;
        const boundary = stripped[b];
        if (key && /^[A-Za-z_$][\w$]*$/.test(key) && (boundary === '{' || boundary === ',')) {
          if (top.keys.has(key)) {
            errors.push(
              `Duplicate key "${key}" in object literal at ${FILE}:${lineAt(original, i)} ` +
                `(first seen line ${top.keys.get(key)})`,
            );
          } else {
            top.keys.set(key, lineAt(original, i));
          }
        }
      }
    }

    prevPrevNonSpace = prevNonSpace;
    prevNonSpace = ch;
  }
}

// ── Check 2: duplicate achievement ids ─────────────────────────────────────
function checkAchievementIds(text) {
  const start = text.indexOf('const ACHIEVEMENTS');
  if (start === -1) return;
  // Find the matching end of the array.
  const open = text.indexOf('[', start);
  if (open === -1) return;
  let depth = 0;
  let end = open;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = text.slice(open, end);
  const seen = new Map();
  const re = /\bid\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const id = m[1];
    const ln = lineAt(text, open + m.index);
    if (seen.has(id)) {
      errors.push(
        `Duplicate achievement id "${id}" at ${FILE}:${ln} (first seen line ${seen.get(id)})`,
      );
    } else {
      seen.set(id, ln);
    }
  }

  // Sanity: every achievement object should carry exactly one id and one check
  // function. If the counts diverge, an entry lost its id or gained a stray check
  // — a silent corruption the duplicate scan above would not surface.
  const checkCount = (block.match(/\bcheck\s*:/g) || []).length;
  if (seen.size > 0 && seen.size !== checkCount) {
    errors.push(
      `Achievement id/check count mismatch: ${seen.size} unique ids vs ${checkCount} check fns ` +
        `(a malformed achievement entry)`,
    );
  }
}

// ── Check 3: degenerate self-comparisons ───────────────────────────────────
function checkSelfCompare(stripped, original) {
  // 3a. Exact self-comparison: `X op X`
  const exact = /\b([A-Za-z_$][\w$.]*)\s*(===|!==|==|!=|>=|<=|>|<)\s*\1\b/g;
  let m;
  while ((m = exact.exec(stripped)) !== null) {
    errors.push(
      `Self-comparison "${m[1]} ${m[2]} ${m[1]}" at ${FILE}:${lineAt(original, m.index)} (always constant)`,
    );
  }
  // 3b. Self-compare against own fallback: `X op (X || ...)` — always degenerate.
  const fallback = /\b([A-Za-z_$][\w$.]*)\s*(===|!==|==|!=|>=|<=|>|<)\s*\(\s*\1\s*\|\|/g;
  while ((m = fallback.exec(stripped)) !== null) {
    errors.push(
      `Degenerate self/fallback comparison on "${m[1]}" at ${FILE}:${lineAt(original, m.index)} (always constant)`,
    );
  }
}

const stripped = stripNonCode(src);
checkDuplicateKeys(stripped, src);
checkAchievementIds(src);
checkSelfCompare(stripped, src);

if (errors.length) {
  console.error(`Static checks FAILED (${errors.length}):`);
  for (const e of errors) console.error('  • ' + e);
  process.exit(1);
}
console.log('Static checks passed.');
