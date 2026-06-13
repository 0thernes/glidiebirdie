<!-- markdownlint-disable MD013 -->

# GlidieBirdie — Complexity & Data-Structure Notes (DSA)

A precise accounting of the algorithms and data structures on the hot path, with
time/space complexity. The governing constraint: **the per-frame cost must be
bounded and allocation-free**, so the game holds 60 fps on a phone and never
triggers GC stalls mid-run.

Symbols: `P` = live pipes on screen (≈ 3–6), `Pa` = active particles (≤ 220),
`W` = active weather (≤ 140), `A` = achievements (12), `T` = themes (5),
`E` = bird emotions (5), `H` = score-history length (≤ 50, sparkline uses ≤ 30).

---

## Per-frame loop — `update()` + `draw()`

| Operation | Structure | Time | Space | Notes |
| --- | --- | --- | --- | --- |
| `updateBird()` | scalars | O(1) | O(1) | semi-implicit Euler, `dt`-scaled |
| `updatePipes()` | array (ring-spawned) | O(P) | O(1) | P is tiny + bounded |
| `updateNearestPipeCache()` | array scan | O(P) | O(1) | computed once/frame, shared by eye-tracking + collision |
| `checkCollisions()` | circle-vs-rect | O(P) | O(1) | true circle hitbox, not AABB |
| `updateParticles()` | pool + write-index compaction | O(Pa) | **O(1)** | in-place; no array allocation/`splice` |
| `updateWeatherParticles()` | pool + compaction | O(W) | **O(1)** | same pattern |
| `spawnParticles(n)` | free-list pointer | O(n) | O(1) | reuses dead slots; never grows the pool |
| `draw*` (bird/pipes/ground/bg) | cached sprites | O(P) | O(1) | pre-rendered offscreen; per-frame is a blit |
| **Whole frame** | — | **O(P + Pa + W)** | **O(1)** | all three are hard-capped → effectively O(1) bounded work, zero steady-state allocation |

---

## Event / periodic paths (not every frame)

| Operation | Structure | Time | Space | Notes |
| --- | --- | --- | --- | --- |
| `checkAchievements()` | `Map<id,nodes>` (cached) | O(A) | O(A) | DOM nodes resolved **once**; was O(A) `getElementById`+`querySelector` *per call* before the cache |
| `getAchievementEls()` | build cache | O(A) | O(A) | lazy, runs once |
| `nextDayStreak()` | scalars | O(1) | O(1) | pure; unit-tested |
| `migrateLegacyStorage()` | KV copy | O(K) | O(1) | K legacy keys, once per device |
| `readStored*` / `writeStoredValue` | localStorage | O(1)\* | O(1) | \*amortized; browser hashes keys |
| `pushScoreHistory()` | array + shift cap | O(1)am | O(1) | bounded to 50 |
| `drawSparkline()` | array scan | O(H) | O(1) | drawer-only (drawer auto-pauses the game) |

---

## One-time setup (boot)

| Operation | Structure | Time | Space | Notes |
| --- | --- | --- | --- | --- |
| Sprite cache build | offscreen canvases | O(T·E) | O(T·E) | bird per theme×emotion + sky/cloud; rebuilt only on theme/score-bracket change |
| Reverb impulse | `Float32Array` | O(sampleRate·dur) | O(samples) | generated once on first audio gesture |
| Object pools | typed arrays of structs | O(Pa + W) | O(Pa + W) | pre-allocated; the entire memory budget for FX |

---

## Randomness

- **`mulberry32(seed)`** — O(1) per draw, 32-bit state PRNG. Deterministic and
  fast; used for Daily-Seed mode so a date yields one canonical pipe sequence.
- **`dateSeed(date)`** — O(1), maps a UTC date to `YYYYMMDD`.

---

## Service worker

| Operation | Structure | Time | Notes |
| --- | --- | --- | --- |
| `isAppShellRequest()` | `Set<url>` (cached) | O(1) | Set built once; was O(n) list rebuild + scan per fetch |
| `staleWhileRevalidate()` | Cache API | O(1) | serve cached immediately, refresh in background |

---

## Why no fancier structures?

The classic Flappy-style game does **not** need spatial partitioning (quadtree,
sweep-and-prune, BVH): collision is against ≤ 6 axis-aligned pipes, so a linear
scan is already optimal and has lower constant factors than any tree. The
engineering effort went where it actually pays off on this workload:

- **Object pooling + write-index compaction** to make per-frame work
  allocation-free (the real 60-fps risk on mobile is GC, not CPU).
- **Memoization** of DOM nodes (`getAchievementEls`) and resolved URLs
  (`isAppShellRequest`) to turn repeated O(n) lookups into O(1).
- **Sprite caching** to convert per-frame vector drawing into a single blit.
- **Delta-time normalization with a clamp** so correctness is frame-rate
  independent and a stall can't tunnel collisions.

Adding a quadtree here would be slower and more complex — a textbook case of
choosing the structure that fits the data size, not the most impressive one.
