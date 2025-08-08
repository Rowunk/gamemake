// src/gfx/webgpu_runtime.js
'use strict';

/**
 * Run a function within a WebGPU validation scope.
 * - Pushes 'validation' scope
 * - Awaits fn (if it returns a promise)
 * - Pops scope and reports any GPUError
 * - If fn throws, that takes precedence over GPUError
 *
 * @param {GPUDevice & {pushErrorScope:Function,popErrorScope:Function}} device
 * @param {Function} fn - may be sync or async
 * @returns {Promise<{ok:boolean, message:string|null}>}
 */
export async function withValidation(device, fn) {
  if (!device || typeof device.pushErrorScope !== 'function' || typeof device.popErrorScope !== 'function') {
    throw new TypeError('withValidation: invalid device');
  }

  device.pushErrorScope('validation');

  let thrown = null;
  try {
    const r = fn?.();
    if (r && typeof r.then === 'function') await r;
  } catch (e) {
    thrown = e;
  }

  const gpuErr = await device.popErrorScope();

  if (thrown) {
    return { ok: false, message: String(thrown?.message ?? thrown) };
  }
  if (gpuErr) {
    return { ok: false, message: String(gpuErr?.message ?? gpuErr) };
  }
  return { ok: true, message: null };
}

/**
 * Wire a handler to device.lost promise and return a disposer.
 * Note: Promise handlers can't truly be "unsubscribed"; disposer will just ignore future callbacks.
 *
 * @param {{lost: Promise<{reason?:string, message?:string}>}} device
 * @param {(info:{reason?:string, message?:string}) => void} cb
 * @returns {() => void} disposer
 */
export function onDeviceLost(device, cb) {
  if (!device || !device.lost || typeof device.lost.then !== 'function') {
    throw new TypeError('onDeviceLost: invalid device');
  }
  let cancelled = false;
  device.lost.then(info => {
    if (!cancelled) cb?.({ reason: info?.reason, message: info?.message });
  });
  return () => { cancelled = true; };
}

/**
 * Acquire adapter/device, get 'webgpu' context from canvas, configure it, and return essentials.
 * Accepts an optional 'env' for testability (injects navigator.gpu shim).
 *
 * @param {HTMLCanvasElement & {getContext:Function}} canvas
 * @param {Object} options - passed to context.configure (e.g., { alphaMode: 'opaque' })
 * @param {{gpu?: {requestAdapter:Function, getPreferredCanvasFormat:Function}}} env
 * @returns {Promise<{device:GPUDevice, context:GPUCanvasContext, format:string}>}
 */
export async function setupWebGPU(canvas, options = {}, env = {}) {
  const gpu = env.gpu ?? (typeof navigator !== 'undefined' ? navigator.gpu : undefined);
  if (!gpu) throw new Error('WebGPU not available');

  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error('No suitable GPU adapter');

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('Failed to get webgpu context');

  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, ...options });

  return { device, context, format };
}
