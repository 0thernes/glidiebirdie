<!-- markdownlint-disable MD013 -->

# GlidieBirdie — System Diagrams

Visual companion to [`architecture_master_blueprint.md`](architecture_master_blueprint.md).
All diagrams are [Mermaid](https://mermaid.js.org/) and render natively on GitHub.

---

## 1. Component / container view

How the static app shell fits together at runtime. There is no backend and no
network data flow for gameplay — every box below ships as a static file.

```mermaid
flowchart TD
  subgraph Browser["Browser tab / installed PWA"]
    HTML["index.html<br/>semantic shell, ARIA, canvas host"]
    CSS["style.css<br/>themes, layout, a11y media queries"]
    JS["game.js<br/>engine: physics, render, audio, input, UI, persistence"]
    Canvas["&lt;canvas&gt; 420×640 logical<br/>DPR-scaled backing store"]
    LS[("localStorage<br/>gb:* namespace")]
    SW["service-worker.js<br/>stale-while-revalidate shell cache"]
    Cache[("Cache Storage<br/>glidiebirdie-v3.0.0")]
    WebAudio["Web Audio graph"]
  end

  Manifest["manifest.webmanifest<br/>+ docs/assets/icon-*.png"]

  HTML --> CSS
  HTML --> JS
  HTML --> Manifest
  JS --> Canvas
  JS --> LS
  JS --> WebAudio
  JS -- "register()" --> SW
  SW --> Cache
  HTML -. "first load + SWR refresh" .-> SW
```

---

## 2. Game phase state machine

`state.phase` is the single source of truth for lifecycle. `paused`,
`postcardMode`, and the `afterglow*` flags are orthogonal modifiers layered on
top of `play` / `gameOver`.

```mermaid
stateDiagram-v2
  [*] --> start
  start --> play: flap / tap / Space (first input)
  play --> play: flap, brake, dive, score
  play --> gameOver: collision (no shield)
  play --> play: collision absorbed by Feather Shield
  gameOver --> afterglow: worthy run (reduced-motion off)
  afterglow --> gameOver: reflection window elapses
  gameOver --> start: R / restart (resetGame)
  play --> paused: Esc / blur / drawer open
  paused --> play: Esc / resume
  play --> postcard: P
  postcard --> play: P / C (capture)
```

---

## 3. Frame loop (one `requestAnimationFrame` tick)

The loop is delta-time normalized: every motion term is multiplied by `state.dt`
(1.0 at 60 fps) so behavior is identical at 60/144/240 Hz. `dt` is clamped to
`DT_MAX` (3) so a lag spike can't tunnel the bird through a pipe.

```mermaid
sequenceDiagram
  participant RAF as requestAnimationFrame
  participant Loop as loop(ts)
  participant Upd as update()
  participant Draw as draw()
  RAF->>Loop: timestamp
  Loop->>Loop: dt = min((ts-last)/16.67, 3)
  Loop->>Loop: dtSec, elapsedSec, afterglow timer
  alt frame-error cooldown active
    Loop-->>RAF: schedule next, skip work
  else
    Loop->>Upd: update() (only if phase=play & !paused)
    Upd->>Upd: bird, pipes, shields, particles, weather
    Upd->>Upd: checkCollisions()
    Loop->>Draw: draw() (always — renders start/pause/gameover too)
  end
  Loop->>RAF: requestAnimationFrame(loop)
```

---

## 4. Audio signal graph

Built once on first user gesture (`ensureAudio`). SFX are scheduled on the
`AudioContext` sample clock (drift-free), never `setTimeout`.

```mermaid
flowchart LR
  Osc["Oscillators<br/>(flap, score, shield, music notes)"] --> MG["masterGain"]
  MG --> LP["lowpass biquad<br/>6 kHz"]
  LP --> Dest["destination (speakers)"]
  MG --> Conv["convolver<br/>procedural impulse"]
  Conv --> Wet["reverb wet gain"]
  Wet --> Dest
```

---

## 5. Persistence & daily-seed data flow

```mermaid
flowchart TD
  Boot["module eval"] --> Mig["migrateLegacyStorage()<br/>flappy-*/zen-* → gb:* (once)"]
  Mig --> Read["state reads via SK.* keys"]
  Event["game event<br/>(score, shield, theme, game over)"] --> Sync["syncStatsAndAchievements(save=true)"]
  Sync --> Write["writeStoredValue(SK.*, …) (guarded try/catch)"]
  Toggle["Daily Seed toggle"] --> Seed{"dailySeedMode?"}
  Seed -- on --> Seeded["setSeededRNG(dateSeed())<br/>mulberry32(YYYYMMDD)"]
  Seed -- off --> Unseeded["setUnseededRNG() → Math.random"]
  Seeded --> Pipes["deterministic pipe gaps"]
  Unseeded --> Pipes
```

See [`DATA-MODEL.md`](DATA-MODEL.md) for the entity model behind `gb:*`.
