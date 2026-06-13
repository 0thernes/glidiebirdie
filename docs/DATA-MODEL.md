<!-- markdownlint-disable MD013 -->

# GlidieBirdie — Data Model (ERM / ERD)

GlidieBirdie has **no backend, no accounts, and no relational database** — by
design (see [Design Boundaries](architecture_master_blueprint.md#design-boundaries)).
So this document models the two data domains that *do* exist:

1. **Persisted domain** — what lives in `localStorage` under the `gb:` namespace
   (the closest thing to a "schema" the game has).
2. **Runtime domain** — the in-memory entities the engine simulates each frame.

> **On ERP:** Enterprise Resource Planning has no meaningful surface here — there
> are no resources, inventory, finance, or HR processes to plan. A backend-less
> arcade toy's "ERP" is intentionally empty; the equivalent *operational* model
> is the CI/CD + release pipeline documented in [CI/CD](#cicd-operational-model).

---

## 1. Persisted entity model (localStorage)

Everything is scoped to a single browser origin = one implicit **PlayerProfile**.
There are no foreign keys at the storage layer (localStorage is a flat string
KV store); the diagram shows the *conceptual* relationships the code enforces.
Each entity is one or more `gb:*` keys read/written through the guarded `SK` map.

```mermaid
erDiagram
  PLAYER_PROFILE ||--|| SETTINGS : has
  PLAYER_PROFILE ||--|| BEST_SCORE : has
  PLAYER_PROFILE ||--|| STATS : has
  PLAYER_PROFILE ||--o{ SCORE_HISTORY : records
  PLAYER_PROFILE ||--o{ PLAYED_THEMES : "has tried"
  PLAYER_PROFILE ||--o{ UNLOCKED_ACHIEVEMENT : "has earned"
  PLAYER_PROFILE ||--|| SCHEMA_VERSION : "tagged with"

  SETTINGS {
    string theme "gb:theme — sunset|midnight|rain|aurora|meadow"
    int gravity "gb:gravity — 1..4"
    int speed "gb:speed — 1..4"
    float musicVolume "gb:music-volume — 0..1"
    float sfxVolume "gb:sfx-volume — 0..1"
    bool dailySeed "gb:daily-seed"
    bool fps "gb:fps"
    bool tutorialSeen "gb:tutorial-seen"
  }
  BEST_SCORE {
    int best "gb:best — all-time high"
  }
  STATS {
    int zenTimeSec "gb:zen-time-sec"
    int shieldsSaved "gb:shields-saved"
    int runs "gb:runs"
    int nearMisses "gb:near-misses"
    int longestSurvivalSec "gb:longest-survival-sec"
    int currentStreak "gb:streak — consecutive UTC days"
    int lastPlayedDay "gb:last-played-day — YYYYMMDD"
  }
  SCORE_HISTORY {
    int score "last <=50 run scores (JSON array)"
  }
  PLAYED_THEMES {
    string themeId "set of theme ids (JSON array)"
  }
  UNLOCKED_ACHIEVEMENT {
    string achievementId "set of ids (JSON array)"
  }
  SCHEMA_VERSION {
    string version "gb:schema — migration tag (currently 3)"
  }
```

### Migration contract

`migrateLegacyStorage()` runs **once per device**, before the first read in
`state`. If `gb:schema` is unset it copies each legacy key
(`flappy-best`, `zen-time-sec`, `current-streak`, …) to its `gb:*` equivalent
via `LEGACY_KEY_MAP`, deletes the old key, then stamps `gb:schema = "3"`.
This is what lets existing players keep their saves across the rename. All
reads/writes go through the `SK` constant — never a bare string — which the
brand-guard and code review can verify.

---

## 2. Runtime entity model (in-memory, per frame)

These objects live for the session (or a run) and are never persisted except
where they feed the STATS/SCORE_HISTORY entities above.

```mermaid
erDiagram
  STATE ||--|| BIRD : owns
  STATE ||--|| GROUND : owns
  STATE ||--o{ PIPE : "spawns (ring)"
  STATE ||--o{ PARTICLE : "pools (220)"
  STATE ||--o{ WEATHER : "pools (120)"
  PIPE ||--o| SHIELD_BUBBLE : "may carry"
  STATE ||--|| THEME : "applies (1 of 5)"
  STATE ||--o{ ACHIEVEMENT : "evaluates (12)"
  THEME ||--|| MUSIC_THEME : "paired with"

  STATE {
    string phase "start|play|gameOver"
    int score
    int best
    float dt "60fps-normalized"
    float dtSec "wall-clock seconds"
    bool shieldActive
    bool isInvincible
  }
  BIRD {
    float x
    float y
    float velocity
    string emotion "calm|happy|scared|determined|dizzy"
    bool isBraking
    bool isDiving
  }
  PIPE {
    float x
    float topHeight
    bool moving
    bool scored
  }
  PARTICLE {
    bool active "free-list flag"
    float x
    float y
    float life
  }
  ACHIEVEMENT {
    string id
    func check "pure predicate over STATE"
    func progress "display string"
  }
```

---

## 3. Key invariants

- **Single writer per key.** Only the `SK`-routed helpers mutate persisted state.
- **Bounded pools.** `PARTICLE` ≤ 220, `WEATHER` ≤ 120 — fixed-capacity, no
  per-frame allocation (see [`COMPLEXITY.md`](COMPLEXITY.md)).
- **Achievements are pure.** `check()` / `progress()` are read-only functions of
  `STATE`; adding one is an array entry + matching `#ach<Id>` markup.
- **Determinism.** In Daily-Seed mode, `PIPE` geometry is a pure function of
  `dateSeed()` → identical layout for everyone on a given UTC date.

---

## CI/CD operational model

The "operational planning" layer of a backend-less game is its release
pipeline, not an ERP. See [`architecture_master_blueprint.md`](architecture_master_blueprint.md#validation-and-release-flow)
and the workflows in `.github/workflows/` (CI, guardrail guard, Dependabot
auto-merge, post-deploy canary). The release/iteration board lives in
[`ROADMAP.md`](ROADMAP.md).
