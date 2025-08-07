import { Vec2 } from '../../src/core/math/vec2.js';
import { Vec3 } from '../../src/core/math/vec3.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Vec3.normalize: rejects non-finite inputs (throws TypeError)', () => {
  const bads = [
    new Vec3(NaN, 0, 0),
    new Vec3(0, Infinity, 0),
    new Vec3(0, 0, -Infinity),
  ];
  for (const v of bads) {
    assert.throws(() => v.normalize(), TypeError);
  }
});

test('Vec2.angleTo: rejects non-finite inputs (throws TypeError)', () => {
  const a = new Vec2(1, 0);
  const bads = [
    new Vec2(NaN, 1),
    new Vec2(1, Infinity),
    new Vec2(-Infinity, 0),
  ];
  for (const b of bads) {
    assert.throws(() => a.angleTo(b), TypeError);
    assert.throws(() => b.angleTo(a), TypeError);
  }
});
