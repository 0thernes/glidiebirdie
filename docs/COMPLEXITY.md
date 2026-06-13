<!-- markdownlint-disable MD013 -->

# GlidieBirdie — Time & Space Complexity (DSA Reference)

A rigorous Big-O accounting of every subsystem, plus the concrete data-structure upgrades available.
Notation: **P** = pipes on screen (≤ ~4), **A** = active particles (≤ 220), **W** = active weather
(≤ 140), **N** = source length (tooling), **F** = frame.

## 1. Per-frame budget

The whole frame is **`O(P + A + W)` time, `O(1)` extra space** — all bounded small constants, so the loop
is effectively constant-time in practice. There is **no quadratic path anywhere in the hot loop.**

| Subsystem | Per-frame time | Space (per frame) | Notes |
|---|---|---|---|
| `updateNearestPipeCache` | O(P) | O(1) | computed once, reused by emotion + eyes |
| `updateBird` | O(1) | O(1) | constant work + ring-buffer trail shift O(trail), trail is fixed ~10 |
| `updateEmotion` | O(1) | O(1) | priority cascade over `state` |
| `updatePipes` | O(P) | O(1) | move + pass-check + bounded shift-cull |
| `updateShieldBubbles` | O(P) | O(1) | one distance test per pipe |
| `spawnParticles` | amortized O(1) | O(1) | rotating free-index probe; worst case O(A) |
| `updateParticles` | O(A) | O(1) | single-pass in-place compaction |
| `spawn/updateWeather` | O(W) | O(1) | pooled, single-pass |
| `checkCollisions` | O(P) | O(1) | circle-vs-rect per pipe; **not** O(P·A) |
| `draw` (cached path) | O(P + A + W) | O(1) | bird = one `drawImage` (sprite cache) |
| `loop` overhead | O(1) | O(1) | dt math, scheduling |

## 2. Amortized / structural results

- **Particle & weather pools:** pre-allocated once at boot → memory is **O(capacity)**, constant for the
  whole session. Spawning scans from a rotating `nextFree*` index → **amortized O(1)**; the only worst
  case is a full pool (O(capacity) probe), which is bounded and rare.
- **Active-list compaction:** `updateParticles`/`updateWeather` write survivors forward in the same array
  in one pass → **O(n)** with **zero allocation** (no filter/splice garbage).
- **Bird trail:** fixed-length **ring buffer**; per-frame shift is O(trailLen) with a constant trailLen.
- **Sprite cache:** converts per-frame vector bird drawing (many path ops) into a single **O(1)** raster
  blit; built once per `(theme, emotion)` = 25 entries, **O(1)** space per entry.
- **Sky/cloud caches:** amortize gradient construction across many frames.
- **Collision:** decoupled — collision iterates pipes only (**O(P)**), never the particle set, so effect
  volume never degrades collision cost.

## 3. Persistence & lookups

| Operation | Complexity |
|---|---|
| `localStorage` read/write (guarded) | O(1) keyed |
| Theme lookup (`THEME_TABLE[name]`) | O(1) |
| Achievement check pass | O(#achievements) — a small constant set, once/score-event |
| Score-history push | O(1) amortized (bounded ring, occasional shift) |
| Migration (`migrateLegacyStorage`) | O(#legacy keys), one-time |

## 4. Tooling complexity (CI checks)

| Check | Complexity |
|---|---|
| `static-checks` strip + brace scan | **O(N)** single pass over source |
| `static-checks` duplicate-key map | O(N) with O(1) `Map` ops |
| `static-checks` `lineAt(offset)` | **O(offset)** per call (re-scan) — see opportunity #2 |
| `engine-test` vm boot + assertions | O(boot) + O(#assertions), constants |
| `smoke-test` regex assertions | O(file size) |

## 5. Concrete DSA upgrades (opportunities)

These are genuine data-structure improvements. Impact is **low** today (small N) but they are the correct
asymptotic forms and worth doing when the engine file stabilizes.

### 5.1 Pool free-list → strict O(1) spawn

**Now:** a rotating `nextFreeParticle` index linearly probes for an inactive slot (worst case O(capacity)).
**Upgrade:** maintain an explicit **free-list stack** of inactive indices. Spawn = `pop()` (O(1)); recycle
on death = `push(idx)` (O(1)). Eliminates the probe entirely.

```text
freeList: number[]            // indices of inactive slots
spawn():  idx = freeList.pop();  if (idx === undefined) return;  activate(idx)
recycle(idx): freeList.push(idx)
```

Trade-off: one extra array of ints (O(capacity) space, already implied). Net: strictly O(1), no worst case.

### 5.2 `lineAt` → precomputed offsets + binary search

**Now:** each `lineAt(offset)` rescans from index 0 → O(offset); k errors → O(k·N).
**Upgrade:** precompute a sorted array of newline offsets once (**O(N)**), then each lookup is a
**binary search → O(log N)**. Total k lookups: O(N + k·log N).

```text
lineStarts = [0, ...indicesAfterEach('\n')]   // O(N) once
lineAt(off) = upperBound(lineStarts, off)      // O(log N)
```

Impact: negligible at current error counts (errors are rare), but it is the textbook fix and removes the
only super-linear pattern in the tooling.

### 5.3 Per-pipe gradient caching (perf, not asymptotic)

The pipe body `createLinearGradient` is rebuilt each frame per pipe (O(P) gradient objects/frame). Cache by
`(theme, score-bracket)` and reuse → fewer allocations. Asymptotically still O(P) draw, but lower constant
and GC pressure. Low priority (P is tiny).

## 6. Why the engine is already fast

The design choices that keep it constant-time in practice:

1. **Bounded entity counts** (pipes, pools) — nothing scales with play time.
2. **Pooling + caching** — allocation and vector work are amortized to near-zero per frame.
3. **No cross-product loops** — every system iterates one bounded set.
4. **Constant memory after boot** — no growth → no GC-stall cliffs.
5. **Delta-time + clamp** — correctness is frame-rate-independent and the clamp bounds worst-case motion.

The result: stable 60 fps on modest hardware and graceful degradation (reduced-motion path) on weak phones.
