// src/core/math/quat.js
'use strict';

import { Vec3 } from './vec3.js';

export class Quat {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
  static identity() { return new Quat(0, 0, 0, 1); }

  static fromAxisAngle(axis, angle) {
    const a = axis.clone().normalize();
    const s = Math.sin(angle * 0.5), c = Math.cos(angle * 0.5);
    return new Quat(a.x * s, a.y * s, a.z * s, c);
  }

  clone() { return new Quat(this.x, this.y, this.z, this.w); }

  length() { return Math.hypot(this.x, this.y, this.z, this.w); }
  normalize() {
    const l = this.length(); if (l > 0) { this.x /= l; this.y /= l; this.z /= l; this.w /= l; }
    return this;
  }

  multiply(b) {
    const ax = this.x, ay = this.y, az = this.z, aw = this.w;
    const bx = b.x, by = b.y, bz = b.z, bw = b.w;
    this.x = aw * bx + ax * bw + ay * bz - az * by;
    this.y = aw * by - ax * bz + ay * bw + az * bx;
    this.z = aw * bz + ax * by - ay * bx + az * bw;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  }

  // Rotate Vec3 without building matrices: v' = v + 2w*(q×v) + 2*(q×(q×v))
  rotateVec3(v) {
    const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
    // t = 2 * (q × v)
    const tx = 2 * (qy * v.z - qz * v.y);
    const ty = 2 * (qz * v.x - qx * v.z);
    const tz = 2 * (qx * v.y - qy * v.x);
    // v' = v + w*t + q × t
    return new Vec3(
      v.x + qw * tx + (qy * tz - qz * ty),
      v.y + qw * ty + (qz * tx - qx * tz),
      v.z + qw * tz + (qx * ty - qy * tx),
    );
  }

  static slerp(a, b, t) {
    // Ensure shortest path
    let bx = b.x, by = b.y, bz = b.z, bw = b.w;
    let cos = a.x * bx + a.y * by + a.z * bz + a.w * bw;
    if (cos < 0) { cos = -cos; bx = -bx; by = -by; bz = -bz; bw = -bw; }

    if (cos > 0.9995) { // linear fallback
      return new Quat(
        a.x + t * (bx - a.x),
        a.y + t * (by - a.y),
        a.z + t * (bz - a.z),
        a.w + t * (bw - a.w)
      ).normalize();
    }

    const theta = Math.acos(cos);
    const s = Math.sin(theta);
    const w1 = Math.sin((1 - t) * theta) / s;
    const w2 = Math.sin(t * theta) / s;
    return new Quat(
      a.x * w1 + bx * w2,
      a.y * w1 + by * w2,
      a.z * w1 + bz * w2,
      a.w * w1 + bw * w2
    );
  }
}
