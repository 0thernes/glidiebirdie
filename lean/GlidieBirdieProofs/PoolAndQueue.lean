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

public theorem listPoolInit_valid (cap : Nat) : (listPoolInit cap).valid := by
  refine ⟨?_, ?_, ?_⟩
  · simp [listPoolInit]
  · simp [listPoolInit, List.nodup_range]
  · intro i hi
    simp only [listPoolInit, List.nil_append, List.mem_range] at hi
    exact hi

public theorem listPoolSpawn_valid (p : ListPool) (h : p.valid) : (listPoolSpawn p).valid := by
  rcases p with ⟨active, free, cap⟩
  cases free with
  | nil => exact h
  | cons idx rest =>
    rcases h with ⟨hlen, hnodup, hbound⟩
    simp only [listPoolSpawn, ListPool.valid] at *
    have hnd := List.nodup_append.mp hnodup
    rcases hnd with ⟨hndA, hndF, hdisj⟩
    have hndF' := List.nodup_cons.mp hndF
    rcases hndF' with ⟨hidxNotRest, hndRest⟩
    refine ⟨by simp at hlen ⊢; omega, ?_, ?_⟩
    · simp only [List.cons_append]
      rw [List.nodup_cons]
      refine ⟨?_, ?_⟩
      · intro hmem
        rcases List.mem_append.mp hmem with hA | hR
        · exact (hdisj idx hA idx (List.mem_cons_self)) rfl
        · exact hidxNotRest hR
      · rw [List.nodup_append]
        refine ⟨hndA, hndRest, ?_⟩
        intro a ha b hb
        exact hdisj a ha b (List.mem_cons_of_mem idx hb)
    · intro i hi
      simp only [List.cons_append, List.mem_cons, List.mem_append] at hi
      apply hbound i
      simp only [List.mem_append, List.mem_cons]
      rcases hi with rfl | hA | hR
      · exact Or.inr (Or.inl rfl)
      · exact Or.inl hA
      · exact Or.inr (Or.inr hR)

public theorem listPoolReclaim_valid (p : ListPool) (h : p.valid) : (listPoolReclaim p).valid := by
  rcases p with ⟨active, free, cap⟩
  cases active with
  | nil => exact h
  | cons idx rest =>
    rcases h with ⟨hlen, hnodup, hbound⟩
    simp only [listPoolReclaim, ListPool.valid] at *
    simp only [List.cons_append] at hnodup
    have hndC := List.nodup_cons.mp hnodup
    rcases hndC with ⟨hidxNotRF, hndRF⟩
    have hndA := List.nodup_append.mp hndRF
    rcases hndA with ⟨hndR, hndF, hdisj⟩
    refine ⟨by simp at hlen ⊢; omega, ?_, ?_⟩
    · rw [List.nodup_append]
      refine ⟨hndR, ?_, ?_⟩
      · rw [List.nodup_cons]
        exact ⟨fun hf => hidxNotRF (List.mem_append_right rest hf), hndF⟩
      · intro a ha b hb
        rcases List.mem_cons.mp hb with rfl | hbF
        · intro heq
          subst heq
          exact hidxNotRF (List.mem_append_left free ha)
        · exact hdisj a ha b hbF
    · intro i hi
      simp only [List.mem_append, List.mem_cons] at hi
      apply hbound i
      simp only [List.cons_append, List.mem_cons, List.mem_append]
      rcases hi with hR | rfl | hF
      · exact Or.inr (Or.inl hR)
      · exact Or.inl rfl
      · exact Or.inr (Or.inr hF)

public theorem listPoolClearAll_valid_and_restores (p : ListPool) (h : p.valid) :
    (listPoolClearAll p).valid ∧ (listPoolClearAll p).active = [] ∧
    (listPoolClearAll p).free.length = p.cap := by
  rcases p with ⟨active, free, cap⟩
  rcases h with ⟨hlen, hnodup, hbound⟩
  simp only [listPoolClearAll, ListPool.valid] at *
  have hnd := List.nodup_append.mp hnodup
  rcases hnd with ⟨hndA, hndF, hdisj⟩
  refine ⟨⟨by simp; omega, ?_, ?_⟩, trivial, by simp; omega⟩
  · simp only [List.nil_append]
    rw [List.nodup_append]
    refine ⟨hndF, hndA, ?_⟩
    intro a ha b hb
    exact Ne.symm (hdisj b hb a ha)
  · intro i hi
    simp only [List.nil_append, List.mem_append] at hi
    apply hbound i
    rw [List.mem_append]
    exact hi.symm

public theorem fifoPush_length_bounded {α : Type} (q : List α) (x : α) (cap : Nat) (h : q.length ≤ cap) :
    (fifoPush q x cap).length ≤ cap := by
  simp only [fifoPush]
  by_cases hc : cap = 0
  · simp [hc]
  · by_cases hl : q.length ≥ cap
    · simp only [hc, ↓reduceIte, hl, List.length_append, List.length_tail, List.length_singleton]
      omega
    · simp only [hc, ↓reduceIte, hl, List.length_append, List.length_singleton]
      omega

end GlidieBirdie.Pools
