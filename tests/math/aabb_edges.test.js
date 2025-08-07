import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AABB } from '../../src/core/math/aabb.js';
import { Vec3 } from '../../src/core/math/vec3.js';

test('AABB: touching faces count as intersection', () => {
  const a = new AABB(new Vec3(0,0,0), new Vec3(1,1,1));
  const b = new AABB(new Vec3(1,0,0), new Vec3(2,1,1)); // touches at x=1 plane
  assert.ok(a.intersects(b));
});

test('AABB.containsPoint: boundary is inclusive', () => {
  const a = new AABB(new Vec3(-1,-1,-1), new Vec3(1,1,1));
  assert.ok(a.containsPoint(new Vec3(1,0,0)));
  assert.ok(a.containsPoint(new Vec3(-1,0,0)));
  assert.ok(!a.containsPoint(new Vec3(1+1e-9,0,0)));
});
