import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onDeviceLost } from '../../src/gfx/webgpu_runtime.js';

test('onDeviceLost wires handler to device.lost promise', async () => {
  let resolveLost;
  const lostPromise = new Promise(resolve => { resolveLost = resolve; });
  const device = { lost: lostPromise };

  const calls = [];
  const dispose = onDeviceLost(device, info => calls.push(info));

  // Simulate device loss
  resolveLost({ reason: 'destroyed', message: 'bye' });
  await new Promise(r => setTimeout(r, 0));

  assert.equal(typeof dispose, 'function');
  assert.deepEqual(calls[0], { reason: 'destroyed', message: 'bye' });
});
