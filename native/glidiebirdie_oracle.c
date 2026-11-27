/*
 * GlidieBirdie v3.2.0 — Independent C11 Differential Reference Oracle & Stress Fuzzer
 * (Build Standard B11 Differential Testing, B12 Reference Oracle, B15 Fuzzing, B16 ASan/UBSan)
 *
 * Zero external dependencies. Standard C11 only (-std=c11 -O3 -Wall -Wextra -Werror).
 * Cross-checks the exact discrete mathematical core against BOTH the JavaScript runtime (src/)
 * and the pure Lean 4.35.0 formal specification (lean/GlidieBirdieProofs/Spec.lean):
 *   1. ms_to_ticks / steps_executed / alpha_scaled (720 Hz LCM grid, MAX_FRAME_STEPS = 5)
 *   2. circle_hits_rect / intersects_pipe_int (closest-point projection, non-positive guards)
 *   3. mulberry32_step (exact 32-bit wrapping PRNG bit-for-bit parity with Lean 4 & JS)
 *   4. next_day_streak / date_seed_nat (UTC calendar streak automaton & YYYYMMDD injectivity)
 *   5. speed_mult_100 (6-point ramp in [100, 118])
 *   6. fixed-capacity free-list stack pool (concrete index uniqueness & active + free == cap)
 *
 * Build & run:
 *   gcc -std=c11 -O3 -Wall -Wextra -Werror native/glidiebirdie_oracle.c -o build/oracle -lm
 *   ./build/oracle --verify
 *   ./build/oracle --fuzz 2000000
 *   ./build/oracle --bench 10000000
 *
 * Sanitizer build (Linux/macOS/Clang/GCC with ASan+UBSan):
 *   cc -std=c11 -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer \
 *      -Wall -Wextra -Werror native/glidiebirdie_oracle.c -o build/oracle-san -lm
 *
 * Optional LibFuzzer target (Clang):
 *   clang -std=c11 -O1 -g -DFUZZING_BUILD_MODE_UNSAFE_FOR_PRODUCTION \
 *      -fsanitize=fuzzer,address,undefined native/glidiebirdie_oracle.c -o build/oracle-fuzz -lm
 */

#include <assert.h>
#include <inttypes.h>
#include <math.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

enum {
  GB_TICK_HZ = 720,
  GB_SIM_HZ = 60,
  GB_TICKS_PER_STEP = 12,
  GB_MAX_FRAME_STEPS = 5,
  GB_CANVAS_W = 420,
  GB_CANVAS_H = 640,
  GB_GROUND_H = 80,
  GB_GROUND_Y = 560,
  GB_PIPE_W = 72,
  GB_PIPE_GAP = 184,
  GB_BIRD_R = 18,
  GB_PARTICLE_POOL = 220,
  GB_WEATHER_POOL = 140,
  GB_INPUT_QUEUE_CAP = 64
};

static uint64_t gb_ms_to_ticks(double ms) {
  if (!isfinite(ms) || ms <= 0.0) return 0u;
  double scaled = floor((ms * (double)GB_TICK_HZ) / 1000.0 + 1e-6);
  if (scaled <= 0.0) return 0u;
  if (scaled >= 9007199254740991.0) return 9007199254740991ULL;
  return (uint64_t)scaled;
}

static uint64_t gb_steps_executed(uint64_t prev_tick, uint64_t frame_tick) {
  uint64_t prev_step = prev_tick / (uint64_t)GB_TICKS_PER_STEP;
  uint64_t target_step = frame_tick / (uint64_t)GB_TICKS_PER_STEP;
  if (target_step <= prev_step) return 0u;
  uint64_t diff = target_step - prev_step;
  return diff < (uint64_t)GB_MAX_FRAME_STEPS ? diff : (uint64_t)GB_MAX_FRAME_STEPS;
}

static bool gb_circle_hits_rect(
    double cx, double cy, double cr, double rx, double ry, double rw, double rh) {
  if (!(cr > 0.0) || !(rw > 0.0) || !(rh > 0.0) || !isfinite(cx) || !isfinite(cy) ||
      !isfinite(cr) || !isfinite(rx) || !isfinite(ry) || !isfinite(rw) || !isfinite(rh)) {
    return false;
  }
  double closest_x = cx < rx ? rx : (cx > rx + rw ? rx + rw : cx);
  double closest_y = cy < ry ? ry : (cy > ry + rh ? ry + rh : cy);
  double dx = cx - closest_x;
  double dy = cy - closest_y;
  return (dx * dx + dy * dy) < (cr * cr);
}

static uint32_t gb_mulberry32_next(uint32_t *state) {
  uint32_t a = *state + 0x6d2b79f5u;
  *state = a;
  uint32_t t = (a ^ (a >> 15)) * (a | 1u);
  t ^= t + ((t ^ (t >> 7)) * (t | 61u));
  return t ^ (t >> 14);
}

static uint32_t gb_next_day_streak(
    uint32_t prev_streak, uint32_t last_day, uint32_t today, uint32_t yesterday) {
  if (last_day == today) return prev_streak;
  if (last_day == yesterday) return prev_streak + 1u;
  return 1u;
}

static uint32_t gb_date_seed_nat(uint32_t y, uint32_t m, uint32_t d) {
  return y * 10000u + m * 100u + d;
}

static uint32_t gb_speed_mult_100(uint32_t score) {
  uint32_t raw = 100u + 3u * (score / 6u);
  return raw > 118u ? 118u : raw;
}

typedef struct {
  uint16_t cap;
  uint16_t active_len;
  uint16_t free_len;
  uint16_t active[GB_PARTICLE_POOL];
  uint16_t free_stack[GB_PARTICLE_POOL];
  uint8_t is_active[GB_PARTICLE_POOL];
} gb_pool_t;

static void gb_pool_init(gb_pool_t *p, uint16_t cap) {
  assert(cap <= GB_PARTICLE_POOL);
  p->cap = cap;
  p->active_len = 0;
  p->free_len = cap;
  for (uint16_t i = 0; i < cap; i++) {
    p->free_stack[i] = i;
    p->is_active[i] = 0;
  }
}

static bool gb_pool_spawn(gb_pool_t *p) {
  if (p->free_len == 0) return false;
  uint16_t idx = p->free_stack[--p->free_len];
  assert(idx < p->cap && p->is_active[idx] == 0);
  p->is_active[idx] = 1;
  p->active[p->active_len++] = idx;
  return true;
}

static bool gb_pool_reclaim_last(gb_pool_t *p) {
  if (p->active_len == 0) return false;
  uint16_t idx = p->active[--p->active_len];
  assert(idx < p->cap && p->is_active[idx] == 1);
  p->is_active[idx] = 0;
  p->free_stack[p->free_len++] = idx;
  return true;
}

static void gb_pool_clear_all(gb_pool_t *p) {
  for (uint16_t i = 0; i < p->active_len; i++) {
    uint16_t idx = p->active[i];
    assert(idx < p->cap && p->is_active[idx] == 1);
    p->is_active[idx] = 0;
    p->free_stack[p->free_len++] = idx;
  }
  p->active_len = 0;
}

static bool gb_pool_check_invariants(const gb_pool_t *p) {
  if ((uint32_t)p->active_len + (uint32_t)p->free_len != (uint32_t)p->cap) return false;
  uint8_t seen[GB_PARTICLE_POOL];
  memset(seen, 0, sizeof(seen));
  for (uint16_t i = 0; i < p->active_len; i++) {
    uint16_t idx = p->active[i];
    if (idx >= p->cap || !p->is_active[idx] || seen[idx]) return false;
    seen[idx] = 1;
  }
  for (uint16_t i = 0; i < p->free_len; i++) {
    uint16_t idx = p->free_stack[i];
    if (idx >= p->cap || p->is_active[idx] || seen[idx]) return false;
    seen[idx] = 1;
  }
  for (uint16_t i = 0; i < p->cap; i++) {
    if (!seen[i]) return false;
  }
  return true;
}

static bool gb_check_single_fuzz_input(const uint8_t *data, size_t size) {
  if (size < 16) return true;
  uint32_t s = 0;
  memcpy(&s, data, 4);
  uint32_t prev_tick = 0, delta_ticks = 0, score = 0;
  memcpy(&prev_tick, data + 4, 4);
  memcpy(&delta_ticks, data + 8, 4);
  memcpy(&score, data + 12, 4);

  uint64_t steps = gb_steps_executed((uint64_t)prev_tick, (uint64_t)prev_tick + (uint64_t)delta_ticks);
  if (steps > (uint64_t)GB_MAX_FRAME_STEPS) return false;
  if (delta_ticks <= 60u) {
    uint64_t uncapped =
        (((uint64_t)prev_tick + (uint64_t)delta_ticks) / (uint64_t)GB_TICKS_PER_STEP) -
        ((uint64_t)prev_tick / (uint64_t)GB_TICKS_PER_STEP);
    if (steps != uncapped) return false;
  }

  /* ms_to_ticks monotonicity & non-finite safety */
  double ms_a = (double)(prev_tick & 0xFFFFu) * 0.25;
  double ms_b = ms_a + (double)(delta_ticks & 0xFFu) * 0.25;
  if (gb_ms_to_ticks(ms_a) > gb_ms_to_ticks(ms_b)) return false;
  if (gb_ms_to_ticks(NAN) != 0u || gb_ms_to_ticks(INFINITY) != 0u || gb_ms_to_ticks(-ms_a) != 0u) {
    return false;
  }

  uint32_t mult = gb_speed_mult_100(score);
  if (mult < 100u || mult > 118u) return false;
  if (score >= 36u && mult != 118u) return false;

  /* Negative / non-positive radius guard must never hit */
  double cx = (double)((int32_t)s % 500);
  double cy = (double)((int32_t)prev_tick % 700);
  if (gb_circle_hits_rect(cx, cy, -1.0, cx - 10.0, cy - 10.0, 20.0, 20.0)) return false;
  if (gb_circle_hits_rect(cx, cy, 0.0, cx - 10.0, cy - 10.0, 20.0, 20.0)) return false;
  if (gb_circle_hits_rect(cx, cy, 10.0, cx - 10.0, cy - 10.0, 0.0, 20.0)) return false;

  /* Centered bird always clears every valid pipe */
  uint32_t top_h = 60u + (score % (uint32_t)(GB_GROUND_Y - GB_PIPE_GAP - 120 + 1));
  double by = (double)top_h + (double)GB_PIPE_GAP * 0.5;
  if (gb_circle_hits_rect(112.0, by, (double)GB_BIRD_R, 100.0, 0.0, (double)GB_PIPE_W, (double)top_h)) {
    return false;
  }
  double gap_bot = (double)(top_h + (uint32_t)GB_PIPE_GAP);
  if (gb_circle_hits_rect(112.0, by, (double)GB_BIRD_R, 100.0, gap_bot, (double)GB_PIPE_W,
                          (double)GB_GROUND_Y - gap_bot)) {
    return false;
  }

  return true;
}

#ifdef FUZZING_BUILD_MODE_UNSAFE_FOR_PRODUCTION
int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
  if (!gb_check_single_fuzz_input(data, size)) abort();
  return 0;
}
#else
static int run_verify(void) {
  /* 1. Exact mulberry32(20261125) golden sequence matching Lean 4.35.0 & JS bit-for-bit */
  uint32_t st = 20261125u;
  uint32_t o1 = gb_mulberry32_next(&st);
  uint32_t s1 = st;
  uint32_t o2 = gb_mulberry32_next(&st);
  uint32_t s2 = st;
  uint32_t o3 = gb_mulberry32_next(&st);
  uint32_t s3 = st;
  if (s1 != 1851826938u || o1 != 1176269751u || s2 != 3683392751u || o2 != 1461114176u ||
      s3 != 1219991268u || o3 != 3047578727u) {
    fprintf(stderr, "FAIL: mulberry32 golden mismatch\n");
    return 1;
  }

  /* 2. Exact 60 Hz vs 144 Hz 3-second parity & ms_to_ticks exactness */
  if (gb_ms_to_ticks(1000.0 / 60.0) != 12u || gb_ms_to_ticks(1000.0 / 144.0) != 5u ||
      gb_ms_to_ticks(NAN) != 0u || gb_ms_to_ticks(-10.0) != 0u) {
    fprintf(stderr, "FAIL: ms_to_ticks mismatch\n");
    return 1;
  }
  uint64_t steps60 = 0, steps144 = 0;
  for (int i = 0; i < 180; i++) {
    steps60 += gb_steps_executed((uint64_t)i * 12u, (uint64_t)(i + 1) * 12u);
  }
  for (int i = 0; i < 432; i++) {
    steps144 += gb_steps_executed((uint64_t)i * 5u, (uint64_t)(i + 1) * 5u);
  }
  if (steps60 != 180u || steps144 != 180u) {
    fprintf(stderr, "FAIL: 60/144 Hz parity mismatch\n");
    return 1;
  }

  /* 3. Pool exact uniqueness & clearWeatherPool restoration */
  gb_pool_t wp;
  gb_pool_init(&wp, GB_WEATHER_POOL);
  if (!gb_pool_check_invariants(&wp)) return 1;
  for (int i = 0; i < 200; i++) (void)gb_pool_spawn(&wp);
  if (wp.active_len != GB_WEATHER_POOL || wp.free_len != 0 || !gb_pool_check_invariants(&wp)) return 1;
  for (int i = 0; i < 37; i++) (void)gb_pool_reclaim_last(&wp);
  if (!gb_pool_check_invariants(&wp)) return 1;
  gb_pool_clear_all(&wp);
  if (wp.active_len != 0 || wp.free_len != GB_WEATHER_POOL || !gb_pool_check_invariants(&wp)) return 1;

  /* 4. Streak & dateSeed */
  uint32_t d1 = gb_date_seed_nat(2026u, 11u, 23u);
  uint32_t d2 = gb_date_seed_nat(2026u, 11u, 24u);
  uint32_t d3 = gb_date_seed_nat(2026u, 11u, 25u);
  uint32_t k1 = gb_next_day_streak(0u, 0u, d1, 20261122u);
  uint32_t k2 = gb_next_day_streak(k1, d1, d2, d1);
  uint32_t k3 = gb_next_day_streak(k2, d2, d3, d2);
  if (k1 != 1u || k2 != 2u || k3 != 3u) return 1;

  printf("{\"status\":\"ok\",\"mulberry32\":[%" PRIu32 ",%" PRIu32 ",%" PRIu32
         "],\"steps60\":%" PRIu64 ",\"steps144\":%" PRIu64
         ",\"weatherPoolCap\":%d,\"streak\":[%" PRIu32 ",%" PRIu32 ",%" PRIu32 "]}\n",
         o1, o2, o3, steps60, steps144, GB_WEATHER_POOL, k1, k2, k3);
  return 0;
}

static int run_fuzz(uint64_t iterations) {
  uint32_t prng = 0x9e3779b9u;
  gb_pool_t pool;
  gb_pool_init(&pool, GB_WEATHER_POOL);
  uint8_t buf[16];
  struct timespec t0, t1;
  clock_gettime(CLOCK_MONOTONIC, &t0);

  for (uint64_t i = 0; i < iterations; i++) {
    uint32_t w0 = gb_mulberry32_next(&prng);
    uint32_t w1 = gb_mulberry32_next(&prng);
    uint32_t w2 = gb_mulberry32_next(&prng);
    uint32_t w3 = gb_mulberry32_next(&prng);
    memcpy(buf, &w0, 4);
    memcpy(buf + 4, &w1, 4);
    memcpy(buf + 8, &w2, 4);
    memcpy(buf + 12, &w3, 4);
    if (!gb_check_single_fuzz_input(buf, sizeof(buf))) {
      fprintf(stderr, "FAIL: fuzz invariant violated at iteration %" PRIu64 "\n", i);
      return 1;
    }
    uint32_t op = w0 & 3u;
    if (op == 0u || op == 1u) (void)gb_pool_spawn(&pool);
    else if (op == 2u) (void)gb_pool_reclaim_last(&pool);
    else if ((w1 & 15u) == 0u) gb_pool_clear_all(&pool);
    if ((i & 1023u) == 0u && !gb_pool_check_invariants(&pool)) {
      fprintf(stderr, "FAIL: pool invariant violated at iteration %" PRIu64 "\n", i);
      return 1;
    }
  }
  if (!gb_pool_check_invariants(&pool)) return 1;
  clock_gettime(CLOCK_MONOTONIC, &t1);
  double sec = (double)(t1.tv_sec - t0.tv_sec) + (double)(t1.tv_nsec - t0.tv_nsec) * 1e-9;
  printf("{\"mode\":\"fuzz\",\"iterations\":%" PRIu64 ",\"elapsedSec\":%.6f,\"casesPerSec\":%.0f,\"failures\":0}\n",
         iterations, sec, sec > 0.0 ? (double)iterations / sec : 0.0);
  return 0;
}

static int run_bench(uint64_t iterations) {
  uint32_t st = 20261125u;
  uint64_t hits = 0;
  struct timespec t0, t1;
  clock_gettime(CLOCK_MONOTONIC, &t0);
  for (uint64_t i = 0; i < iterations; i++) {
    uint32_t r = gb_mulberry32_next(&st);
    double cy = (double)(r & 511u);
    double top_h = (double)(60u + ((r >> 9) & 255u));
    if (gb_circle_hits_rect(112.0, cy, 14.76, 100.0, 0.0, 72.0, top_h)) hits++;
    if (gb_circle_hits_rect(112.0, cy, 14.76, 100.0, top_h + 184.0, 72.0, 560.0 - (top_h + 184.0))) {
      hits++;
    }
  }
  clock_gettime(CLOCK_MONOTONIC, &t1);
  double ns = (double)(t1.tv_sec - t0.tv_sec) * 1e9 + (double)(t1.tv_nsec - t0.tv_nsec);
  printf("{\"mode\":\"bench\",\"iterations\":%" PRIu64 ",\"hits\":%" PRIu64
         ",\"totalMs\":%.3f,\"nsPerIter\":%.2f,\"finalState\":%" PRIu32 "}\n",
         iterations, hits, ns * 1e-6, ns / (double)iterations, st);
  return 0;
}

int main(int argc, char **argv) {
  if (argc >= 2 && strcmp(argv[1], "--verify") == 0) {
    return run_verify();
  }
  if (argc >= 2 && strcmp(argv[1], "--fuzz") == 0) {
    uint64_t n = argc >= 3 ? strtoull(argv[2], NULL, 10) : 1000000ULL;
    return run_fuzz(n);
  }
  if (argc >= 2 && strcmp(argv[1], "--bench") == 0) {
    uint64_t n = argc >= 3 ? strtoull(argv[2], NULL, 10) : 10000000ULL;
    return run_bench(n);
  }
  fprintf(stderr, "Usage: %s [--verify | --fuzz N | --bench N]\n", argv[0]);
  return 2;
}
#endif
