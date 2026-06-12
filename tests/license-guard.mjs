// License guard — keeps the repo on the permissive MIT license it relicensed to.
//
// A consumer game wants to be forked/embedded freely; a stray AGPL reference (or
// a reverted LICENSE file) would quietly reintroduce copyleft obligations. This
// check fails the build if LICENSE.txt is not MIT or package.json drifts off it.
//
// Run: node tests/license-guard.mjs   (part of `npm run check`)

import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const license = await readFile('LICENSE.txt', 'utf8');
const pkg = JSON.parse(await readFile('package.json', 'utf8'));

assert.match(license, /^MIT License/, 'LICENSE.txt must be the MIT License');
assert.match(
  license,
  /Permission is hereby granted, free of charge/,
  'LICENSE.txt must contain the MIT grant text',
);
assert.doesNotMatch(license, /AGPL|GNU AFFERO|copyleft/i, 'LICENSE.txt must not contain copyleft terms');
assert.equal(pkg.license, 'MIT', 'package.json license must be "MIT"');

console.log('License guard passed — MIT in LICENSE.txt and package.json.');
