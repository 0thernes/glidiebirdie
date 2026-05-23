# Decisions

Architectural commitments made in this project.

## Zero dependencies

No npm packages, no CDN links, no build step. The entire game is three files: HTML, CSS, JS. This keeps deployment trivial and eliminates supply-chain risk.

## Procedural everything

All audio is synthesized via Web Audio API oscillators. All visuals are drawn via Canvas 2D. No image files, no audio files, no font files. The game is entirely self-contained.

## Monolithic game.js

The engine is one file by design. Splitting into modules would require a bundler or ES module imports, both of which violate the zero-dependency commitment. If the file grows past 1200 lines, reconsider.

## Canvas over DOM for game world

The bird, pipes, particles, and ground are canvas-rendered for performance. UI chrome (buttons, status text) is DOM-based for accessibility. Canvas elements are invisible to screen readers.

## Delta-time physics

All motion is multiplied by `state.dt` (normalized to 60fps). This guarantees consistent behavior across 60Hz, 144Hz, and 240Hz displays. The `dt` cap at 3× prevents physics explosions after lag spikes.

## Emotion-driven rendering

The bird's visual state is derived from an emotion enum, not direct properties. This centralizes visual logic and makes the character feel reactive. New emotions require updates to `drawBird()` and `updateEmotion()`.

## localStorage for persistence

Best score and settings are stored in `localStorage`. No backend, no cloud sync. The `try/catch` handles private mode and quota exceeded. No encryption — this is local-only data.

## Accessibility as a feature

ARIA, reduced motion, keyboard navigation, and screen reader support are built in from the start, not bolted on. Every new feature must include accessibility considerations.

## Theme system

Four visual themes (sunset, midnight, rain, aurora) each define complete color palettes for bird, ground, pipes, sky, and weather. Themes are stored in `localStorage` and applied via CSS class on `document.body`. The `BIRD_THEME_COLORS`, `GROUND_THEME_COLORS`, and `SKY_THEME_COLORS` constants are frozen lookup tables. New themes require entries in all three tables plus a music theme entry.

## Object pooling for particles and weather

Pre-allocated pools of 220 particles and 120 weather objects avoid garbage collection pressure during gameplay. Objects are marked `active: true` when spawned and `active: false` when dead. The `activeParticles` and `activeWeather` arrays hold references to live objects. This keeps frame times consistent.

## Web Audio scheduler for music

Music is scheduled on the AudioContext sample clock, not the JavaScript event loop. A 25ms interval calls `scheduleMusicAhead()` which schedules notes 0.1 seconds into the future. This eliminates timing drift. If the tab is throttled, the scheduler skips stale backlog rather than dumping notes.

## Customizer with live persistence

The Zen Customizer lets players adjust gravity, speed, music/SFX volume, and theme. All changes apply immediately and persist to `localStorage`. The drawer uses `inert` when closed, auto-pauses the game when opened, and restores focus on close. Physics values are derived from slider levels via lookup tables (`gravityMap`, `flapMap`, `speedMap`, `spawnIntervalMap`).

## Feather Shield power-up

Every 3rd pipe spawns a shield bubble in its gap. Collecting it sets `state.shieldActive = true`. On collision, the shield absorbs the hit, pops the bird upward, grants 95 frames of invincibility (`state.isInvincible`), and increments the shields-saved stat. The shield is a single-use item per collection.

## Stats and achievements

Four persistent stats (zen minutes, shields saved, runs completed, near misses) are stored in `localStorage` and displayed in the customizer drawer. Four achievements unlock based on gameplay milestones. Stats are saved immediately on significant events (run start, shield use, game over) and on `beforeunload`/`visibilitychange`.

## AGPL-3.0-or-later license

The project uses a copyleft license. If a modified version is run on a public server, the source must be offered to users. This is a deliberate choice for a browser-based game that users interact with remotely.
