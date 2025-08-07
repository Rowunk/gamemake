// src/core/memory/allocator.js
'use strict';

/**
 * Simple slab allocator for a single TypedArray type.
 * Keeps a free list of {offset,size} in BYTES. Coalesces on free.
 * STRICT MODE: prevents double-free of the same view object.
 */
export class SlabAllocator {
  constructor(totalBytes, ArrayType = Uint8Array) {
    if (totalBytes % ArrayType.BYTES_PER_ELEMENT !== 0) {
      throw new Error('totalBytes must align to element size');
    }
    this.buffer = new ArrayBuffer(totalBytes);
    this.ArrayType = ArrayType;
    this.BPE = ArrayType.BYTES_PER_ELEMENT;
    this._free = [{ offset: 0, size: totalBytes }]; // sorted by offset
    this._used = 0;

    // Track only views we returned; used to detect double free.
    this._liveViews = new WeakSet();
  }

  alloc(count) {
    if (count <= 0) throw new Error('alloc count must be > 0');
    const need = count * this.BPE;

    for (let i = 0; i < this._free.length; ++i) {
      const blk = this._free[i];
      if (blk.size >= need) {
        const offset = blk.offset;
        blk.offset += need;
        blk.size -= need;
        if (blk.size === 0) this._free.splice(i, 1);
        this._used += need;
        const view = new this.ArrayType(this.buffer, offset, count);
        this._liveViews.add(view);
        return view;
      }
    }
    throw new Error('Out of memory');
  }

  free(view) {
    if (!(view && view.buffer === this.buffer)) {
      throw new Error('foreign buffer');
    }
    // STRICT: only views allocated by us may be freed once
    if (!this._liveViews.has(view)) {
      throw new Error('double free');
    }
    this._liveViews.delete(view);

    const size = view.byteLength;
    const offset = view.byteOffset;
    this._used -= size;

    // insert back sorted by offset
    let i = 0;
    while (i < this._free.length && this._free[i].offset < offset) i++;
    this._free.splice(i, 0, { offset, size });

    // coalesce neighbors
    const f = this._free;
    for (let j = Math.max(0, i - 1); j < f.length - 1; ++j) {
      const a = f[j], b = f[j + 1];
      if (a.offset + a.size === b.offset) {
        a.size += b.size; f.splice(j + 1, 1); j--;
      }
    }
  }

  usedBytes() { return this._used; }
  freeBytes() { return this._free.reduce((s, b) => s + b.size, 0); }
}
