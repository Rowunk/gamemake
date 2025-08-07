import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mat4 } from '../../src/core/math/mat4.js';
import { Vec3 } from '../../src/core/math/vec3.js';

const almost = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('Mat4.lookAt: basis is orthonormal', () => {
  const eye = new Vec3(3, 4, 5);
  const at  = new Vec3(0, 0, 0);
  const up  = new Vec3(0, 1, 0);
  const V   = Mat4.lookAt(eye, at, up);
  const m = V.m;

  // Column-major: columns are basis vectors
  const x = new Vec3(m[0], m[1], m[2]);
  const y = new Vec3(m[4], m[5], m[6]);
  const z = new Vec3(m[8], m[9], m[10]);

  const lx = Math.hypot(x.x, x.y, x.z);
  const ly = Math.hypot(y.x, y.y, y.z);
  const lz = Math.hypot(z.x, z.y, z.z);

  assert.ok(almost(lx, 1) && almost(ly, 1) && almost(lz, 1));
  const dot = (a, b) => a.x*b.x + a.y*b.y + a.z*b.z;
  assert.ok(almost(dot(x,y), 0) && almost(dot(x,z), 0) && almost(dot(y,z), 0));
});

test('Mat4.inverse: singular matrix throws (scale(0,1,1))', () => {
  const S = Mat4.scale(0, 1, 1);
  assert.throws(() => S.inverse(), /not invertible/i);
});
