// src/gfx/texture_bindgroup.js
'use strict';

/**
 * Bind group for textured 2D pipeline:
 *   binding(0) => MVP UBO (64 bytes)
 *   binding(1) => sampler
 *   binding(2) => texture view
 * @param {GPUBuffer} ubo
 * @param {GPUSampler} sampler
 * @param {GPUTextureView} textureView
 */
export function makeTextureBindGroupDescriptor(ubo, sampler, textureView) {
  return {
    entries: [
      { binding: 0, resource: { buffer: ubo, offset: 0, size: 64 } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: textureView },
    ]
  };
}
