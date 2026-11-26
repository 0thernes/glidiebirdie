# GlidieBirdie v3.2.0 — Pure Lean 4.35.0 Formal Core

Zero-Mathlib, zero-dependency Lean 4.35.0 (`module` system) formalization certifying **45 theorems** across six modules covering the discrete mathematical invariants of GlidieBirdie's browser engine (`src/`).

## Modules

| Module | Theorems | Runtime Source Covered |
| --- | ---: | --- |
| `GlidieBirdieProofs/Spec.lean` | — | Pure shared definitions (zero proofs, zero `sorry`) |
| `GlidieBirdieProofs/TimestepGrid.lean` | 8 | `src/timestep.js`, `src/loop.js` (720 Hz LCM grid, 60/144 Hz parity, hitch & alpha clamp) |
| `GlidieBirdieProofs/CollisionGeometry.lean` | 8 | `src/collision.js` (closest-point optimality, non-positive radius guard, universal pipe clearance) |
| `GlidieBirdieProofs/StorageStreak.lean` | 8 | `src/storage.js`, `src/rng.js` (`nextDayStreak`, `dateSeed` injectivity, `clampNumber` bounds) |
| `GlidieBirdieProofs/PoolAndQueue.lean` | 8 | `src/physics.js`, `src/input-queue.js` (free-list pool conservation, `clearWeatherPool`, 64-cap FIFO) |
| `GlidieBirdieProofs/PhysicsBounds.lean` | 9 | `src/physics.js`, `src/rng.js` (6-point ramp `[1.00×, 1.18×]`, shield hit safety, `mulberry32` 32-bit golden vectors) |
| `GlidieBirdieProofs/NonVacuity.lean` | 4 | Concrete witnesses proving every hypothesis bundle is satisfiable |

## Local Verification Commands

```bash
cd lean
lake build
lake build Challenge
lake env lean VerifyAxioms.lean
lake env leanchecker --fresh Solution
lake env leanchecker-paranoid --fresh Solution
# On Linux with bubblewrap installed (also run in GitHub Actions CI):
lake check --paranoid
lake comparator --config comparator.json --paranoid
```
