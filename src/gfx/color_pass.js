// src/gfx/color_pass.js
'use strict';

/**
 * WGSL for a solid-color triangle pass.
 * - Vertex consumes vec2<f32> position at @location(0) and emits clip-space position.
 * - Fragment reads a uniform color struct at @group(0) @binding(0).
 */

// Vertex shader: pass-through position
export const WGSL_COLOR_VERT = /* wgsl */`
struct VSIn {
  @location(0) position : vec2<f32>,
};

struct VSOut {
  @builtin(position) pos : vec4<f32>,
};

@vertex
fn main(in : VSIn) -> VSOut {
  var out : VSOut;
  out.pos = vec4<f32>(in.position, 0.0, 1.0);
  return out;
}
`;

// Fragment shader: solid color from uniform buffer
export const WGSL_COLOR_FRAG = /* wgsl */`
struct Color {
  color : vec4<f32>,
};

@group(0) @binding(0) var<uniform> uColor : Color;

@fragment
fn main() -> @location(0) vec4<f32> {
  return uColor.color;
}
`;

/**
 * Describe a minimal uniform-buffer layout for the color.
 * Note: for testability we use strings (e.g., 'fragment') instead of GPUShaderStage enums.
 */
export function colorUniformLayout() {
  return {
    entries: [
      {
        binding: 0,
        visibility: 'fragment',        // tests assert this exact string
        buffer: {
          type: 'uniform',
          minBindingSize: 16,          // vec4<f32>
        },
      },
    ],
  };
}

/**
 * Build a WebGPU-like render pipeline descriptor for the color pass.
 * Node tests verify the *shape* only; at runtime you replace the module placeholders
 * with actual GPUShaderModules.
 *
 * @param {string} format e.g. 'rgba8unorm'
 */
export function buildColorPipelineDescriptor(format = 'rgba8unorm') {
  return {
    layout: 'auto',
    vertex: {
      module: { code: WGSL_COLOR_VERT },   // placeholder for tests
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: 2 * 4,              // vec2<f32>
          attributes: [
            { shaderLocation: 0, offset: 0, format: 'float32x2' },
          ],
        },
      ],
    },
    fragment: {
      module: { code: WGSL_COLOR_FRAG },   // placeholder for tests
      entryPoint: 'main',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  };
}

/**
 * Create a bind-group descriptor that binds the given uniform GPU buffer at binding(0).
 * The descriptor includes the matching layout (shape only for tests).
 *
 * @param {any} buffer a GPUBuffer-like identity (tests use a placeholder object)
 */
export function makeColorBindGroupDescriptor(buffer) {
  return {
    layout: colorUniformLayout(),
    entries: [
      {
        binding: 0,
        resource: {
          buffer,
          offset: 0,
          size: 16, // vec4<f32>
        },
      },
    ],
  };
}

/**
 * Deterministic RGBA color varying with time t (seconds).
 * Returns components in [0,1], with alpha fixed at 1.
 *
 * @param {number} t
 * @returns {[number, number, number, number]}
 */
export function computeColorAt(t) {
  const r = 0.5 + 0.5 * Math.sin(t * 1.000);
  const g = 0.5 + 0.5 * Math.sin(t * 1.618 + 1.0);
  const b = 0.5 + 0.5 * Math.sin(t * 2.414 + 2.0);
  const a = 1.0;
  // Clamp defensively to [0,1] in case of weird inputs
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  return [clamp01(r), clamp01(g), clamp01(b), a];
}
