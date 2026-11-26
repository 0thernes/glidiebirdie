# Threat Model (`docs/threat-model.md`)

**System:** GlidieBirdie v3.2.0 (static client-side PWA + optional local zero-dependency static development server `tools/static-server.mjs`).

## Protected Assets

| Asset | Location | Security Objective |
| --- | --- | --- |
| **Browser UI & Script Integrity** | `index.html`, `game.js`, `src/*.js`, `style.css` | Prevent DOM XSS, script injection, and stale/poisoned PWA shell caches. |
| **Local Player Save State** | `localStorage` (`gb:*` schema `3`) | Prevent runtime crashes, NaN propagation, and unvalidated achievement/theme injection from corrupted or tampered storage. |
| **Host Developer Checkout Files** | `.git/`, `.env`, `package.json`, `tests/`, `scripts/`, `tools/` | Never expose non-public checkout files or host filesystem paths through `tools/static-server.mjs`. |
| **Formal & Release Artifacts** | `lean/`, `dist/*.pdf`, `dist/*.tar.gz`, `CHECKSUMS.sha256` | Prevent silent `sorry` proofs, forged PDFs/checksums, or overly broad CI signing permissions. |

## Trust Boundaries & Data-Flow Sketch

```text
[Player Input / Gamepad / URL Query]     [Tampered localStorage (gb:*)]
               |                                       |
               v                                       v
+-----------------------------------------------------------------------+
|  TRUST BOUNDARY 1: Browser Sandbox (CSP default-src 'self')           |
|  index.html -> game.js -> src/* (60 Hz loop, allowlisted storage)     |
|                 |                                                     |
|                 +--> service-worker.js (cleanKey SWR cache, same-orig)|
+-----------------------------------------------------------------------+
               ^
               | HTTPS (GitHub Pages) OR HTTP (local dev only)
               |
+-----------------------------------------------------------------------+
|  TRUST BOUNDARY 2: Optional Local Server (tools/static-server.mjs)    |
|  Raw URL pre-check -> IPv6 URL parse -> Public Allowlist + realpath   |
|  Allowed: index/css/js/sw/manifest, src/, icons/, blueprint/, dist/   |
|  Blocked (403): dotfiles (.git, .env), package.json, tools/, tests/   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
|  TRUST BOUNDARY 3: CI & Supply Chain (.github/workflows/*)            |
|  Minimal permissions (contents: read) -> SHA-pinned Actions ->        |
|  6-kernel Lean comparator + negative tamper test -> SLSA attestations |
+-----------------------------------------------------------------------+
```

1. **Browser Sandbox (`index.html`, `src/*.js`, `service-worker.js`)**: Untrusted inputs include URL query/hash strings, tampered `localStorage` values, corrupted JSON payloads, OS/browser media preference flips, and rapid keyboard/pointer/gamepad bursts.
2. **Local Static Server (`tools/static-server.mjs`)**: Untrusted inputs include raw HTTP request paths, URL-encoded path-traversal payloads (`%2e%2e%2f`, `..%5c`, `/%2e%2e/.env/../%2e%2e`), dotfiles, null bytes (`%00`), symlinks pointing outside the repository root, and unsupported HTTP methods.
3. **CI / Supply Chain (`.github/workflows/*`, `package-lock.json`, `lean/`)**: Untrusted inputs include compromised dev dependencies, unpinned GitHub Actions, overly broad OIDC token permissions, and forged/sorry-backed Lean proof files.

## STRIDE Analysis & Mitigations

| Threat (STRIDE) | Surface | Concrete Mitigation | Verification |
| --- | --- | --- | --- |
| **Spoofing / Tampering** | `localStorage` injection (`gb:unlocked-achievements`, `gb:theme`, `gb:best`, malformed JSON) | Strict `THEMES` & `ACHIEVEMENT_IDS` allowlists, finite-bound-safe `clampNumber`, JSON `try/catch` fallbacks (`src/storage.js`). | `tests/property-and-metamorphic.mjs`, `tests/fuzz-http-and-inputs.mjs` (1,500 cases), `M05` |
| **Tampering / XSS** | DOM updates & CSP | Zero `innerHTML` on user/storage data (`textContent` only); strict `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; ...">`. | `index.html`, `tests/static-checks.mjs`, CodeQL |
| **Information Disclosure / Path Traversal** | `tools/static-server.mjs` | Raw-URL pre-normalization dot-segment & backslash block (`403`), `decodeURIComponent` & null-byte guard (`400`), strict public asset allowlist (`403` for `.git/`, `.env`, `package.json`, `tools/`, `tests/`), `realpath` symlink confinement (`403`), `GET`/`HEAD`-only (`405`), IPv6-safe URL parsing, `nosniff` + `X-Frame-Options: DENY` + `Referrer-Policy: no-referrer`. | `tests/property-and-metamorphic.mjs`, `tests/fuzz-http-and-inputs.mjs` (500 HTTP fuzz cases), `M11` |
| **Denial of Service (Memory / Loop)** | Particle/weather pools, input queue, toast stack, render errors | Fixed capacities (`PARTICLE_POOL = 220`, `WEATHER_POOL = 140`, `INPUT_QUEUE_CAP = 64`), `NaN` tick rejection, toast cap (`<= 4`) with null guard, `FRAME_ERROR_BURST_LIMIT` cooldown. | `PoolAndQueue.lean`, `tests/engine-test.mjs`, `M06`, `M07`, `M12` |
| **Cache Poisoning / Stale Shell** | `service-worker.js` | Same-origin `GET` only, `cleanKey` normalization before legacy `request` lookup, `await cache.put()` inside `event.waitUntil`, versioned `CACHE_NAME` tied to `package.json`/`VERSION`. | `tests/smoke-test.mjs` |
| **Proof Forgery / Supply Chain** | `lean/`, CI | Zero-Mathlib Lean 4.35.0 (55 theorems), `VerifyAxioms.lean`, `leanchecker-paranoid`, 6-kernel `lake comparator --paranoid`, live negative kernel tamper test (`verify-negative-kernel.sh`), SHA-pinned Actions, job-scoped OIDC permissions, `gitleaks`, `npm audit`, `SHA256SUMS`, SLSA attestations on freshly built outputs. | `.github/workflows/ci.yml`, `.github/workflows/release.yml` |

## Accepted Residual Risks

- Client-side `localStorage` can be edited locally by the player via browser DevTools (no server-side leaderboard exists).
- GitHub Pages does not support custom HTTP response headers, so `frame-ancestors` cannot be enforced on `github.io` (documented in `.github/SECURITY.md` and `LIMITATIONS.md`).
