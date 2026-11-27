module

public import GlidieBirdieProofs.TimestepGrid
public import GlidieBirdieProofs.CollisionGeometry
public import GlidieBirdieProofs.StorageStreak
public import GlidieBirdieProofs.PoolAndQueue
public import GlidieBirdieProofs.PhysicsBounds

/-!
# GlidieBirdieProofs.NonVacuity

Explicit concrete witnesses establishing that none of the hypothesis bundles in
`TimestepGrid`, `CollisionGeometry`, `StorageStreak`, `PoolAndQueue`, or `PhysicsBounds`
are vacuously satisfied.
-/

namespace GlidieBirdie.NonVacuity

open GlidieBirdie.Timestep GlidieBirdie.Collision GlidieBirdie.Storage GlidieBirdie.Pools GlidieBirdie.Physics

/-- Realizes 3 full seconds (36 LCM cycles): 180 frames @ 60 Hz = 432 frames @ 144 Hz = 180 sim steps. -/
public theorem nonvacuous_60_144_parity_witness :
    ∃ cycles : Nat, cycles = 36 ∧
      totalStepsUniform (5 * cycles) TICKS_PER_STEP = 180 ∧
      totalStepsUniform (12 * cycles) TICKS_PER_144 = 180 := by
  exact ⟨36, rfl, by decide, by decide⟩

/-- Realizes both a safe centered passage AND an unmistakable top-pipe hit on the same valid pipe. -/
public theorem nonvacuous_pipe_clearance_and_hit_witness :
    ∃ topH : Int, PIPE_MOVE_MIN_TOP ≤ topH ∧ topH ≤ PIPE_MOVE_MAX_TOP ∧
      intersectsPipeInt 112 (topH + PIPE_GAP / 2) BIRD_R 100 topH = false ∧
      intersectsPipeInt 112 (topH - 10) BIRD_R 100 topH = true := by
  refine ⟨160, by decide, by decide, by decide, by decide⟩

/-- Realizes weather-pool churn followed by full `clearWeatherPool` recovery of all 140 slots. -/
public theorem nonvacuous_weather_pool_churn_and_clear_witness :
    ∃ s : PoolState, s.valid ∧ s.active = 3 ∧
      (poolClearAll s).active = 0 ∧ (poolClearAll s).free = WEATHER_POOL := by
  let s0 := poolInit WEATHER_POOL
  let s3 := poolSpawn (poolSpawn (poolSpawn s0))
  refine ⟨s3, ?_, rfl, rfl, rfl⟩
  exact poolSpawn_conserves _ (poolSpawn_conserves _ (poolSpawn_conserves _ (poolInit_conserves WEATHER_POOL)))

/-- Realizes a valid 3-day consecutive play progression unlocking the `IronCalm` streak threshold (3). -/
public theorem nonvacuous_iron_calm_3day_streak_witness :
    let d1 := dateSeedNat 2026 11 23
    let d2 := dateSeedNat 2026 11 24
    let d3 := dateSeedNat 2026 11 25
    let st1 := nextDayStreak 0 0 d1 20261122
    let st2 := nextDayStreak st1 d1 d2 d1
    let st3 := nextDayStreak st2 d2 d3 d2
    st1 = 1 ∧ st2 = 2 ∧ st3 = 3 := by
  decide

/-- Concrete list-backed pool witness (`cap = 4`): spawn 2, reclaim 1, clear all preserves Nodup & restores. -/
public theorem nonvacuous_concrete_list_pool_witness :
    ∃ p : ListPool, p.valid ∧ p.active.length = 1 ∧
      (listPoolClearAll p).valid ∧ (listPoolClearAll p).active = [] ∧
      (listPoolClearAll p).free.length = 4 := by
  let p0 := listPoolInit 4
  let p1 := listPoolSpawn p0
  let p2 := listPoolSpawn p1
  let p3 := listPoolReclaim p2
  have hv0 : p0.valid := listPoolInit_valid 4
  have hv1 : p1.valid := listPoolSpawn_valid p0 hv0
  have hv2 : p2.valid := listPoolSpawn_valid p1 hv1
  have hv3 : p3.valid := listPoolReclaim_valid p2 hv2
  have hc := listPoolClearAll_valid_and_restores p3 hv3
  exact ⟨p3, hv3, rfl, hc.1, hc.2.1, hc.2.2⟩

end GlidieBirdie.NonVacuity
