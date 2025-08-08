// src/gfx/pipeline_tex3d.js
'use strict';

/**
 * 3D textured pipeline (pos+uv, MVP uniform, sampler+texture).
 * Vertex buffer 0: @location(0) vec3<f32> position
 * Vertex buffer 1: @location(1) vec2<f32> uv
 * Bind group(0):
 *   binding(0): var<uniform> uMVP : mat4x4<f32>
 *   binding(1): sampler
 *   binding(2): texture_2d<f32>
 */

export const WGSL_TEX3D_VERT = /* wgsl */`
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
fn main(in : VSIn) -> VSOut {
  var out : VSOut;
  out.pos = uMVP * vec4<f32>(in.position, 1.0);
  out.vUV = in.uv;
  return out;
}
`;

export const WGSL_TEX3D_FRAG = /* wgsl */`
@group(0) @binding(1) var uSampler : sampler;
@group(0) @binding(2) var uTex     : texture_2d<f32>;

@fragment
fn main(@location(0) vUV : vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(uTex, uSampler, vUV);
}
`;

/**
 * Build a WebGPU-like pipeline descriptor (shape-only; replace modules at runtime).
 * @param {string} colorFormat
 */
export function buildTexture3DPipelineDescriptor(colorFormat = 'rgba8unorm') {
  return {
    layout: 'auto',
    vertex: {
      module: { code: WGSL_TEX3D_VERT },
      entryPoint: 'main',
      buffers: [
        // positions
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
        // uvs
        { arrayStride: 8,  attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x2' }] },
      ]
    },
    fragment: {
      module: { code: WGSL_TEX3D_FRAG },
      entryPoint: 'main',
      targets: [{ format: colorFormat }]
    },
    primitive: { topology: 'triangle-list' }
  };
}
