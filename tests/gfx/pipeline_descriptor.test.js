import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildClearPipelineDescriptor } from '../../src/gfx/renderer.js';

test('buildClearPipelineDescriptor: minimal valid shape', () => {
  const format = 'rgba8unorm';
  const desc = buildClearPipelineDescriptor(format);

  // Layout & primitive topology
  assert.equal(desc.layout, 'auto');
  assert.equal(desc.primitive?.topology, 'triangle-list');

  // Vertex buffer layout
  const vb = desc.vertex?.buffers?.[0];
  assert.ok(vb);
  assert.equal(vb.arrayStride, 8); // 2 floats * 4 bytes
  assert.equal(vb.attributes?.[0]?.format, 'float32x2');
  assert.equal(vb.attributes?.[0]?.shaderLocation, 0);
  assert.equal(vb.attributes?.[0]?.offset, 0);

  // Fragment target format wiring
  assert.equal(desc.fragment?.targets?.[0]?.format, format);

  // Shader placeholders must carry .code strings (we don't compile in Node)
  assert.equal(typeof desc.vertex?.module?.code, 'string');
  assert.equal(typeof desc.fragment?.module?.code, 'string');
});
