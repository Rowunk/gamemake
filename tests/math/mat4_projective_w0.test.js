import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mat4 } from '../../src/core/math/mat4.js';
import { Vec3 } from '../../src/core/math/vec3.js';

test('Mat4.transformVec3: when w==0, do not divide', () => {
  // Construct matrix with last row [0,0,0,0] → w=0 for all inputs
  const M = new Mat4([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,0
  ]);
  const v = new Vec3(2, 4, 6);
  const out = M.transformVec3(v);
  // No division expected; acts like affine with w=0 (returns xyz unchanged)
  // (By our implementation, nx=x, ny=y, nz=z, nw=0 ⇒ returned unscaled)
  assert.equal(out.x, 2);
  assert.equal(out.y, 4);
  assert.equal(out.z, 6);
});
