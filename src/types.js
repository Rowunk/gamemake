// @ts-check
'use strict';

/**
 * A generic environment bag for Web APIs you might mock in tests.
 * @typedef {Object} EnvGPU
 * @property {Object} [gpu]
 * @property {Function} [gpu.requestAdapter]  // (opts?:object) => Promise<any>
 * @property {Function} [gpu.getPreferredCanvasFormat] // () => string
 */

/**
 * Minimal shape for a device that supports error scopes.
 * JSDoc doesn’t support “intersection types”; use descriptions instead.
 * @typedef {Object} ErrorScopeDevice
 * @property {Function} pushErrorScope
 * @property {Function} popErrorScope
 */

/**
 * Device with a “lost” promise.
 * @typedef {Object} DeviceWithLost
 * @property {Promise<Object>} lost
 */

/**
 * Simple RGBA8 image payload.
 * @typedef {Object} RGBA8Data
 * @property {Uint8Array} data
 * @property {number} width
 * @property {number} height
 */

/**
 * Sampler description (keep strings; document allowed values in text).
 * @typedef {Object} SamplerDesc
 * @property {string} addressModeU
 * @property {string} addressModeV
 * @property {string} addressModeW
 * @property {string} magFilter
 * @property {string} minFilter
 * @property {string} [mipmapFilter]
 * @property {number} [lodMinClamp]
 * @property {number} [lodMaxClamp]
 */

/**
 * Options for createImageBitmap and friends.
 * (JSDoc doesn’t do string literal unions; document values in prose.)
 * @typedef {Object} BitmapOptions
 * @property {string} [imageOrientation]   // 'from-image' | 'none'
 * @property {string} [premultiplyAlpha]   // 'none' | 'premultiply'
 * @property {string} [colorSpaceConversion] // 'none' | 'default'
 */

/**
 * Generic update callback.
 * @callback UpdateCallback
 * @param {number} dtSeconds
 * @returns {void}
 */

/**
 * Generic disposer function.
 * @callback Disposer
 * @returns {void}
 */
