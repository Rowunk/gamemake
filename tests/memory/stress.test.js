import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SlabAllocator } from '../../src/core/memory/allocator.js';

function rng(seed = 0xC0FFEE) {
  let x = seed >>> 0;
  return () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5), (x >>> 0) / 0xFFFFFFFF);
}

test('SlabAllocator: invariants under random alloc/free', () => {
  const slab = new SlabAllocator(4096, Uint32Array); // 4 KiB buffer, 4-byte elements
  const R = rng();
  const live = []; // keep only views actually allocated (no double free)

  const iters = 500;
  for (let i = 0; i < iters; ++i) {
    const op = R() < 0.6 ? 'alloc' : 'free'; // more allocs than frees to churn
    if (op === 'alloc') {
      const count = 1 + Math.floor(R() * 64); // 1..64 uint32s
      try {
        const v = slab.alloc(count);
        // alignment invariant
        assert.equal(v.byteOffset % (Uint32Array.BYTES_PER_ELEMENT), 0);
        live.push(v);
      } catch (e) {
        // Out of memory is acceptable; immediately free one random block to make progress
        if (/Out of memory/i.test(String(e))) {
          if (live.length) {
            const idx = Math.floor(R() * live.length);
            slab.free(live.splice(idx,1)[0]);
          }
        } else {
          throw e;
        }
      }
    } else if (live.length) {
      const idx = Math.floor(R() * live.length);
      slab.free(live.splice(idx,1)[0]);
    }

    // Global invariant: used + free == total
    const used = slab.usedBytes();
    const free = slab.freeBytes();
    assert.equal(used + free, 4096);
  }

  // Drain everything; final state must be fully free
  for (const v of live) slab.free(v);
  assert.equal(slab.usedBytes(), 0);
  assert.equal(slab.freeBytes(), 4096);
});
