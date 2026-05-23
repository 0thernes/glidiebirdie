# Changelog

All notable changes to this project are documented here.

## [2.0.2] — Full Polish Audit

### Added

- Added a lightweight `service-worker.js` app-shell cache so PWA installs can reopen after the first localhost / HTTPS visit.
- Added GitHub Actions CI to run `npm run check` on pushes and pull requests.
- Extended smoke checks to validate service-worker registration, cache contents, service-worker syntax, and CI coverage.

### Fixed

- Removed stale tracked duplicate memory stubs under `.github/.memory/`; `.memory/` remains the canonical AI/project context.
- Aligned `game.js` section numbering and version comments with the current release.
- Updated PWA/offline documentation so it describes the real service-worker behavior.
- Made the first-run tutorial dismiss button start the first glide so the first phone tap feels responsive.

## [2.0.1] — 250-Point Audit Closure

### Fixed

- Capped the visible game canvas at the intended 420px logical width so desktop does not over-scale the playfield.
- Kept phone Brake / Flap / Dive controls fixed near the bottom of the viewport so touch controls stay reachable while playing.
- Prioritized the playable stage on narrow screens so phone players reach the game before the descriptive hero content.
- Moved drawer focus into the customizer on open and strengthened the focus trap when focus starts outside the drawer.
- Added smoke-test coverage for canvas sizing, mobile control reachability, mobile stage priority, and drawer focus recovery.
- Added `AUDIT-250.md`, a 250-point solo web-game audit and closure ledger.

## [2.0.0] — Comprehensive Quality & Mobile Pass

### Added — Mobile & Distribution

- **Mobile control bar** (Brake / Flap / Dive) visible on coarse pointers and narrow viewports.
- **PWA manifest** (`manifest.webmanifest`) for "Add to Home Screen" on iOS and Android.
- `apple-touch-icon`, `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `theme-color` meta tags.
- Open Graph `og:image` and Twitter `summary_large_image` cards.
- Fullscreen toggle (`F` key, button) using `requestFullscreen`.
- Haptic feedback via `navigator.vibrate` on flap / score / shield (Android Chrome).
- `resize` and `orientationchange` handlers re-configure the canvas DPR.
- AudioContext re-arms on `visibilitychange` so music returns after tab switch on iOS.
- Skip-link to canvas for keyboard-first navigation.
- First-run tutorial overlay (dismissable, remembers via `localStorage`).

### Added — Visual & Audio Polish

- **DPR-aware canvas** — sharp on Retina and high-DPI phones.
- **Offscreen sprite caches** for sky, clouds, and bird (per theme × emotion) — cuts per-frame canvas work.
- **Master gain + reverb + lowpass** audio graph; gentler timbre, real ambient space.
- **Audio-clock-scheduled SFX sequences** replace drifty `setTimeout` chains.
- **Music fade in/out** on start/stop/pause (no more hard cuts).
- **New Best** celebration: gold panel border, golden chime, particle burst.
- **Near-miss feedback**: brief sky-blue flash, sine ping, calm-meter bump.
- **Calm meter** visible during play (left edge).
- **Vignette** focuses the eye toward the center.
- **Game-over title** varies with score bracket.
- **4 rotating energy nodes** on the active shield (was 1).
- **Color-blind redundancy**: shield bubble carries an `S` glyph + ring; moving pipes also show a horizontal bar in addition to the red dot.

### Added — Game Design

- **Daily Seed mode** — deterministic mulberry32 RNG seeded by UTC date. Compare daily scores with friends.
- **12 achievements total** (was 4): added Calm Marathon, Featherweight, Featherlight, Streak Keeper, Brake Master, Diver, Iron Calm, Long Haul.
- **Achievement progress display** (e.g., `12/15`) on every milestone.
- **Reset stats** button.
- **Audio test** button for quick volume calibration without starting a run.
- **Longest survival** stat.
- **Current streak** stat (consecutive runs scoring ≥10).
- Bird drawer auto-resumes the game when closed (configurable in code).

### Fixed

- **Replaced AABB hitbox** on the bird with a true circle-vs-rect check — no more unfair corner hits.
- **`state.frames % 60` stats-sync interval** is now wall-clock seconds. Was fps-coupled (sync rate skewed at 144Hz).
- **Score-announcement spam** to screen readers throttled to every 5 pipes.
- **Achievement announcements** now name the specific milestone.
- **Frame-error rate limit** — sustained throw bursts cool down for 3 s instead of spamming 3,600 / min.
- **Drawer focus trap** — Tab cycles inside the drawer.
- **Drawer animation** uses `transform: translateX` (GPU) instead of animating `right` (layout).
- **Reduced-motion now also disables transitions**, not just animations.
- **iOS audio resume on tab return**.
- **Nearest-pipe cache** unified — was being computed twice per frame.

### Repo / Tooling

- Removed duplicate `.github/.memory/` directory (single source of truth: `.memory/`).
- Removed stray `.github/.github/` directory.
- Fixed `.gitignore` so `.vscode/` is no longer ignored while being committed (negated for the tracked files).
- Synced `cspell.json` ↔ `.vscode/settings.json` word lists.
- Fixed `.vscode/launch.json` port to match `package.json serve` script.
- Added `repository`, `bugs`, `homepage`, `keywords`, `engines` to `package.json`.
- Added `CLAUDE.md` for AI-assisted workflows.
- Improved `tests/smoke-test.mjs` to validate new features (PWA, mobile controls, manifest, expanded achievements).

### Documentation

- Removed false claims from README ("Touch-friendly controls" now matches actual touch support).
- Added browser support floor and PWA mention.
- Updated `.memory/decisions.md` — removed stale "1200-line ceiling" rule.

## [1.0.0] — Initial release

- Canvas 2D game world, DOM UI chrome, procedural Web Audio.
- Four themes, expressive bird, accessibility-first defaults.
- AGPL-3.0-or-later.
