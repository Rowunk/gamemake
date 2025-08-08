import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTextureBindGroupDescriptor } from '../../src/gfx/texture_bindgroup.js';

test('makeTextureBindGroupDescriptor: entries for UBO(0,64B), sampler(1), textureView(2)', () => {
  const ubo = { __buf: true };
  const sampler = { __samp: true };
  const view = { __view: true };
  const d = makeTextureBindGroupDescriptor(ubo, sampler, view);

  // UBO
  const e0 = d.entries.find(e => e.binding === 0);
  assert.equal(e0.resource.buffer, ubo);
  assert.equal(e0.resource.size, 64);

  // Sampler
  const e1 = d.entries.find(e => e.binding === 1);
  assert.equal(e1.resource, sampler);

  // Texture
  const e2 = d.entries.find(e => e.binding === 2);
  assert.equal(e2.resource, view);
});
