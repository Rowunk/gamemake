import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resizeWebGPU } from '../../src/gfx/resize.js';

test('resizeWebGPU: updates canvas size and reconfigures context on change', () => {
  const calls = [];
  const context = { configure: (opts) => calls.push(opts) };
  const canvas = { width: 100, height: 100, getContext: () => context };
  const device = {};
  const format = 'bgra8unorm';
  const opts = { alphaMode: 'opaque' };

  // 1) change from 100x100 → 200x150
  let out = resizeWebGPU(canvas, context, device, format, opts, 200, 150);
  assert.equal(canvas.width, 200);
  assert.equal(canvas.height, 150);
  assert.equal(out.reconfigured, true);
  assert.deepEqual(calls.at(-1), { device, format, alphaMode: 'opaque' });

  // 2) same size again → no reconfigure
  const before = calls.length;
  out = resizeWebGPU(canvas, context, device, format, opts, 200, 150);
  assert.equal(out.reconfigured, false);
  assert.equal(calls.length, before);
});
