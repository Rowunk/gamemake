// src/core/time/fps.js
'use strict';

/**
 * Windowed FPS counter with instant FPS (1/dt).
 * Use .sample(dtSeconds) each frame; read .instant and .avg.
 */
export class FpsCounter {
  constructor({ window = 60 } = {}) {
    this.window = Math.max(1, window | 0);
    this.buf = new Array(this.window).fill(0);
    this.i = 0;
    this.count = 0;
    this.sum = 0;
    this.instant = 0;
    this.avg = 0;
  }

  /**
   * @param {number} dtSeconds - frame delta time in seconds
   */
  sample(dtSeconds) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    const inst = 1 / dtSeconds;
    this.instant = inst;

    // Circular buffer of inst FPS
    const idx = this.i % this.window;
    const old = this.buf[idx];
    this.buf[idx] = inst;
    this.i++;
    if (this.count < this.window) {
      this.count++;
      this.sum += inst;
    } else {
      this.sum += inst - old;
    }
    this.avg = this.count ? this.sum / this.count : 0;
  }
}
