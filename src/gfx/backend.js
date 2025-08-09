// src/gfx/backend.js
'use strict';

/**
 * @file Backend selection helpers.
 * Provides a single exported function `selectBackend` used to choose
 * between WebGPU and WebGL2 based on availability and required features.
 */

/**
 * Minimal shape for WebGPU env.
 * @typedef {Object} WebGpuEnv
 * @property {boolean} available
 * @property {Set<string>|string[]|undefined} [features]
 */

/**
 * Minimal shape for WebGL2 env.
 * @typedef {Object} WebGl2Env
 * @property {boolean} available
 */

/**
 * Environment passed to {@link selectBackend}.
 * @typedef {Object} BackendEnv
 * @property {WebGpuEnv} [webgpu]
 * @property {WebGl2Env} [webgl2]
 */

/**
 * Return true if `features` contains every element in `required`.
 * Accepts Set<string> or string[]; case-sensitive.
 * @param {Set<string>|string[]|undefined} features
 * @param {string[]} required
 */
function hasAllFeatures(features, required) {
  if (!required || required.length === 0) return true;
  if (!features) return required.length === 0;

  if (Array.isArray(features)) {
    const s = new Set(features);
    return required.every((f) => s.has(f));
  }
  // Assume Set-like
  return required.every((f) => features.has(f));
}

/**
 * Choose a graphics backend based on availability and (for WebGPU) required features.
 *
 * Preference order:
 *  1) 'webgpu' if env.webgpu.available && all required features are present
 *  2) 'webgl2' if env.webgl2.available
 *  3) throw Error if neither is available
 *
 * @param {BackendEnv} env
 * @param {string[]} [requiredFeatures=[]] WebGPU features that must be present if selecting WebGPU
 * @returns {'webgpu'|'webgl2'}
 * @throws {Error} When no supported GPU backend is available
 */
export function selectBackend(env, requiredFeatures = []) {
  const gpu = env && env.webgpu;
  const gl2 = env && env.webgl2;

  // Prefer WebGPU when available and feature requirements are satisfied
  if (gpu && gpu.available && hasAllFeatures(gpu.features, requiredFeatures)) {
    return 'webgpu';
  }

  // Fallback to WebGL2 if available
  if (gl2 && gl2.available) {
    return 'webgl2';
  }

  throw new Error('No supported GPU backend available (need WebGPU or WebGL2)');
}
