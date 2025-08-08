// src/gfx/texture.js
'use strict';

/**
 * Number of mip levels for a 2D texture: floor(log2(max(w,h))) + 1, minimum 1.
 * @param {number} w - width in pixels (>=1)
 * @param {number} h - height in pixels (>=1)
 * @returns {number}
 */
export function computeMipCount(w, h) {
  const mw = Math.max(1, Math.floor(w));
  const mh = Math.max(1, Math.floor(h));
  const m = Math.max(mw, mh);
  // log2(1) = 0 -> 1 level; log2(320)=~8.32 -> 9 levels
  return Math.floor(Math.log2(m)) + 1;
}

/**
 * WebGPU requires bytesPerRow to be a multiple of 256.
 * @param {number} width - width in texels
 * @param {number} bytesPerPixel - bytes per pixel (e.g., 4 for rgba8unorm)
 * @returns {number} aligned bytesPerRow
 */
export function computeBytesPerRow(width, bytesPerPixel) {
  const raw = Math.max(0, Math.floor(width)) * Math.max(0, Math.floor(bytesPerPixel));
  const align = 256;
  // Round up to next multiple of 256
  return Math.ceil(raw / align) * align;
}
