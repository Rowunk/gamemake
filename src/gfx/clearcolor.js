// src/gfx/clearcolor.js
'use strict';

/**
 * Normalize and validate a clear color array.
 * Policy:
 *  - Accept [r,g,b] or [r,g,b,a]
 *  - All components must be finite numbers in [0,1]
 *  - If alpha omitted, default a=1
 *
 * @param {number[]} rgba3or4
 * @returns {{r:number,g:number,b:number,a:number}}
 * @throws {TypeError} on invalid input
 */
export function normalizeClearColor(rgba3or4) {
  if (!Array.isArray(rgba3or4)) {
    throw new TypeError('Clear color must be an array of length 3 or 4');
  }
  if (rgba3or4.length !== 3 && rgba3or4.length !== 4) {
    throw new TypeError('Clear color must be an array of length 3 or 4');
  }
  const [r, g, b, a = 1] = rgba3or4;

  for (const v of [r, g, b, a]) {
    if (!Number.isFinite(v)) {
      throw new TypeError('Clear color components must be finite numbers');
    }
    if (v < 0 || v > 1) {
      throw new RangeError('Clear color components must be in the range 0..1');
    }
  }

  return { r, g, b, a };
}

/**
 * Build a minimal WebGPU render pass descriptor for a clear.
 * (Node tests verify shape only; at runtime you pass a real GPUTextureView.)
 *
 * @param {any} view - GPUTextureView-like identity object
 * @param {number[]} color - [r,g,b] or [r,g,b,a]
 * @returns {object} GPURenderPassDescriptor-like object
 */
export function beginRenderPassDescriptor(view, color) {
  const clearValue = normalizeClearColor(color);
  return {
    colorAttachments: [{
      view,
      clearValue,
      loadOp: 'clear',
      storeOp: 'store'
    }]
  };
}

/**
 * Apply a color-buffer clear on a WebGL2 context.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {number[]} color - [r,g,b] or [r,g,b,a]
 */
export function applyGLClear(gl, color) {
  const { r, g, b, a } = normalizeClearColor(color);
  gl.clearColor(r, g, b, a);
  gl.clear(gl.COLOR_BUFFER_BIT);
}
