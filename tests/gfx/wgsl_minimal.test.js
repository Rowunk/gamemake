import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WGSL_CLEAR_VERT, WGSL_CLEAR_FRAG } from '../../src/gfx/shaders.js';

test('WGSL shaders expose main entry points', () => {
  assert.match(WGSL_CLEAR_VERT, /@vertex\s+fn\s+main/i);
  assert.match(WGSL_CLEAR_FRAG, /@fragment\s+fn\s+main/i);
});

test('WGSL vertex provides @location(0) float32x2 position', () => {
  assert.match(WGSL_CLEAR_VERT, /@location\(0\)\s*pos\s*:\s*vec2<f32>/i);
});
