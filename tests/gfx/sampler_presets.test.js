import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSamplerPreset } from '../../src/gfx/sampler.js';

test('createSamplerPreset: linearClamp', () => {
  const s = createSamplerPreset('linearClamp');
  assert.equal(s.minFilter, 'linear');
  assert.equal(s.magFilter, 'linear');
  assert.equal(s.addressModeU, 'clamp-to-edge');
});

test('createSamplerPreset: mipmapLinear', () => {
  const s = createSamplerPreset('mipmapLinear');
  assert.equal(s.mipmapFilter, 'linear');
  assert.equal(s.lodMinClamp, 0);
  assert.equal(s.lodMaxClamp, 32);
});

test('createSamplerPreset: nearestRepeat', () => {
  const s = createSamplerPreset('nearestRepeat');
  assert.equal(s.minFilter, 'nearest');
  assert.equal(s.magFilter, 'nearest');
  assert.equal(s.addressModeU, 'repeat');
  assert.equal(s.addressModeV, 'repeat');
  assert.equal(s.addressModeW, 'repeat');
});

test('createSamplerPreset: rejects unknown', () => {
  assert.throws(() => createSamplerPreset('nope'), /unknown/i);
});
