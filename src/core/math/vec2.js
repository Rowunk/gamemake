// src/core/math/vec2.js
'use strict';

export class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  clone() { return new Vec2(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }

  add(b) { this.x += b.x; this.y += b.y; return this; }
  sub(b) { this.x -= b.x; this.y -= b.y; return this; }
  mul(s) { this.x *= s; this.y *= s; return this; }

  dot(b) { return this.x * b.x + this.y * b.y; }
  length() { return Math.hypot(this.x, this.y); }
  normalize() {
    const l = this.length(); if (l > 0) { this.x /= l; this.y /= l; }
    return this;
  }

  // Rotate 90° counterclockwise: (x,y) -> (-y,x)
  perp() { const { x, y } = this; this.x = -y; this.y = x; return this; }

  equals(b, eps = 1e-6) {
    return Math.abs(this.x - b.x) <= eps && Math.abs(this.y - b.y) <= eps;
  }

  angleTo(b) {
    // STRICT POLICY: reject non-finite inputs
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y) ||
        !Number.isFinite(b.x)    || !Number.isFinite(b.y)) {
      throw new TypeError('Vec2.angleTo: non-finite input');
    }
    const den = this.length() * b.length();
    if (den === 0) return 0;
    const c = Math.min(1, Math.max(-1, this.dot(b) / den));
    return Math.acos(c);
  }
}
