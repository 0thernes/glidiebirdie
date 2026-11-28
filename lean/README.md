# GlidieBirdie v3.2.0 — Pure Lean 4.35.0 Formal Core

Zero-Mathlib, zero-dependency Lean 4.35.0 (`module` system) formalization certifying **68 theorems** (59 core invariants + 9 constructive adversarial refutations; 19 zero-axiom theorems) across seven modules covering the discrete mathematical invariants of GlidieBirdie's browser engine (`src/`).

## Modules

| Module | Theorems | Runtime Source Covered |
| --- | ---: | --- |
| `GlidieBirdieProofs/Spec.lean` | — | Pure shared definitions (zero proofs, zero `sorry`) |
| `GlidieBirdieProofs/TimestepGrid.lean` | 13 | `src/timestep.js`, `src/loop.js` (720 Hz LCM grid, 60/144 Hz parity, hitch-free `dt <= 60` proof, alpha clamp & positivity, 252-step afterglow, idle scheduler liveness & thermal sleep) |
| `GlidieBirdieProofs/CollisionGeometry.lean` | 9 | `src/collision.js` (closest-point optimality, non-positive guard, conservative radius monotonicity, universal pipe clearance) |
| `GlidieBirdieProofs/StorageStreak.lean` | 8 | `src/storage.js`, `src/rng.js` (`nextDayStreak`, `dateSeed` injectivity, `clampNumber` bounds) |
| `GlidieBirdieProofs/PoolAndQueue.lean` | 13 | `src/physics.js`, `src/input-queue.js` (abstract & concrete `Nodup` free-list pool conservation, `clearWeatherPool`, 64-cap FIFO list queue) |
| `GlidieBirdieProofs/PhysicsBounds.lean` | 11 | `src/physics.js`, `src/rng.js` (6-point ramp `[1.00×, 1.18×]`, shield hit safety, `mulberry32` 32-bit golden vectors, pupil sclera clamp, moving-pipe lerp bounds) |
| `GlidieBirdieProofs/NonVacuity.lean` | 5 | Concrete witnesses proving every hypothesis bundle (including concrete `ListPool`) is satisfiable |
| `GlidieBirdieProofs/AdversarialTests.lean` | 9 | Constructive false-variant refutations proving guards, caps, sclera clamp, and preconditions are sharp |

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
cd .. && bash lean/scripts/verify-negative-kernel.sh
```
