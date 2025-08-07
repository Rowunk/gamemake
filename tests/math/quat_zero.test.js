import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Quat } from '../../src/core/math/quat.js';

test('Quat.normalize on zero quaternion stays zero (no NaN)', () => {
  const q = new Quat(0,0,0,0).normalize();
  assert.equal(q.x, 0); assert.equal(q.y, 0); assert.equal(q.z, 0); assert.equal(q.w, 0);
});
