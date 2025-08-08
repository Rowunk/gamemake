import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeMVPBindGroupDescriptor } from '../../src/gfx/pipeline_color3d.js';

test('makeMVPBindGroupDescriptor: binds uniform mat4x4<f32> (64 bytes) at binding(0)', () => {
  const buf = { __id: 'ubo' };
  const d = makeMVPBindGroupDescriptor(buf);
  assert.equal(d.entries?.[0]?.binding, 0);
  const res = d.entries?.[0]?.resource;
  assert.equal(res.buffer, buf);
  assert.equal(res.offset, 0);
  assert.equal(res.size, 64);
});
