// tests/gfx/pipeline_tex3d.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WGSL_TEX3D_VERT,
  WGSL_TEX3D_FRAG,
  buildTexture3DPipelineDescriptor,
} from '../../src/gfx/pipeline_tex3d.js';

test('WGSL_TEX3D_*: entry points, bindings, and attrs exist', () => {
  // Vertex has @vertex and uses @location(0) vec3 + @location(1) vec2
  assert.match(WGSL_TEX3D_VERT, /@vertex/);
  assert.match(WGSL_TEX3D_VERT, /@location\(0\)\s+position\s*:\s*vec3<f32>/);
  assert.match(WGSL_TEX3D_VERT, /@location\(1\)\s+uv\s*:\s*vec2<f32>/);
  assert.match(WGSL_TEX3D_VERT, /@group\(0\)\s*@binding\(0\)\s+var<uniform>\s+uMVP/);

  // Fragment samples sampler+texture at group(0) bindings 1 and 2
  assert.match(WGSL_TEX3D_FRAG, /@group\(0\)\s*@binding\(1\)\s+var\s+uSampler\s*:\s*sampler/);
  assert.match(WGSL_TEX3D_FRAG, /@group\(0\)\s*@binding\(2\)\s+var\s+uTex\s*:\s*texture_2d<f32>/);
  assert.match(WGSL_TEX3D_FRAG, /@fragment/);
  assert.match(WGSL_TEX3D_FRAG, /->\s*@location\(0\)\s*vec4<f32>/);
});

test('buildTexture3DPipelineDescriptor: two vertex buffers and triangle-list', () => {
  const desc = buildTexture3DPipelineDescriptor('rgba8unorm');
  assert.equal(desc.layout, 'auto');
  assert.equal(desc.primitive.topology, 'triangle-list');

  // vertex buffers: 0=pos(float32x3), 1=uv(float32x2)
  const vb = desc.vertex.buffers;
  assert.equal(vb.length, 2);
  assert.equal(vb[0].attributes[0].format, 'float32x3');
  assert.equal(vb[0].attributes[0].shaderLocation, 0);
  assert.equal(vb[1].attributes[0].format, 'float32x2');
  assert.equal(vb[1].attributes[0].shaderLocation, 1);

  // fragment target format wired
  assert.equal(desc.fragment.targets[0].format, 'rgba8unorm');
});
