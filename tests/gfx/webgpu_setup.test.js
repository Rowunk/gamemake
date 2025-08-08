import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupWebGPU } from '../../src/gfx/webgpu_runtime.js';

test('setupWebGPU configures context with device and format', async () => {
  const configured = [];
  const context = { configure: (opts) => configured.push(opts) };
  const canvas = { getContext: (kind) => (kind === 'webgpu' ? context : null) };

  const device = {};
  const adapter = { requestDevice: async () => device };
  const env = {
    gpu: {
      requestAdapter: async () => adapter,
      getPreferredCanvasFormat: () => 'bgra8unorm',
    }
  };

  const out = await setupWebGPU(canvas, { alphaMode: 'opaque' }, env);

  assert.strictEqual(out.device, device);
  assert.strictEqual(out.context, context);
  assert.equal(out.format, 'bgra8unorm');

  assert.equal(configured.length, 1);
  assert.deepEqual(configured[0], { device, format: 'bgra8unorm', alphaMode: 'opaque' });
});
