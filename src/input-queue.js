/** Timestamped input applied on simulation-step boundaries, not render frames. */
import { CONFIG } from './config.js';
import { msToTicks } from './timestep.js';

/** @type {{tick:number, type:string}[]} */
const queue = [];

/** @param {number} timeMs @param {string} type */
export function scheduleInput(timeMs, type) {
  if (!Number.isFinite(timeMs)) return;
  const tick = msToTicks(timeMs);
  while (queue.length >= CONFIG.INPUT_QUEUE_CAP) queue.shift();
  queue.push({ tick, type });
}

export function getInputQueueLength() {
  return queue.length;
}

export function clearInputs() {
  queue.length = 0;
}

/**
 * Apply every event whose tick is at or before this step, in insertion order.
 * Late events land on the next step instead of being dropped.
 * @param {number} stepEndTick
 * @param {(ev:{tick:number, type:string}) => void} apply
 */
export function consumeInputs(stepEndTick, apply) {
  let i = 0;
  while (i < queue.length) {
    if (queue[i].tick <= stepEndTick) {
      const ev = queue[i];
      queue.splice(i, 1);
      apply(ev);
    } else {
      i++;
    }
  }
}

