import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withValidation } from '../../src/gfx/webgpu_runtime.js';

test('withValidation: pushes "validation", calls fn, pops, returns ok=true', async () => {
  const calls = [];
  const device = {
    pushErrorScope: (t) => { calls.push(['push', t]); },
    popErrorScope: async () => { calls.push(['pop']); return null; } // no GPUError
  };
  let ran = false;
  const res = await withValidation(device, () => { ran = true; });
  assert.equal(ran, true);
  assert.deepEqual(calls, [['push', 'validation'], ['pop']]);
  assert.deepEqual(res, { ok: true, message: null });
});

test('withValidation: reports GPU validation error message', async () => {
  const calls = [];
  const device = {
    pushErrorScope: (t) => { calls.push(['push', t]); },
    popErrorScope: async () => { calls.push(['pop']); return { message: 'oops' }; } // GPUError-like
  };
  const res = await withValidation(device, () => {});
  assert.deepEqual(calls, [['push', 'validation'], ['pop']]);
  assert.deepEqual(res, { ok: false, message: 'oops' });
});

test('withValidation: function throws → ok=false, message carries error', async () => {
  const calls = [];
  const device = {
    pushErrorScope: (t) => { calls.push(['push', t]); },
    popErrorScope: async () => { calls.push(['pop']); return null; }
  };
  const res = await withValidation(device, () => { throw new Error('boom'); });
  assert.deepEqual(calls, [['push', 'validation'], ['pop']]);
  assert.equal(res.ok, false);
  assert.match(res.message, /boom/);
});
