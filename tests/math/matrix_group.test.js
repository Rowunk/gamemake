import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mat4 } from '../../src/core/math/mat4.js';
import { Vec3 } from '../../src/core/math/vec3.js';

const eq = (a, b, eps = 1e-5) => Math.abs(a - b) <= eps;
const eqV = (a, b, eps = 1e-5) => eq(a.x, b.x, eps) && eq(a.y, b.y, eps) && eq(a.z, b.z, eps);

function mul(A, B) { return new Mat4(A.m).multiply(B); } // non-mutating helper

test('(A·B)·C ≈ A·(B·C) by action on vectors', () => {
  const A = Mat4.translation(1, 2, 3);
  const B = Mat4.rotationY(Math.PI / 4);
  const C = Mat4.scale(2, 3, 4);

  const left  = mul(mul(A, B), C);
  const right = mul(A, mul(B, C));

  // Compare action on a basis of test vectors to avoid floating drift
  const vs = [new Vec3(1,2,3), new Vec3(-4,5,-6), new Vec3(0.5,-0.25,2)];
  for (const v of vs) {
    const l = left.transformVec3(v);
    const r = right.transformVec3(v);
    assert.ok(eqV(l, r));
  }
});
