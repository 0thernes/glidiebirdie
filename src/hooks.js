/**
 * Late-bound callbacks so physics can reach session/achievements
 * without an import cycle. Assigned when those modules initialize.
 */
export const hooks = {
  gameOver() {},
  persistStatsHot() {},
};

