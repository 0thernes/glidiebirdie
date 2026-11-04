# Decisions

Architectural commitments made in this project.

## Zero dependencies

No runtime npm packages, no CDN links, no build step. Dev dependencies (ESLint, Playwright, axe-core) are tooling only. The playable app shell is HTML, CSS, native ES modules, the web manifest, and a tiny service worker. GitHub Pages serves the modules directly.

## Procedural everything

All runtime audio is synthesized via Web Audio API oscillators. All runtime game visuals are drawn via Canvas 2D. No runtime image files, audio files, or font files are needed. The game is entirely self-contained.

## Native ES modules

The engine lives in `src/` and is loaded by `game.js` with `type="module"`. There is no bundler. Modules import each other with explicit `.js` extensions so GitHub Pages can serve them. `src/hooks.js` breaks the one cycle between physics and the session lifecycle.

`service-worker.js` caches every module plus the HTML, CSS, and manifest.

## Canvas over DOM for game world

The bird, pipes, particles, and ground are canvas-rendered for performance. UI chrome (buttons, status text) is DOM-based for accessibility. Canvas elements are invisible to screen readers.

## Fixed-step physics

Simulation advances in exact 1/60 s steps on a 720 Hz integer tick grid (the least common multiple of 60 and 144). A hitch simulates at most five steps, then drops the backlog. Rendering interpolates with `view.alpha`. Inputs are queued by timestamp and applied on the step that covers them, so a daily-seed run does not depend on the display refresh rate.

## Emotion-driven rendering

The bird's visual state is derived from an emotion enum, not direct properties. This centralizes visual logic and makes the character feel reactive. New emotions require updates to `drawBird()` and `updateEmotion()`.

## localStorage for persistence

Best score and settings are stored in `localStorage`. No backend, no cloud sync. The `try/catch` handles private mode and quota exceeded. No encryption by design — score hacking is fully accepted as this is an open-source, hackable, and transparent browser game.

## Accessibility as a feature

ARIA, reduced motion, keyboard navigation, and screen reader support are built in from the start, not bolted on. Every new feature must include accessibility considerations.

## Theme system

Five visual themes (sunset, midnight, rain, aurora, meadow) each define complete color palettes for bird, ground, pipes, sky, and weather. Themes are stored in `localStorage` and applied via CSS class on `document.body`. The consolidated `THEME_TABLE` constant carries all per-theme palettes (bird/ground/sky/pipe/trail/particles); `musicThemes` carries the per-theme arpeggios. New themes require entries in both.

## Object pooling for particles and weather

Pre-allocated pools of 220 particles and 120 weather objects avoid garbage collection pressure during gameplay. Objects are marked `active: true` when spawned and `active: false` when dead. The `activeParticles` and `activeWeather` arrays hold references to live objects. This keeps frame times consistent.

## Web Audio scheduler for music

Music is scheduled on the AudioContext sample clock, not the JavaScript event loop. A 25ms interval calls `scheduleMusicAhead()` which schedules notes 0.1 seconds into the future. This eliminates timing drift. If the tab is throttled, the scheduler skips stale backlog rather than dumping notes.

## Customizer with live persistence

The Zen Customizer lets players adjust gravity, speed, music/SFX volume, and theme. All changes apply immediately and persist to `localStorage`. The drawer uses `inert` when closed, auto-pauses the game when opened, and restores focus on close. Physics values are derived from slider levels via lookup tables (`gravityMap`, `flapMap`, `speedMap`, `spawnIntervalMap`).

## Feather Shield power-up

Every 3rd pipe spawns a shield bubble in its gap. Collecting it sets `state.shieldActive = true`. On collision, the shield absorbs the hit, pops the bird upward (`SHIELD_POP_VELOCITY`), grants `SHIELD_INVINCIBILITY_SEC` of invincibility, and increments the shields-saved stat. The shield is single-use per collection. Pickup radius is generous (`SHIELD_PICKUP_BONUS`) to honor the calm thesis.

## Stats and achievements

Six persistent stats (zen minutes, shields saved, runs completed, near misses, longest survival seconds, current streak) are stored in `localStorage` and displayed in the customizer drawer. Twelve achievements unlock based on gameplay milestones, each with a live progress display. The `ACHIEVEMENTS` array is the single source of truth — adding one requires only an array entry plus matching `<div id="ach*">` markup. Stats throttle-save on `beforeunload` and `visibilitychange`.

## Mobile-first input

Mobile players are first-class. The on-screen control bar (Brake / Flap / Dive) gives the same depth as keyboard players. Touch handlers attach `pointerdown` / `pointerup` / `pointercancel` to mirror keyboard `keydown` / `keyup`. The bar is shown via `@media (pointer: coarse)` or `max-width: 540px`. Haptics via `navigator.vibrate` are best-effort.

## DPR-aware canvas

The canvas backing buffer is sized by `devicePixelRatio` (clamped to 3) so Retina and high-DPI phones render sharply. All drawing coordinates remain in logical 420×640 space; `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` is applied once on init and on `resize` / `orientationchange`.

## Audio graph

Web Audio routes: oscillator → master gain → [lowpass biquad → destination] + [convolver reverb → wet gain → destination]. The convolver buffer is procedurally generated (white noise with exponential decay). SFX sequences schedule on the audio clock (no `setTimeout` chains). Music start/stop uses gain ramps to avoid hard cuts.

## MIT license

The project uses a permissive MIT license (changed from AGPL-3.0 in v3.0.0). For a small, calm, open-source arcade toy the goal is to be enjoyed, forked, embedded, and learned from with the least possible friction — AGPL's network-copyleft obligations actively repelled that. MIT keeps it maximally remixable; attribution is the only ask.

## Name: GlidieBirdie (no trademarked name)

The game was renamed in v3.0.0 to drop a prior trademarked name and remove all IP exposure. A CI brand-guard (`tests/brand-guard.mjs`) fails the build if that trademark ever reappears in tracked files, so the rename can't silently regress.

## GitHub Actions CI

CI is intentionally small. It checks out the repo, installs Node.js, and runs `npm run check`. No package install is needed because the game has zero dependencies.
