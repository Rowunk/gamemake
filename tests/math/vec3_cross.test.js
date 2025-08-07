import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vec3 } from '../../src/core/math/vec3.js';

const dot = (a,b) => a.x*b.x + a.y*b.y + a.z*b.z;

test('Vec3.cross produces a vector perpendicular to both inputs', () => {
  const a = new Vec3(1,2,3);
  const b = new Vec3(-2,0,5);
  const c = a.clone().cross(b);

  // c ⟂ a and c ⟂ b
  const eps = 1e-6;
  assert.ok(Math.abs(dot(c, a)) <= eps);
  assert.ok(Math.abs(dot(c, b)) <= eps);
});

test('Right-handed system: i×j = k; j×i = -k', () => {
  const i = new Vec3(1,0,0), j = new Vec3(0,1,0), k = new Vec3(0,0,1);
  const a = i.clone().cross(j);
  const b = j.clone().cross(i);
  const eq = (u,v)=>Math.abs(u.x-v.x)<1e-9&&Math.abs(u.y-v.y)<1e-9&&Math.abs(u.z-v.z)<1e-9;
  assert.ok(eq(a, k));
  assert.ok(eq(b, new Vec3(0,0,-1)));
});
