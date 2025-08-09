// @ts-check
'use strict';

/**
 * FPS counter with exponential moving average.
 *
 * - Pass `{ window }` to control smoothing; alpha = 1/window.
 * - Ignores non-finite or non-positive dt.
 * - `instant` := 1/dt of last valid sample.
 * - `avg` := EMA of FPS; first valid sample seeds avg exactly (no bias).
 *
 * @example
 * const fps = new FpsCounter({ window: 120 });
 * fps.sample(1 / 60);
 * console.log(fps.instant, fps.avg);
 *
 * @typedef {Object} FpsCounterOptions
 * @property {number} [window] Smoothing window size in frames (≥ 1). Default: 60.
 */
export class FpsCounter {
  /**
   * @param {FpsCounterOptions} [opts] Configuration options.
   */
  constructor(opts = {}) {
    const w = Math.max(1, opts.window | 0 || 60); // clamp to ≥1

    /** @type {number} */
    this.instant = 0; // last-sample FPS

    /** @type {number} */
    this.avg = 0; // exponential moving average of FPS

    /** @type {number} */
    this._alpha = 1 / w;

    /** @type {boolean} */
    this._seeded = false; // whether avg has been seeded by a valid sample
  }

  /**
   * Record one frame's delta time in seconds.
   * Ignores non-finite or non-positive values.
   *
   * @param {number} dtSeconds Time since last frame in seconds.
   * @returns {void}
   */
  sample(dtSeconds) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;

    const fps = 1 / dtSeconds;
    this.instant = fps;

    if (!this._seeded) {
      // Seed EMA exactly to the first valid FPS so steady inputs stay exact.
      this.avg = fps;
      this._seeded = true;
      return;
    }
    // EMA update: avg += alpha * (x - avg)
    this.avg += this._alpha * (fps - this.avg);
  }

  /**
   * Reset all measurements.
   * @returns {void}
   */
  reset() {
    this.instant = 0;
    this.avg = 0;
    this._seeded = false;
  }
}
