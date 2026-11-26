# Upgrading & Migration Guide (`UPGRADING.md`)

## Upgrading from `v3.1.0` to `v3.2.0`

- **Browser players:** No action required. `service-worker.js` bumps `CACHE_NAME` from `glidiebirdie-v3.1.0` to `glidiebirdie-v3.2.0`, automatically purging stale app-shell entries on activation while preserving all `gb:*` localStorage saves on schema `3`.
- **Corrupted achievement storage:** `readUnlockedAchievements()` now filters persisted entries through the canonical `ACHIEVEMENT_IDS` allowlist (`src/config.js`). Any unknown or hand-injected IDs are silently ignored on next load.
- **Local developers:** `tools/static-server.mjs` now enforces a strict public static asset allowlist (blocking `.git/`, `.env`, `package.json`, `tools/`, `tests/`, `scripts/`), supports IPv6 bind hosts via `HOST` and `PORT` environment variables (`npm run serve` no longer overrides `PORT`), and exposes `GET /healthz`. Run `npm run check && npm run fuzz && npm run mutate && npm run benchmark` after pulling.

## Upgrading from `v2.x` to `v3.x`

- **HTTP serving required (breaking change vs v2.x `file://`):** Because v3.1.0 refactored the engine into 20 native ES2022 modules (`<script type="module" src="game.js">`), opening `index.html` directly over `file://` fails browser CORS checks. Use `npm run serve` (`http://127.0.0.1:8000`) or any static HTTP server.
- **Automatic save migration (`v2` → `v3`):** `migrateLegacyStorage()` in `src/storage.js` runs once before first read when `gb:schema` is absent, migrating all 18 legacy `flappy-*` / `zen-*` / bare keys to `gb:*` keys. **Conflict behavior:** if `gb:schema` is absent and a destination `gb:*` key already exists alongside a legacy key, `migrateLegacyStorage()` keeps the existing `gb:*` destination value and deletes the conflicting legacy key. Users who have manually edited or mixed both legacy and `gb:*` key sets should back up browser `localStorage` before upgrading.
- **License change (`v2` → `v3.0.0`):** Relicensed from AGPL-3.0-or-later to MIT (code) + CC BY 4.0 (docs/white paper).
