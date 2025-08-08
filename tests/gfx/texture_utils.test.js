import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMipCount, computeBytesPerRow } from '../../src/gfx/texture.js';

test('computeMipCount: >=1 levels, log2(maxDim)+1', () => {
  assert.equal(computeMipCount(1, 1), 1);
  assert.equal(computeMipCount(320, 200), 9);   // floor(log2(320)) + 1 = 8 + 1
  assert.equal(computeMipCount(1024, 512), 11); // 10 + 1
});

test('computeBytesPerRow: 256-byte aligned', () => {
  // 256-aligned when width*bpp already multiple
  assert.equal(computeBytesPerRow(256, 4), 1024);
  // Non-aligned rounds up to next 256 multiple
  assert.equal(computeBytesPerRow(257, 4), 1280);
});
