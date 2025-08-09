// @ts-check
'use strict';

/**
 * Lightweight shape of a WebGPU device for validation scopes.
 * @typedef {Object} GPUDeviceLike
 * @property {Function} pushErrorScope
 * @property {Function} popErrorScope
 * @property {Object} [queue]
 * @property {Function} [queue.writeTexture]
 */

/**
 * Result object returned by withValidation.
 * @typedef {Object} ValidationResult
 * @property {boolean} ok
 * @property {string|null} message
 */

/**
 * Run a function within a WebGPU validation scope.
 * - Pushes 'validation' scope
 * - Awaits fn (if it returns a promise)
 * - Pops scope and reports any GPUError
 * - If fn throws, that takes precedence over GPUError
 *
 * @param {GPUDeviceLike} device
 * @param {Function} fn - may be sync or async
 * @returns {Promise<ValidationResult>}
 */
export async function withValidation(device, fn) {
  if (
    !device ||
    typeof device.pushErrorScope !== 'function' ||
    typeof device.popErrorScope !== 'function'
  ) {
    throw new TypeError('withValidation: invalid device');
  }

  device.pushErrorScope('validation');

  let thrown = /** @type {any} */ (null);
  try {
    const r = fn?.();
    if (r && typeof r.then === 'function') await r;
  } catch (e) {
    thrown = e;
  }

  const gpuErr = await device.popErrorScope();

  if (thrown) {
    return { ok: false, message: String(/** @type {any} */ (thrown)?.message ?? thrown) };
  }
  if (gpuErr) {
    return { ok: false, message: String(/** @type {any} */ (gpuErr)?.message ?? gpuErr) };
  }
  return { ok: true, message: null };
}

/**
 * Device shape exposing a `lost` promise.
 * @typedef {Object} DeviceWithLost
 * @property {Promise<Object>} lost
 */

/**
 * Info object provided when a device is lost.
 * @typedef {Object} DeviceLostInfo
 * @property {string} [reason]
 * @property {string} [message]
 */

/**
 * Callback invoked when a device is lost.
 * @callback DeviceLostHandler
 * @param {DeviceLostInfo} info
 * @returns {void}
 */

/**
 * Wire a handler to device.lost promise and return a disposer.
 * Note: Promise handlers can't truly be "unsubscribed"; disposer will just ignore future callbacks.
 *
 * @param {DeviceWithLost} device
 * @param {DeviceLostHandler} cb
 * @returns {function(): void} disposer
 */
export function onDeviceLost(device, cb) {
  if (!device || !device.lost || typeof device.lost.then !== 'function') {
    throw new TypeError('onDeviceLost: invalid device');
  }
  let cancelled = false;
  device.lost.then((info) => {
    if (!cancelled) cb?.(/** @type {DeviceLostInfo} */ (info || {}));
  });
  return () => {
    cancelled = true;
  };
}

/**
 * Minimal canvas shape used here.
 * @typedef {Object} CanvasLike
 * @property {Function} getContext
 */

/**
 * Minimal GPU env for tests/shims.
 * @typedef {Object} RuntimeEnv
 * @property {{ requestAdapter: Function, getPreferredCanvasFormat: Function }} [gpu]
 */

/**
 * Acquire adapter/device, get 'webgpu' context from canvas, configure it, and return essentials.
 * Accepts an optional 'env' for testability (injects navigator.gpu shim).
 *
 * @param {CanvasLike} canvas
 * @param {Object} [options] - passed to context.configure (e.g., { alphaMode: 'opaque' })
 * @param {RuntimeEnv} [env]
 * @returns {Promise<{device:any, context:any, format:string}>}
 */
export async function setupWebGPU(canvas, options = {}, env = {}) {
  const gpu =
    env.gpu ?? (typeof navigator !== 'undefined' ? /** @type {any} */ (navigator).gpu : undefined);
  if (!gpu) throw new Error('WebGPU not available');

  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error('No suitable GPU adapter');

  const device = await adapter.requestDevice();
  const context = /** @type {any} */ (canvas.getContext('webgpu'));
  if (!context) throw new Error('Failed to get webgpu context');

  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, ...options });

  return { device, context, format };
}
