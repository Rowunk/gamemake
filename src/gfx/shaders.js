// src/gfx/shaders.js
'use strict';

// These are already correct (should PASS the WGSL string tests)
export const WGSL_CLEAR_VERT = /* wgsl */`
@vertex
fn main(@location(0) pos : vec2<f32>) -> @builtin(position) vec4<f32> {
  return vec4<f32>(pos, 0.0, 1.0);
}
`;

export const WGSL_CLEAR_FRAG = /* wgsl */`
@fragment
fn main() -> @location(0) vec4<f32> {
  return vec4<f32>(0.1, 0.1, 0.1, 1.0);
}
`;
