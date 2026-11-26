module

public import GlidieBirdieProofs.Spec

/-!
# GlidieBirdie v3.2.0 — Isolated Statement-Only Challenge Specification (`Challenge.lean`)

Imports ONLY `GlidieBirdieProofs.Spec` (pure definitions, zero proofs, zero `sorry`)
and NONE of the six proof modules. Every `sorry` here is intentional and matched
against sorry-free `Solution.lean` across 6 independent Lean 4.35.0 kernels via:
    lake comparator --config comparator.json --paranoid
-/

namespace GlidieBirdie.Timestep

public theorem lcm_60_144_eq_720 : Nat.lcm SIM_HZ HZ_144 = TICK_HZ := by sorry
public theorem standard_rates_divide_720 :
    TICK_HZ % 60 = 0 ∧ TICK_HZ % 120 = 0 ∧ TICK_HZ % 144 = 0 ∧
    TICK_HZ % 240 = 0 ∧ TICK_HZ % 360 = 0 ∧ TICK_HZ % 720 = 0 := by sorry
public theorem ticks_per_step_eq_12 : TICKS_PER_STEP = 12 ∧ TICKS_PER_144 = 5 := by sorry
public theorem hz60_hz144_lcm_cycle_step_parity (cycles : Nat) :
    totalStepsUniform (5 * cycles) TICKS_PER_STEP = totalStepsUniform (12 * cycles) TICKS_PER_144 ∧
    totalStepsUniform (5 * cycles) TICKS_PER_STEP = 5 * cycles := by sorry
public theorem steps_executed_bounded (prevTick frameTick : Nat) :
    stepsExecuted prevTick frameTick ≤ MAX_FRAME_STEPS := by sorry
public theorem steps_executed_monotone (prevTick f1 f2 : Nat) (h : f1 ≤ f2) :
    stepsExecuted prevTick f1 ≤ stepsExecuted prevTick f2 := by sorry
public theorem steps_executed_zero_when_nonadvancing (prevTick frameTick : Nat) (h : frameTick ≤ prevTick) :
    stepsExecuted prevTick frameTick = 0 := by sorry
public theorem interp_alpha_bounded (frameTick stepIndex : Nat) (backlogDropped : Bool) :
    alphaScaled frameTick stepIndex backlogDropped ≤ TICKS_PER_STEP := by sorry

end GlidieBirdie.Timestep

namespace GlidieBirdie.Collision

public theorem clampInt_bounds (v lo hi : Int) (h : lo ≤ hi) :
    lo ≤ clampInt v lo hi ∧ clampInt v lo hi ≤ hi := by sorry
public theorem clampInt_minimizes_sq_dist (v lo hi p : Int)
    (hlo : lo ≤ p) (hhi : p ≤ hi) :
    (v - clampInt v lo hi) * (v - clampInt v lo hi) ≤ (v - p) * (v - p) := by sorry
public theorem distSqPointRect_nonneg (cx cy rx ry rw rh : Int) :
    0 ≤ distSqPointRect cx cy rx ry rw rh := by sorry
public theorem distSqPointRect_minimality (cx cy rx ry rw rh px py : Int)
    (hpx1 : rx ≤ px) (hpx2 : px ≤ rx + rw)
    (hpy1 : ry ≤ py) (hpy2 : py ≤ ry + rh) :
    distSqPointRect cx cy rx ry rw rh ≤ (cx - px) * (cx - px) + (cy - py) * (cy - py) := by sorry
public theorem interior_point_distSq_zero (cx cy rx ry rw rh : Int)
    (hx1 : rx ≤ cx) (hx2 : cx ≤ rx + rw)
    (hy1 : ry ≤ cy) (hy2 : cy ≤ ry + rh) :
    distSqPointRect cx cy rx ry rw rh = 0 := by sorry
public theorem circleHitsRect_false_nonpos_radius_or_rect (cx cy cr rx ry rw rh : Int)
    (h : cr ≤ 0 ∨ rw ≤ 0 ∨ rh ≤ 0) :
    circleHitsRect cx cy cr rx ry rw rh = false := by sorry
public theorem circleHitsRect_interior_hits (cx cy cr rx ry rw rh : Int)
    (hcr : cr > 0) (hrw : rw > 0) (hrh : rh > 0)
    (hx1 : rx ≤ cx) (hx2 : cx ≤ rx + rw)
    (hy1 : ry ≤ cy) (hy2 : cy ≤ ry + rh) :
    circleHitsRect cx cy cr rx ry rw rh = true := by sorry
public theorem centered_bird_clears_every_valid_pipe (bx px topH : Int)
    (hlo : PIPE_MOVE_MIN_TOP ≤ topH) (hhi : topH ≤ PIPE_MOVE_MAX_TOP) :
    topH + PIPE_GAP < GROUND_Y ∧
    PIPE_GAP > 5 * (2 * BIRD_R) ∧
    intersectsPipeInt bx (topH + PIPE_GAP / 2) BIRD_R px topH = false := by sorry

end GlidieBirdie.Collision

namespace GlidieBirdie.Storage

public theorem nextDayStreak_same_day (prevStreak day yesterday : Nat) :
    nextDayStreak prevStreak day day yesterday = prevStreak := by sorry
public theorem nextDayStreak_consecutive_day (prevStreak yesterday today : Nat) (hne : yesterday ≠ today) :
    nextDayStreak prevStreak yesterday today yesterday = prevStreak + 1 := by sorry
public theorem nextDayStreak_gap_resets (prevStreak lastDay today yesterday : Nat)
    (h1 : lastDay ≠ today) (h2 : lastDay ≠ yesterday) :
    nextDayStreak prevStreak lastDay today yesterday = 1 := by sorry
public theorem nextDayStreak_positive_after_play (prevStreak lastDay today yesterday : Nat)
    (h : prevStreak ≥ 1 ∨ lastDay ≠ today) :
    nextDayStreak prevStreak lastDay today yesterday ≥ 1 := by sorry
public theorem dateSeedNat_injective (y1 m1 d1 y2 m2 d2 : Nat)
    (hm1 : 1 ≤ m1 ∧ m1 ≤ 12) (hd1 : 1 ≤ d1 ∧ d1 ≤ 31)
    (hm2 : 1 ≤ m2 ∧ m2 ≤ 12) (hd2 : 1 ≤ d2 ∧ d2 ≤ 31)
    (heq : dateSeedNat y1 m1 d1 = dateSeedNat y2 m2 d2) :
    y1 = y2 ∧ m1 = m2 ∧ d1 = d2 := by sorry
public theorem clampIntBounds_range (v fb lo hi : Int) (h : lo ≤ hi) :
    lo ≤ clampIntBounds v fb lo hi ∧ clampIntBounds v fb lo hi ≤ hi := by sorry
public theorem clampIntBounds_idempotent (v fb lo hi : Int) (h : lo ≤ hi) :
    clampIntBounds (clampIntBounds v fb lo hi) fb lo hi = clampIntBounds v fb lo hi := by sorry
public theorem clampIntBounds_inverted_returns_fallback (v fb lo hi : Int) (h : hi < lo) :
    clampIntBounds v fb lo hi = fb := by sorry

end GlidieBirdie.Storage

namespace GlidieBirdie.Pools

public theorem poolInit_conserves (cap : Nat) : (poolInit cap).valid := by sorry
public theorem poolSpawn_conserves (s : PoolState) (h : s.valid) : (poolSpawn s).valid := by sorry
public theorem poolReclaim_conserves (s : PoolState) (h : s.valid) : (poolReclaim s).valid := by sorry
public theorem poolClearAll_conserves_and_empties (s : PoolState) (h : s.valid) :
    (poolClearAll s).valid ∧ (poolClearAll s).active = 0 ∧ (poolClearAll s).free = s.cap := by sorry
public theorem pool_active_le_cap (s : PoolState) (h : s.valid) : s.active ≤ s.cap := by sorry
public theorem glidiebirdie_pool_capacities_exact :
    PARTICLE_POOL = 220 ∧ WEATHER_POOL = 140 ∧ INPUT_QUEUE_CAP = 64 ∧
    MEADOW_POLLEN_DETAIL_CAP ≤ WEATHER_POOL := by sorry
public theorem queuePushCap_bounded (len cap : Nat) :
    queuePushCap len cap ≤ cap := by sorry
public theorem queuePushMany_bounded (n len cap : Nat) (h : len ≤ cap) :
    queuePushMany n len cap ≤ cap := by sorry

end GlidieBirdie.Pools

namespace GlidieBirdie.Physics

public theorem speedMult100_initial : speedMult100 0 = 100 := by sorry
public theorem speedMult100_bounded (score : Nat) :
    100 ≤ speedMult100 score ∧ speedMult100 score ≤ 118 := by sorry
public theorem speedMult100_monotone (s1 s2 : Nat) (h : s1 ≤ s2) :
    speedMult100 s1 ≤ speedMult100 s2 := by sorry
public theorem speedMult100_six_point_ramp :
    speedMult100 5 = 100 ∧ speedMult100 6 = 103 := by sorry
public theorem speedMult100_saturates_at_36 (score : Nat) (h : score ≥ 36) :
    speedMult100 score = 118 := by sorry
public theorem resolvePipeHit_shield_never_gameover (isInvincible : Bool) :
    resolvePipeHit true isInvincible ≠ .gameOver := by sorry
public theorem resolvePipeHit_invincible_never_gameover :
    resolvePipeHit false true ≠ .gameOver := by sorry
public theorem resolvePipeHit_unprotected_gameover :
    resolvePipeHit false false = .gameOver := by sorry
public theorem mulberry32_golden_20261125 :
    let (s1, o1) := mulberry32Step 20261125
    let (s2, o2) := mulberry32Step s1
    let (s3, o3) := mulberry32Step s2
    s1 = 1851826938 ∧ o1 = 1176269751 ∧
    s2 = 3683392751 ∧ o2 = 1461114176 ∧
    s3 = 1219991268 ∧ o3 = 3047578727 := by sorry

end GlidieBirdie.Physics

namespace GlidieBirdie.NonVacuity

open GlidieBirdie.Timestep GlidieBirdie.Collision GlidieBirdie.Storage GlidieBirdie.Pools GlidieBirdie.Physics

public theorem nonvacuous_60_144_parity_witness :
    ∃ cycles : Nat, cycles = 36 ∧
      totalStepsUniform (5 * cycles) TICKS_PER_STEP = 180 ∧
      totalStepsUniform (12 * cycles) TICKS_PER_144 = 180 := by sorry
public theorem nonvacuous_pipe_clearance_and_hit_witness :
    ∃ topH : Int, PIPE_MOVE_MIN_TOP ≤ topH ∧ topH ≤ PIPE_MOVE_MAX_TOP ∧
      intersectsPipeInt 112 (topH + PIPE_GAP / 2) BIRD_R 100 topH = false ∧
      intersectsPipeInt 112 (topH - 10) BIRD_R 100 topH = true := by sorry
public theorem nonvacuous_weather_pool_churn_and_clear_witness :
    ∃ s : PoolState, s.valid ∧ s.active = 3 ∧
      (poolClearAll s).active = 0 ∧ (poolClearAll s).free = WEATHER_POOL := by sorry
public theorem nonvacuous_iron_calm_3day_streak_witness :
    let d1 := dateSeedNat 2026 11 23
    let d2 := dateSeedNat 2026 11 24
    let d3 := dateSeedNat 2026 11 25
    let st1 := nextDayStreak 0 0 d1 20261122
    let st2 := nextDayStreak st1 d1 d2 d1
    let st3 := nextDayStreak st2 d2 d3 d2
    st1 = 1 ∧ st2 = 2 ∧ st3 = 3 := by sorry

end GlidieBirdie.NonVacuity
