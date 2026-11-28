module

public import GlidieBirdieProofs.Spec

/-!
# GlidieBirdieProofs.StorageStreak

Machine-checked invariants for `src/storage.js` and `src/rng.js` (`dateSeed`):
  - Calendar-day streak transition laws (idempotence, consecutive increment, gap reset, positivity)
  - Exact injectivity of the `YYYYMMDD` integer calendar encoding across all valid `(y, m, d)`
  - Clamping bounds, idempotence, and inverted-bound fallback safety
-/

namespace GlidieBirdie.Storage

public theorem nextDayStreak_same_day (prevStreak day yesterday : Nat) :
    nextDayStreak prevStreak day day yesterday = prevStreak := by
  simp [nextDayStreak]

public theorem nextDayStreak_consecutive_day (prevStreak yesterday today : Nat) (hne : yesterday ≠ today) :
    nextDayStreak prevStreak yesterday today yesterday = prevStreak + 1 := by
  simp [nextDayStreak, hne]

public theorem nextDayStreak_gap_resets (prevStreak lastDay today yesterday : Nat)
    (h1 : lastDay ≠ today) (h2 : lastDay ≠ yesterday) :
    nextDayStreak prevStreak lastDay today yesterday = 1 := by
  simp [nextDayStreak, h1, h2]

public theorem nextDayStreak_positive_after_play (prevStreak lastDay today yesterday : Nat)
    (h : prevStreak ≥ 1 ∨ lastDay ≠ today) :
    nextDayStreak prevStreak lastDay today yesterday ≥ 1 := by
  simp only [nextDayStreak]
  split
  · omega
  · split <;> omega

public theorem dateSeedNat_injective (y1 m1 d1 y2 m2 d2 : Nat)
    (hm1 : 1 ≤ m1 ∧ m1 ≤ 12) (hd1 : 1 ≤ d1 ∧ d1 ≤ 31)
    (hm2 : 1 ≤ m2 ∧ m2 ≤ 12) (hd2 : 1 ≤ d2 ∧ d2 ≤ 31)
    (heq : dateSeedNat y1 m1 d1 = dateSeedNat y2 m2 d2) :
    y1 = y2 ∧ m1 = m2 ∧ d1 = d2 := by
  simp only [dateSeedNat] at heq
  omega

public theorem clampIntBounds_range (v fb lo hi : Int) (h : lo ≤ hi) :
    lo ≤ clampIntBounds v fb lo hi ∧ clampIntBounds v fb lo hi ≤ hi := by
  simp only [clampIntBounds]
  split <;> omega

public theorem clampIntBounds_idempotent (v fb lo hi : Int) (h : lo ≤ hi) :
    clampIntBounds (clampIntBounds v fb lo hi) fb lo hi = clampIntBounds v fb lo hi := by
  simp only [clampIntBounds]
  split <;> omega

public theorem clampIntBounds_inverted_returns_fallback (v fb lo hi : Int) (h : hi < lo) :
    clampIntBounds v fb lo hi = fb := by
  simp only [clampIntBounds]
  split <;> omega

end GlidieBirdie.Storage
