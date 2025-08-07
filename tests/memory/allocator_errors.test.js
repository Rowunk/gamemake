import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlabAllocator } from '../../src/core/memory/allocator.js';

test('SlabAllocator.free: rejects double free on same view', () => {
  const slab = new SlabAllocator(64, Uint8Array);
  const v = slab.alloc(8);
  slab.free(v);
  assert.throws(() => slab.free(v), /double free/i);
});
