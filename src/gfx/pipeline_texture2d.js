// src/gfx/pipeline_texture2d.js
'use strict';

/**
 * WGSL: textured 2D pipeline (pos+uv in TWO vertex buffers, MVP uniform, sampler+texture).
 * Vertex inputs:
 *   @location(0) position: vec3<f32>  // buffer 0, stride 12
 *   @location(1) uv:       vec2<f32>  // buffer 1, stride 8
 * Bindings (group 0):
 *   binding(0) => var<uniform> uMVP: mat4x4<f32>
 *   binding(1) => sampler
 *   binding(2) => texture_2d<f32>
 */

export const WGSL_TEX2D_VERT = /* wgsl */`
struct VSIn {
  @location(0) position : vec3<f32>,
  @location(1) uv       : vec2<f32>,
};

struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) vUV       : vec2<f32>,
};

@group(0) @binding(0) var<uniform> uMVP : mat4x4<f32>;

@vertex
fn main(input : VSIn) -> VSOut {
  var out : VSOut;
  out.pos = uMVP * vec4<f32>(input.position, 1.0);
  out.vUV = input.uv;
  return out;
}
`;

export const WGSL_TEX2D_FRAG = /* wgsl */`
@group(0) @binding(1) var uSampler : sampler;
@group(0) @binding(2) var uTex     : texture_2d<f32>;

@fragment
fn main(@location(0) vUV : vec2<f32>) -> @location(0) vec4<f32> {
  // Sample directly; upload path already matches UV orientation.
  return textureSample(uTex, uSampler, vUV);
}
`;

/**
 * Pipeline descriptor (layout 'auto'), TWO vertex buffers: pos (float32x3), uv (float32x2).
 * Triangle list topology.
 * @param {GPUTextureFormat|string} colorFormat
 */
export function buildTexture2DPipelineDescriptor(colorFormat = 'rgba8unorm') {
  return {
    layout: 'auto',
    vertex: {
      module: { code: WGSL_TEX2D_VERT },
      entryPoint: 'main',
      buffers: [
        // Position buffer: float32x3 tightly packed
        {
          arrayStride: 12,
          attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
        },
        // UV buffer: float32x2 tightly packed
        {
          arrayStride: 8,
          attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x2' }],
        },
      ],
    },
    fragment: {
      module: { code: WGSL_TEX2D_FRAG },
      entryPoint: 'main',
      targets: [{ format: colorFormat }],
    },
    primitive: { topology: 'triangle-list' },
  };
}
