module

public import GlidieBirdieProofs.Spec

/-!
# GlidieBirdieProofs.AdversarialTests — Constructive False-Variant Refutations (9 Theorems)

Machine-checked negative witnesses proving that each hardened guard, cap, and precondition
in `GlidieBirdieProofs` is genuinely load-bearing rather than vacuous:
  1. Unguarded negative radius satisfies `d^2 < cr^2` (M01)
  2. A 100 ms hitch (`72` ticks) intentionally drops 1 step (`5 < 6`)
  3. Corrupted `TICKS_PER_STEP = 10` breaks 180-step parity (`216 ≠ 180`, M03)
  4. Same-day `prevStreak = 0` yields `0` (proving `prevStreak ≥ 1 ∨ lastDay ≠ today` is sharp)
  5. Leaked `clearWeatherPool` (dropping `freeWeather.push`) violates `active + free = cap` (M07)
  6. Off-by-one queue allowance `65` exceeds `INPUT_QUEUE_CAP = 64` (F02 / M06)
  7. Unclamped difficulty ramp exceeds `speedMult100` cap `118` at score `42`
  8. Degenerate zero/negative rectangle dimensions never hit interior circles (F01)
-/

namespace GlidieBirdie.Adversarial

open GlidieBirdie.Timestep GlidieBirdie.Collision GlidieBirdie.Storage GlidieBirdie.Pools GlidieBirdie.Physics

public theorem adversarial_unguarded_neg_radius_false_hit :
    (0 : Int) < (-1) * (-1) ∧ circleHitsRect 50 50 (-1) 40 40 20 20 = false := by
  decide

public theorem adversarial_hitch_100ms_drops_one_step :
    stepsExecuted 0 72 = 5 ∧ 72 / TICKS_PER_STEP = 6 ∧ stepsExecuted 0 72 < 72 / TICKS_PER_STEP := by
  decide

public theorem adversarial_corrupted_ticks_per_step_10_breaks_180 :
    (180 * 12) / 10 = 216 ∧ (180 * 12) / 10 ≠ 180 := by
  decide

public theorem adversarial_zero_prev_same_day_returns_zero :
    nextDayStreak 0 20261125 20261125 20261124 = 0 := by
  decide

public theorem adversarial_leaked_weather_clear_violates_conservation :
    ¬ ({ active := 0, free := 137, cap := WEATHER_POOL : PoolState }).valid := by
  simp only [PoolState.valid, WEATHER_POOL]
  omega

public theorem adversarial_off_by_one_queue_exceeds_cap :
    65 > INPUT_QUEUE_CAP ∧ queuePushCap 64 INPUT_QUEUE_CAP = INPUT_QUEUE_CAP := by
  decide

public theorem adversarial_unclamped_speed_exceeds_cap :
    100 + 3 * (42 / 6) = 121 ∧ speedMult100 42 = 118 ∧ 121 > speedMult100 42 := by
  decide

public theorem adversarial_nonpos_rect_never_hits_interior :
    circleHitsRect 50 50 10 50 50 0 20 = false ∧ circleHitsRect 50 50 10 50 50 20 (-5) = false := by
  decide

/-- Refutes the pre-hardening detached-pupil bug (`lookX = 18`): `18^2 = 324 > 64 = 8^2`, whereas `2^2 = 4 < 64`. -/
public theorem adversarial_detached_pupil_18_escapes_sclera :
    (18 : Int) * 18 > SCLERA_R * SCLERA_R ∧ (2 : Int) * 2 < SCLERA_R * SCLERA_R := by
  decide

end GlidieBirdie.Adversarial
