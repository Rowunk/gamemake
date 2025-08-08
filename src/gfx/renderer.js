// src/gfx/renderer.js
'use strict';

import { WGSL_CLEAR_VERT, WGSL_CLEAR_FRAG } from './shaders.js';

/**
 * Build a minimal WebGPU render pipeline descriptor for a clear pass.
 * Node tests only verify the shape; at runtime you will replace the
 * `{ module: { code } }` placeholders with actual GPUShaderModules.
 *
 * @param {GPUTextureFormat|string} format - color target format (e.g., 'rgba8unorm')
 */
export function buildClearPipelineDescriptor(format = 'rgba8unorm') {
  return {
    layout: 'auto',
    vertex: {
      module: { code: WGSL_CLEAR_VERT }, // placeholder for tests
      entryPoint: 'main',
      // One buffer with vec2<f32> positions at @location(0)
      buffers: [{
        arrayStride: 2 * 4, // 2 floats * 4 bytes
        attributes: [{
          shaderLocation: 0,
          offset: 0,
          format: 'float32x2'
        }]
      }]
    },
    fragment: {
      module: { code: WGSL_CLEAR_FRAG }, // placeholder for tests
      entryPoint: 'main',
      targets: [{ format }]
    },
    primitive: { topology: 'triangle-list' }
  };
}
