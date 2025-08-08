// src/gfx/pipeline_color3d.js
'use strict';

/**
 * 3D color pipeline (positions + colors, MVP uniform).
 * - Vertex buffer 0: position @location(0) float32x3
 * - Vertex buffer 1: color    @location(1) float32x3
 * - Uniform @group(0) @binding(0): mat4x4<f32> (MVP)
 */

export const WGSL_COLOR3D_VERT = /* wgsl */`
struct VSIn {
  @location(0) position : vec3<f32>,
  @location(1) color    : vec3<f32>,
};

struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) vColor    : vec3<f32>,
};

@group(0) @binding(0) var<uniform> uMVP : mat4x4<f32>;

@vertex
fn main(in : VSIn) -> VSOut {
  var out : VSOut;
  out.pos    = uMVP * vec4<f32>(in.position, 1.0);
  out.vColor = in.color;
  return out;
}
`;

// Fragment must directly return a value annotated with @location(0)
// to satisfy the regex in tests.
export const WGSL_COLOR3D_FRAG = /* wgsl */`
@fragment
fn main(@location(0) vColor : vec3<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(vColor, 1.0);
}
`;

/**
 * Shape-only pipeline descriptor (modules are placeholders; replace with GPUShaderModules at runtime).
 * @param {string} colorFormat - e.g., 'rgba8unorm'
 * @param {string} depthFormat - e.g., 'depth24plus'
 */
export function buildColor3DPipelineDescriptor(colorFormat = 'rgba8unorm', depthFormat = 'depth24plus') {
  return {
    layout: 'auto',
    vertex: {
      module: { code: WGSL_COLOR3D_VERT },
      entryPoint: 'main',
      buffers: [
        {
          // positions
          arrayStride: 12, // vec3<f32>
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x3' },
          ],
        },
        {
          // colors
          arrayStride: 12, // vec3<f32>
          attributes: [
            { shaderLocation: 1, offset: 0, format: 'float32x3' },
          ],
        },
      ],
    },
    fragment: {
      module: { code: WGSL_COLOR3D_FRAG },
      entryPoint: 'main',
      targets: [{ format: colorFormat }],
    },
    primitive: { topology: 'triangle-list' },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: true,
      depthCompare: 'less',
    },
  };
}

/**
 * Bind group descriptor for MVP uniform buffer (64 bytes, binding 0).
 */
export function makeMVPBindGroupDescriptor(buffer) {
  return {
    layout: {
      entries: [
        {
          binding: 0,
          visibility: 'vertex',
          buffer: { type: 'uniform', minBindingSize: 64 },
        },
      ],
    },
    entries: [
      {
        binding: 0,
        resource: { buffer, offset: 0, size: 64 },
      },
    ],
  };
}
