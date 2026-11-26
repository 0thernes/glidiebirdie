# Glossary (`docs/glossary.md`)

| Term | Definition |
| --- | --- |
| **720 Hz Tick Grid** | Integer time lattice (`TICK_HZ = 720`, `TICKS_PER_STEP = 12`) chosen as `lcm(60, 144)` so 60 Hz and 144 Hz refresh rates execute identical 60 Hz simulation steps. |
| **Afterglow** | A calm 4.2-second post-run reflection state entered after notable flights (new best, score `>= 14`, heavy brake use, or `> 22 s` survival) when `prefers-reduced-motion` is off. |
| **App Shell** | The minimal static file set (`index.html`, `style.css`, `game.js`, `src/*.js`, `manifest.webmanifest`, PNG icons) precached by `service-worker.js` for offline PWA launches. |
| **CSS Cascade Layers** | Native `@layer` blocks in `style.css` organizing base, layout, component, and utility specificity; `@media (prefers-reduced-transparency: reduce)` sits unlayered at the end so it reliably overrides every layer. |
| **Daily Seed** | Deterministic UTC calendar date key (`YYYYMMDD` from `dateSeed()`) seeding `mulberry32` so all players experience identical pipe layouts on the same UTC day. |
| **Feather Shield** | Collectible orb spawning every 3rd pipe (`CONFIG.SHIELD_INTERVAL = 3`) that absorbs one pipe collision and grants `1.5 s` of invincibility. |
| **Free-List Pool** | Pre-allocated fixed-capacity array (`particlePool` 220, `weatherPool` 140) paired with an inactive-index stack enabling $O(1)$ spawn/reclaim with zero GC churn. |
| **Mutation Testing** | Planting deliberate single-line defects (`scripts/mutation-test.mjs`) to verify the baseline-gated automated test suite fails on every defect (`12/12 = 100.0%` killed). |
| **Palomar Comparator** | Lean 4.35.0's `lake comparator --paranoid`, verifying that sorry-free `Solution.lean` proves the exact signatures in statement-only `Challenge.lean` across multiple independent kernels. |
| **Serene Postcard** | Auto-paused snapshot composition mode (`P` key) centering the bird cleanly inside `try/finally` without mutating simulation coordinates, exportable as PNG (`C` key). |
| **Stale-While-Revalidate** | Service-worker caching policy serving the cached normalized app-shell asset immediately while awaiting a background network refresh and `cache.put()` via `event.waitUntil`. |
