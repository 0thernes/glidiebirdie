<!-- markdownlint-disable MD013 -->

# GlidieBirdie — Architecture

A precise, diagram-backed walkthrough of how the game is built. Companion to
[`architecture_master_blueprint.md`](architecture_master_blueprint.md) (narrative) and
[`DATA-MODEL.md`](DATA-MODEL.md) (persistence ERD).

## 1. One-paragraph summary

GlidieBirdie is a **zero-dependency, canvas-rendered browser game** plus a tiny PWA
shell. There is no build step, no framework, and no backend. `index.html` is the semantic shell,
`style.css` is all presentation, and `game.js` loads native ES modules from `src/`. A fixed 60 Hz
simulation (720 Hz tick grid, so 60 Hz and 144 Hz land on the same steps) advances a single mutable
`state` object; rendering interpolates between steps. A `service-worker.js` caches the shell, including
every module. Everything is delivered as static files on GitHub Pages.

## 2. Component map

```mermaid
graph TD
  subgraph Static Delivery (GitHub Pages)
    HTML[index.html<br/>semantic shell + DOM contract]
    CSS[style.css<br/>layout · themes · a11y]
    JS[game.js + src/*.js<br/>native ES modules]
    SW[service-worker.js<br/>offline shell]
    MAN[manifest.webmanifest<br/>install metadata]
  end
  HTML -->|type=module| JS
  HTML -->|link| CSS
  HTML -->|link| MAN
  JS -->|register| SW
  JS -->|render| CANVAS[(canvas#game)]
  JS -->|persist| LS[(localStorage gb:*)]
  JS -->|synthesize| WA[(Web Audio graph)]
```

## 3. Engine internal structure (`game.js` + `src/*.js`)

The engine is organized into focused native ES modules under `src/` (no bundler):

```mermaid
graph LR
  CFG[src/config.js<br/>frozen tunables] --> STATE[src/state.js<br/>single source of truth]
  STATE --> UPD{src/physics.js}
  UPD --> PHYS[bird / emotion / eyes]
  UPD --> PIPES[pipes / spawn / cull]
  UPD --> FX[particles / weather pools]
  UPD --> COLL[src/collision.js]
  STATE --> DRAW{src/render.js}
  DRAW --> CACHE[sprite / sky / pipe caches]
  DRAW --> HUD[score / HUD / postcard / modals]
  LOOP[src/loop.js<br/>fixed 60 Hz on 720 Hz grid] --> UPD
  LOOP --> DRAW
  INPUT[src/input.js + input-queue.js] --> STATE
  STORAGE[src/storage.js] --> STATE
```

**Module boundaries:** `src/config.js` → `src/rng.js` → `src/storage.js` → `src/timestep.js` / `src/input-queue.js` → `src/state.js` → `src/dom.js` / `src/haptics.js` / `src/hooks.js` → `src/audio.js` → `src/collision.js` → `src/physics.js` → `src/render.js` → `src/achievements.js` → `src/ui.js` → `src/session.js` → `src/input.js` → `src/loop.js` → `src/main.js` (loaded by `game.js`).

## 4. The frame loop (data flow per frame)

```mermaid
sequenceDiagram
  participant rAF as requestAnimationFrame
  participant L as loop()
  participant S as stepSimulation()
  participant U as update()
  participant D as draw()
  rAF->>L: timestamp
  L->>L: pollGamepad() · map ms to 720 Hz tick grid
  loop up to MAX_FRAME_STEPS (5) per frame
    L->>S: step at 1/60 s (12 ticks, dt=1, dtSec=1/60)
    S->>S: snapshotPrev() · consumeInputs() · syncLocomotion()
    S->>U: if phase==play && !paused (or gameOver visual decay)
    U->>U: updateNearestPipeCache() · updateBird() · updateEmotion()
    U->>U: updatePipes() · updateShieldBubbles()
    U->>U: spawn/update weather · particles · checkCollisions()
  end
  L->>D: view.alpha clamped to [0, 1] · draw()
  D->>D: interpolated world (shake-wrapped) → HUD → modal / postcard
  L->>rAF: schedule next
```

**Invariant:** Gameplay physics only advance during active play in exact 1/60 s steps (`dt = 1`, `dtSec = 1/60`) on a 720 Hz grid; `gameOver` continues decaying shake/flashes/particles and the afterglow timer without advancing gameplay. Capping hitches at `MAX_FRAME_STEPS = 5` and clamping `view.alpha` to `[0, 1]` prevents collision tunneling and extrapolation jumps.

## 5. Rendering model

- One global transform matrix; `ctx.save()/restore()` strictly balanced.
- **Painter's algorithm:** background → pipes → shield bubbles → ground → bird trail → bird → bird shield → weather → particles → score → meters → flashes → vignette → FPS, then (outside the shake transform) the modal panel.
- **Screen shake** translates the whole world render but is applied *before* the modal, so game-over text never shakes.
- **Sprite caching:** the bird is pre-rendered to an offscreen canvas per `(theme, emotion)` — 25 small canvases — so the per-frame cost is one `drawImage` plus the dynamic wing/eyes overlay.
- **DPR awareness:** the canvas backing store is `420×640 × devicePixelRatio`; all drawing is in logical units via `setTransform(dpr,…)`.

## 6. Audio architecture

```mermaid
graph LR
  SFX_OSC[SFX oscillators] --> MG[masterGain]
  MUSIC_OSC[Music oscillators] --> MUG[musicGain] --> MG
  MG --> LP[lowpass]
  MG --> RV[convolver reverb]
  LP --> OUT[(destination)]
  RV --> WET[reverb wet gain] --> OUT
  SCHED[lookahead scheduler<br/>audio sample clock] --> MUSIC_OSC
```

Procedural only (no audio files). Music is scheduled on the **audio clock** (drift-free), routes through a dedicated `musicGain` bus so music fades never duck SFX, and the whole graph is lazily built on the first user gesture.

## 7. Persistence

All state persists to `localStorage` under a `gb:` namespace via a single `SK` key map, behind guarded
read/write helpers (clamp + NaN fallback + try/catch). A one-time `migrateLegacyStorage()` carries
pre-rebrand keys forward. The service-worker cache name is tied to `package.json` version. See
[`DATA-MODEL.md`](DATA-MODEL.md) for the full entity diagram.

## 8. Boot sequence

```text
onDprChange(rebuildSpriteCaches) → configureCanvasForDPR() → updateDerivedPhysics() → resetGame()
→ bindDrawerControls() → bindMobileControls() → bindTutorial()
→ registerServiceWorker() → syncUiState() → attach toolbar listeners
→ requestAnimationFrame(loop)
```

Linear, idempotent, and defensive (every DOM ref is optional-chained, so a missing element no-ops).

## 9. Key invariants (do not break)

| Invariant | Why it matters |
|---|---|
| `dt` clamped to `DT_MAX` | Collision tunneling-proof at any frame rate/preset |
| `dtSec` coupled to `dt` on zero-elapsed frames | Prevents `time` vs `elapsedSec` drift / cooldown stalls |
| Squash/stretch is visual-only | Hitbox stays predictable |
| Exponential decay uses `Math.pow(base, dt)` | Frame-rate-independent drag/shake |
| All storage via guarded helpers + `SK` map | Corruption-safe, namespaced, migratable |
| `globalAlpha` reset after each alpha pass | No accidental global translucency |
| Audio/storage wrapped in try/catch | Non-essential systems never crash a frame |

## 10. Extension points (how to add things safely)

- **New theme:** add a `THEME_TABLE` entry + a `body.theme-*` block in CSS + a music entry. Table-driven, no branching.
- **New tunable:** add to frozen `CONFIG`; never inline a magic number.
- **New persisted value:** add a key to `SK`, read via a guarded helper, document it in `DATA-MODEL.md`.
- **New effect:** spawn through the existing pools; never allocate in the hot loop.
- **New gate:** add a check to `npm run check`; if it touches `.github/`/`tests/`, expect the Guardrail check.

## 11. Constraints (architectural guardrails)

- No build step, no runtime dependencies, no backend, no remote assets/fonts/CDN.
- Do not add a bundler. Keep `style.css` as one file. New engine code belongs in `src/`.
- Keep the service worker tiny and app-shell-focused.
- `main` is PR-gated; every change flows branch → PR → CI → auto-merge.
