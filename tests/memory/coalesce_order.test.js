import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlabAllocator } from '../../src/core/memory/allocator.js';

test('Coalescing works regardless of free order', () => {
  const slab = new SlabAllocator(256, Uint8Array);

  // Allocate 4 equal blocks (0..63, 64..127, 128..191, 192..255)
  const a = slab.alloc(64), b = slab.alloc(64), c = slab.alloc(64), d = slab.alloc(64);

  // Free out of order
  slab.free(c);
  slab.free(a);
  slab.free(d);
  slab.free(b);

  // Should fully coalesce back to one block; next full alloc should start at 0
  const all = slab.alloc(256);
  assert.equal(all.byteOffset, 0);
  assert.equal(slab.usedBytes(), 256);
  slab.free(all);
  assert.equal(slab.freeBytes(), 256);
});
