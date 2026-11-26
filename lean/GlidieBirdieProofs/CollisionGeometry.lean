module

public import GlidieBirdieProofs.Spec

/-!
# GlidieBirdieProofs.CollisionGeometry

Machine-checked Euclidean geometry proofs for `src/collision.js`:
  - Exact 1D interval clamping bounds & squared-distance minimality
  - Exact 2D closest-point projection optimality over closed axis-aligned rectangles
  - Non-negativity and interior-zero characterization
  - Soundness guard: non-positive radius or degenerate rectangle never triggers collision
  - Universal pipe clearance: every valid pipe (`topH ∈ [60, 316]`) is strictly passable
    and a bird centered in the gap misses both top and bottom pipe segments.
-/

namespace GlidieBirdie.Collision

public theorem clampInt_bounds (v lo hi : Int) (h : lo ≤ hi) :
    lo ≤ clampInt v lo hi ∧ clampInt v lo hi ≤ hi := by
  simp only [clampInt]
  omega

private theorem sq_nonneg_int (x : Int) : 0 ≤ x * x := by
  rcases Int.le_total 0 x with h | h
  · exact Int.mul_nonneg h h
  · have hn : 0 ≤ -x := by omega
    have hmul : 0 ≤ (-x) * (-x) := Int.mul_nonneg hn hn
    simpa [Int.neg_mul_neg] using hmul

private theorem sq_le_sq_of_nonneg_le {a b : Int} (ha : 0 ≤ a) (hab : a ≤ b) :
    a * a ≤ b * b := by
  have hb : 0 ≤ b := Int.le_trans ha hab
  have h1 : a * a ≤ a * b := Int.mul_le_mul_of_nonneg_left hab ha
  have h2 : a * b ≤ b * b := Int.mul_le_mul_of_nonneg_right hab hb
  exact Int.le_trans h1 h2

public theorem clampInt_minimizes_sq_dist (v lo hi p : Int)
    (hlo : lo ≤ p) (hhi : p ≤ hi) :
    (v - clampInt v lo hi) * (v - clampInt v lo hi) ≤ (v - p) * (v - p) := by
  simp only [clampInt]
  by_cases hv1 : v < lo
  · have hcl : max lo (min v hi) = lo := by omega
    rw [hcl]
    have ha : 0 ≤ lo - v := by omega
    have hab : lo - v ≤ p - v := by omega
    have hsq := sq_le_sq_of_nonneg_le ha hab
    have e1 : (v - lo) * (v - lo) = (lo - v) * (lo - v) := by
      have : v - lo = -(lo - v) := by omega
      rw [this, Int.neg_mul_neg]
    have e2 : (v - p) * (v - p) = (p - v) * (p - v) := by
      have : v - p = -(p - v) := by omega
      rw [this, Int.neg_mul_neg]
    rw [e1, e2]
    exact hsq
  · by_cases hv2 : hi < v
    · have hcl : max lo (min v hi) = hi := by omega
      rw [hcl]
      have ha : 0 ≤ v - hi := by omega
      have hab : v - hi ≤ v - p := by omega
      exact sq_le_sq_of_nonneg_le ha hab
    · have hcl : max lo (min v hi) = v := by omega
      rw [hcl]
      have h0 : (v - v) * (v - v) = 0 := by omega
      rw [h0]
      exact sq_nonneg_int (v - p)

public theorem distSqPointRect_nonneg (cx cy rx ry rw rh : Int) :
    0 ≤ distSqPointRect cx cy rx ry rw rh := by
  simp only [distSqPointRect]
  exact Int.add_nonneg (sq_nonneg_int _) (sq_nonneg_int _)

public theorem distSqPointRect_minimality (cx cy rx ry rw rh px py : Int)
    (hpx1 : rx ≤ px) (hpx2 : px ≤ rx + rw)
    (hpy1 : ry ≤ py) (hpy2 : py ≤ ry + rh) :
    distSqPointRect cx cy rx ry rw rh ≤ (cx - px) * (cx - px) + (cy - py) * (cy - py) := by
  simp only [distSqPointRect]
  have hx := clampInt_minimizes_sq_dist cx rx (rx + rw) px hpx1 hpx2
  have hy := clampInt_minimizes_sq_dist cy ry (ry + rh) py hpy1 hpy2
  exact Int.add_le_add hx hy

public theorem interior_point_distSq_zero (cx cy rx ry rw rh : Int)
    (hx1 : rx ≤ cx) (hx2 : cx ≤ rx + rw)
    (hy1 : ry ≤ cy) (hy2 : cy ≤ ry + rh) :
    distSqPointRect cx cy rx ry rw rh = 0 := by
  simp only [distSqPointRect, clampInt]
  have h1 : max rx (min cx (rx + rw)) = cx := by omega
  have h2 : max ry (min cy (ry + rh)) = cy := by omega
  rw [h1, h2]
  omega

public theorem circleHitsRect_false_nonpos_radius_or_rect (cx cy cr rx ry rw rh : Int)
    (h : cr ≤ 0 ∨ rw ≤ 0 ∨ rh ≤ 0) :
    circleHitsRect cx cy cr rx ry rw rh = false := by
  simp only [circleHitsRect, decide_eq_false_iff_not]
  omega

public theorem circleHitsRect_interior_hits (cx cy cr rx ry rw rh : Int)
    (hcr : cr > 0) (hrw : rw > 0) (hrh : rh > 0)
    (hx1 : rx ≤ cx) (hx2 : cx ≤ rx + rw)
    (hy1 : ry ≤ cy) (hy2 : cy ≤ ry + rh) :
    circleHitsRect cx cy cr rx ry rw rh = true := by
  simp only [circleHitsRect, decide_eq_true_eq]
  refine ⟨hcr, hrw, hrh, ?_⟩
  rw [interior_point_distSq_zero cx cy rx ry rw rh hx1 hx2 hy1 hy2]
  exact Int.mul_pos hcr hcr

public theorem centered_bird_clears_every_valid_pipe (bx px topH : Int)
    (hlo : PIPE_MOVE_MIN_TOP ≤ topH) (hhi : topH ≤ PIPE_MOVE_MAX_TOP) :
    topH + PIPE_GAP < GROUND_Y ∧
    PIPE_GAP > 5 * (2 * BIRD_R) ∧
    intersectsPipeInt bx (topH + PIPE_GAP / 2) BIRD_R px topH = false := by
  have hGeom : topH + PIPE_GAP < GROUND_Y ∧ PIPE_GAP > 5 * (2 * BIRD_R) := by
    simp only [PIPE_MOVE_MIN_TOP, PIPE_MOVE_MAX_TOP, GROUND_Y, CANVAS_H, GROUND_H, PIPE_GAP, BIRD_R] at *
    omega
  refine ⟨hGeom.1, hGeom.2, ?_⟩
  simp only [intersectsPipeInt, Bool.or_eq_false_iff, circleHitsRect, decide_eq_false_iff_not]
  constructor
  · intro ⟨_, _, _, hlt⟩
    simp only [distSqPointRect, clampInt, PIPE_GAP, BIRD_R, PIPE_W, PIPE_MOVE_MIN_TOP, PIPE_MOVE_MAX_TOP,
      GROUND_Y, CANVAS_H, GROUND_H] at *
    have hqy : max 0 (min (topH + (184 : Int) / 2) (0 + topH)) = topH := by omega
    rw [hqy] at hlt
    have hdx : 0 ≤ (bx - max px (min bx (px + 72))) * (bx - max px (min bx (px + 72))) := sq_nonneg_int _
    have hdy : (topH + (184 : Int) / 2 - topH) * (topH + (184 : Int) / 2 - topH) = 8464 := by omega
    omega
  · intro ⟨_, _, _, hlt⟩
    simp only [distSqPointRect, clampInt, PIPE_GAP, BIRD_R, PIPE_W, PIPE_MOVE_MIN_TOP, PIPE_MOVE_MAX_TOP,
      GROUND_Y, CANVAS_H, GROUND_H] at *
    have hqy : max (topH + 184) (min (topH + (184 : Int) / 2) (topH + 184 + (640 - 80 - (topH + 184)))) = topH + 184 := by omega
    rw [hqy] at hlt
    have hdx : 0 ≤ (bx - max px (min bx (px + 72))) * (bx - max px (min bx (px + 72))) := sq_nonneg_int _
    have hdy : (topH + (184 : Int) / 2 - (topH + 184)) * (topH + (184 : Int) / 2 - (topH + 184)) = 8464 := by omega
    omega

end GlidieBirdie.Collision
