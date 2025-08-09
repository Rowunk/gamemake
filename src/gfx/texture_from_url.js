// @ts-check
'use strict';

import { computeMipCount } from './texture.js';

/**
 * Raw RGBA8 image data produced by the loader.
 * @typedef {Object} RGBA8Image
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} data
 */

/**
 * Options for {@link createTextureFromURLWebGPU}.
 * @typedef {Object} TextureFromURLOpts
 * @property {boolean} [generateMips] When not false, generate full mip chain.
 */

/**
 * Result returned by the WebGPU texture uploader.
 * @typedef {Object} TextureUploadResult
 * @property {any} texture
 * @property {any} view
 */

/**
 * Minimal interface for the mip generator object.
 * @typedef {Object} MipGenerator
 * @property {function(*, *, number, number, number): void} generate
 */

/**
 * Options object for the RGBA8 WebGPU uploader.
 * @typedef {Object} UploadRGBA8Opts
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} data
 * @property {boolean} [mips]
 * @property {string} [label]
 */

/**
 * Options object for the mip generator factory.
 * @typedef {Object} MipGenOpts
 * @property {string} [format]
 */

/**
 * Loader function signature.
 * @callback LoadRGBA8FromURL
 * @param {string} url
 * @param {object} [loaderOpts]
 * @param {object} [env]
 * @returns {Promise<RGBA8Image>}
 */

/**
 * WebGPU RGBA8 uploader signature.
 * @callback UploadTextureRGBA8WebGPU
 * @param {any} device
 * @param {UploadRGBA8Opts} opts
 * @returns {TextureUploadResult}
 */

/**
 * Factory that creates a mip generator.
 * @callback MakeMipGenerator
 * @param {any} device
 * @param {MipGenOpts} [opts]
 * @returns {MipGenerator}
 */

/**
 * Dependency injection hooks for testing.
 * Any of these may be omitted; defaults will be lazily imported.
 * @typedef {Object} TextureFromURLDeps
 * @property {LoadRGBA8FromURL} [loadRGBA8FromURL]
 * @property {UploadTextureRGBA8WebGPU} [uploadTextureRGBA8WebGPU]
 * @property {MakeMipGenerator} [makeMipGenerator]
 */

/**
 * Result object returned by {@link createTextureFromURLWebGPU}.
 * @typedef {Object} TextureFromURLResult
 * @property {any} texture
 * @property {any} view
 * @property {number} width
 * @property {number} height
 * @property {number} mipLevelCount
 */

/**
 * High-level helper: load an image URL → upload to WebGPU RGBA8 texture → (optionally) generate mips.
 * Designed for testability: pass `deps` to inject loader/uploader/mipgen.
 *
 * @param {any} device WebGPU device-like object (must provide createCommandEncoder() and queue.submit()).
 * @param {string} url Image URL to load.
 * @param {TextureFromURLOpts} [opts]
 * @param {TextureFromURLDeps} [deps]
 * @returns {Promise<TextureFromURLResult>}
 */
export async function createTextureFromURLWebGPU(device, url, opts = {}, deps = {}) {
  const {
    loadRGBA8FromURL = (await import('./image_loader.js')).loadRGBA8FromURL,
    uploadTextureRGBA8WebGPU = (await import('./texture_upload.js')).uploadTextureRGBA8WebGPU,
    makeMipGenerator = (await import('./mipgen.js')).makeMipGenerator,
  } = /** @type {TextureFromURLDeps} */ (deps);

  const img = /** @type {RGBA8Image} */ (await loadRGBA8FromURL(url, {}, deps));
  const { width, height } = img;
  const mipLevelCount = computeMipCount(width, height);

  // Upload base level; our uploader returns { texture, view } and accepts { mips: true|false }.
  const { texture, view } = uploadTextureRGBA8WebGPU(device, { ...img, mips: true });

  if (opts.generateMips !== false && mipLevelCount > 1) {
    const encoder = device.createCommandEncoder();
    const gen = /** @type {MipGenerator} */ (makeMipGenerator(device, { format: 'rgba8unorm' }));
    gen.generate(encoder, texture, width, height, mipLevelCount);
    device.queue.submit([encoder.finish()]);
  }

  return { texture, view, width, height, mipLevelCount };
}
