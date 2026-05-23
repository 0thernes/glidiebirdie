# Decisions

Architectural commitments made in this project.

## Zero dependencies

No npm packages, no CDN links, no build step. The playable app shell is HTML, CSS, one game-engine JS file, the web manifest, and a tiny service worker. This keeps deployment trivial and eliminates supply-chain risk.

## Procedural everything

All runtime audio is synthesized via Web Audio API oscillators. All runtime game visuals are drawn via Canvas 2D. No runtime image files, audio files, or font files are needed. The game is entirely self-contained.

## Monolithic game.js

The engine is one file (~2400 lines) by design. Splitting into modules would require a bundler or ES module imports, violating the zero-dependency commitment. Large monolithic files are fully accepted because a single file fits completely inside modern LLM context sizes, enabling clean, AI-native pairing.

`service-worker.js` is the only extra JavaScript file. It is not engine code. It only caches the static app shell for installed PWA use on localhost or HTTPS.

## Canvas over DOM for game world

The bird, pipes, particles, and ground are canvas-rendered for performance. UI chrome (buttons, status text) is DOM-based for accessibility. Canvas elements are invisible to screen readers.

## Delta-time physics

All motion is multiplied by `state.dt` (normalized to 60fps). This guarantees consistent behavior across 60Hz, 144Hz, and 240Hz displays. The `dt` cap at 3× prevents physics explosions after lag spikes.

## Emotion-driven rendering

The bird's visual state is derived from an emotion enum, not direct properties. This centralizes visual logic and makes the character feel reactive. New emotions require updates to `drawBird()` and `updateEmotion()`.

## localStorage for persistence

Best score and settings are stored in `localStorage`. No backend, no cloud sync. The `try/catch` handles private mode and quota exceeded. No encryption by design — score hacking is fully accepted as this is an open-source, hackable, and transparent browser game.

## Accessibility as a feature

ARIA, reduced motion, keyboard navigation, and screen reader support are built in from the start, not bolted on. Every new feature must include accessibility considerations.

## Theme system

Four visual themes (sunset, midnight, rain, aurora) each define complete color palettes for bird, ground, pipes, sky, and weather. Themes are stored in `localStorage` and applied via CSS class on `document.body`. The consolidated `THEME_TABLE` constant carries all per-theme palettes (bird/ground/sky/pipe/trail/particles); `musicThemes` carries the per-theme arpeggios. New themes require entries in both.

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

## AGPL-3.0-or-later license

The project uses a copyleft license. If a modified version is run on a public server, the source must be offered to users. This is a deliberate choice for a browser-based game that users interact with remotely.

## GitHub Actions CI

CI is intentionally small. It checks out the repo, installs Node.js, and runs `npm run check`. No package install is needed because the game has zero dependencies.
