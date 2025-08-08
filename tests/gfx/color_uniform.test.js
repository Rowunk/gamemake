import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorUniformLayout, buildColorPipelineDescriptor } from '../../src/gfx/color_pass.js';

test('colorUniformLayout: minimal uniform buffer at binding(0), visibility fragment', () => {
  const l = colorUniformLayout();
  assert.ok(Array.isArray(l.entries));
  assert.equal(l.entries.length, 1);
  const e = l.entries[0];
  assert.equal(e.binding, 0);
  assert.equal(e.visibility, 'fragment');        // string tag for testability
  assert.equal(e.buffer?.type, 'uniform');
  assert.ok((e.buffer?.minBindingSize ?? 0) >= 16); // vec4<f32> = 16 bytes
});

test('buildColorPipelineDescriptor: vertex buffer layout & triangle-list', () => {
  const desc = buildColorPipelineDescriptor('rgba8unorm');
  assert.equal(desc.layout, 'auto');
  assert.equal(desc.primitive?.topology, 'triangle-list');

  const vb = desc.vertex?.buffers?.[0];
  assert.ok(vb);
  assert.equal(vb.arrayStride, 8);
  assert.equal(vb.attributes?.[0]?.format, 'float32x2');
  assert.equal(vb.attributes?.[0]?.shaderLocation, 0);
  assert.equal(vb.attributes?.[0]?.offset, 0);

  // Shader placeholders are strings (Node doesn’t compile WGSL)
  assert.equal(typeof desc.vertex?.module?.code, 'string');
  assert.equal(typeof desc.fragment?.module?.code, 'string');
  assert.equal(desc.fragment?.targets?.[0]?.format, 'rgba8unorm');
});
