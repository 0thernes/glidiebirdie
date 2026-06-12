# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- Added a fifth `Meadow` theme with its own palette, music loop, theme-color metadata, and gentle drifting pollen flecks that respect `prefers-reduced-motion`.
- Headless behavioral test harness (`tests/engine-test.mjs`) asserting physics, collision, emotion, RNG, and storage invariants — zero dependencies, wired into `npm run check`.
- Zero-dependency static checks (`tests/static-checks.mjs`) that fail CI on duplicate object keys, duplicate achievement ids, and self-comparisons.
- Automated type checking (`npm run typecheck`) via ephemeral TypeScript as a dedicated CI step; `game.js` is fully `checkJs`-clean.
- Strict Content-Security-Policy plus absolute `og:`/`twitter:` share metadata in `index.html`.
- `.github/dependabot.yml` to keep the SHA-pinned GitHub Actions current automatically.
- Hands-free autonomous merge pipeline: branch protection (required CI, PR-gated, force-push and deletion blocked) plus a Dependabot auto-merge workflow. Changes land automatically once CI is green, with no human clicks, while preserving full PR, CI, and git history.

### Changed

- SHA-pinned the GitHub Actions (`checkout`, `setup-node`) to commit SHAs for supply-chain safety.
- Consolidated the audit documentation down to a single canonical `AUDIT-250.md`.
- Reworked the Zen Customizer theme selector into an auto-fit grid so all five themes sit cleanly without the old awkward wrapping.
- Polished active theme buttons with a subtle lift and stronger theme-aware glow so selection feedback feels more intentional.
- Updated Theme Explorer achievement progress to track all available themes dynamically.
- Made `cspell.json` the single source of truth for spelling and removed the duplicate word list from `.vscode/settings.json` (the editor's Code Spell Checker reads `cspell.json` automatically), superseding the earlier "synced word lists" note.
- Reworked the README: deduplicated the two merged drafts down to one, corrected the `npm run check` description to its real five steps, documented the `P`/`C` Serene Postcard keys in the Controls table, and added `AGENTS.md`, the test files, and `CODE_OF_CONDUCT.md` to the Repository Map.
- Added the referenced `CODE_OF_CONDUCT.md` and removed the spent `SHIP-v2.2.md` and `docs/assets/pr-body-v2.2.md` release artifacts (the latter hardcoded a developer-machine path).
- Aligned the VS Code Python-server launch URLs with the `127.0.0.1` serve bind.

### Fixed

- Styled the toast notifications (achievement / share / Serene Postcard feedback); they previously rendered as unstyled default-flow elements because no CSS matched the injected `.toast` markup.
- Synced the FPS-counter toggle's checked state on load so the switch no longer shows OFF while the overlay is ON after a reload.

## [2.2.0] — Parallel Elevation (12-Build Superman Drop)

### Added

- **Cinematic new hero & social assets** — Beautiful wide meadow golden-hour banner and polished social preview card generated and integrated. The repo now looks as serene and inviting as the game plays.
- **Cute head crest on the bird** — Small expressive feather tuft added to every cached sprite (all themes + emotions). The bird feels even more like a living companion character.
- New "Superman Mode" badge and energetic LFG callout in README celebrating the 12 parallel Grok 4.3 build process that produced this elevation.

### Improved

- **README transformed** — Stunning new hero image at the top, clearer visual hierarchy, celebratory yet calm tone, updated Open Graph card to the new social preview. The landing experience on GitHub is now world-class.
- Updated version strings, headers, and meta across the project for the 2.2.0 Parallel Elevation.
- Minor ground and particle atmosphere already rich from prior work now complemented by the new crest and presentation assets.
- **Premium calm interactions** — Theme-aware focus rings + gentle scale lift on hover for toolbar buttons, mobile controls, theme selectors, and canvas. All micro-animations and transforms fully respect `prefers-reduced-motion` and forced-colors. The UI now feels even more special and cohesive with the five serene themes.

### Docs & Release

- This drop was forged in 12 simultaneous Grok 4.3 builds with full respect for the zero-dependency, single-file, accessibility-first, calm-core rules. LFG.

## [2.1.0] — Meadow & Visual Delight

### Added

- **New "Meadow" theme** — Golden-hour greens, warm sunlit bird, gentle flute-like arpeggios. Fifth distinct palette for even more calm variety.
- Enhanced high-score celebration with richer particle bursts and subtle screen emphasis (still respects `prefers-reduced-motion`).
- More expressive micro-animations on the bird (subtle body squash on strong flaps, livelier wing timing).

### Improved

- Refined theme button layout in the Zen Customizer for all five themes (now uses elegant auto-fit grid; active states feel premium and intentional).
- **Meadow theme now alive** — gentle drifting pollen / petal flecks with soft warm colors that match the palette, making the theme feel distinct and serene (low density, calm, respects reduced-motion). Organic 4-lobe petal rendering + living sparse grass tufts on the ground band with subtle wind sway (static in reduced-motion) for true "meadow" presence.
- All previous themes now fully table-driven with matching music and weather density.
- **Living Bird** — subtle breathing animation when calmly gliding (low-velocity, non-braking, non-diving calm/happy states). The bird now feels like a small companion.
- **Poetic Presence** — game-over titles, start, and pause messages rewritten with warmer, calmer language ("The wind carried you.", "The air welcomed you.", "The air is waiting."). New-best line feels like quiet recognition.
- **Shield collection** — added a soft warm low sine tail ("you are held"). The emotional reward is stronger and more calm.

### Docs & Release

- Continuing the Vibe & Soul direction under v2.1.0. All changes remain strictly zero-dependency, single-file, procedural, and fully respectful of reduced-motion and accessibility rules.

## [2.0.2] — Full Polish Audit

### Added

- Added a lightweight `service-worker.js` app-shell cache so PWA installs can reopen after the first localhost / HTTPS visit.
- Added GitHub Actions CI to run `npm run check` on pushes and pull requests.
- Extended smoke checks to validate service-worker registration, cache contents, service-worker syntax, and CI coverage.

### Fixed

- Cleaned up redundant and unreachable keyboard `ArrowDown` dive increment logic in `game.js` since coordinates and counts are already safely updated in `updateBird()`.
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
