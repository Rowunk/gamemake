// src/core/math/vec3.js
'use strict';

export class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  clone() { return new Vec3(this.x, this.y, this.z); }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }

  add(b) { this.x += b.x; this.y += b.y; this.z += b.z; return this; }
  sub(b) { this.x -= b.x; this.y -= b.y; this.z -= b.z; return this; }
  mul(s) { this.x *= s; this.y *= s; this.z *= s; return this; }

  dot(b) { return this.x * b.x + this.y * b.y + this.z * b.z; }

  cross(b) {
    const { x, y, z } = this;
    this.x = y * b.z - z * b.y;
    this.y = z * b.x - x * b.z;
    this.z = x * b.y - y * b.x;
    return this;
  }

  length() { return Math.hypot(this.x, this.y, this.z); }

  normalize() {
    // STRICT POLICY: reject non-finite inputs to avoid NaN propagation
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y) || !Number.isFinite(this.z)) {
      throw new TypeError('Vec3.normalize: non-finite input');
    }
    const l = this.length();
    if (l > 0) { this.x /= l; this.y /= l; this.z /= l; }
    // zero vector stays zero without throwing
    return this;
  }
}
