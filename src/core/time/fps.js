// src/core/time/fps.js
'use strict';

/**
 * FPS counter (zero-dep).
 *
 * Usage:
 *   const fps = new FpsCounter();
 *   // each frame:
 *   fps.sample(dt);           // dt in seconds
 *   console.log(fps.instant); // FPS of last frame
 *   console.log(fps.avg);     // cumulative average FPS
 *
 * Design:
 * - Guards non-finite or non-positive dt (ignored).
 * - instant = 1 / dt of the most recent valid sample.
 * - avg = cumulative mean of FPS since first valid sample.
 *   (Deliberate choice for deterministic tests and stable reporting.)
 */
export class FpsCounter {
  constructor() {
    /** @type {number} last-frame FPS */
    this.instant = 0;
    /** @type {number} cumulative average FPS */
    this.avg = 0;

    // Internal accumulators for cumulative average.
    this._sum = 0;    // sum of per-frame FPS samples
    this._count = 0;  // number of accepted samples
  }

  /**
   * Record one frame's delta time.
   * @param {number} dtSeconds - frame delta time in seconds (must be > 0 and finite)
   */
  sample(dtSeconds) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;

    const inst = 1 / dtSeconds;
    this.instant = inst;

    this._sum += inst;
    this._count += 1;
    this.avg = this._count ? this._sum / this._count : 0;
  }
}
