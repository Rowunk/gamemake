import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlabAllocator } from '../../src/core/memory/allocator.js';

test('Allocator re-uses freed blocks to avoid fragmentation', () => {
  const slab = new SlabAllocator(256, Uint8Array);

  const a = slab.alloc(64);   // uses [0..63]
  const b = slab.alloc(64);   // uses [64..127]
  slab.free(a);               // free [0..63], free list: [0..63], [128..255]

  const c = slab.alloc(32);   // should reuse start of freed hole [0..31]
  assert.equal(c.byteOffset, 0, 'should reuse the lowest free block');

  // Correct invariants:
  assert.equal(slab.usedBytes(), 96,  '64 (b) + 32 (c)');
  assert.equal(slab.freeBytes(), 160, '256 total - 96 used');

  // Extra: prove coalescing works when freeing everything
  slab.free(b);               // free [64..127] → neighbors [32..63] and [64..127] can merge via next free
  slab.free(c);               // free [0..31] → full coalesce expected
  assert.equal(slab.freeBytes(), 256, 'all memory should be free again');

  // Allocate full slab to ensure a single coalesced block exists
  const all = slab.alloc(256);
  assert.equal(all.byteOffset, 0);
});
