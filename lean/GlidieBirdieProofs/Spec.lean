module

/-!
# GlidieBirdieProofs.Spec — Pure Shared Definitions Only (Zero Proofs, Zero `sorry`)

Canonical mathematical specifications shared identically by BOTH:
  - `Challenge.lean` (isolated statement-only specification — imports ONLY this file)
  - `GlidieBirdieProofs/*.lean` & `Solution.lean` (sorry-free proofs checked across 6 kernels)

Every constant and transition mirrors the exact zero-dependency JavaScript runtime under `src/`:
  - `src/timestep.js`   (720 Hz tick grid, 60 Hz step, 144 Hz parity, hitch clamp)
  - `src/collision.js`  (circle-vs-rectangle projection and pipe clearance geometry)
  - `src/storage.js`    (UTC calendar-day streak automaton, YYYYMMDD encoding, clamping)
  - `src/physics.js`    (free-list object pool conservation, 6-point speed ramp, shield response)
  - `src/input-queue.js` (bounded timestamped input queue)
  - `src/rng.js`        (exact 32-bit `mulberry32` PRNG transition)
-/

-- ============================================================================
-- MODULE 1: TIMESTEP GRID (`src/timestep.js`, `src/loop.js`)
-- ============================================================================
namespace GlidieBirdie.Timestep

@[expose] public def TICK_HZ : Nat := 720
@[expose] public def SIM_HZ : Nat := 60
@[expose] public def TICKS_PER_STEP : Nat := TICK_HZ / SIM_HZ
@[expose] public def MAX_FRAME_STEPS : Nat := 5
@[expose] public def HZ_144 : Nat := 144
@[expose] public def TICKS_PER_144 : Nat := TICK_HZ / HZ_144

/-- Number of 60 Hz steps executed in a single frame advancing from `prevTick` to `frameTick`. -/
@[expose] public def stepsExecuted (prevTick frameTick : Nat) : Nat :=
  min MAX_FRAME_STEPS ((frameTick / TICKS_PER_STEP) - (prevTick / TICKS_PER_STEP))

/-- Total steps executed over `frames` uniform frames of width `ticksPerFrame` ticks (starting at 0). -/
@[expose] public def totalStepsUniform (frames ticksPerFrame : Nat) : Nat :=
  (frames * ticksPerFrame) / TICKS_PER_STEP

/-- Scaled interpolation numerator in `[0, TICKS_PER_STEP]` matching `view.alpha` in `src/loop.js`. -/
@[expose] public def alphaScaled (frameTick stepIndex : Nat) (backlogDropped : Bool) : Nat :=
  if backlogDropped then TICKS_PER_STEP
  else if frameTick ≤ stepIndex * TICKS_PER_STEP then TICKS_PER_STEP
  else min TICKS_PER_STEP (frameTick - stepIndex * TICKS_PER_STEP)

end GlidieBirdie.Timestep

-- ============================================================================
-- MODULE 2: COLLISION GEOMETRY (`src/collision.js`, `src/config.js`)
-- ============================================================================
namespace GlidieBirdie.Collision

@[expose] public def CANVAS_W : Int := 420
@[expose] public def CANVAS_H : Int := 640
@[expose] public def GROUND_H : Int := 80
@[expose] public def GROUND_Y : Int := CANVAS_H - GROUND_H
@[expose] public def PIPE_W : Int := 72
@[expose] public def PIPE_GAP : Int := 184
@[expose] public def BIRD_R : Int := 18
@[expose] public def PIPE_MOVE_MIN_TOP : Int := 60
@[expose] public def PIPE_MOVE_MAX_TOP : Int := GROUND_Y - PIPE_GAP - 60

/-- Exact clamping of `v` onto `[lo, hi]`. -/
@[expose] public def clampInt (v lo hi : Int) : Int :=
  max lo (min v hi)

/-- Squared Euclidean distance from `(cx, cy)` to the closed rectangle `[rx, rx+rw] × [ry, ry+rh]`. -/
@[expose] public def distSqPointRect (cx cy rx ry rw rh : Int) : Int :=
  let qx := clampInt cx rx (rx + rw)
  let qy := clampInt cy ry (ry + rh)
  (cx - qx) * (cx - qx) + (cy - qy) * (cy - qy)

/-- Exact circle-vs-rectangle predicate matching `circleHitsRect` in `src/collision.js`. -/
@[expose] public def circleHitsRect (cx cy cr rx ry rw rh : Int) : Bool :=
  decide (cr > 0 ∧ rw > 0 ∧ rh > 0 ∧ distSqPointRect cx cy rx ry rw rh < cr * cr)

/-- Top-pipe and bottom-pipe intersection test matching `intersectsPipe` in `src/collision.js`. -/
@[expose] public def intersectsPipeInt (bx by_ cr px topH : Int) : Bool :=
  circleHitsRect bx by_ cr px 0 PIPE_W topH ||
  circleHitsRect bx by_ cr px (topH + PIPE_GAP) PIPE_W (GROUND_Y - (topH + PIPE_GAP))

end GlidieBirdie.Collision

-- ============================================================================
-- MODULE 3: STORAGE, STREAK & CLAMPING (`src/storage.js`, `src/rng.js`)
-- ============================================================================
namespace GlidieBirdie.Storage

/-- Pure UTC calendar-day streak transition matching `nextDayStreak` in `src/storage.js`. -/
@[expose] public def nextDayStreak (prevStreak lastDay today yesterday : Nat) : Nat :=
  if lastDay = today then prevStreak
  else if lastDay = yesterday then prevStreak + 1
  else 1

/-- UTC YYYYMMDD integer date key matching `dateSeed` in `src/rng.js`. -/
@[expose] public def dateSeedNat (y m d : Nat) : Nat :=
  y * 10000 + m * 100 + d

/-- Guarded clamping matching `clampNumber` in `src/storage.js` (returns `fb` on inverted bounds). -/
@[expose] public def clampIntBounds (v fb lo hi : Int) : Int :=
  if hi < lo then fb else max lo (min v hi)

end GlidieBirdie.Storage

-- ============================================================================
-- MODULE 4: OBJECT POOLS & INPUT QUEUE (`src/physics.js`, `src/input-queue.js`)
-- ============================================================================
namespace GlidieBirdie.Pools

@[expose] public def PARTICLE_POOL : Nat := 220
@[expose] public def WEATHER_POOL : Nat := 140
@[expose] public def MEADOW_POLLEN_DETAIL_CAP : Nat := 64
@[expose] public def INPUT_QUEUE_CAP : Nat := 64

/-- Abstract slot-count state of a free-list pool (`active` + `free` slots of capacity `cap`). -/
public structure PoolState where
  active : Nat
  free   : Nat
  cap    : Nat
  deriving DecidableEq, Repr

@[expose] public def PoolState.valid (s : PoolState) : Prop :=
  s.active + s.free = s.cap

@[expose] public def poolInit (cap : Nat) : PoolState :=
  { active := 0, free := cap, cap := cap }

@[expose] public def poolSpawn (s : PoolState) : PoolState :=
  if s.free > 0 then { active := s.active + 1, free := s.free - 1, cap := s.cap }
  else s

@[expose] public def poolReclaim (s : PoolState) : PoolState :=
  if s.active > 0 then { active := s.active - 1, free := s.free + 1, cap := s.cap }
  else s

/-- Matches `clearWeatherPool()` in `src/physics.js`: recycles all active slots onto `free`. -/
@[expose] public def poolClearAll (s : PoolState) : PoolState :=
  { active := 0, free := s.free + s.active, cap := s.cap }

/-- Bounded FIFO push matching `scheduleInput` in `src/input-queue.js`. -/
@[expose] public def queuePushCap (len cap : Nat) : Nat :=
  if cap = 0 then 0
  else if len ≥ cap then cap
  else len + 1

@[expose] public def queuePushMany : Nat → Nat → Nat → Nat
  | 0, len, _ => len
  | n + 1, len, cap => queuePushMany n (queuePushCap len cap) cap

end GlidieBirdie.Pools

-- ============================================================================
-- MODULE 5: PHYSICS RAMP, SHIELD RESPONSE & MULBERRY32 (`src/physics.js`, `src/rng.js`)
-- ============================================================================
namespace GlidieBirdie.Physics

/-- Scaled speed multiplier (×100): starts at 100 (1.00×), +3 every 6 points, capped at 118 (1.18×). -/
@[expose] public def speedMult100 (score : Nat) : Nat :=
  min 118 (100 + 3 * (score / 6))

/-- Pipe-hit outcome matching `checkCollisions()` in `src/physics.js`. -/
public inductive HitOutcome where
  | shieldPop
  | invincPass
  | gameOver
  deriving DecidableEq, Repr

@[expose] public def resolvePipeHit (shieldActive isInvincible : Bool) : HitOutcome :=
  if shieldActive then .shieldPop
  else if isInvincible then .invincPass
  else .gameOver

/-- Exact 32-bit `mulberry32` step matching `src/rng.js` bit-for-bit (`>>> 0`, `Math.imul`). -/
@[expose] public def mulberry32Step (seed : UInt32) : UInt32 × UInt32 :=
  let s : UInt32 := seed + 0x6d2b79f5
  let t1 : UInt32 := (s ^^^ (s >>> 15)) * (s ||| 1)
  let t2 : UInt32 := t1 ^^^ (t1 + ((t1 ^^^ (t1 >>> 7)) * (t1 ||| 61)))
  let out : UInt32 := t2 ^^^ (t2 >>> 14)
  (s, out)

end GlidieBirdie.Physics
