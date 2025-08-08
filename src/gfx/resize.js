// src/gfx/resize.js
'use strict';

/**
 * Internal helper: clamp to integers >= 1.
 * @param {number} v
 * @returns {number}
 */
function normDim(v) {
  if (!Number.isFinite(v)) throw new TypeError('resize: dimensions must be finite numbers');
  const n = Math.max(1, Math.floor(v));
  return n;
}

/**
 * Resize a WebGPU canvas and reconfigure the context if dimensions changed.
 * Note: WebGPU surface sizing is tied to the canvas width/height; reconfigure
 * after changing dims so the swapchain matches.
 *
 * @param {{width:number,height:number}} canvas
 * @param {{configure:Function}} context - GPUCanvasContext-like
 * @param {object} device
 * @param {string} format
 * @param {object} options - passed through to context.configure (e.g., { alphaMode:'opaque' })
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @returns {{width:number,height:number,reconfigured:boolean}}
 */
export function resizeWebGPU(canvas, context, device, format, options, targetWidth, targetHeight) {
  const w = normDim(targetWidth);
  const h = normDim(targetHeight);

  const changed = canvas.width !== w || canvas.height !== h;
  if (changed) {
    canvas.width = w;
    canvas.height = h;
    // Reconfigure without explicit size; canvas dimensions drive surface size.
    context.configure({ device, format, ...options });
  }

  return { width: canvas.width, height: canvas.height, reconfigured: changed };
}

/**
 * Resize a WebGL2 canvas and set the viewport to match.
 *
 * @param {{width:number,height:number}} canvas
 * @param {{viewport:Function}} gl - WebGL2RenderingContext-like
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @returns {{width:number,height:number}}
 */
export function resizeWebGL2(canvas, gl, targetWidth, targetHeight) {
  const w = normDim(targetWidth);
  const h = normDim(targetHeight);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height };
}
