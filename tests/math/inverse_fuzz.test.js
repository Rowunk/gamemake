import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mat4 } from '../../src/core/math/mat4.js';
import { Vec3 } from '../../src/core/math/vec3.js';
import { makeRng } from '../random.js';

const rng = makeRng(0xBADA55);
const R = (min, max) => rng()*(max-min)+min;

function mul(A,B){ return new Mat4(A.m).multiply(B); }

test('Mat4 inverse round-trip across random S·R·T (100 cases)', () => {
  for (let i=0;i<100;i++){
    const S = Mat4.scale(R(0.5,2.0), R(0.5,2.0), R(0.5,2.0));      // avoid zero scale
    const RY = Mat4.rotationY(R(-Math.PI, Math.PI));
    const T = Mat4.translation(R(-10,10), R(-10,10), R(-10,10));
    const M = mul(mul(T,RY),S);
    const Minv = M.inverse();

    // Action equivalence on a few test vectors
    const vs = [new Vec3(R(-5,5),R(-5,5),R(-5,5)), new Vec3(1,2,3), new Vec3(-4,0.5,7)];
    for (const v of vs) {
      const rt = Minv.transformVec3(M.transformVec3(v));
      const dx = Math.hypot(rt.x-v.x, rt.y-v.y, rt.z-v.z);
      assert.ok(dx <= 1e-5);
    }
  }
});
