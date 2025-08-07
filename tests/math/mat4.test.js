import { test } from 'node:test';
import { Mat4 } from '../../src/core/math/mat4.js';
import { Vec3 } from '../../src/core/math/vec3.js';
import { eq, eqVec } from '../helpers.js';

test('Mat4::inverse * M === I', () => {
  const M = Mat4.translation(3, 4, 5)
            .multiply(Mat4.rotationY(Math.PI / 3))
            .multiply(Mat4.scale(2, 2, 2));
  const I = M.multiply(M.inverse());
  eq(I.isIdentity(), true);                 // dedicated helper
});

test('Mat4::lookAt', () => {
  const eye = new Vec3(0, 0, 5);
  const at  = new Vec3(0, 0, 0);
  const up  = new Vec3(0, 1, 0);
  const V   = Mat4.lookAt(eye, at, up);
  const v   = V.transformVec3(new Vec3(0,0,0)); // origin in view-space
  eqVec(v, new Vec3(0,0,-5));
});

