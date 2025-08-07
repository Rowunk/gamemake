import { test } from 'node:test';
import { Vec3 } from '../../src/core/math/vec3.js';
import { Mat4 } from '../../src/core/math/mat4.js';
import { Quat } from '../../src/core/math/quat.js';
import { makeRng } from '../random.js';
import { eq, eqVec } from '../helpers.js';

const rng = makeRng(0xDEADBEEF);

function rand(min = -10, max = 10) {
  return rng() * (max - min) + min;
}

test('Vec3 normalize idempotence (1 000 cases)', () => {
  for (let i = 0; i < 1_000; ++i) {
    const v = new Vec3(rand(), rand(), rand());
    const n = v.normalize();
    eq(Math.abs(n.length() - 1), 0);
    eqVec(n.normalize(), n); // idempotent
  }
});

test('Quat*Vec == Mat4*Vec equivalence', () => {
  for (let i = 0; i < 1_000; ++i) {
    const axis = new Vec3(rand(), rand(), rand()).normalize();
    const angle = rand(0, 2*Math.PI);
    const q = Quat.fromAxisAngle(axis, angle);
    const m = Mat4.fromQuat(q);

    const v = new Vec3(rand(), rand(), rand());
    eqVec(q.rotateVec3(v), m.transformVec3(v), 1e-5);
  }
});

