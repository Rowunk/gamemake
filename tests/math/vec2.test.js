import { test } from 'node:test';
import { Vec2 } from '../../src/core/math/vec2.js';
import { eq, eqVec } from '../helpers.js';

test('Vec2::mul/scale & ::equals', () => {
  const v = new Vec2(2, -3).mul(4);
  eqVec(v, new Vec2(8, -12));
  eq(v.equals(new Vec2(8.0000001, -12.0000001)), true);
});

test('Vec2::angleTo', () => {
  const a = new Vec2(1, 0);
  const b = new Vec2(0, 1);
  eq(a.angleTo(b), Math.PI / 2);
});

