// @ts-check
'use strict';

/**
 * @file Image loading helpers with dependency injection for tests.
 * Tests assert:
 *  - loadImageBitmap calls fetch + createImageBitmap with merged options
 *  - imageBitmapToRGBA8 uses OffscreenCanvas 2D and returns tight RGBA8 copy
 *  - loadRGBA8FromURL composes both end-to-end
 */

/**
 * Options forwarded to createImageBitmap.
 * (Use strings; JSDoc literal unions aren’t reliably parsed by jsdoc.)
 * @typedef {Object} BitmapOptions
 * @property {string} [imageOrientation] Optional. Usually "from-image" or "none".
 * @property {string} [premultiplyAlpha] Optional. Usually "none" or "premultiply".
 * @property {string} [colorSpaceConversion] Optional. Usually "none" or "default".
 */

/**
 * Environment shims for tests and non-browser contexts.
 * All properties are optional; when missing, globals are used if available.
 * @typedef {Object} ImageEnv
 * @property {Function} [fetch] A fetch-like function (url) -> Promise<Response>
 * @property {Function} [createImageBitmap] A function (source, options?) -> Promise<any>
 * @property {any} [OffscreenCanvas] OffscreenCanvas constructor
 */

/**
 * Minimal RGBA8 image payload.
 * @typedef {Object} RGBA8Image
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} data Length = width * height * 4
 */

/**
 * Merge two plain objects (shallow). Later keys override earlier ones.
 * @template T
 * @param {T} a
 * @param {Partial<T>|undefined|null} b
 * @returns {T}
 */
function merge(a, b) {
  const out = /** @type {any} */ ({});
  if (a && typeof a === 'object') {
    for (const k of Object.keys(a)) out[k] = /** @type {any} */ (a)[k];
  }
  if (b && typeof b === 'object') {
    for (const k of Object.keys(b)) out[k] = /** @type {any} */ (b)[k];
  }
  return /** @type {T} */ (out);
}

/**
 * Load an ImageBitmap from a URL using fetch + createImageBitmap.
 *
 * @param {string} url
 * @param {BitmapOptions} [opts]
 * @param {ImageEnv} [env]
 * @returns {Promise<any>} Resolves to an ImageBitmap-like object.
 */
export async function loadImageBitmap(url, opts, env) {
  const _fetch = (env && env.fetch) || /** @type {any} */ (globalThis.fetch);

  const _createImageBitmap =
    (env && env.createImageBitmap) || /** @type {any} */ (globalThis.createImageBitmap);

  if (typeof _fetch !== 'function') {
    throw new Error('loadImageBitmap: fetch is not available');
  }
  if (typeof _createImageBitmap !== 'function') {
    throw new Error('loadImageBitmap: createImageBitmap is not available');
  }

  /** @type {BitmapOptions} */
  const defaults = {
    imageOrientation: 'from-image',
    premultiplyAlpha: 'none',
    // test expects this to be "none" when not provided by caller
    colorSpaceConversion: 'none',
  };
  const bitmapOpts = merge(defaults, opts || {});

  const res = await _fetch(url);
  if (!res || typeof res.blob !== 'function') {
    throw new Error('loadImageBitmap: fetch response has no blob()');
  }
  const blob = await res.blob();
  return _createImageBitmap(blob, bitmapOpts);
}

/**
 * Convert an ImageBitmap to a tight RGBA8 buffer using OffscreenCanvas.
 *
 * @param {any} imageBitmap Must have width, height; drawImage compatible.
 * @param {ImageEnv} [env]
 * @returns {RGBA8Image}
 */
export function imageBitmapToRGBA8(imageBitmap, env) {
  if (!imageBitmap || !Number.isFinite(imageBitmap.width) || !Number.isFinite(imageBitmap.height)) {
    throw new TypeError('imageBitmapToRGBA8: invalid imageBitmap');
  }

  const OffscreenCanvasCtor =
    (env && env.OffscreenCanvas) || /** @type {any} */ (globalThis.OffscreenCanvas);

  if (typeof OffscreenCanvasCtor !== 'function') {
    throw new Error('imageBitmapToRGBA8: OffscreenCanvas is not available');
  }

  const width = Math.max(0, imageBitmap.width | 0);
  const height = Math.max(0, imageBitmap.height | 0);
  const canvas = new OffscreenCanvasCtor(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('imageBitmapToRGBA8: 2D context not available');

  ctx.drawImage(imageBitmap, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  // Ensure we return a tight copy (tests assert a Uint8Array copy, not the live backing store).
  const data = new Uint8Array(imgData.data);

  return { width, height, data };
}

/**
 * Convenience: load a URL and return a tight RGBA8 buffer.
 *
 * @param {string} url
 * @param {BitmapOptions} [opts]
 * @param {ImageEnv} [env]
 * @returns {Promise<RGBA8Image>}
 */
export async function loadRGBA8FromURL(url, opts, env) {
  const bmp = await loadImageBitmap(url, opts, env);
  return imageBitmapToRGBA8(bmp, env);
}
