import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resizeWebGL2 } from '../../src/gfx/resize.js';

test('resizeWebGL2: sets canvas size and calls gl.viewport to new dims', () => {
  const calls = [];
  const gl = {
    viewport: (x, y, w, h) => calls.push(['viewport', x, y, w, h]),
  };
  const canvas = { width: 64, height: 64 };

  // 1) change size
  let out = resizeWebGL2(canvas, gl, 300, 200);
  assert.equal(canvas.width, 300);
  assert.equal(canvas.height, 200);
  assert.deepEqual(calls.at(-1), ['viewport', 0, 0, 300, 200]);
  assert.deepEqual(out, { width: 300, height: 200 });

  // 2) same size again — still okay to set viewport each frame
  out = resizeWebGL2(canvas, gl, 300, 200);
  assert.deepEqual(calls.at(-1), ['viewport', 0, 0, 300, 200]);
  assert.deepEqual(out, { width: 300, height: 200 });
});
