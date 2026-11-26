# Frequently Asked Questions (`docs/faq.md`)

## Why does opening `index.html` directly from disk (`file://`) show a blank canvas?

Starting in `v3.1.0`, GlidieBirdie uses native ES2022 modules (`<script type="module" src="game.js">`). Browser security policy blocks ES module imports over `file://`. Run `npm run serve` (uses zero-dependency `tools/static-server.mjs`) and open `http://127.0.0.1:8000/`.

## Does GlidieBirdie solve any open problem in `unsolved-problems-mega-atlas`?

No — **0 / 1,900** problems retired. GlidieBirdie is a formally verified browser-game engineering artifact whose Lean 4.35.0 proofs certify its own software invariants (720 Hz fixed-step grid, circle-vs-rect collision geometry, calendar streak encoding, pool conservation, and `mulberry32` parity).

## Why use a 720 Hz tick grid if physics steps at 60 Hz?

`720 = lcm(60, 144)` and is evenly divisible by `60, 120, 144, 240, 360, and 720`. Quantizing wall time to 720 Hz integer ticks eliminates floating-point accumulator drift so hitch-free 60 Hz and 144 Hz displays execute the exact same 180 simulation steps over 3.0 s (`0.000 px` max drift across 30 paired seeds).

## Why are there zero runtime dependencies and zero bundler?

Browser standards (ES2022 modules, Canvas 2D, Web Audio, CSS Cascade Layers, Service Workers) natively supply everything needed. Shipping zero runtime packages eliminates supply-chain bloat and guarantees clean-clone longevity.

## How is accessibility verified?

Every CI run executes 7 Playwright Chromium end-to-end tests (`tests/e2e/smoke.spec.js`), including an automated `@axe-core/playwright` audit targeting WCAG 2.0/2.1/2.2 Levels A and AA (`0` violations), keyboard focus-trap assertions, `prefers-reduced-motion`, and unlayered `prefers-reduced-transparency`.

## Are player scores or telemetry sent to any server?

No. GlidieBirdie makes zero outbound network calls during gameplay. All settings and statistics remain strictly inside local browser `localStorage` (`gb:*` keys).
