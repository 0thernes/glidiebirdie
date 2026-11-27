module

public import GlidieBirdieProofs.Spec

/-!
# GlidieBirdieProofs.PhysicsBounds

Machine-checked invariants for `src/physics.js` and `src/rng.js`:
  - 6-point difficulty speed ramp bounds (`[1.00×, 1.18×]`), monotonicity, 6-point boundary, saturation at score 36
  - Feather Shield & invincibility collision safety (`resolvePipeHit`)
  - Exact 32-bit `mulberry32` golden vectors matching Node.js `src/rng.js` bit-for-bit on daily seed `20261125`
-/

namespace GlidieBirdie.Physics

public theorem speedMult100_initial : speedMult100 0 = 100 := by
  decide

public theorem speedMult100_bounded (score : Nat) :
    100 ≤ speedMult100 score ∧ speedMult100 score ≤ 118 := by
  simp only [speedMult100]
  omega

public theorem speedMult100_monotone (s1 s2 : Nat) (h : s1 ≤ s2) :
    speedMult100 s1 ≤ speedMult100 s2 := by
  simp only [speedMult100]
  have hdiv : s1 / 6 ≤ s2 / 6 := Nat.div_le_div_right h
  omega

public theorem speedMult100_six_point_ramp :
    speedMult100 5 = 100 ∧ speedMult100 6 = 103 := by
  decide

public theorem speedMult100_saturates_at_36 (score : Nat) (h : score ≥ 36) :
    speedMult100 score = 118 := by
  simp only [speedMult100]
  have hdiv : 6 ≤ score / 6 := by omega
  omega

public theorem resolvePipeHit_shield_never_gameover (isInvincible : Bool) :
    resolvePipeHit true isInvincible ≠ .gameOver := by
  simp [resolvePipeHit]

public theorem resolvePipeHit_invincible_never_gameover :
    resolvePipeHit false true ≠ .gameOver := by
  simp [resolvePipeHit]

public theorem resolvePipeHit_unprotected_gameover :
    resolvePipeHit false false = .gameOver := by
  rfl

public theorem mulberry32_golden_20261125 :
    let (s1, o1) := mulberry32Step 20261125
    let (s2, o2) := mulberry32Step s1
    let (s3, o3) := mulberry32Step s2
    s1 = 1851826938 ∧ o1 = 1176269751 ∧
    s2 = 3683392751 ∧ o2 = 1461114176 ∧
    s3 = 1219991268 ∧ o3 = 3047578727 := by
  decide

/-- Any clamped pupil gaze `(gx, gy)` with `gx^2 + gy^2 ≤ 16` remains strictly inside the `8 px` sclera (`64`). -/
public theorem eye_gaze_clamp_within_sclera (gx gy : Int) (h : gx * gx + gy * gy ≤ 16) :
    gx * gx + gy * gy < SCLERA_R * SCLERA_R := by
  simp only [SCLERA_R]
  omega

/-- Interpolating a moving pipe top height between valid endpoints stays strictly within `[12*lo, 12*hi]`. -/
public theorem moving_pipe_lerp_within_bounds (prevH curH lo hi a : Int)
    (hp1 : lo ≤ prevH) (hp2 : prevH ≤ hi)
    (hc1 : lo ≤ curH) (hc2 : curH ≤ hi)
    (ha1 : 0 ≤ a) (ha2 : a ≤ 12) :
    12 * lo ≤ lerpPipeTopScaled prevH curH a ∧ lerpPipeTopScaled prevH curH a ≤ 12 * hi := by
  simp only [lerpPipeTopScaled]
  have heq : 12 * prevH + a * (curH - prevH) = (12 - a) * prevH + a * curH := by
    have h1 : a * (curH - prevH) = a * curH - a * prevH := Int.mul_sub a curH prevH
    have h2 : (12 - a) * prevH = 12 * prevH - a * prevH := Int.sub_mul 12 a prevH
    omega
  rw [heq]
  have h12a : 0 ≤ 12 - a := by omega
  have hlo1 : (12 - a) * lo ≤ (12 - a) * prevH := Int.mul_le_mul_of_nonneg_left hp1 h12a
  have hlo2 : a * lo ≤ a * curH := Int.mul_le_mul_of_nonneg_left hc1 ha1
  have hhi1 : (12 - a) * prevH ≤ (12 - a) * hi := Int.mul_le_mul_of_nonneg_left hp2 h12a
  have hhi2 : a * curH ≤ a * hi := Int.mul_le_mul_of_nonneg_left hc2 ha1
  have hsumLo : (12 - a) * lo + a * lo = 12 * lo := by
    have h := Int.sub_mul 12 a lo
    omega
  have hsumHi : (12 - a) * hi + a * hi = 12 * hi := by
    have h := Int.sub_mul 12 a hi
    omega
  constructor <;> omega

end GlidieBirdie.Physics
