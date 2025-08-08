import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perspective, orthographic } from '../../src/gfx/camera.js';

test('perspective: parameter guards and basic shape', () => {
  assert.throws(() => perspective(NaN, 1, 0.1, 100), /non-finite/);
  assert.throws(() => perspective(Math.PI/4, 0, 0.1, 100), /bad params/);
  assert.throws(() => perspective(Math.PI/4, 1, -1, 100), /bad params/);
  assert.throws(() => perspective(Math.PI/4, 1, 1, 0.5), /bad params/);

  const P = perspective(Math.PI/2, 1, 0.1, 100);
  // Finite diagonal, m[15] == 0 (projective)
  assert.ok(Number.isFinite(P.m[0]));
  assert.ok(Number.isFinite(P.m[5]));
  assert.ok(Number.isFinite(P.m[10]));
  assert.equal(P.m[15], 0);
});

test('orthographic: guards and expected layout', () => {
  assert.throws(() => orthographic(0,0,0,1,0.1,100), /degenerate/);
  const O = orthographic(-1, 1, -1, 1, 0.1, 100);
  // Diagonal scales (≈1), translation terms live in last column (m[12..14])
  assert.ok(Math.abs(O.m[0] - 1) < 1e-6);
  assert.ok(Math.abs(O.m[5] - 1) < 1e-6);
  assert.ok(Number.isFinite(O.m[10]));
  assert.equal(O.m[15], 1);
});
