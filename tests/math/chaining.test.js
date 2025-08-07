// tests/math/chaining.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vec2 } from '../../src/core/math/vec2.js';
import { Vec3 } from '../../src/core/math/vec3.js';

test('Vec2 methods are chainable and mutate in place', () => {
  const v = new Vec2(1, 2);
  const r = v.add(new Vec2(3, -2)).mul(2).sub(new Vec2(2, 2));
  assert.strictEqual(r, v); // chain returns same instance
  assert.deepStrictEqual({ x: v.x, y: v.y }, { x: 6, y: -2 });
});

test('Vec3 methods are chainable and mutate in place', () => {
  const v = new Vec3(1, 2, 3);
  const r = v.add(new Vec3(0, 1, 0)).mul(3).sub(new Vec3(3, 3, 3));
  assert.strictEqual(r, v);
  assert.deepStrictEqual({ x: v.x, y: v.y, z: v.z }, { x: 0, y: 6, z: 6 });
});
