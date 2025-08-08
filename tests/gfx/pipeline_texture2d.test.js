import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WGSL_TEX2D_VERT, WGSL_TEX2D_FRAG,
  buildTexture2DPipelineDescriptor
} from '../../src/gfx/pipeline_texture2d.js';

test('WGSL_TEX2D_*: vertex/fragment entrypoints, attrs, MVP+sampler+texture', () => {
  // Entry points
  assert.match(WGSL_TEX2D_VERT, /@vertex\s+fn\s+main/i);
  assert.match(WGSL_TEX2D_FRAG, /@fragment\s+fn\s+main/i);

  // Vertex inputs: position and uv
  assert.match(WGSL_TEX2D_VERT, /@location\(0\)\s*position\s*:\s*vec3<f32>/i);
  assert.match(WGSL_TEX2D_VERT, /@location\(1\)\s*uv\s*:\s*vec2<f32>/i);

  // MVP uniform at @group(0) @binding(0)
  assert.match(WGSL_TEX2D_VERT, /@group\(0\)\s*@binding\(0\)\s*var<uniform>\s+uMVP/i);

  // Sampler+texture in fragment at bindings 1 and 2
  assert.match(WGSL_TEX2D_FRAG, /@group\(0\)\s*@binding\(1\)\s*var\s+\w+\s*:\s*sampler/i);
  assert.match(WGSL_TEX2D_FRAG, /@group\(0\)\s*@binding\(2\)\s*var\s+\w+\s*:\s*texture_2d<f32>/i);

  // Fragment returns @location(0) vec4<f32>
  assert.match(WGSL_TEX2D_FRAG, /->\s*@location\(0\)\s*vec4<f32>/i);
});

test('buildTexture2DPipelineDescriptor: two vertex buffers (pos/uv), triangle-list', () => {
  const desc = buildTexture2DPipelineDescriptor('rgba8unorm');

  assert.equal(desc.layout, 'auto');
  assert.equal(desc.primitive?.topology, 'triangle-list');

  const vb0 = desc.vertex?.buffers?.[0]; // positions
  const vb1 = desc.vertex?.buffers?.[1]; // uvs
  assert.ok(vb0 && vb1);

  assert.equal(vb0.arrayStride, 12); // float32x3
  assert.equal(vb0.attributes?.[0]?.format, 'float32x3');
  assert.equal(vb0.attributes?.[0]?.shaderLocation, 0);
  assert.equal(vb0.attributes?.[0]?.offset, 0);

  assert.equal(vb1.arrayStride, 8); // float32x2
  assert.equal(vb1.attributes?.[0]?.format, 'float32x2');
  assert.equal(vb1.attributes?.[0]?.shaderLocation, 1);
  assert.equal(vb1.attributes?.[0]?.offset, 0);

  assert.equal(desc.fragment?.targets?.[0]?.format, 'rgba8unorm');
});
