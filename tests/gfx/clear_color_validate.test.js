import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClearColor } from '../../src/gfx/clearcolor.js';

test('normalizeClearColor: [r,g,b] accepted; alpha defaults to 1', () => {
  const c = normalizeClearColor([0.25, 0.5, 0.75]);
  assert.deepStrictEqual(c, { r: 0.25, g: 0.5, b: 0.75, a: 1 });
});

test('normalizeClearColor: [r,g,b,a] accepted as-is', () => {
  const c = normalizeClearColor([0, 1, 0.5, 0.33]);
  assert.deepStrictEqual(c, { r: 0, g: 1, b: 0.5, a: 0.33 });
});

test('normalizeClearColor: rejects wrong lengths', () => {
  assert.throws(() => normalizeClearColor([]), /clear color must be an array of length 3 or 4/i);
  assert.throws(() => normalizeClearColor([1, 2]), /length 3 or 4/i);
  assert.throws(() => normalizeClearColor([1, 2, 3, 4, 5]), /length 3 or 4/i);
});

test('normalizeClearColor: rejects non-finite or out-of-range components', () => {
  assert.throws(() => normalizeClearColor([NaN, 0, 0]), /finite/i);
  assert.throws(() => normalizeClearColor([0, Infinity, 0]), /finite/i);
  assert.throws(() => normalizeClearColor([0, 0, -0.1]), /0..1/i);
  assert.throws(() => normalizeClearColor([0, 0, 0, 2]), /0..1/i);
});
