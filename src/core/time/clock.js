// src/core/time/clock.js
'use strict';

/**
 * Lightweight frame clock.
 * - Pass getTimeSec() for testability; default uses performance.now()/1000.
 * - tick(nowSec?) returns { t, dt } with dt clamped to maxDelta and non-negative.
 */
export function makeClock({
  getTimeSec = () => (typeof performance !== 'undefined' ? performance.now() * 1e-3 : Date.now() * 1e-3),
  maxDelta = 0.25
} = {}) {
  let tPrev = undefined;
  let t = 0;

  return {
    /**
     * Advance clock to nowSec (optional); returns { t, dt }.
     * @param {number} [nowSec]
     */
    tick(nowSec) {
      const now = Number.isFinite(nowSec) ? nowSec : getTimeSec();
      if (tPrev === undefined) {
        tPrev = now;
        return { t, dt: 0 };
      }
      let dt = now - tPrev;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > maxDelta) dt = maxDelta;

      t += dt;
      tPrev = now;
      return { t, dt };
    }
  };
}
