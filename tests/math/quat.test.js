import { test } from 'node:test';
import { Quat } from '../../src/core/math/quat.js';
import { Vec3 } from '../../src/core/math/vec3.js';
import { eq, eqVec } from '../helpers.js';

test('Quat::normalize length==1', () => {
  const q = new Quat(0.6, 0.2, 0.1, 0.7).normalize();
  eq(Math.abs(q.length() - 1), 0);
});

test('Quat::slerp endpoint accuracy', () => {
  const a = Quat.identity();
  const b = Quat.fromAxisAngle(new Vec3(0,0,1), Math.PI);
  eqVec(Quat.slerp(a, b, 0), a);
  eqVec(Quat.slerp(a, b, 1), b);
});

