# Threat Model (`docs/threat-model.md`)

**System:** GlidieBirdie v3.2.0 (static client-side PWA + optional local zero-dependency static development server `tools/static-server.mjs`).

## Trust Boundaries

1. **Browser Sandbox (`index.html`, `src/*.js`, `service-worker.js`)**: Untrusted inputs include URL query/hash strings, tampered `localStorage` values, corrupted JSON payloads, OS/browser media preference flips, and rapid keyboard/pointer/gamepad bursts.
2. **Local Static Server (`tools/static-server.mjs`)**: Untrusted inputs include raw HTTP request paths, URL-encoded path-traversal payloads (`%2e%2e%2f`, `..%5c`), null bytes (`%00`), symlinks pointing outside the repository root, and unsupported HTTP methods.
3. **CI / Supply Chain (`.github/workflows/*`, `package-lock.json`, `lean/`)**: Untrusted inputs include compromised dev dependencies, unpinned GitHub Actions, and forged/sorry-backed Lean proof files.

## STRIDE Analysis & Mitigations

| Threat (STRIDE) | Surface | Concrete Mitigation | Verification |
| --- | --- | --- | --- |
| **Spoofing / Tampering** | `localStorage` injection (`gb:unlocked-achievements`, `gb:theme`, `gb:best`, malformed JSON) | Strict `THEMES` & `ACHIEVEMENT_IDS` allowlists, finite numeric clamping (`clampNumber`), JSON `try/catch` fallbacks (`src/storage.js`). | `tests/property-and-metamorphic.mjs`, `M05` |
| **Tampering / XSS** | DOM updates & CSP | Zero `innerHTML` on user/storage data (`textContent` only); strict `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; ...">`. | `index.html`, `tests/static-checks.mjs`, CodeQL |
| **Information Disclosure / Path Traversal** | `tools/static-server.mjs` | `decodeURIComponent` guard (`400`), null-byte rejection (`400`), `path.relative()` root containment (`403`), `realpath` symlink confinement (`403`), `GET`/`HEAD`-only (`405`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`. | `tests/property-and-metamorphic.mjs` (HTTP contract + 16x concurrent suite) |
| **Denial of Service (Memory / Loop)** | Particle/weather pools, input queue, toast stack, render errors | Fixed capacities (`PARTICLE_POOL = 220`, `WEATHER_POOL = 140`, `INPUT_QUEUE_CAP = 64`), `NaN` tick rejection, toast cap (`<= 4`) with null guard, `FRAME_ERROR_BURST_LIMIT` cooldown. | `PoolAndQueue.lean`, `tests/engine-test.mjs`, `M06`, `M07` |
| **Cache Poisoning / Stale Shell** | `service-worker.js` | Same-origin `GET` only, `cleanKey` normalization before legacy `request` lookup, `await cache.put()` inside `event.waitUntil`, versioned `CACHE_NAME` tied to `package.json`/`VERSION`. | `tests/smoke-test.mjs` |
| **Proof Forgery / Supply Chain** | `lean/`, CI | Zero-Mathlib Lean 4.35.0, `VerifyAxioms.lean` allowlist, `leanchecker-paranoid`, 6-kernel `lake comparator --paranoid`, `gitleaks`, `npm audit`, `SHA256SUMS`, SLSA `actions/attest-build-provenance`. | `.github/workflows/ci.yml`, `.github/workflows/release.yml` |

## Accepted Residual Risks

- Client-side `localStorage` can be edited locally by the player via browser DevTools (no server-side leaderboard exists).
- GitHub Pages does not support custom HTTP response headers, so `frame-ancestors` cannot be enforced on `github.io` (documented in `.github/SECURITY.md` and `LIMITATIONS.md`).
