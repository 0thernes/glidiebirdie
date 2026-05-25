# Assessment Deep Analysis

> Comprehensive hierarchical system decomposition of Flappy Bird — Calm Edition v2.0.2
> Generated: May 24, 2026

---

## 1. Repository Overview & Philosophy

**Project Identity:** A solo-built, browser-first Flappy Bird variant tuned for comfort, accessibility, and zero-dependency deployment.

**Core Philosophy (The "Calm Thesis"):**

- Less frustration → Larger gaps, slower pipes, softer gravity, forgiving hitboxes
- Better mobile play → Fixed on-screen Brake/Flap/Dive controls
- Better readability → High-contrast UI, expressive bird states
- More player control → Brake, dive, theme selection, physics tuning
- Better reliability → DPR-aware canvas, normalized delta-time physics
- Better inclusion → Keyboard, ARIA, reduced-motion, focus management

**Hard Constraints (Non-Negotiable):**

| Constraint                  | Rationale                          |
| --------------------------- | ---------------------------------- |
| No build step               | Static hosting must be sufficient  |
| No runtime dependencies     | Zero supply-chain risk             |
| No backend                  | No network data flow for gameplay  |
| No module split for game.js | Fits in LLM context, zero bundler  |
| No remote assets            | Self-contained, offline-capable    |
| No CDN imports              | Eliminates external failure points |

---

## 2. File System Hierarchy

```text
flappy-bird-calm-edition/
├── .claude/
│   └── settings.local.json          # Claude-specific workspace settings
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── accessibility_feedback.yml
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── workflows/
│   │   └── ci.yml                   # GitHub Actions: runs npm run check
│   ├── copilot-instructions.md      # Fast-start guide for AI assistants
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── SECURITY.md
├── .memory/                         # Canonical project notes (AI context)
│   ├── instructions.md              # Behavior rules for Copilot/AI
│   ├── quirks.md                    # Non-obvious breakage patterns
│   ├── preferences.md               # Style, naming, design choices
│   ├── decisions.md                 # Architecture commitments
│   └── security.md                  # Security rules (read before any change)
├── .vscode/
│   ├── extensions.json
│   ├── launch.json
│   └── settings.json
├── docs/
│   ├── architecture_master_blueprint.md   # Runtime structure deep-dive
│   ├── audit_strict_250_point_inspection.md
│   ├── assessment_deep_analysis.md    # ← THIS FILE
│   └── assets/
│       └── flappy-calm-edition-preview.png
├── tests/
│   └── smoke-test.mjs               # 50+ assertion repo safety checks
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .markdownlint.json
├── .markdownlintignore
├── .prettierrc
├── AUDIT-250.md                     # 250-point audit closure ledger
├── CHANGELOG.md
├── CLAUDE.md                        # AI assistant project context
├── CONTRIBUTING.md
├── cspell.json
├── game.js                          # 🧠 ENTIRE RUNTIME ENGINE (~2400 lines)
├── index.html                       # 🏗️ Semantic shell, canvas host, UI
├── jsconfig.json
├── LICENSE.txt                      # AGPL-3.0-or-later
├── manifest.webmanifest             # 📱 PWA install metadata
├── package.json                     # v2.0.2, zero dependencies
├── README.md
├── service-worker.js                # 🔧 Minimal offline app-shell cache
├── style.css                        # 🎨 Layout, themes, accessibility
└── SUPPORT.md
```

---

## 3. System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER ENVIRONMENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   index.html │    │   style.css │    │   game.js   │    │ manifest    │   │
│  │  (Semantic   │◄──►│  (Design    │◄──►│  (Runtime   │◄──►│  (PWA       │   │
│  │   Shell)     │    │   System)   │    │   Engine)   │    │   Metadata) │   │
│  └─────────────┘    └─────────────┘    └──────┬──────┘    └─────────────┘   │
│                                                 │                            │
│                              ┌──────────────────┘                            │
│                              ▼                                               │
│                    ┌─────────────────┐                                         │
│                    │ service-worker.js                                         │
│                    │ (App Shell Cache)                                         │
│                    └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         GAME.JS INTERNAL ARCHITECTURE                        │
│                         (21 Numbered Sections, ~2400 lines)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │ 1.CONFIG│  │ 2.DOM   │  │ 3.RNG   │  │ 4.STORAGE│  │ 5.AUDIO │          │
│  │Constants│  │+Canvas  │  │Seeded   │  │Guarded  │  │Web Audio│          │
│  │         │  │DPR-aware│  │Random   │  │localStorage│ │Graph    │          │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│       │            │            │            │            │                 │
│  ┌────┴────────────┴────────────┴────────────┴────────────┴────┐            │
│  │                    6. STATE (Mutable Runtime)               │            │
│  │  phase, score, best, theme, physics, audio, stats...      │            │
│  └─────────────────────────────────────────────────────────────┘            │
│       │                                                                      │
│  ┌────┴────┐  ┌─────────┐  ┌─────────┐                                      │
│  │7.THEME  │  │8.SPRITE │  │ 9.WORLD │                                      │
│  │TABLES   │  │CACHE    │  │Bird/Ground│                                     │
│  │Palettes │  │Offscreen│  │Pipes/Pools│                                     │
│  │+Music   │  │Canvases │  │         │                                      │
│  └────┬────┘  └────┬────┘  └────┬────┘                                      │
│       │            │            │                                           │
│  ┌────┴────────────┴────────────┴────────────────────────────────────┐     │
│  │                    10. PHYSICS                                     │     │
│  │  updateBird(), spawnPipe(), updatePipes(), checkCollisions()       │     │
│  │  updateShieldBubbles(), updateNearestPipeCache()                    │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│       │                                                                      │
│  ┌────┴────────────────────────────────────────────────────────────────────┐  │
│  │                    11. RENDER                                          │  │
│  │  drawBackground(), drawPipes(), drawBird(), drawScore(), draw()      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│       │                                                                      │
│  ┌────┴────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │12.UI    │  │13.STATS │  │14.ACHIEVE│  │15.LIFECYCLE│  │16.INPUT │          │
│  │Drawer   │  │Persistent│  │MENTS    │  │Reset/Start │  │Keyboard │          │
│  │Mobile   │  │Stats    │  │12 total │  │Pause/Over  │  │Pointer  │          │
│  │Focus    │  │Sparkline│  │         │  │         │  │Mobile   │          │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘          │
│       │            │            │            │            │                 │
│  ┌────┴────────────┴────────────┴────────────┴────────────┴────────────────┐ │
│  │                    17-19. EVENTS & BINDINGS                              │ │
│  │  Lifecycle events, Service Worker reg, Drawer controls, Tutorial         │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│       │                                                                      │
│  ┌────┴────────────────────────────────────────────────────────────────────┐  │
│  │                    20. LOOP (Main Animation Loop)                        │  │
│  │  requestAnimationFrame → compute dt → update() → draw()              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│       │                                                                      │
│  ┌────┴────────────────────────────────────────────────────────────────────┐  │
│  │                    21. BOOT (Initialization Sequence)                    │  │
│  │  configureCanvasForDPR() → updateDerivedPhysics() → resetGame()        │  │
│  │  → bindDrawerControls() → bindMobileControls() → bindTutorial()        │  │
│  │  → registerServiceWorker() → syncUiState() → requestAnimationFrame(loop)│ │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INPUT LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Keyboard ──► heldKeys Set ──┐                                              │
│  Pointer ───► canvas/stage ──┼──► handleAction() ──► doFlap()               │
│  Mobile ────► mBrake/mFlap/mDive ──┘         │                              │
│                                              ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         STATE MUTATION                             │   │
│  │  bird.velocity = state.flap  │  bird.isBraking = true              │   │
│  │  bird.isDiving = true        │  state.phase = "play"               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                              │                              │
│                                              ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PHYSICS UPDATE                               │   │
│  │  updateBird() → gravity, drag, terminal velocity, rotation, scale   │   │
│  │  updatePipes() → spawn, move, score detection, speed ramp           │   │
│  │  checkCollisions() → ground, pipes, shield, invincibility         │   │
│  │  updateShieldBubbles() → collision detection, pickup              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                              │                              │
│                                              ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         RENDER PIPELINE                              │   │
│  │  drawBackground() → sky cache, clouds, stars, aurora bands        │   │
│  │  drawPipes() → gradient pipes, caps, moving indicators              │   │
│  │  drawShieldBubbles() → pulsing golden orbs                         │   │
│  │  drawGround() → sand, grass, dirt pattern                          │   │
│  │  drawBirdTrail() → fading motion trail                             │   │
│  │  drawBird() → cached body + dynamic wing/eye/eyebrow/blush         │   │
│  │  drawBirdShield() → rotating energy nodes                          │   │
│  │  drawWeatherParticles() → rain/dust/cyber/pollen                   │   │
│  │  drawParticles() → flap/score/death particles                        │   │
│  │  drawScore() → large score + emotion emoji                           │   │
│  │  drawCalmMeter() → left-edge progress bar                            │   │
│  │  drawNearMissFlash() → brief sky-blue overlay                        │   │
│  │  drawVignette() → radial darkening                                   │   │
│  │  drawFpsCounter() → top-right performance readout                    │   │
│  │  drawPanel() → start/pause/gameover overlays                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                              │                              │
│                                              ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PERSISTENCE LAYER                               │   │
│  │  localStorage ←── writeStoredValue() ←── syncStatsAndAchievements() │   │
│  │  localStorage ──► readStored*() ──► state initialization           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                              │                              │
│                                              ▼                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      AUDIO OUTPUT                                      │   │
│  │  Web Audio API → masterGain → [lowpass→destination] + [reverb→wet] │   │
│  │  SFX: playTone(), playSequence()                                     │   │
│  │  Music: scheduleMusicAhead() (audio-clock scheduled)                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. State Machine Analysis

```text
                    ┌─────────────┐
                    │   "start"   │
                    │  (idle demo) │
                    └──────┬──────┘
                           │ Space/Click/Tap
                           ▼
                    ┌─────────────┐
                    │   "play"    │
                    │  (active)   │◄────────────────┐
                    └──────┬──────┘                 │
                           │ Collision               │
                           ▼                         │
                    ┌─────────────┐    Space/Click  │
                    │  "gameOver" │─────────────────┘
                    │  (score panel)│
                    └─────────────┘
                           │
                           │ R key / Restart button
                           ▼
                    ┌─────────────┐
                    │   "play"    │ (restartRun())
                    │  (fresh run) │
                    └─────────────┘

"play" has a sub-state: paused (boolean)
  - paused=true: physics frozen, music stopped, "Paused" overlay
  - paused=false: normal gameplay
```

---

## 6. Deep Dive: index.html — Semantic Shell Architecture

**Purpose:** Single-file semantic document containing all non-canvas UI, PWA metadata, controls, tutorial, and drawer.

**Structural Hierarchy:**

```text
html[lang="en", dir="ltr"]
├── head
│   ├── charset, viewport (viewport-fit=cover, interactive-widget=resizes-content)
│   ├── color-scheme: dark, theme-color: #081120
│   ├── description (SEO)
│   ├── PWA/iOS/Android install metadata (apple-mobile-web-app-capable, etc.)
│   ├── Open Graph / Twitter cards (og:title, og:description, og:image, twitter:card)
│   ├── favicon (inline SVG)
│   ├── preload style.css, link stylesheet
│   └── title
│
└── body
    ├── a.skip-link (accessibility: jump to game)
    │
    ├── main.shell (container-type: inline-size)
    │   ├── p#srStatus (aria-live="polite", aria-atomic="true") — Screen reader announcements
    │   ├── p#controlHelp (sr-only) — Keyboard/mobile control descriptions
    │   │
    │   ├── header.panel.hero#heroPanel
    │   │   ├── p.eyebrow — "Relaxed arcade • ergonomic controls • normalized physics"
    │   │   └── div.hero-layout
    │   │       ├── div.hero-copy — h1 + lede paragraph
    │   │       └── div.status-cluster — 4 status pills (Relaxed mode, 60–240Hz safe, etc.)
    │   │
    │   ├── section.panel.stage (aria-labelledby="playfield-title")
    │   │   ├── div.stage-topbar
    │   │   │   ├── div.stage-copy — h2#playfield-title + description
    │   │   │   └── div.toolbar (role="group", aria-label="Game actions")
    │   │   │       ├── button#restartButton (aria-keyshortcuts="R")
    │   │   │       ├── button#pauseToggle (aria-keyshortcuts="Escape")
    │   │   │       ├── button#muteToggle (aria-keyshortcuts="M")
    │   │   │       ├── button#fullscreenToggle (aria-keyshortcuts="F")
    │   │   │       └── button#drawerToggle (aria-controls="customizerDrawer")
    │   │   │
    │   │   ├── div.canvas-wrap
    │   │   │   ├── canvas#game (tabindex="0", role="application", aria-label, aria-describedby, aria-keyshortcuts)
    │   │   │   └── div#tutorialOverlay (role="dialog", aria-label="How to play")
    │   │   │       └── div.tutorial-card — h3 + ul + button#tutorialDismiss
    │   │   │
    │   │   └── div#mobileControls (role="group", aria-label="Touch controls")
    │   │       ├── button#mBrake (aria-label="Brake (hold)")
    │   │       ├── button#mFlap (aria-label="Flap")
    │   │       └── button#mDive (aria-label="Dive (hold)")
    │   │
    │   └── section.meta-grid (aria-label="Game guide and controls")
    │       ├── article.panel.card — Comfortable controls (kbd list)
    │       └── article.panel.card — Comfort-first design notes
    │
    ├── aside#customizerDrawer (aria-hidden="true", aria-modal="true", role="dialog", inert)
    │   ├── div.drawer-header — h2#drawerTitle + button#drawerClose
    │   ├── div.drawer-section — Theme selector (5 theme buttons)
    │   ├── div.drawer-section — Physics overrides (gravity + speed sliders)
    │   ├── div.drawer-section — Audio volumes (music + SFX sliders + test button)
    │   ├── div.drawer-section — Daily Seed (field-switch pattern)
    │   ├── div.drawer-section — Zen Dashboard Stats (6 stat cards + reset button)
    │   └── div.drawer-section — Cozy Milestones (12 achievement items)
    │
    ├── noscript — "JavaScript is required" fallback
    └── script src="game.js" defer
```

**Key Accessibility Features in HTML:**

- `aria-live="polite"` for non-intrusive screen reader updates
- `aria-keyshortcuts` on all interactive elements
- `role="application"` on canvas (tells screen readers it's an interactive widget)
- `inert` attribute on closed drawer (prevents focus reaching hidden content)
- Skip-link for keyboard navigation
- `aria-pressed` on toggle buttons
- `aria-expanded` on drawer toggle
- `aria-modal="true"` on drawer
- `aria-describedby` chaining control help + status to canvas

---

## 7. Deep Dive: style.css — Design System Architecture

**Layer Architecture (CSS Cascade Layers):**

```text
@layer base, layout, components, utilities;
```

**CSS Custom Properties (@property for animatable types):**

```css
@property --bg-1 {
  syntax: '<color>';
  initial-value: #081120;
  inherits: false;
}
@property --bg-2 {
  syntax: '<color>';
  initial-value: #10223d;
  inherits: false;
}
@property --bg-3 {
  syntax: '<color>';
  initial-value: #17355f;
  inherits: false;
}
```

**Theme System (5 themes, CSS class-based):**

| Theme            | Body Class        | Primary Accent      | Mood            |
| ---------------- | ----------------- | ------------------- | --------------- |
| Sunset (default) | `.theme-sunset`   | `#fda4af` (pink)    | Warm evening    |
| Midnight         | `.theme-midnight` | `#f472b6` (magenta) | Deep night      |
| Rain             | `.theme-rain`     | `#cbd5e1` (silver)  | Cozy rain       |
| Aurora           | `.theme-aurora`   | `#4ade80` (green)   | Northern lights |
| Meadow           | `.theme-meadow`   | `#86efac` (mint)    | Fresh grass     |

**Design Tokens:**

- `--bg-1/2/3`: Background gradient stops
- `--surface-1/2`: Panel backgrounds with transparency
- `--surface-stroke`: Subtle border color
- `--text-1/2/3`: Text hierarchy (primary/secondary/tertiary)
- `--accent-1/2/3`: Interactive accent colors
- `--accent-glow`: Glow effect color
- `--danger`: Error/red state
- `--success`: Success/green state
- `--shadow-1/2`: Layered shadows
- `--radius-panel/soft`: Border radius tokens
- `--space-1..5`: Fluid spacing with `clamp()`

**Responsive Strategy:**

- Container queries (`@container`) for component-level responsiveness
- `@media (max-width: 640px)` for mobile layout (stage first, hide meta)
- `@media (pointer: coarse)` for touch-optimized sizing
- `@media (prefers-contrast: more)` for high-contrast borders
- `@media (forced-colors: active)` for Windows high-contrast mode
- `@media (prefers-reduced-motion: reduce)` disables ALL animations/transitions

**Mobile-First Patterns:**

- `.stage { order: -1; }` on mobile — game appears before hero text
- Mobile controls `position: fixed` at bottom with safe-area insets
- Canvas capped at `min(100%, 420px)` — never overscales on desktop
- `touch-action: manipulation` on canvas and buttons

---

## 8. Deep Dive: game.js — The Complete Engine

### Section 1: CONFIG (~40 constants, Object.freeze)

```text
CANVAS_W/H          420×640 logical pixels
FRAME_MS_60         16.667ms baseline
DT_MAX              3 (lag spike cap)
BIRD_X              112 (fixed horizontal position)
BIRD_RADIUS         18
BIRD_TRAIL_LEN      10 trail segments
BIRD_TRAIL_LIFE     10 frames
GROUND_HEIGHT       80
PIPE_WIDTH          72
PIPE_GAP            184 (larger than classic Flappy Bird)
PIPE_MIN_TOP        80
PIPE_SCORE_FOR_MOVING  14 (moving pipes unlock at score 14)
PIPE_MOVING_CHANCE  0.12
PIPE_MAX_SPEED_MULT 1.18
SHIELD_INTERVAL     3 (every 3rd pipe)
SHIELD_RADIUS       16
SHIELD_PICKUP_BONUS 4 (generous pickup radius)
SHIELD_INVINCIBILITY_SEC 1.5
SHIELD_POP_VELOCITY -1.5
EMOTION_HOLD_SEC    1.0
EMOTION_SCARED_VELOCITY 1.65
EMOTION_DETERMINED_SCORE 8
EMOTION_HAPPY_SCORE_STEP 5
EMOTION_PIPE_PROXIMITY 40
SFX_DIVE_COOLDOWN_SEC 0.17
SFX_BRAKE_COOLDOWN_SEC 0.23
NEAR_MISS_X_WINDOW  40
NEAR_MISS_Y_BAND    12
STATS_SYNC_INTERVAL_SEC 1.0
VISIBILITY_SYNC_INTERVAL_MS 250
SCORE_ANNOUNCE_EVERY 5
PARTICLE_POOL       220
WEATHER_POOL        140
GRAVITY_MAP         {1:0.038, 2:0.052, 3:0.066, 4:0.082}
FLAP_MAP            {1:-2.15, 2:-2.35, 3:-2.55, 4:-2.75}
SPEED_MAP           {1:0.85, 2:1.15, 3:1.35, 4:1.65}
SPAWN_INTERVAL_MAP  {1:220, 2:170, 3:148, 4:120}
AUDIO_MASTER_TARGET_DB 0
MUSIC_LOOKAHEAD     0.1
MUSIC_TICK_MS       25
MUSIC_FADE_SEC      0.4
REVERB_SECONDS      2.0
REVERB_DECAY        2.4
REVERB_MIX          0.18
FRAME_ERROR_BURST_LIMIT 8
FRAME_ERROR_COOLDOWN_SEC 3
```

### Section 2: DOM + DPR-Aware Canvas

- `getDPR()`: Clamps `devicePixelRatio` to [1, 3]
- `configureCanvasForDPR()`: Sets canvas backing store to `logical × DPR`, applies `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`
- `dom` object: Centralized DOM element cache (30+ references)
- `announce()`: Screen reader live-region updater with `requestAnimationFrame` re-assertion

### Section 3: RNG (Seeded Random)

- `mulberry32()`: High-quality 32-bit seeded PRNG
- `dateSeed()`: UTC date → integer seed (YYYY×10000 + MM×100 + DD)
- `_rngFn`: Pluggable RNG (Math.random or mulberry32)
- `setSeededRNG(seed)`: Daily seed mode
- `setUnseededRNG()`: Random mode

### Section 4: STORAGE (Guarded localStorage)

| Function                                    | Purpose                                 |
| ------------------------------------------- | --------------------------------------- |
| `readStoredChoice(key, choices, fallback)`  | Validate string against allowed set     |
| `readStoredNumber(key, fallback, min, max)` | Parse, clamp, validate number           |
| `readStoredLevel(key, fallback)`            | Validate 1-4 level                      |
| `readStoredBool(key, fallback)`             | Parse "true"/"false"                    |
| `readPlayedThemes()`                        | Parse JSON array → Set                  |
| `readScoreHistory()`                        | Parse JSON array, filter, slice last 50 |
| `readUnlockedAchievements()`                | Parse JSON array → Set                  |
| `writeStoredValue(key, value)`              | Safe write with try/catch               |

### Section 5: AUDIO (Web Audio Engine)

**Audio Graph Topology:**

```text
oscillator ──► masterGain ──┬──► masterLowpass ──► destination
                            └──► reverbConvolver ──► reverbWetGain ──► destination
```

**SFX Functions:**

| Function             | Sound         | Waveform        | Notes                    |
| -------------------- | ------------- | --------------- | ------------------------ |
| `sfxFlap()`          | Flap sound    | triangle + sine | 420Hz + 560Hz            |
| `sfxScore()`         | Score chime   | sine sequence   | 660→880→1100Hz           |
| `sfxNewBest()`       | New best      | sine sequence   | 523→659→784→1047Hz       |
| `sfxDie()`           | Death         | sawtooth        | 220Hz → 140Hz descending |
| `sfxDive()`          | Dive          | triangle        | 300Hz brief              |
| `sfxBrake()`         | Brake         | sine            | 380Hz brief              |
| `sfxNearMiss()`      | Near miss     | sine            | 820Hz ping               |
| `sfxAchievement()`   | Achievement   | sine            | 880→1320Hz               |
| `sfxShieldCollect()` | Shield pickup | sine sequence   | Ascending arpeggio       |
| `sfxShieldPop()`     | Shield pop    | triangle + sine | 880→1200Hz               |

**Music System:**

- Per-theme arpeggio definitions in `musicThemes` object
- `scheduleMusicAhead()`: Schedules notes 0.1s ahead on AudioContext clock
- 25ms interval scheduler (drift-free)
- A/B section variation every 12 notes
- Ambient pad drone every 4 notes
- Rain theme adds random high-frequency sparkles (35% chance)
- `fadeMaster()`: Smooth gain ramping for start/stop

### Section 6: STATE (Mutable Runtime Object)

**Core Properties:**

```text
phase: "start" | "play" | "gameOver"
score, best, frames, time, elapsedSec, runSec
theme, gravitySetting, speedSetting, musicVolume, sfxVolume
dailySeedMode, showFps
gravity, flap, terminalRise, terminalFall, pipeSpeed, gap
pipeSpawnTimer, pipeSpawnInterval, speedMultiplier, maxSpeedMultiplier
paused, audioEnabled, reducedMotion, reducedTransparency
lastDiveAtSec, lastBrakeAtSec, lastScoreAnnounceAt, lastStatsSyncAtSec
shakeAmount, hueShift, newBestFlash, nearMissFlash, calmMeter
lastTimestamp, dt, dtSec
shieldActive, isInvincible, invincibilityTimer
zenTimeSec, shieldsSavedCount, runsCount, nearMissesCount
longestSurvivalSec, currentStreak, playedThemes, scoreHistory, unlockedAchievements
brakeUseCount, diveUseCount, runNearMisses, themeChangedDuringRun, runStartedAtTheme
isNewBest
```

### Section 7: THEME TABLES

`THEME_TABLE` contains per-theme palettes for:

- `bird`: 6 emotions × color (calm, happy, scared, determined, dizzy, beak, hl, shadow)
- `ground`: sand, grass1, grass2, dirt
- `sky`: h1, h2, cAlpha (cloud alpha)
- `pipe`: hue, cap
- `trail`, `flapParticle`, `scoreParticle`

### Section 8: SPRITE CACHE

Offscreen canvas caching strategy:

- `SPRITE_CACHE.sky`: Theme + score-bracket keyed sky gradient
- `SPRITE_CACHE.clouds`: Single white cloud shape (scaled at draw time)
- `SPRITE_CACHE.bird`: 5 themes × 5 emotions = 25 cached bird sprites

`makeOffscreen(w, h)`: Creates DPR-scaled offscreen canvas with proper transform

### Section 9: WORLD

**Bird Object:**

```text
x, y, radius, velocity, rotation, emotion, emotionTimer
wingAngle, wingDir, scaleX, scaleY, trail[], isBraking, isDiving
blush, pupilOffsetX, pupilOffsetY, pupilDilate
```

**Ground Object:**

```text
y, height, offset
```

**Pipes Array:**
Each pipe: `x, topHeight, baseTopHeight, passed, isMoving, movePhase, color, capColor, nearMissRecorded, shieldBubble`

**Object Pools:**

- `particlePool`: 220 pre-allocated particles
- `activeParticles`: Live particle references
- `weatherPool`: 140 pre-allocated weather particles
- `activeWeather`: Live weather references

### Section 10: PHYSICS

**`updateEmotion()`:**

- `dizzy` → game over
- `happy` → score milestone (every 5)
- `scared` → near pipe edge OR high velocity
- `determined` → score ≥ 8
- `calm` → default

**`doFlap()`:**

- Sets velocity to `state.flap`
- Squash/stretch animation (scaleX=0.8, scaleY=1.3)
- Pupil dilation micro-interaction
- SFX + haptic + particles

**`updateBird()`:**

- Brake: velocity \*= 0.78^dt (when falling)
- Dive: velocity += 0.16×dt (capped at terminalFall)
- Drag: 0.992^dt (rising) / 0.985^dt (falling)
- Gravity: velocity += gravity × dt
- Terminal velocity clamp: [terminalRise, terminalFall]
- Rotation easing toward velocity × 0.12
- Wing oscillation: ±0.4 radians
- Scale recovery: exponential toward 1.0
- Trail propagation (position history)
- Eye tracking toward nearest pipe gap center

**`spawnPipe()`:**

- Random topHeight between [PIPE_MIN_TOP, ground.y - gap - 80]
- Moving pipes unlock at score ≥ 14 (12% chance)
- Color derived from theme hue + random variation
- Shield bubble every 3rd pipe (if no active shield)

**`updatePipes()`:**

- Spawn timer counts down by `dt`
- Speed = `pipeSpeed × speedMultiplier × dt`
- Moving pipes oscillate ±14px vertically
- Score on pass (pipe fully behind bird)
- Speed ramp: +0.03 multiplier every 6 pipes (capped at max)

**`updateShieldBubbles()`:**

- Pulse animation
- Collision: distance < bird.radius + shield.radius + bonus
- On pickup: shieldActive=true, SFX, haptic, particles, announcement

**`checkCollisions()`:**

- Ground collision → game over
- Ceiling collision → clamp + zero velocity
- Pipe collision:
  - Shield active → pop shield, invincibility, upward velocity
  - Invincible → ignore
  - Otherwise → game over
- Near-miss detection: within X_WINDOW and Y_BAND of pipe edge

**Collision Math:**
`circleHitsRect(cx, cy, cr, rx, ry, rw, rh)` — true circle-vs-rectangle with closest-point test
`intersectsPipe(pipe)` — applies 0.82× radius forgiveness factor

### Section 11: RENDER

**Layer Order (back to front):**

1. `drawBackground()` — cached sky, aurora bands, parallax clouds (3 depths), stars
2. `drawPipes()` — gradient pipes with caps, moving indicators
3. `drawShieldBubbles()` — pulsing golden orbs with "S" glyph
4. `drawGround()` — sand, grass gradient, dirt pattern
5. `drawBirdTrail()` — fading motion trail
6. `drawBird()` — cached body + dynamic wing/eye/eyebrow/blush/smile/dizzy
7. `drawBirdShield()` — 4 rotating energy nodes
8. `drawWeatherParticles()` — rain streaks, dust, cyber squares, pollen
9. `drawParticles()` — flap/score/death particles
10. `drawScore()` — large score + emotion emoji
11. `drawCalmMeter()` — left-edge vertical bar
12. `drawNearMissFlash()` — brief overlay
13. `drawVignette()` — radial darkening
14. `drawFpsCounter()` — performance readout
15. `drawPanel()` — start/pause/gameover overlay (conditional)

### Section 12: UI

**Drawer System:**

- `setCustomizerOpen(isOpen, restoreFocus)` — toggles class, aria, inert
- Auto-pauses game when opened (if playing)
- Auto-resumes when closed (if was playing)
- Focus trap: Tab cycles within drawer
- Focus restoration on close

**`applyTheme(theme)`:**

- Updates body classList
- Updates meta theme-color
- Updates button active states
- Rebuilds sky cache

**`syncUiState()`:**

- Updates pause/mute/fullscreen button text and aria-pressed
- Updates daily seed toggle and status text

**`togglePause(forceValue)`:**

- Only works in "play" phase
- Stops music when paused, resumes when unpaused
- Re-applies held key states (Shift/ArrowDown)

**`toggleMute()`:**

- Toggles audioEnabled
- Stops/starts music accordingly

**`toggleFullscreen()`:**

- Uses requestFullscreen / exitFullscreen

**Haptics:**

- `hapticTap()`: 10ms vibration
- `hapticPulse(ms)`: Custom duration vibration
- Respects reducedMotion

### Section 13: STATS

**Persistent Stats (6 total):**

| Stat             | Key                  | Display                       |
| ---------------- | -------------------- | ----------------------------- |
| Zen minutes      | zen-time-sec         | `zenTimeSec / 60` (1 decimal) |
| Shields saved    | shields-saved-count  | Integer                       |
| Runs completed   | runs-count           | Integer                       |
| Near misses      | near-misses-count    | Integer                       |
| Longest survival | longest-survival-sec | `<60s` or `Xm` format         |
| Current streak   | current-streak       | Integer (≥10 score runs)      |

**`syncStatsAndAchievements(saveToStorage)`:**

- Writes to localStorage if `saveToStorage=true`
- Updates all DOM stat elements
- Draws sparkline
- Checks achievements

**`drawSparkline()`:**

- DPR-aware mini canvas
- Area fill under line
- Line stroke
- Gold dot at best score position

### Section 14: ACHIEVEMENTS

**12 Achievements:**

| ID            | Name           | Condition               | Progress           |
| ------------- | -------------- | ----------------------- | ------------------ |
| FirstFlight   | First Flight   | score ≥ 1               | `min(score,1)/1`   |
| ZenMaster     | Zen Master     | score ≥ 15              | `min(score,15)/15` |
| ShieldSavior  | Shield Savior  | shieldsSavedCount ≥ 1   | `min(count,1)/1`   |
| ThemeExplorer | Theme Explorer | playedThemes.size ≥ 5   | `min(size,5)/5`    |
| CalmMarathon  | Calm Marathon  | zenTimeSec ≥ 300        | `min(min,5)/5 min` |
| Featherweight | Featherweight  | score ≥ 30              | `min(score,30)/30` |
| Featherlight  | Featherlight   | score ≥ 50              | `min(score,50)/50` |
| StreakKeeper  | Streak Keeper  | runNearMisses ≥ 5       | `min(misses,5)/5`  |
| BrakeMaster   | Brake Master   | brakeUseCount ≥ 10      | `min(count,10)/10` |
| Diver         | Diver          | diveUseCount ≥ 10       | `min(count,10)/10` |
| IronCalm      | Iron Calm      | currentStreak ≥ 3       | `min(streak,3)/3`  |
| LongHaul      | Long Haul      | longestSurvivalSec ≥ 60 | `min(sec,60)/60s`  |

**Unlock Flow:**

1. `checkAchievements()` iterates ACHIEVEMENTS array
2. If `check()` returns true and not already unlocked:
   - Add to unlockedAchievements Set
   - Add `.unlocked` class to DOM element
   - Play achievement SFX
   - Haptic pulse (60ms)
   - Spawn green particles
   - Screen reader announcement
   - Toast notification
   - Sync to storage

### Section 15: LIFECYCLE

**`resetGame()`:**

- Resets ALL run-scoped state
- Resets bird position/velocity/rotation
- Clears pipes, particles, weather
- Resets RNG (seeded or unseeded)
- Stops music

**`startGame()`:**

- Calls `resetGame()`
- Sets phase="play"
- Increments runsCount
- Starts music
- Calls `doFlap()`
- Syncs UI and stats

**`restartRun()`:**

- Same as startGame but announces "Run restarted"

**`gameOver()`:**

- Sets phase="gameOver"
- Updates best score
- If new best: celebration (SFX, haptic, particles, flash)
- Pushes score to history
- Updates longest survival
- Updates streak (≥10 = +1, else reset)
- Screen shake (unless reduced motion)
- Death SFX and particles
- Second wave of particles after 180ms delay
- Syncs everything to storage

### Section 16: INPUT

**Keyboard Handler:**

- `Escape`: Close drawer OR toggle pause
- `Tab`: Focus trap when drawer open
- `M`: Toggle mute
- `R`: Restart run
- `F`: Toggle fullscreen
- `Space`/`ArrowUp`: Flap / start / restart
- `ArrowDown`: Dive (hold)
- `ShiftLeft`/`ShiftRight`: Brake (hold)

**Pointer Handler:**

- `canvas.pointerdown`: Flap / start / restart
- `stagePanel.pointerdown`: Extended tap zone (excludes controls/toolbar/tutorial)

**Mobile Controls:**

- `mFlap`: pointerdown → handleAction, pointerup → noop
- `mBrake`: pointerdown → isBraking=true, pointerup → isBraking=false
- `mDive`: pointerdown → isDiving=true, pointerup → isDiving=false
- Uses `pointerdown/up/cancel/leave/touchend` for robust touch handling

**`shouldIgnoreGlobalShortcut()`:**

- Returns true if focus is inside drawer or on interactive form elements
- Prevents game keys from firing while using customizer

### Section 17: LIFECYCLE EVENTS

- `blur`: Pause game, clear held keys
- `visibilitychange`: Pause when hidden, re-arm audio when shown, sync stats
- `beforeunload`: Final stats sync
- `resize`/`orientationchange`: Reconfigure canvas DPR
- `fullscreenchange`: Reconfigure canvas + sync UI
- `prefers-reduced-motion` change: Update state, disable effects
- `prefers-reduced-transparency` change: Update state

### Section 18: OFFLINE SHELL

`registerServiceWorker()`:

- Checks for `navigator.serviceWorker` support
- Skips on `file:` protocol
- Registers `./service-worker.js` with scope `./`
- Deferred until `window.load` or immediate if already loaded

### Section 19: CUSTOMIZER & DRAWER BINDINGS

**Slider Bindings:**

- `gravitySlider`: 1-4 → `GRAVITY_LABELS` + `updateDerivedPhysics()`
- `speedSlider`: 1-4 → `SPEED_LABELS` + `updateDerivedPhysics()`
- `musicVolumeSlider`: 0-100% → live volume update
- `sfxVolumeSlider`: 0-100% → live volume update

**Theme Buttons:**

- Click → apply theme, add to playedThemes, rebuild sky, play tone
- If theme changes during run: `themeChangedDuringRun = true`

**Daily Seed Toggle:**

- Checkbox → seeded/unseeded RNG switch

**Reset Stats Button:**

- `confirm()` dialog → `resetStats()` (wipes all localStorage keys)

**Audio Test Button:**

- Plays ascending 3-note sequence

**Share Button:**

- `navigator.share()` if available
- Fallback to `navigator.clipboard.writeText()`

**FPS Toggle:**

- Checkbox → `showFps` state

### Section 20: MAIN LOOP

```javascript
function loop(timestamp) {
  // 1. Compute delta time
  elapsedMs = timestamp - lastTimestamp;
  rawDt = elapsedMs / FRAME_MS_60;
  dt = min(rawDt, DT_MAX);
  dtSec = max(0, min(elapsedMs / 1000, DT_MAX / 60));

  // 2. Error rate limiting
  if (elapsedSec < frameErrorCooldownAt) {
    rAF(loop);
    return;
  }

  // 3. Update FPS counter
  updateFpsCounter(dtSec);

  // 4. Try update + draw
  try {
    update(); // physics, collisions, particles
    draw(); // full render pipeline
  } catch (err) {
    // Burst detection: >8 errors → 3s cooldown
  }

  // 5. Start screen idle animation
  if (phase === 'start') {
    bird.y = CANVAS_H / 2 + sin(timestamp * 0.0025) * 10;
  }

  // 6. Schedule next frame
  requestAnimationFrame(loop);
}
```

### Section 21: BOOT SEQUENCE

```javascript
configureCanvasForDPR(); // 1. Canvas setup
updateDerivedPhysics(); // 2. Physics from stored settings
resetGame(); // 3. Initial state
bindDrawerControls(); // 4. Customizer event listeners
bindMobileControls(); // 5. Touch control listeners
bindTutorial(); // 6. Tutorial overlay logic
registerServiceWorker(); // 7. PWA registration
syncUiState(); // 8. Initial UI state
// 9. Toolbar button listeners
// 10. requestAnimationFrame(loop) — starts the engine
```

---

## 9. Deep Dive: service-worker.js — PWA Cache Strategy

### Cache Strategy: Cache-First with Navigation Fallback

```text
INSTALL:
  → Open cache "flappy-calm-v2.0.2"
  → Add all APP_SHELL files
  → skipWaiting()

ACTIVATE:
  → Delete all old caches
  → clients.claim()

FETCH:
  → Only handle GET requests
  → Only handle same-origin requests
  → cacheFirst(request):
      1. Return cached response if exists
      2. Fetch from network
      3. If OK and isAppShellRequest → update cache
      4. Return network response
      5. If navigate request fails → return cached index.html fallback
```

**App Shell (5 files):**

- `./` (root/navigation)
- `./index.html`
- `./style.css`
- `./game.js`
- `./manifest.webmanifest`

**Versioning:** Cache name includes version string (`v2.0.2`). Must be bumped on every release.

---

## 10. Deep Dive: manifest.webmanifest — Install Metadata

```json
{
  "name": "Flappy Bird — Calm Edition",
  "short_name": "Flappy Calm",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#081120",
  "theme_color": "#081120",
  "categories": ["games", "entertainment"],
  "icons": [
    { "sizes": "192x192", "type": "image/svg+xml", "purpose": "any maskable" },
    { "sizes": "512x512", "type": "image/svg+xml", "purpose": "any maskable" }
  ]
}
```

**Icons:** Inline SVG data URIs (emoji 🐦 on dark rounded rectangle) — no external image files.

---

## 11. Testing & Quality Assurance

### smoke-test.mjs (50+ Assertions)

**File Coverage Checks:**

- `index.html`: canvas, srStatus, customizerDrawer, aria-modal, inert, skip-link
- `index.html`: mobileControls, mBrake, mFlap, mDive
- `style.css`: mobile control styles, fixed position, stage order
- `game.js`: bindMobileControls, loop, updateDerivedPhysics, bindDrawerControls, setCustomizerOpen, configureCanvasForDPR, mulberry32, buildReverbBuffer, trapDrawerFocus, focusElement, getDrawerFocusable, toggleFullscreen, circleHitsRect
- `manifest.webmanifest`: valid JSON, name, icons
- `service-worker.js`: CACHE_NAME matches version, all shell files listed
- `service-worker.js`: registration code in game.js
- Canvas sizing: `.canvas-wrap` capped at 420px
- Drawer: closed state collapses width to 0

**Syntax Checks:**

- `node --check game.js`
- `node --check service-worker.js`
- `.github/.memory` must NOT exist (duplicate prevention)

### CI Pipeline (GitHub Actions)

```yaml
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - checkout@v4
      - setup-node@v4 (node 22)
      - run: npm run check
```

---

## 12. Memory System (.memory/)

**Purpose:** Canonical project notes for AI assistants — the single source of truth for conventions, constraints, and quirks.

| File              | Purpose                       | When to Read                        |
| ----------------- | ----------------------------- | ----------------------------------- |
| `instructions.md` | Behavior rules for AI         | Before any code change              |
| `quirks.md`       | Non-obvious breakage patterns | When something behaves unexpectedly |
| `preferences.md`  | Style, naming, design choices | When creating new code              |
| `decisions.md`    | Architecture commitments      | Before refactoring                  |
| `security.md`     | Security rules                | ALWAYS read before any change       |

**Key Quirks Documented:**

- `.gitignore` once contained 50+ lines of live credentials
- `.vscode/` may contain files from unrelated projects (reused workspace)
- `localStorage` best score has no schema version (silent NaN on corruption)
- `bird.emotionTimer` uses 60-frame cooldown (not seconds)
- `heldKeys` Set ensures modifier survival across restarts
- Music scheduler skips backlog rather than dumping notes when throttled

---

## 13. Security Posture

**Absolute Prohibitions:**

1. No credentials in ANY file (including `.gitignore`, comments, strings)
2. No API keys, tokens, passwords, recovery codes
3. No hardcoded secrets in JavaScript
4. No sensitive data in `localStorage`

**Approved `.gitignore` Content:**
Standard patterns only (OS noise, editor state, node_modules, logs, `.env`, certs). Nothing else.

**Service Worker Scope:**

- Cache only same-origin static files
- No analytics, push notifications, background sync, remote scripts

**Historical Incident:**
Repository previously contained live credentials for 8+ services inside `.gitignore`. All exposed credentials considered compromised.

---

## 14. Complete Function Reference (game.js)

### Configuration & Setup

| Function                  | Line | Purpose                                       |
| ------------------------- | ---- | --------------------------------------------- |
| `getDPR()`                | ~120 | Returns clamped device pixel ratio            |
| `configureCanvasForDPR()` | ~125 | Sizes canvas backing store, applies transform |
| `announce(message)`       | ~175 | Screen reader live region update              |

### RNG

| Function             | Purpose                     |
| -------------------- | --------------------------- |
| `mulberry32(seed)`   | 32-bit seeded PRNG factory  |
| `dateSeed(d)`        | Date → integer seed         |
| `rng()`              | Current RNG invocation      |
| `setSeededRNG(seed)` | Switch to deterministic RNG |
| `setUnseededRNG()`   | Switch to Math.random       |

### Storage

| Function                                    | Purpose                     |
| ------------------------------------------- | --------------------------- |
| `readStoredChoice(key, choices, fallback)`  | Validated string read       |
| `clampNumber(value, fallback, min, max)`    | Safe number clamping        |
| `readStoredNumber(key, fallback, min, max)` | Number read with validation |
| `readStoredLevel(key, fallback)`            | 1-4 level read              |
| `readStoredBool(key, fallback)`             | Boolean read                |
| `readPlayedThemes()`                        | Parse theme history         |
| `readScoreHistory()`                        | Parse score history         |
| `readUnlockedAchievements()`                | Parse achievement set       |
| `writeStoredValue(key, value)`              | Safe localStorage write     |

### Audio

| Function                                              | Purpose                             |
| ----------------------------------------------------- | ----------------------------------- |
| `buildReverbBuffer(ctx, durationSec, decay)`          | Procedural reverb impulse           |
| `buildAudioGraph()`                                   | Constructs Web Audio routing        |
| `ensureAudio()`                                       | Lazy AudioContext creation + resume |
| `audioDestination()`                                  | Returns master gain or fallback     |
| `playToneAt(freq, duration, type, volume, startTime)` | Scheduled tone                      |
| `playTone(freq, duration, type, volume)`              | Immediate tone                      |
| `playSequence(notes)`                                 | Multi-note sequence                 |
| `sfxFlap()`                                           | Flap sound effect                   |
| `sfxScore()`                                          | Score chime                         |
| `sfxNewBest()`                                        | New best celebration                |
| `sfxDie()`                                            | Death sound                         |
| `sfxDive()`                                           | Dive sound                          |
| `sfxBrake()`                                          | Brake sound                         |
| `sfxNearMiss()`                                       | Near-miss ping                      |
| `sfxAchievement()`                                    | Achievement chime                   |
| `sfxShieldCollect()`                                  | Shield pickup                       |
| `sfxShieldPop()`                                      | Shield pop                          |
| `scheduleMusicAhead()`                                | Audio-clock music scheduler         |
| `fadeMaster(target, durationSec)`                     | Smooth gain ramp                    |
| `startMusic()`                                        | Begin music playback                |
| `stopMusic(fade)`                                     | Stop music playback                 |

### State & Physics

| Function                 | Purpose                          |
| ------------------------ | -------------------------------- |
| `updateDerivedPhysics()` | Convert slider levels to physics |
| `getTheme()`             | Returns current theme palette    |
| `getPipeScoreHue(score)` | Dynamic pipe color by score      |

### Sprite Cache

| Function                | Purpose                            |
| ----------------------- | ---------------------------------- |
| `makeOffscreen(w, h)`   | Create DPR-scaled offscreen canvas |
| `rebuildSkyCache()`     | Cache sky gradient                 |
| `rebuildCloudCache()`   | Cache cloud shape                  |
| `rebuildBirdCache()`    | Cache all theme×emotion birds      |
| `rebuildSpriteCaches()` | Rebuild all caches                 |

### World & Particles

| Function                                     | Purpose                             |
| -------------------------------------------- | ----------------------------------- |
| `initObjectPools()`                          | Pre-allocate particle/weather pools |
| `spawnParticles(x, y, count, color, spread)` | Spawn from pool                     |
| `updateParticles()`                          | Physics + lifecycle                 |
| `drawParticles()`                            | Render active particles             |
| `spawnWeatherParticle(...)`                  | Spawn weather from pool             |
| `spawnWeatherParticles()`                    | Theme-appropriate weather spawning  |
| `updateWeatherParticles()`                   | Weather physics + lifecycle         |
| `drawWeatherParticles()`                     | Render weather                      |
| `drawAuroraBands()`                          | Aurora theme overlay                |

### Physics Core

| Function                                     | Purpose                      |
| -------------------------------------------- | ---------------------------- |
| `updateEmotion()`                            | Determine bird emotion state |
| `doFlap()`                                   | Execute flap action          |
| `updateBird()`                               | Full bird physics update     |
| `spawnPipe()`                                | Create new pipe              |
| `updatePipes()`                              | Move pipes, detect passes    |
| `updateShieldBubbles()`                      | Shield collision + pickup    |
| `updateNearestPipeCache()`                   | Cache closest pipe for AI    |
| `circleHitsRect(cx, cy, cr, rx, ry, rw, rh)` | Circle-rect collision        |
| `intersectsPipe(pipe)`                       | Bird-pipe collision test     |
| `checkCollisions()`                          | All collision detection      |

### Render

| Function                                     | Purpose                |
| -------------------------------------------- | ---------------------- |
| `drawBackground()`                           | Sky, clouds, stars     |
| `drawCachedCloud(x, y, scale)`               | Draw cached cloud      |
| `drawPipes()`                                | All pipes              |
| `drawPipe(x, y, height, isTop, pipe)`        | Single pipe            |
| `drawGround()`                               | Ground layers          |
| `drawBirdTrail()`                            | Motion trail           |
| `drawBird()`                                 | Full bird render       |
| `drawShieldBubbles()`                        | Pipe shield orbs       |
| `drawBirdShield()`                           | Active shield aura     |
| `drawScore()`                                | Score + emotion emoji  |
| `updateFpsCounter(dtSec)`                    | FPS calculation        |
| `drawFpsCounter()`                           | FPS display            |
| `drawVignette()`                             | Radial darkening       |
| `drawNearMissFlash()`                        | Flash overlay          |
| `drawCalmMeter()`                            | Left-edge meter        |
| `drawPanel(title, subtitle, extra, options)` | Modal overlay          |
| `wrapText(text, x, y, maxWidth, lineHeight)` | Text wrapping          |
| `roundRect(x, y, w, h, r)`                   | Rounded rectangle      |
| `draw()`                                     | Full frame composition |
| `pickGameOverTitle(score)`                   | Score-bracketed title  |

### UI

| Function                                  | Purpose                        |
| ----------------------------------------- | ------------------------------ |
| `isDrawerOpen()`                          | Check drawer state             |
| `setCustomizerOpen(isOpen, restoreFocus)` | Toggle drawer                  |
| `focusElement(element)`                   | Safe focus with preventScroll  |
| `getDrawerFocusable()`                    | List focusable drawer elements |
| `trapDrawerFocus(e)`                      | Tab cycling trap               |
| `applyTheme(theme)`                       | Apply CSS theme                |
| `syncUiState()`                           | Sync all UI controls           |
| `togglePause(forceValue)`                 | Pause/resume                   |
| `toggleMute()`                            | Mute/unmute                    |
| `toggleFullscreen()`                      | Fullscreen toggle              |
| `hapticTap()`                             | Short vibration                |
| `hapticPulse(ms)`                         | Custom vibration               |

### Stats & Achievements

| Function                                  | Purpose                       |
| ----------------------------------------- | ----------------------------- |
| `pushScoreHistory(score)`                 | Add to history array          |
| `syncStatsAndAchievements(saveToStorage)` | Sync all stats + achievements |
| `resetStats()`                            | Wipe all persistent data      |
| `checkAchievements()`                     | Evaluate all achievements     |
| `showToast(text, type)`                   | Visible notification          |
| `drawSparkline()`                         | Score history mini-chart      |

### Lifecycle

| Function           | Purpose                     |
| ------------------ | --------------------------- |
| `onScoreChanged()` | Score event handler         |
| `resetGame()`      | Full run reset              |
| `startGame()`      | Begin first run             |
| `restartRun()`     | Restart current run         |
| `gameOver()`       | End run, celebrate, persist |

### Input

| Function                            | Purpose                |
| ----------------------------------- | ---------------------- |
| `handleAction(event)`               | Unified action handler |
| `shouldIgnoreGlobalShortcut(event)` | Filter input target    |
| `bindMobileControls()`              | Attach touch handlers  |

### Events & Boot

| Function                  | Purpose                  |
| ------------------------- | ------------------------ |
| `pauseForPageLifecycle()` | Blur/visibility pause    |
| `onResize()`              | Canvas reconfiguration   |
| `registerServiceWorker()` | PWA registration         |
| `bindDrawerControls()`    | All customizer listeners |
| `bindTutorial()`          | Tutorial overlay logic   |
| `update()`                | Per-frame physics update |
| `loop(timestamp)`         | Main animation loop      |

---

## 15. Version History & Evolution

| Version | Date          | Key Changes                                                                                                                                                                                                                                                  |
| ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| v2.0.2  | Current       | Service worker app-shell cache, GitHub Actions CI, smoke test extensions, tutorial dismiss starts game                                                                                                                                                       |
| v2.0.1  | Audit closure | Canvas capped at 420px, mobile controls fixed bottom, stage prioritized on mobile, drawer focus improvements, AUDIT-250.md                                                                                                                                   |
| v2.0.0  | Major rewrite | Mobile control bar, PWA manifest, DPR canvas, offscreen sprites, Web Audio graph, reverb, music scheduler, 12 achievements, daily seed, feather shield, true circle collision, delta-time physics, focus trap, reduced motion, tutorial, fullscreen, haptics |

---

## 16. Anti-Patterns & Edge Cases

1. **localStorage Schema Drift:** No versioning on stored data. Key format changes → silent NaN/corruption.
2. **AudioContext Unlock Scattering:** `ensureAudio()` called in multiple handlers. Missing one = silent audio.
3. **Canvas Hardcoded Size:** 420×640 is baked into CONFIG, CSS, and all coordinate math. Changing requires 4+ file updates.
4. **Emotion Timer Frame Assumption:** `CONFIG.EMOTION_HOLD_SEC * 60` assumes 60fps baseline. Actually uses `dt` so it's time-based, but the constant name is misleading.
5. **Service Worker Cache Version:** Manual string bump required. Forgetting = stale installs.
6. **Particle Pool Exhaustion:** If spawn rate exceeds pool size, particles silently fail to spawn.
7. **RNG State Not Persisted:** Daily seed RNG state resets on page reload mid-run.

---

## 17. Complete Dependency Graph

```text
index.html
├── style.css (preload + stylesheet)
├── manifest.webmanifest (PWA metadata)
└── game.js (defer)
    └── [runtime creates:]
        ├── Web Audio API (browser native)
        ├── Canvas 2D Context (browser native)
        ├── localStorage (browser native)
        ├── navigator.serviceWorker (browser native)
        ├── navigator.vibrate (browser native)
        ├── navigator.share (browser native)
        └── navigator.clipboard (browser native)

service-worker.js
├── [self-contained, no imports]
└── Caches API (browser native)

tests/smoke-test.mjs
├── node:fs/promises (readFile, access)
├── node:child_process (spawnSync)
└── node:assert/strict
```

**Zero npm dependencies. Zero runtime CDN imports. Zero build tooling.**

---

## 18. Performance Characteristics

| Metric                   | Value                             | Notes                         |
| ------------------------ | --------------------------------- | ----------------------------- |
| Initial load size        | ~15KB HTML + ~12KB CSS + ~85KB JS | Total ~112KB                  |
| Service worker cache     | 5 files                           | ~112KB total                  |
| Canvas backing store     | 420×640 × DPR (up to 3)           | Max 1260×1920                 |
| Offscreen sprites        | 1 sky + 1 cloud + 25 birds        | Rebuilt on DPR/theme change   |
| Particle pool            | 220 objects                       | Pre-allocated, no GC pressure |
| Weather pool             | 140 objects                       | Pre-allocated                 |
| Music scheduler interval | 25ms                              | Minimal CPU impact            |
| Stats sync interval      | 1 second (wall clock)             | Throttled                     |
| Frame error cooldown     | 3 seconds after 8 errors          | Self-healing                  |

---

## 19. Accessibility Architecture

**Screen Reader Support:**

- `aria-live="polite"` region for game announcements
- `announce()` function re-asserts text via rAF for reliable re-reading
- Score announcements throttled to every 5 pipes
- Achievement announcements name the specific milestone
- Control help paragraph describes all inputs

**Keyboard Navigation:**

- Full keyboard control (Space, Shift, Arrow keys, Escape, M, R, F)
- Skip-link jumps directly to game
- Focus trap in customizer drawer
- Focus restoration on drawer close
- `aria-keyshortcuts` on all buttons

**Motion Sensitivity:**

- `prefers-reduced-motion`: Disables trail, weather, shake, animations, transitions
- `prefers-reduced-transparency`: Disables backdrop-filter, uses solid backgrounds
- `prefers-contrast: more`: Stronger borders on all interactive elements
- `forced-colors: active`: System color scheme compliance

**Visual Design:**

- High contrast UI elements
- Color-blind redundancy (shield has "S" glyph + ring, moving pipes have horizontal bar)
- Large touch targets (min 44px)
- Focus-visible outlines on all interactive elements

---

## 20. Theme System Deep Dive

**Theme Application Flow:**

```text
User clicks theme button
    ↓
state.theme updated
    ↓
applyTheme(theme) called
    ↓
document.body.classList updated (remove old, add new)
    ↓
meta[name="theme-color"] updated
    ↓
theme buttons aria-pressed updated
    ↓
SPRITE_CACHE.sky cleared
    ↓
rebuildSkyCache() called
    ↓
activeWeather cleared (theme-specific particles)
    ↓
if playing: startMusic() (new theme music)
    ↓
playTone() confirmation chime
    ↓
state.playedThemes.add(theme)
    ↓
syncStatsAndAchievements(true)
```

**Music Per Theme:**

| Theme    | Notes                   | Wave     | SubWave  | Interval | Special            |
| -------- | ----------------------- | -------- | -------- | -------- | ------------------ |
| Sunset   | 262,330,392,523,392,330 | sine     | triangle | 0.50s    | —                  |
| Midnight | 293,370,440,587,440,370 | square   | sine     | 0.44s    | —                  |
| Rain     | 220,262,330,440,330,262 | sine     | triangle | 0.52s    | 35% random sparkle |
| Aurora   | 277,311,349,415,349,311 | sine     | sine     | 0.50s    | —                  |
| Meadow   | 247,294,370,494,370,330 | triangle | sine     | 0.48s    | —                  |

---

## 21. Physics Engine Mathematics

**Delta Time Normalization:**

```text
dt = elapsedMs / (1000/60)  // normalized to 60fps
dt = min(dt, 3)             // cap at 3× to prevent tunneling
dtSec = elapsedMs / 1000    // wall-clock seconds
```

**Bird Physics (per frame):**

```text
if braking and falling: velocity *= 0.78^dt
if diving: velocity += 0.16*dt (capped at terminalFall)
velocity *= drag^dt  // drag=0.992 (up) or 0.985 (down)
velocity += gravity*dt
velocity = clamp(velocity, terminalRise, terminalFall)
y += velocity*dt
rotation += (targetRotation - rotation) * easing*dt
```

**Pipe Movement:**

```text
speed = pipeSpeed * speedMultiplier * dt
x -= speed
if moving: topHeight = baseTopHeight + sin(movePhase)*14
```

**Speed Ramp:**

```text
if score % 6 == 0: speedMultiplier = min(maxSpeedMultiplier, speedMultiplier + 0.03)
```

---

## 22. Rendering Pipeline Analysis

**Frame Composition Order (with approximate GPU cost):**

| Layer           | Method                              | Cost       | Optimization                      |
| --------------- | ----------------------------------- | ---------- | --------------------------------- |
| Sky             | `drawImage(cached)`                 | Low        | Offscreen cache                   |
| Aurora bands    | `createLinearGradient` + fill       | Medium     | Conditional (aurora only)         |
| Clouds (far)    | `drawImage(cached, scaled)`         | Low        | 3 depths, alpha blending          |
| Clouds (mid)    | `drawImage(cached, scaled)`         | Low        | —                                 |
| Clouds (near)   | `drawImage(cached, scaled)`         | Low        | —                                 |
| Stars           | `arc()` × 14                        | Low        | Conditional                       |
| Pipes           | `createLinearGradient` + `fillRect` | Medium     | Per-pipe gradient                 |
| Shield bubbles  | `createRadialGradient` + `arc`      | Low        | Few active                        |
| Ground          | `fillRect` + pattern                | Low        | Dirt pattern loop                 |
| Bird trail      | `arc()` × trail length              | Low        | Conditional (reducedMotion)       |
| Bird            | `drawImage(cached)` + dynamic       | Medium     | Cached body, dynamic wing/eye     |
| Bird shield     | `arc()` × 4 nodes + strokes         | Low        | Conditional                       |
| Weather         | `stroke()` / `fill()` / `ellipse()` | Medium     | Pool-based, theme-specific        |
| Particles       | `arc()` × active count              | Medium     | Pool-based                        |
| Score           | `strokeText` + `fillText`           | Low        | —                                 |
| Calm meter      | `fillRect` × 2                      | Negligible | —                                 |
| Near miss flash | `fillRect`                          | Negligible | Conditional                       |
| Vignette        | `createRadialGradient` + fill       | Low        | Conditional (reducedTransparency) |
| FPS counter     | `fillRect` + `fillText`             | Negligible | Conditional                       |

**Total estimated draw calls per frame:** 50-150 (depending on active particles/weather)

---

## 23. Complete State Transition Diagram

```text
┌─────────┐     Space/Click/Tap      ┌─────────┐
│  START  │ ─────────────────────────► │  PLAY   │
│ (idle)  │                            │ (active)│
└────┬────┘                            └────┬────┘
     │                                        │
     │ Escape ──► togglePause()               │ Collision ──► gameOver()
     │     ┌─────────┐                        │     ┌─────────┐
     └────►│ PAUSED  │◄───────────────────────┘     │ GAMEOVER│
           │ (frozen)│                              │ (panel) │
           └────┬────┘                              └────┬────┘
                │ Escape ──► togglePause()               │
                │     │                                   │ Space/Click ──► startGame()
                └─────┘                                   │     ┌─────────┐
                                                          └────►│  PLAY   │
                                                                │ (fresh) │
                                                                └─────────┘
```

---

## 24. Build & Deployment

**No Build Step Required.**

**Local Development:**

```bash
python -m http.server 8000
# or
npm run serve
```

**Validation:**

```bash
npm run check
# Runs:
#   node --check game.js
#   node --check service-worker.js
#   node tests/smoke-test.mjs
```

**Deployment Targets:**

- GitHub Pages (current: `0thernes.github.io/flappy-bird-calm-edition/`)
- Any static file server
- Local file:// (with service worker limitations)

**PWA Installation:**

1. Visit HTTPS or localhost version
2. Service worker registers and caches app shell
3. Browser offers "Add to Home Screen"
4. Installed app works offline (cached shell)

---

## 25. Repository Governance

**License:** AGPL-3.0-or-later (copyleft — modified versions on public servers must offer source)

**Contribution Workflow:**

1. Read README.md → architecture_master_blueprint.md → CLAUDE.md
2. Make small, readable changes
3. Run `npm run check`
4. Test keyboard, drawer, mobile controls
5. Update matching documentation
6. Open PR with: what changed, why it helps, how tested

**Documentation Update Rules:**

| Change Type          | Update File                             |
| -------------------- | --------------------------------------- |
| Public feature       | `README.md`                             |
| Runtime/system       | `docs/architecture_master_blueprint.md` |
| Contributor workflow | `CONTRIBUTING.md`                       |
| AI guidance          | `CLAUDE.md`                             |
| Troubleshooting      | `SUPPORT.md`                            |

---

## 26. Summary: What Makes This Repo Special

1. **Zero-Dependency Purity:** Not a single npm package, CDN link, or build tool. The entire game is self-contained in 4 files.

2. **AI-Native Monolith:** `game.js` is intentionally ~2400 lines in one file so modern LLMs can process the entire engine in context. This is a deliberate architectural choice, not technical debt.

3. **Accessibility-First:** ARIA, keyboard navigation, screen readers, reduced motion, high contrast, and focus management are core features, not afterthoughts.

4. **Procedural Everything:** All audio synthesized via Web Audio API. All visuals drawn via Canvas 2D. No external assets of any kind.

5. **Delta-Time Physics:** Consistent gameplay across 60Hz, 120Hz, 144Hz, and 240Hz displays.

6. **Calm Design Philosophy:** Every feature reduces stress — larger gaps, slower pipes, forgiving hitboxes, brake/dive controls, gentle music, soft colors.

7. **Comprehensive Quality:** 250-point audit, 50+ assertion smoke tests, GitHub Actions CI, detailed documentation, memory system for AI assistants.

8. **Mobile-First:** Touch controls are first-class, not desktop ports. Fixed control bar, haptic feedback, safe-area insets.

9. **PWA-Ready:** Installable, offline-capable, service worker cached, manifest complete.

10. **Security-Conscious:** Explicit security rules, credential incident documented, service worker scope restricted.
