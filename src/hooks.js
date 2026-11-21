/**
 * Late-bound callbacks so lower modules can reach session/achievements/input/ui
 * without import cycles. Assigned when those modules initialize.
 */
export const hooks = {
  gameOver() {},
  persistStatsHot() {},
  /** @param {Event | null} [_event] */
  handleAction(_event) {},
  clearDrawerResume() {},
};

