// src/gfx/texture_from_url.js
'use strict';

import { computeMipCount } from './texture.js';

/**
 * High-level helper: load an image URL → upload to WebGPU RGBA8 texture → (optionally) generate mips.
 * Designed for testability: pass `deps` to inject loader/uploader/mipgen.
 *
 * @param {GPUDevice} device
 * @param {string} url
 * @param {{generateMips?: boolean}} [opts]
 * @param {{
 *   loadRGBA8FromURL?: Function,
 *   uploadTextureRGBA8WebGPU?: Function,
 *   makeMipGenerator?: Function
 * }} [deps]
 * @returns {Promise<{texture: any, view: any, width: number, height: number, mipLevelCount: number}>}
 */
export async function createTextureFromURLWebGPU(device, url, opts = {}, deps = {}) {
  const {
    loadRGBA8FromURL = (await import('./image_loader.js')).loadRGBA8FromURL,
    uploadTextureRGBA8WebGPU = (await import('./texture_upload.js')).uploadTextureRGBA8WebGPU,
    makeMipGenerator = (await import('./mipgen.js')).makeMipGenerator,
  } = deps;

  const img = await loadRGBA8FromURL(url, {}, deps);
  const { width, height } = img;
  const mipLevelCount = computeMipCount(width, height);

  // Upload base level; our uploader returns { texture, view } and accepts { mips: true|false }
  const { texture, view } = uploadTextureRGBA8WebGPU(device, { ...img, mips: true });

  if (opts.generateMips !== false && mipLevelCount > 1) {
    const encoder = device.createCommandEncoder();
    const gen = makeMipGenerator(device, { format: 'rgba8unorm' });
    gen.generate(encoder, texture, width, height, mipLevelCount);
    device.queue.submit([encoder.finish()]);
  }

  return { texture, view, width, height, mipLevelCount };
}
