/** Circle hit tests. Pure enough to import from Node. */
import { bird, ground, state } from './state.js';

export function circleHitsRect(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

export function intersectsPipe(pipe) {
  const r = bird.radius * 0.82; // slightly forgiving
  // top pipe
  if (circleHitsRect(bird.x, bird.y, r, pipe.x, 0, state.pipeWidth, pipe.topHeight)) return true;
  // bottom pipe
  const gapBottom = pipe.topHeight + state.gap;
  return circleHitsRect(
    bird.x,
    bird.y,
    r,
    pipe.x,
    gapBottom,
    state.pipeWidth,
    ground.y - gapBottom,
  );
}

