/** Seeded gameplay RNG and an independent cosmetic stream. */

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateSeed(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return (y * 10000 + m * 100 + day) >>> 0;
}

export let _rngFn = Math.random;
export function rng() {
  return _rngFn();
}
export function setSeededRNG(seed) {
  _rngFn = mulberry32(seed >>> 0);
}
export function setUnseededRNG() {
  _rngFn = Math.random;
}
// Cosmetics (particles, weather) draw from an independent stream so their
// theme / reduced-motion / dt-dependent draw counts never perturb the seeded
// gameplay RNG used for pipe layout — this keeps daily-seed runs reproducible
// across players regardless of their theme or motion settings.
export function cosmeticRng() {
  return Math.random();
}
