// src/gfx/sampler.js
'use strict';

/**
 * Return a WebGPU-style sampler descriptor for common presets.
 * Valid kinds:
 *  - 'linearClamp'     : linear min/mag, no mips, clamp-to-edge
 *  - 'linearRepeat'    : linear min/mag, no mips, repeat
 *  - 'nearestClamp'    : nearest min/mag, clamp-to-edge
 *  - 'nearestRepeat'   : nearest min/mag, repeat
 *  - 'mipmapLinear'    : linear min/mag/mipmap, clamp-to-edge, LOD[0..32]
 *
 * @param {string} kind
 * @returns {{addressModeU:string,addressModeV:string,addressModeW:string,
 *            magFilter:string,minFilter:string,mipmapFilter?:string,
 *            lodMinClamp?:number,lodMaxClamp?:number}}
 */
export function createSamplerPreset(kind = 'linearClamp') {
  const base = {
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
    addressModeW: 'clamp-to-edge',
  };

  switch (kind) {
    case 'linearClamp':
      return { ...base, magFilter: 'linear', minFilter: 'linear' };
    case 'linearRepeat':
      return {
        addressModeU: 'repeat', addressModeV: 'repeat', addressModeW: 'repeat',
        magFilter: 'linear', minFilter: 'linear'
      };
    case 'nearestClamp':
      return { ...base, magFilter: 'nearest', minFilter: 'nearest' };
    case 'nearestRepeat':
      return {
        addressModeU: 'repeat', addressModeV: 'repeat', addressModeW: 'repeat',
        magFilter: 'nearest', minFilter: 'nearest'
      };
    case 'mipmapLinear':
      return {
        ...base,
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        lodMinClamp: 0,
        lodMaxClamp: 32,
      };
    default:
      throw new Error(`Unknown sampler preset: ${kind}`);
  }
}
