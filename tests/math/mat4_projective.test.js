import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mat4 } from '../../src/core/math/mat4.js';
import { Vec3 } from '../../src/core/math/vec3.js';

test('Mat4.transformVec3: divides by w when w≠1', () => {
  // Build a matrix that behaves like identity but sets w=2
  const M = new Mat4([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,2  // m[15] = 2
  ]);
  const v = new Vec3(1, 2, 3);
  const out = M.transformVec3(v);
  // Expect coordinates halved by w=2
  assert.equal(out.x, 0.5);
  assert.equal(out.y, 1);
  assert.equal(out.z, 1.5);
});
