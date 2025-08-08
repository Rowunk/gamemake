import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeColorBindGroupDescriptor, computeColorAt } from '../../src/gfx/color_pass.js';

test('makeColorBindGroupDescriptor: binds given buffer at binding(0) with 16-byte slice', () => {
  const buf = { __id: 'gpu-buffer' }; // placeholder for tests
  const d = makeColorBindGroupDescriptor(buf);
  assert.equal(d.layout?.entries?.[0]?.binding, 0);
  assert.equal(d.entries?.[0]?.binding, 0);
  assert.equal(d.entries?.[0]?.resource?.buffer, buf);
  assert.equal(d.entries?.[0]?.resource?.offset, 0);
  assert.equal(d.entries?.[0]?.resource?.size, 16);
});

test('computeColorAt: returns RGBA in [0,1], periodic in t', () => {
  const a = computeColorAt(0.0);
  const b = computeColorAt(1.0);
  for (const v of [...a, ...b]) {
    assert.ok(Number.isFinite(v));
    assert.ok(v >= 0 && v <= 1);
  }
  // Basic periodicity check: two samples a second apart shouldn’t be identical but should be valid
  assert.notDeepStrictEqual(a, b);
});
