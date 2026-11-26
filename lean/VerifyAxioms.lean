import GlidieBirdieProofs

/-!
# GlidieBirdie v3.2.0 — Standalone Axiom Audit (`VerifyAxioms.lean`)

Runs `#print axioms` on all 45 machine-checked theorems across all 6 pure Lean 4.35.0
modules. Every declaration MUST depend strictly on `[propext, Classical.choice, Quot.sound]`
(or zero axioms) with zero `sorryAx`, `Lean.ofReduceBool`, `Lean.trustCompiler`, or custom axioms.
-/

-- Module 1: TimestepGrid (8)
#print axioms GlidieBirdie.Timestep.lcm_60_144_eq_720
#print axioms GlidieBirdie.Timestep.standard_rates_divide_720
#print axioms GlidieBirdie.Timestep.ticks_per_step_eq_12
#print axioms GlidieBirdie.Timestep.hz60_hz144_lcm_cycle_step_parity
#print axioms GlidieBirdie.Timestep.steps_executed_bounded
#print axioms GlidieBirdie.Timestep.steps_executed_monotone
#print axioms GlidieBirdie.Timestep.steps_executed_zero_when_nonadvancing
#print axioms GlidieBirdie.Timestep.interp_alpha_bounded

-- Module 2: CollisionGeometry (8)
#print axioms GlidieBirdie.Collision.clampInt_bounds
#print axioms GlidieBirdie.Collision.clampInt_minimizes_sq_dist
#print axioms GlidieBirdie.Collision.distSqPointRect_nonneg
#print axioms GlidieBirdie.Collision.distSqPointRect_minimality
#print axioms GlidieBirdie.Collision.interior_point_distSq_zero
#print axioms GlidieBirdie.Collision.circleHitsRect_false_nonpos_radius_or_rect
#print axioms GlidieBirdie.Collision.circleHitsRect_interior_hits
#print axioms GlidieBirdie.Collision.centered_bird_clears_every_valid_pipe

-- Module 3: StorageStreak (8)
#print axioms GlidieBirdie.Storage.nextDayStreak_same_day
#print axioms GlidieBirdie.Storage.nextDayStreak_consecutive_day
#print axioms GlidieBirdie.Storage.nextDayStreak_gap_resets
#print axioms GlidieBirdie.Storage.nextDayStreak_positive_after_play
#print axioms GlidieBirdie.Storage.dateSeedNat_injective
#print axioms GlidieBirdie.Storage.clampIntBounds_range
#print axioms GlidieBirdie.Storage.clampIntBounds_idempotent
#print axioms GlidieBirdie.Storage.clampIntBounds_inverted_returns_fallback

-- Module 4: PoolAndQueue (8)
#print axioms GlidieBirdie.Pools.poolInit_conserves
#print axioms GlidieBirdie.Pools.poolSpawn_conserves
#print axioms GlidieBirdie.Pools.poolReclaim_conserves
#print axioms GlidieBirdie.Pools.poolClearAll_conserves_and_empties
#print axioms GlidieBirdie.Pools.pool_active_le_cap
#print axioms GlidieBirdie.Pools.glidiebirdie_pool_capacities_exact
#print axioms GlidieBirdie.Pools.queuePushCap_bounded
#print axioms GlidieBirdie.Pools.queuePushMany_bounded

-- Module 5: PhysicsBounds (9)
#print axioms GlidieBirdie.Physics.speedMult100_initial
#print axioms GlidieBirdie.Physics.speedMult100_bounded
#print axioms GlidieBirdie.Physics.speedMult100_monotone
#print axioms GlidieBirdie.Physics.speedMult100_six_point_ramp
#print axioms GlidieBirdie.Physics.speedMult100_saturates_at_36
#print axioms GlidieBirdie.Physics.resolvePipeHit_shield_never_gameover
#print axioms GlidieBirdie.Physics.resolvePipeHit_invincible_never_gameover
#print axioms GlidieBirdie.Physics.resolvePipeHit_unprotected_gameover
#print axioms GlidieBirdie.Physics.mulberry32_golden_20261125

-- Module 6: NonVacuity (4)
#print axioms GlidieBirdie.NonVacuity.nonvacuous_60_144_parity_witness
#print axioms GlidieBirdie.NonVacuity.nonvacuous_pipe_clearance_and_hit_witness
#print axioms GlidieBirdie.NonVacuity.nonvacuous_weather_pool_churn_and_clear_witness
#print axioms GlidieBirdie.NonVacuity.nonvacuous_iron_calm_3day_streak_witness
