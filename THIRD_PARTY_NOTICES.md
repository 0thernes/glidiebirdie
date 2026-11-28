# Third-Party Notices & Licensing Attribution (`THIRD_PARTY_NOTICES.md`)

## Runtime Shipped to Browsers

**Zero third-party runtime dependencies.** All browser HTML, CSS, ES2022 JavaScript (`game.js`, `src/*.js`), Canvas 2D procedural sprites, Web Audio procedural synthesis, raster PNG icons (`tools/generate-icons.mjs`), and service-worker code are original works licensed under the **MIT License** (`LICENSE.txt`), and documentation/manuscripts/figures (`paper/`, `dist/`, `docs/`, `README.md`) are licensed under **CC BY 4.0**.

## Offline Development & CI Tooling (`devDependencies` only — never shipped to browsers)

| Package | License | Purpose |
| --- | --- | --- |
| `eslint` / `@eslint/js` / `globals` | MIT | Static lint verification (`npm run lint`) |
| `@playwright/test` | Apache-2.0 | Headless Chromium E2E testing (`npm run test:browser`) |
| `@axe-core/playwright` | MPL-2.0 | Automated WCAG 2.2 AA accessibility auditing |
| `typescript` (ephemeral `npx -p typescript@5`) | Apache-2.0 | `checkJs` type checking (`npm run typecheck`) |
| `Lean 4` (`v4.35.0`, zero Mathlib) | Apache-2.0 | Formal kernel verification under `lean/` |
| `Tectonic` (`0.17.0`) | MIT | Offline AMS-LaTeX white-paper compilation (`paper/`) |

## Algorithm & Standards Attributions

- **Mulberry32 PRNG** (`src/rng.js`): Public-domain 32-bit PRNG algorithm attributed to Tommy Ettinger.
- **Fixed-timestep accumulator pattern** (`src/timestep.js`, `src/loop.js`): Classic pattern popularized by Glenn Fiedler (*Fix Your Timestep!*, 2004).
- **Circle-vs-AABB closest-point clamping** (`src/collision.js`): Standard computational geometry method (Christer Ericson, *Real-Time Collision Detection*, 2004).
