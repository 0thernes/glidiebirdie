/**
 * Fixed 60 Hz simulation on a 720 Hz integer grid.
 * 720 is the least common multiple of 60 and 144, so both refresh rates
 * land on exact tick boundaries and take the same steps over the same wall time.
 */
export const TICK_HZ = 720;
export const SIM_HZ = 60;
export const TICKS_PER_STEP = TICK_HZ / SIM_HZ;
export const MAX_FRAME_STEPS = 5;

/** @param {number} ms */
export function msToTicks(ms) {
  return Math.round((ms * 18) / 25);
}

