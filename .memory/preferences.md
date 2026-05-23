# Preferences

Style, tone, and design choices for this project.

## Tone

- Calm, forgiving, accessible.
- The bird is a character, not a sprite.
- Every feature should reduce stress, not add it.

## Naming

- Functions: `camelCase`, descriptive, action-first (`doFlap`, `spawnParticles`, `checkCollisions`).
- State properties: `camelCase`, nouns (`pipeSpawnTimer`, `speedMultiplier`).
- Constants: Not formally defined, but magic numbers are grouped in the `state` object.
- DOM element IDs: `camelCase` with descriptive names (`pauseToggle`, `srStatus`).

## CSS

- Use `@layer` for cascade ordering: base, layout, components, utilities.
- Use `clamp()` for fluid sizing.
- Use container queries (`@container`) for component-level responsiveness.
- Custom properties use `@property` for animatable types.
- Dark mode only. No light mode support planned.

## JavaScript

- Single quotes for strings (enforced by `.prettierrc`).
- Semicolons required.
- 2-space indentation.
- `try/catch` around any API that can throw (`localStorage`, `AudioContext`).
- No `var`. Use `const` and `let`.
- No frameworks. Vanilla JS only.
- `'use strict';` at the top of `game.js`.

## Accessibility

- Every interactive element needs keyboard access.
- Screen reader changes use `announce()` with `aria-live="polite"`.
- Respect `prefers-reduced-motion` everywhere motion exists.
- Respect `prefers-contrast: more` with stronger borders.

## Audio

- Procedural only. No external audio files.
- Default volume is low (`0.12` or lower).
- Music is ambient, not foreground.
