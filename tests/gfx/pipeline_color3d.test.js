import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WGSL_COLOR3D_VERT, WGSL_COLOR3D_FRAG,
  buildColor3DPipelineDescriptor
} from '../../src/gfx/pipeline_color3d.js';

test('WGSL_COLOR3D_*: vertex/fragment entrypoints, attrs, MVP uniform', () => {
  assert.match(WGSL_COLOR3D_VERT, /@vertex\s+fn\s+main/i);
  assert.match(WGSL_COLOR3D_FRAG, /@fragment\s+fn\s+main/i);

  // Vertex inputs: position and color
  assert.match(WGSL_COLOR3D_VERT, /@location\(0\)\s*position\s*:\s*vec3<f32>/i);
  assert.match(WGSL_COLOR3D_VERT, /@location\(1\)\s*color\s*:\s*vec3<f32>/i);

  // MVP uniform at @group(0) @binding(0)
  assert.match(WGSL_COLOR3D_VERT, /@group\(0\)\s*@binding\(0\)\s*var<uniform>\s+uMVP/i);
  assert.match(WGSL_COLOR3D_VERT, /mat4x4<f32>/i);

  // Fragment outputs a color (rgba)
  assert.match(WGSL_COLOR3D_FRAG, /@location\(0\)\s*vec4<f32>/i);
});

test('buildColor3DPipelineDescriptor: layouts, targets, depth state', () => {
  const desc = buildColor3DPipelineDescriptor('rgba8unorm', 'depth24plus');

  assert.equal(desc.layout, 'auto');
  assert.equal(desc.primitive?.topology, 'triangle-list');

  const vb0 = desc.vertex?.buffers?.[0];
  const vb1 = desc.vertex?.buffers?.[1];
  assert.ok(vb0 && vb1);
  assert.equal(vb0.arrayStride, 12); // vec3<f32>
  assert.equal(vb0.attributes?.[0]?.format, 'float32x3');
  assert.equal(vb0.attributes?.[0]?.shaderLocation, 0);
  assert.equal(vb0.attributes?.[0]?.offset, 0);

  assert.equal(vb1.arrayStride, 12); // vec3<f32>
  assert.equal(vb1.attributes?.[0]?.format, 'float32x3');
  assert.equal(vb1.attributes?.[0]?.shaderLocation, 1);
  assert.equal(vb1.attributes?.[0]?.offset, 0);

  assert.equal(desc.fragment?.targets?.[0]?.format, 'rgba8unorm');

  // Depth state present and enabled
  assert.ok(desc.depthStencil);
  assert.equal(desc.depthStencil.format, 'depth24plus');
  assert.equal(desc.depthStencil.depthWriteEnabled, true);
  assert.equal(desc.depthStencil.depthCompare, 'less');
});
