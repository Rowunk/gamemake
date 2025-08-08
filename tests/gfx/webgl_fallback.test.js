import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectBackend } from '../../src/gfx/backend.js';

test('selectBackend: falls back to WebGL2 when WebGPU is unavailable', () => {
  const env = { webgpu: { available: false }, webgl2: { available: true } };
  assert.equal(selectBackend(env), 'webgl2');
});
