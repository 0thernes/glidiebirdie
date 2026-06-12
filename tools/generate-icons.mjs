// Dependency-free PNG app-icon generator for GlidieBirdie.
//
// WHY THIS EXISTS: iOS silently ignores an SVG data-URI `apple-touch-icon`, and
// several Android launchers will not use an SVG maskable icon either. The home-
// screen install therefore needs real raster PNGs. This is a one-shot DEV tool
// (run by hand, outputs committed) — NOT a runtime build step, so it preserves
// the "no build, zero runtime deps" rule. It uses only Node built-ins (zlib).
//
// Run:  node tools/generate-icons.mjs
// Out:  docs/assets/icon-180.png, icon-192.png, icon-512.png  (opaque, full-bleed
//       maskable backgrounds with a simple geometric bird)

import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const SS = 4; // supersample factor for anti-aliasing

const C = {
  bg: [8, 17, 32], // #081120 brand navy (full-bleed for maskable safety)
  body: [246, 216, 168],
  belly: [252, 233, 198],
  wing: [225, 190, 140],
  beak: [245, 165, 36],
  eyeWhite: [255, 255, 255],
  pupil: [20, 24, 38],
  crest: [240, 200, 150],
};

/** Render an opaque RGB icon at `size` px. Returns a Buffer of size*size*3. */
function renderIcon(size) {
  const n = size * SS;
  const buf = Buffer.alloc(n * n * 3);

  const put = (x, y, [r, g, b]) => {
    const i = (y * n + x) * 3;
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
  };

  // Full-bleed background (no transparent corners → safe to mask).
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) put(x, y, C.bg);

  const inEllipse = (x, y, cx, cy, rx, ry) => {
    const dx = (x - cx * n) / (rx * n);
    const dy = (y - cy * n) / (ry * n);
    return dx * dx + dy * dy <= 1;
  };
  const fillEllipse = (cx, cy, rx, ry, color) => {
    const x0 = Math.max(0, Math.floor((cx - rx) * n));
    const x1 = Math.min(n - 1, Math.ceil((cx + rx) * n));
    const y0 = Math.max(0, Math.floor((cy - ry) * n));
    const y1 = Math.min(n - 1, Math.ceil((cy + ry) * n));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) if (inEllipse(x, y, cx, cy, rx, ry)) put(x, y, color);
  };
  const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
  const fillTriangle = (p, q, r, color) => {
    const P = [p[0] * n, p[1] * n];
    const Q = [q[0] * n, q[1] * n];
    const R = [r[0] * n, r[1] * n];
    const x0 = Math.max(0, Math.floor(Math.min(P[0], Q[0], R[0])));
    const x1 = Math.min(n - 1, Math.ceil(Math.max(P[0], Q[0], R[0])));
    const y0 = Math.max(0, Math.floor(Math.min(P[1], Q[1], R[1])));
    const y1 = Math.min(n - 1, Math.ceil(Math.max(P[1], Q[1], R[1])));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d1 = sign(x, y, P[0], P[1], Q[0], Q[1]);
        const d2 = sign(x, y, Q[0], Q[1], R[0], R[1]);
        const d3 = sign(x, y, R[0], R[1], P[0], P[1]);
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(hasNeg && hasPos)) put(x, y, color);
      }
    }
  };

  // Crest tuft (drawn first so it peeks above the head).
  fillTriangle([0.45, 0.31], [0.53, 0.31], [0.49, 0.22], C.crest);
  // Body + belly highlight.
  fillEllipse(0.5, 0.55, 0.275, 0.26, C.body);
  fillEllipse(0.45, 0.5, 0.17, 0.16, C.belly);
  // Wing.
  fillEllipse(0.56, 0.6, 0.135, 0.1, C.wing);
  // Beak (forward triangle).
  fillTriangle([0.66, 0.49], [0.66, 0.6], [0.83, 0.545], C.beak);
  // Eye.
  fillEllipse(0.6, 0.47, 0.058, 0.058, C.eyeWhite);
  fillEllipse(0.618, 0.478, 0.03, 0.03, C.pupil);

  // Box-downsample SS×SS → final opaque RGB.
  const out = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * n + (x * SS + sx)) * 3;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
        }
      }
      const k = SS * SS;
      const o = (y * size + x) * 3;
      out[o] = Math.round(r / k);
      out[o + 1] = Math.round(g / k);
      out[o + 2] = Math.round(b / k);
    }
  }
  return out;
}

// ── Minimal PNG encoder (truecolor RGB, no alpha) ──────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng(rgb, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colortype 2 = truecolor RGB
  // 10..12 default 0 (compression, filter, interlace)
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (none)
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [180, 192, 512]) {
  const png = encodePng(renderIcon(size), size);
  const path = `docs/assets/icon-${size}.png`;
  await writeFile(path, png);
  console.log(`wrote ${path} (${png.length} bytes)`);
}
console.log('Icons generated.');
