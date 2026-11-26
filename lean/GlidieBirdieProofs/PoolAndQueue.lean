module

public import GlidieBirdieProofs.Spec

/-!
# GlidieBirdieProofs.PoolAndQueue

Machine-checked resource conservation and bounded-memory proofs for:
  - `src/physics.js` (`particlePool` cap 220, `weatherPool` cap 140, `clearWeatherPool`)
  - `src/input-queue.js` (bounded FIFO input buffer capped at `INPUT_QUEUE_CAP = 64`)
-/

namespace GlidieBirdie.Pools

public theorem poolInit_conserves (cap : Nat) : (poolInit cap).valid := by
  simp [poolInit, PoolState.valid]

public theorem poolSpawn_conserves (s : PoolState) (h : s.valid) : (poolSpawn s).valid := by
  rcases s with ⟨active, free, cap⟩
  simp only [poolSpawn, PoolState.valid] at *
  split <;> simp only [] <;> omega

public theorem poolReclaim_conserves (s : PoolState) (h : s.valid) : (poolReclaim s).valid := by
  rcases s with ⟨active, free, cap⟩
  simp only [poolReclaim, PoolState.valid] at *
  split <;> simp only [] <;> omega

public theorem poolClearAll_conserves_and_empties (s : PoolState) (h : s.valid) :
    (poolClearAll s).valid ∧ (poolClearAll s).active = 0 ∧ (poolClearAll s).free = s.cap := by
  rcases s with ⟨active, free, cap⟩
  simp only [poolClearAll, PoolState.valid] at *
  refine ⟨by omega, trivial, by omega⟩

public theorem pool_active_le_cap (s : PoolState) (h : s.valid) : s.active ≤ s.cap := by
  simp only [PoolState.valid] at h
  omega

public theorem glidiebirdie_pool_capacities_exact :
    PARTICLE_POOL = 220 ∧ WEATHER_POOL = 140 ∧ INPUT_QUEUE_CAP = 64 ∧
    MEADOW_POLLEN_DETAIL_CAP ≤ WEATHER_POOL := by
  decide

public theorem queuePushCap_bounded (len cap : Nat) :
    queuePushCap len cap ≤ cap := by
  simp only [queuePushCap]
  by_cases hc : cap = 0
  · simp [hc]
  · by_cases hl : len ≥ cap
    · simp [hc, hl]
    · simp [hc, hl]; omega

public theorem queuePushMany_bounded (n len cap : Nat) (h : len ≤ cap) :
    queuePushMany n len cap ≤ cap := by
  induction n generalizing len with
  | zero => exact h
  | succ k ih =>
    simp only [queuePushMany]
    exact ih (queuePushCap len cap) (queuePushCap_bounded len cap)

end GlidieBirdie.Pools
