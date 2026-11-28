# Environment & Configuration Reference (`docs/configuration.md`)

## 1. Local Static Server Environment Variables (`.env.example`)

The browser game itself requires **zero environment variables**. Optional variables configure only `tools/static-server.mjs`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind interface for the local zero-dependency static server |
| `PORT` | `8000` | Listen port (CLI argument `node tools/static-server.mjs 8080` overrides `PORT`) |

## 2. Player-Facing `localStorage` Keys (`gb:*`, Schema `3`)

All browser persistence routes through guarded helpers in `src/storage.js`:

| Key | Type / Bounds | Default |
| --- | --- | --- |
| `gb:schema` | `'3'` | Migrated automatically from v2 legacy keys |
| `gb:best` | Finite integer `>= 0` | `0` |
| `gb:theme` | One of `sunset`, `midnight`, `rain`, `aurora`, `meadow` | `sunset` |
| `gb:gravity` | Integer level `1..4` | `2` (Calm) |
| `gb:speed` | Integer level `1..4` | `2` (Chill) |
| `gb:music-volume` | Float `[0, 1]` | `0.6` |
| `gb:sfx-volume` | Float `[0, 1]` | `0.8` |
| `gb:daily-seed` | Boolean (`'true'`/`'false'`) | `false` |
| `gb:fps` | Boolean | `false` |
| `gb:tutorial-seen` | Boolean | `false` |
| `gb:unlocked-achievements` | JSON array filtered by `ACHIEVEMENT_IDS` | `[]` |
| `gb:score-history` | JSON array of finite numbers `>= 0` (max 50) | `[]` |
| `gb:played-themes` | JSON array filtered by `THEMES` | `['sunset']` |
| `gb:zen-time-sec`, `gb:shields-saved`, `gb:runs`, `gb:near-misses`, `gb:longest-survival-sec`, `gb:streak`, `gb:last-played-day` | Finite numbers `>= 0` | `0` |

## 3. OS / Browser Media Preferences Honored Automatically

- `prefers-reduced-motion: reduce`: disables idle bobbing, impact shake, weather spawning, trail particles, Afterglow auto-entry, haptics, and freezes decorative `state.time` during `gameOver`.
- `prefers-reduced-transparency: reduce`: disables `backdrop-filter` blur and switches all panels, drawers, overlays, and toasts to high-opacity solid surfaces via unlayered CSS rules.
