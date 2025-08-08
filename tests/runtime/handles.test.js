import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HandlePool } from '../../src/runtime/handles.js';

// Simple RNG for fuzz
function makeRng(seed = 0xC0FFEE) {
  let x = seed >>> 0;
  return () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5), (x >>> 0) / 0xFFFFFFFF);
}

test('HandlePool: create/get/destroy semantics + double-destroy guard', () => {
  const pool = new HandlePool({ capacity: 8 });

  const a = { name: 'A' };
  const h = pool.create(a);

  // get returns the exact object
  assert.equal(pool.get(h), a);

  // destroying invalidates handle
  pool.destroy(h);
  assert.throws(() => pool.get(h), /invalid|stale/i);

  // double-destroy rejected
  assert.throws(() => pool.destroy(h), /invalid|stale|destroy/i);
});

test('HandlePool: recycling increments generation; stale handles are rejected', () => {
  const pool = new HandlePool({ capacity: 2 });

  const h1 = pool.create({ v: 1 });
  pool.destroy(h1);

  // Recycle slot → new handle should NOT equal previous (gen bump)
  const h2 = pool.create({ v: 2 });
  assert.notEqual(h1, h2);

  // Old/stale handle is invalid
  assert.throws(() => pool.get(h1), /invalid|stale/i);
  // New handle works
  assert.equal(pool.get(h2).v, 2);
});

test('HandlePool: guards invalid/foreign handles', () => {
  const pool = new HandlePool({ capacity: 4 });
  assert.throws(() => pool.get(0xDEADBEEF), /invalid|range/i);
  assert.throws(() => pool.destroy(12345), /invalid|range/i);
  // Non-finite / wrong types
  // @ts-ignore
  assert.throws(() => pool.get(undefined), /invalid|type/i);
  // @ts-ignore
  assert.throws(() => pool.destroy(null), /invalid|type/i);
});

test('HandlePool: fuzz alloc/free invariants (liveCount matches, all live handles valid)', () => {
  const pool = new HandlePool({ capacity: 128 });
  const R = makeRng(0xBADA55);

  /** @type {number[]} */
  const live = [];
  const iters = 2000;

  for (let i = 0; i < iters; i++) {
    const op = (live.length === 0 || (live.length < 64 && R() < 0.6)) ? 'alloc' : 'free';

    if (op === 'alloc') {
      const h = pool.create({ i });
      live.push(h);
      assert.equal(pool.get(h).i, i);
    } else {
      const idx = Math.floor(R() * live.length);
      const h = live.splice(idx, 1)[0];
      pool.destroy(h);
      assert.throws(() => pool.get(h), /invalid|stale/i);
    }

    // Invariant: liveCount reported by pool matches our list length
    assert.equal(pool.liveCount(), live.length);

    // Spot-check: all live handles resolve
    if (live.length) {
      const j = Math.floor(R() * live.length);
      const hj = live[j];
      const v = pool.get(hj);
      assert.ok(v && Number.isFinite(v.i));
    }
  }
});
