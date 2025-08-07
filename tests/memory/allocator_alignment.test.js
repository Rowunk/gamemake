import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlabAllocator } from '../../src/core/memory/allocator.js';

test('SlabAllocator: constructor enforces alignment to element size', () => {
  assert.throws(() => new SlabAllocator(10, Uint32Array), /align/i);
  // A valid aligned size should not throw
  new SlabAllocator(16, Uint32Array);
});
