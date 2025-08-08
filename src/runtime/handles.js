// src/runtime/handles.js
'use strict';

/**
 * HandlePool
 * - O(1) create/get/destroy using an index+generation handle.
 * - Encodes handle as a 32-bit unsigned int: [gen | index].
 * - Stale handles are rejected once a slot is recycled (generation increments on destroy).
 *
 * Options:
 *   { capacity?: number }  // max concurrent live handles (default 1024)
 *
 * Error policy:
 *   - get/destroy on invalid/stale/foreign handle -> Error('invalid or stale handle')
 *   - create when pool exhausted -> Error('Out of handles')
 */
export class HandlePool {
  /**
   * @param {{capacity?: number}} opts
   */
  constructor(opts = {}) {
    const cap = Math.max(1, (opts.capacity | 0) || 1024);
    this._capacity = cap;

    // Bits for index; remaining (32 - indexBits) for generation
    this._indexBits = Math.ceil(Math.log2(cap)) || 1;        // at least 1 bit
    if (this._indexBits >= 32) throw new RangeError('HandlePool: capacity too large for 32-bit handles');
    this._genBits = 32 - this._indexBits;

    this._indexMask = (2 ** this._indexBits) - 1;            // e.g., if bits=10 -> 0x3FF
    this._genMask = (2 ** this._genBits) - 1;

    // Storage
    this._values = new Array(cap);                            // user payloads by slot
    this._gen = new Uint32Array(cap);                         // generation counters
    this._free = new Uint32Array(cap);                        // freelist as LIFO stack
    for (let i = 0; i < cap; i++) this._free[i] = cap - 1 - i; // start with [cap-1 .. 0]
    this._top = cap;                                          // stack size
    this._live = 0;
  }

  /** @returns {number} number of live handles */
  liveCount() { return this._live; }

  /** @returns {number} capacity */
  capacity() { return this._capacity; }

  /**
   * Create a handle for a value.
   * @param {any} value
   * @returns {number} opaque 32-bit unsigned handle
   */
  create(value) {
    if (this._top === 0) throw new Error('Out of handles');
    const idx = this._free[--this._top] >>> 0;
    const gen = this._gen[idx] & this._genMask;

    this._values[idx] = value;
    this._live++;

    // Pack handle: (gen << indexBits) | idx, kept as uint32
    const h = ((gen * (2 ** this._indexBits)) + idx) >>> 0;
    return h;
  }

  /**
   * Resolve a handle to its value.
   * @param {number} handle
   * @returns {any}
   */
  get(handle) {
    const idx = this._decodeIndex(handle);
    const gen = this._decodeGen(handle);

    if (this._gen[idx] !== gen) throw new Error('invalid or stale handle');
    const v = this._values[idx];
    if (v === undefined) throw new Error('invalid or stale handle');
    return v;
  }

  /**
   * Destroy a handle, freeing its slot and invalidating the handle.
   * @param {number} handle
   */
  destroy(handle) {
    const idx = this._decodeIndex(handle);
    const gen = this._decodeGen(handle);

    if (this._gen[idx] !== gen) throw new Error('invalid or stale handle');
    if (this._values[idx] === undefined) throw new Error('invalid or stale handle');

    // Invalidate: bump generation, clear value, push back to freelist
    this._values[idx] = undefined;
    this._gen[idx] = (this._gen[idx] + 1) & this._genMask;
    this._free[this._top++] = idx;
    this._live--;
  }

  // ---------- internals ----------

  _isFiniteUint32(n) {
    return Number.isFinite(n) && n >= 0 && n <= 0xFFFFFFFF && Number.isInteger(n);
  }

  _decodeIndex(handle) {
    if (!this._isFiniteUint32(handle)) throw new TypeError('invalid handle type');
    const h = handle >>> 0;
    const idx = h & this._indexMask;
    if (idx >= this._capacity) throw new RangeError('invalid handle index');
    return idx;
  }

  _decodeGen(handle) {
    const h = handle >>> 0;
    return (h >>> this._indexBits) & this._genMask;
  }
}
