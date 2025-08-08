import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyGLClear } from '../../src/gfx/clearcolor.js';

test('applyGLClear calls gl.clearColor with normalized RGBA then gl.clear', () => {
  const calls = [];
  const gl = {
    COLOR_BUFFER_BIT: 0x4000,
    clearColor: (r, g, b, a) => calls.push(['clearColor', r, g, b, a]),
    clear: (mask) => calls.push(['clear', mask]),
    viewport: () => {} // not used here
  };

  applyGLClear(gl, [0.25, 0.5, 0.75]); // alpha defaults to 1

  assert.deepStrictEqual(calls[0][0], 'clearColor');
  assert.deepStrictEqual(
    calls[0].slice(1).map(x => Number(x.toFixed(6))),
    [0.25, 0.5, 0.75, 1].map(x => Number(x.toFixed(6)))
  );
  assert.deepStrictEqual(calls[1], ['clear', gl.COLOR_BUFFER_BIT]);
});

test('applyGLClear rejects invalid colors (propagates validator)', () => {
  const gl = { COLOR_BUFFER_BIT: 0x4000, clearColor(){}, clear(){} };
  assert.throws(() => applyGLClear(gl, [1, 2]), /length 3 or 4/i);
});
