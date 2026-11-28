//! GlidieBirdie v3.2.0 — Optional Zig -> wasm32-freestanding Microbenchmark Module
//!
//! Offline empirical benchmark companion ONLY (NOT loaded by the zero-build browser runtime).
//! Used by `scripts/benchmark-native.mjs` to measure JS V8 vs Zig-WASM (single-call boundary vs
//! batched) vs Native C11 on identical mulberry32 + circle-vs-rect collision kernels, providing
//! falsifiable evidence for ADR 0004 (why WASM physics does NOT fix browser thermal burn).
//!
//! Build:
//!   zig build-exe native/oracle.zig -target wasm32-freestanding -O ReleaseFast -fno-entry -rdynamic -femit-bin=build/oracle.wasm

export fn mulberry32_step(seed: u32) u32 {
    const a: u32 = seed +% 0x6d2b79f5;
    var t: u32 = (a ^ (a >> 15)) *% (a | 1);
    t ^= t +% ((t ^ (t >> 7)) *% (t | 61));
    return t ^ (t >> 14);
}

export fn circle_hits_rect(cx: f64, cy: f64, cr: f64, rx: f64, ry: f64, rw: f64, rh: f64) u32 {
    if (!(cr > 0.0) or !(rw > 0.0) or !(rh > 0.0)) return 0;
    const closest_x = if (cx < rx) rx else if (cx > rx + rw) rx + rw else cx;
    const closest_y = if (cy < ry) ry else if (cy > ry + rh) ry + rh else cy;
    const dx = cx - closest_x;
    const dy = cy - closest_y;
    return if (dx * dx + dy * dy < cr * cr) 1 else 0;
}

export fn bench_batch(iterations: u32) u32 {
    var st: u32 = 20261125;
    var hits: u32 = 0;
    var i: u32 = 0;
    while (i < iterations) : (i += 1) {
        st +%= 0x6d2b79f5;
        var t: u32 = (st ^ (st >> 15)) *% (st | 1);
        t ^= t +% ((t ^ (t >> 7)) *% (t | 61));
        const r: u32 = t ^ (t >> 14);
        const cy: f64 = @floatFromInt(r & 511);
        const top_h: f64 = @floatFromInt(60 + ((r >> 9) & 255));
        hits +%= circle_hits_rect(112.0, cy, 14.76, 100.0, 0.0, 72.0, top_h);
        hits +%= circle_hits_rect(112.0, cy, 14.76, 100.0, top_h + 184.0, 72.0, 560.0 - (top_h + 184.0));
    }
    return hits;
}
