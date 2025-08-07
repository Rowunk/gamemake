import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Quat } from '../../src/core/math/quat.js';
import { Vec3 } from '../../src/core/math/vec3.js';

test('q1*q2 ≠ q2*q1 (non-commutative rotations)', () => {
  const qx = Quat.fromAxisAngle(new Vec3(1,0,0), Math.PI/2);
  const qy = Quat.fromAxisAngle(new Vec3(0,1,0), Math.PI/2);

  const v = new Vec3(1,1,1);

  const v12 = qx.clone().multiply(qy).rotateVec3(v);
  const v21 = qy.clone().multiply(qx).rotateVec3(v);

  // They should differ by more than numerical noise
  const dx = Math.hypot(v12.x - v21.x, v12.y - v21.y, v12.z - v21.z);
  assert.ok(dx > 1e-3);
});
