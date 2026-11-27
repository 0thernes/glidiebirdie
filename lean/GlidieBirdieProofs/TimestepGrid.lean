module

public import GlidieBirdieProofs.Spec

/-!
# GlidieBirdieProofs.TimestepGrid

Machine-checked proofs of the 720 Hz fixed-step simulation tick grid (`src/timestep.js`, `src/loop.js`):
  - Exact LCM(60, 144) = 720 and exact divisibility across all standard refresh rates (60/120/144/240/360/720 Hz)
  - Exact step-count parity between 60 Hz and 144 Hz displays over any number of 1/12 s cycles
  - Hitch backlog bound (`≤ MAX_FRAME_STEPS = 5`) and monotonicity
  - Interpolation blend clamp `alpha ∈ [0, 1]` (scaled `[0, 12]`)
-/

namespace GlidieBirdie.Timestep

public theorem lcm_60_144_eq_720 : Nat.lcm SIM_HZ HZ_144 = TICK_HZ := by
  decide

public theorem standard_rates_divide_720 :
    TICK_HZ % 60 = 0 ∧ TICK_HZ % 120 = 0 ∧ TICK_HZ % 144 = 0 ∧
    TICK_HZ % 240 = 0 ∧ TICK_HZ % 360 = 0 ∧ TICK_HZ % 720 = 0 := by
  decide

public theorem ticks_per_step_eq_12 : TICKS_PER_STEP = 12 ∧ TICKS_PER_144 = 5 := by
  decide

public theorem hz60_hz144_lcm_cycle_step_parity (cycles : Nat) :
    totalStepsUniform (5 * cycles) TICKS_PER_STEP = totalStepsUniform (12 * cycles) TICKS_PER_144 ∧
    totalStepsUniform (5 * cycles) TICKS_PER_STEP = 5 * cycles := by
  simp only [totalStepsUniform, TICKS_PER_STEP, TICKS_PER_144, TICK_HZ, SIM_HZ, HZ_144]
  omega

public theorem steps_executed_bounded (prevTick frameTick : Nat) :
    stepsExecuted prevTick frameTick ≤ MAX_FRAME_STEPS := by
  simp only [stepsExecuted]
  omega

public theorem steps_executed_monotone (prevTick f1 f2 : Nat) (h : f1 ≤ f2) :
    stepsExecuted prevTick f1 ≤ stepsExecuted prevTick f2 := by
  simp only [stepsExecuted, TICKS_PER_STEP, TICK_HZ, SIM_HZ]
  have hdiv : f1 / 12 ≤ f2 / 12 := Nat.div_le_div_right h
  omega

public theorem steps_executed_zero_when_nonadvancing (prevTick frameTick : Nat) (h : frameTick ≤ prevTick) :
    stepsExecuted prevTick frameTick = 0 := by
  simp only [stepsExecuted, TICKS_PER_STEP, TICK_HZ, SIM_HZ]
  have hdiv : frameTick / 12 ≤ prevTick / 12 := Nat.div_le_div_right h
  omega

public theorem interp_alpha_bounded (frameTick stepIndex : Nat) (backlogDropped : Bool) :
    alphaScaled frameTick stepIndex backlogDropped ≤ TICKS_PER_STEP := by
  cases backlogDropped
  · simp only [alphaScaled, Bool.false_eq_true, ↓reduceIte]
    split <;> omega
  · simp only [alphaScaled, ↓reduceIte]
    omega

/-- Any hitch-free frame (`dtTicks ≤ 60`, covering all refresh rates ≥ 12 Hz including 60 Hz and 144 Hz)
    executes its exact uncapped step count with zero dropped backlog. -/
public theorem steps_executed_no_drop_under_60_ticks (prevTick dtTicks : Nat) (h : dtTicks ≤ 60) :
    stepsExecuted prevTick (prevTick + dtTicks) =
      (prevTick + dtTicks) / TICKS_PER_STEP - prevTick / TICKS_PER_STEP := by
  simp only [stepsExecuted, MAX_FRAME_STEPS, TICKS_PER_STEP, TICK_HZ, SIM_HZ]
  omega

/-- Interpolation numerator is strictly positive (`≥ 1`), never collapsing to degenerate `0`. -/
public theorem interp_alpha_pos (frameTick stepIndex : Nat) (backlogDropped : Bool) :
    1 ≤ alphaScaled frameTick stepIndex backlogDropped := by
  cases backlogDropped
  · simp only [alphaScaled, Bool.false_eq_true, ↓reduceIte, TICKS_PER_STEP, TICK_HZ, SIM_HZ]
    by_cases h : frameTick ≤ stepIndex * (720 / 60)
    · simp only [h, ↓reduceIte]; omega
    · simp only [h, ↓reduceIte]; omega
  · simp only [alphaScaled, ↓reduceIte, TICKS_PER_STEP, TICK_HZ, SIM_HZ]
    omega

/-- Afterglow (`4.2 s = 42/10 s`) decremented by `dtSec = 1/60 s` terminates in exact `252` steps. -/
public theorem afterglow_terminates_252_steps :
    AFTERGLOW_TENTHS * SIM_HZ = 252 * 10 := by
  decide

/-- Liveness of the demand-driven idle scheduler: visible, active unpaused play NEVER sleeps. -/
public theorem idle_scheduler_never_sleeps_during_active_play
    (postcard reducedMotion hasGamepad : Bool) :
    shouldContinueLoop false true false postcard reducedMotion hasGamepad = true := by
  simp [shouldContinueLoop]

/-- Thermal safety of the demand-driven idle scheduler: hidden tabs and static pauses always sleep (`false`). -/
public theorem idle_scheduler_sleeps_when_hidden_or_static_pause
    (hidden playing paused postcard reducedMotion hasGamepad : Bool)
    (h : hidden = true ∨ (paused = true ∧ postcard = false ∧ hasGamepad = false)) :
    shouldContinueLoop hidden playing paused postcard reducedMotion hasGamepad = false := by
  rcases h with hh | ⟨hp, hpc, hg⟩
  · simp [shouldContinueLoop, hh]
  · cases hidden <;> cases playing <;> simp [shouldContinueLoop, hp, hpc, hg]

end GlidieBirdie.Timestep
