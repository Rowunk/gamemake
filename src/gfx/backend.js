// src/gfx/backend.js
'use strict';

/**
 * Decide GPU backend without touching the DOM (pure function for testability).
 *
 * Selection policy:
 * 1) Prefer WebGPU if available AND all required features are present.
 * 2) Else fallback to WebGL2 if available.
 * 3) Else throw.
 *
 * @param {Object} env
 * @param {{available:boolean, features?:Set<string>}} [env.webgpu]
 * @param {{available:boolean}} [env.webgl2]
 * @param {string[]} [requiredFeatures=[]]
 * @returns {'webgpu'|'webgl2'}
 */
export function selectBackend(env, requiredFeatures = []) {
  const gpu = env?.webgpu;
  const gl2 = env?.webgl2;

  if (gpu?.available) {
    const feats = gpu.features instanceof Set ? gpu.features : new Set();
    const ok = requiredFeatures.every(f => feats.has(f));
    if (ok) return 'webgpu';
  }

  if (gl2?.available) return 'webgl2';

  throw new Error('No supported GPU backend');
}
