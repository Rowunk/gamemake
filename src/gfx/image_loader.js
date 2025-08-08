// src/gfx/image_loader.js
'use strict';

/**
 * Fetch an image and decode to ImageBitmap.
 * Testability: pass { fetch, createImageBitmap } via env to avoid DOM/Node coupling.
 *
 * @param {string} url
 * @param {{imageOrientation?:'from-image'|'none', premultiplyAlpha?:'none'|'premultiply',
 *          colorSpaceConversion?:'none'|'default'}} [opts]
 * @param {{fetch?:Function, createImageBitmap?:Function}} [env]
 * @returns {Promise<ImageBitmap>}
 */
export async function loadImageBitmap(url, opts = {}, env = {}) {
  const fetchFn = env.fetch ?? (typeof fetch !== 'undefined' ? fetch : null);
  const cib = env.createImageBitmap ?? (typeof createImageBitmap !== 'undefined' ? createImageBitmap : null);

  if (!fetchFn) throw new Error('loadImageBitmap: fetch unavailable');
  if (!cib) throw new Error('loadImageBitmap: createImageBitmap unavailable');

  const res = await fetchFn(url);
  if (!res || !res.ok) throw new Error(`loadImageBitmap: HTTP ${res?.status ?? 'ERR'}`);
  const blob = await res.blob();
  return await cib(blob, {
    imageOrientation: 'none',
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
    ...opts
  });
}

/**
 * Convert an ImageBitmap to raw RGBA8 pixels.
 * Testability: pass { OffscreenCanvas } via env to avoid relying on global.
 *
 * @param {{width:number,height:number}} bitmap ImageBitmap-like object
 * @param {{OffscreenCanvas?: any}} [env]
 * @returns {{width:number,height:number,data:Uint8Array}}
 */
export function imageBitmapToRGBA8(bitmap, env = {}) {
  const C = env.OffscreenCanvas ?? (typeof OffscreenCanvas !== 'undefined' ? OffscreenCanvas : null);
  if (!C) throw new Error('imageBitmapToRGBA8: OffscreenCanvas unavailable');

  const w = Math.max(1, bitmap.width | 0);
  const h = Math.max(1, bitmap.height | 0);
  const canvas = new C(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('imageBitmapToRGBA8: 2D context unavailable');

  ctx.drawImage(bitmap, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  // Return a tightly-packed copy (detached from the canvas buffer)
  const data = new Uint8Array(img.data);
  return { width: w, height: h, data };
}

/**
 * Convenience: load URL → RGBA8 pixels in one go.
 *
 * @param {string} url
 * @param {{bitmapOpts?:object}} [opts]
 * @param {{fetch?:Function, createImageBitmap?:Function, OffscreenCanvas?:any}} [env]
 */
export async function loadRGBA8FromURL(url, opts = {}, env = {}) {
  const bmp = await loadImageBitmap(url, opts.bitmapOpts, env);
  return imageBitmapToRGBA8(bmp, env);
}
