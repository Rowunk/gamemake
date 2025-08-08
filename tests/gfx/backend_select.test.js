import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectBackend } from '../../src/gfx/backend.js';

test('selectBackend: prefers WebGPU when available and features satisfied', () => {
  const env = {
    webgpu: { available: true, features: new Set(['texture-compression-bc']) },
    webgl2: { available: true }
  };
  const got = selectBackend(env, ['texture-compression-bc']);
  assert.equal(got, 'webgpu');   // should choose WebGPU
});

test('selectBackend: throws when neither WebGPU nor WebGL2 are available', () => {
  const env = { webgpu: { available: false }, webgl2: { available: false } };
  assert.throws(() => selectBackend(env), /no supported gpu backend/i);
});
