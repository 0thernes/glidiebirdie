# Project Context for AI Assistants

This file is for Claude Code, Cursor, Copilot, Continue, and similar AI coding tools.
Read this first when you start a session in this repo.

## What this is

A **solo, vibe-coded, browser-first MVP** of a calm Flappy Bird variant. Single HTML, single
CSS, single game-engine JavaScript file, plus a tiny service worker for the offline app shell.
No build step. No bundler. No runtime dependencies.

The game runs on desktop browsers and phone browsers. It is intended to be installable as
a PWA on Android and iOS.

## Hard rules

- **No build step.** Never add Webpack, Vite, Rollup, Parcel, esbuild, or Turbopack.
- **No runtime dependencies.** Never add `npm install <runtime-package>`.
- **No remote assets.** No CDN imports, no Google Fonts, no analytics scripts.
- **No backend.** All state lives in `localStorage`.
- **Single `game.js` game-engine file** is intentional. Do not split it into modules.
- **Single `style.css` file** is intentional.
- **Vanilla DOM + Canvas 2D + Web Audio** only.
- **Service worker stays tiny.** It only caches the static app shell; no analytics, push, background sync, or remote dependencies.

## Soft preferences

- Add features by extending the existing structure rather than refactoring it.
- Group magic numbers in the `CONFIG` block at the top of `game.js`.
- Keep section comment dividers (`// ─── N. SECTION ───`) intact and update the index at the top.
- Naming: `camelCase` everywhere, action-first for functions (`doFlap`, `spawnParticles`).
- All time math must respect `state.dt` (60-fps-normalized) or `state.dtSec` (real seconds).
- All persistence must go through the guarded storage helpers, never `localStorage.setItem` directly.
- All ATs (screen readers) must be considered — use `announce()` for status changes.
- Respect `prefers-reduced-motion`, `prefers-contrast: more`, `prefers-reduced-transparency`, `forced-colors: active`.

## Where things live

- `game.js` — entire engine.
- `index.html` — semantic shell, ARIA, mobile controls, PWA tags.
- `style.css` — layered (base/layout/components/utilities), themed, reduced-motion aware.
- `manifest.webmanifest` — PWA install metadata.
- `service-worker.js` — offline app-shell cache for localhost / HTTPS installs.
- `tests/smoke-test.mjs` — regex + syntax smoke check.
- `.memory/` — the canonical AI context (decisions, preferences, security, quirks, instructions).
- `docs/assets/` — README screenshots.

## When in doubt

- Read `.memory/security.md` before any change involving storage, network, or DOM injection.
- Read `.memory/decisions.md` for architectural commitments.
- Read `.memory/preferences.md` for style.
- Read `.memory/quirks.md` for project-specific weirdness.

## Hot tip for LLMs

The whole project fits in one context window. Read every file before making changes —
faster than guessing, and the project is small enough that full context costs nothing.
