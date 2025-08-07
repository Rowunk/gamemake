// src/core/math/mat4.js
'use strict';

import { Vec3 } from './vec3.js';
import { Quat } from './quat.js';

// Column-major 4x4 (WebGPU/WebGL style). Multiplication is this * other.
export class Mat4 {
  constructor(m) {
    this.m = m ? Float32Array.from(m) : Mat4.identity().m;
  }

  static identity() {
    return new Mat4([
      1,0,0,0,
      0,1,0,0,
      0,0,1,0,
      0,0,0,1
    ]);
  }

  static translation(x, y, z) {
    const out = Mat4.identity();
    out.m[12] = x; out.m[13] = y; out.m[14] = z;
    return out;
  }

  static scale(x, y, z) {
    return new Mat4([
      x,0,0,0,
      0,y,0,0,
      0,0,z,0,
      0,0,0,1
    ]);
  }

  static rotationY(rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    return new Mat4([
       c,0, s,0,
       0,1, 0,0,
      -s,0, c,0,
       0,0, 0,1
    ]);
  }

  // this = this * b
  multiply(b) {
    const a = this.m, c = new Float32Array(16), d = b.m;
    for (let r = 0; r < 4; ++r) {
      for (let k = 0; k < 4; ++k) {
        c[4*k + r] =
          a[r]     * d[4*k + 0] +
          a[4 + r] * d[4*k + 1] +
          a[8 + r] * d[4*k + 2] +
          a[12 + r]* d[4*k + 3];
      }
    }
    this.m = c; return this;
  }

  // Transform 3D point (implicitly w=1). Returns Vec3.
  transformVec3(v) {
    const m = this.m, x = v.x, y = v.y, z = v.z;
    const nx = m[0]*x + m[4]*y + m[8]*z + m[12];
    const ny = m[1]*x + m[5]*y + m[9]*z + m[13];
    const nz = m[2]*x + m[6]*y + m[10]*z + m[14];
    const nw = m[3]*x + m[7]*y + m[11]*z + m[15];
    if (nw && Math.abs(nw - 1) > 1e-8) return new Vec3(nx / nw, ny / nw, nz / nw);
    return new Vec3(nx, ny, nz);
  }

  isIdentity(eps = 1e-6) {
    const I = Mat4.identity().m, a = this.m;
    for (let i = 0; i < 16; ++i) if (Math.abs(a[i] - I[i]) > eps) return false;
    return true;
  }

  inverse() {
    // Gauss-Jordan (optimized): returns new Mat4 that is inv(this)
    const m = this.m;
    const a = Float32Array.from(m);
    const inv = Mat4.identity().m;

    // Perform elimination on columns
    for (let i = 0; i < 4; ++i) {
      // Find pivot
      let pivot = i, max = Math.abs(a[4*i + i]);
      for (let r = i + 1; r < 4; ++r) {
        const v = Math.abs(a[4*i + r]); if (v > max) { max = v; pivot = r; }
      }
      if (max === 0) throw new Error('Mat4 not invertible');

      // Swap rows i <-> pivot in both a and inv
      if (pivot !== i) {
        for (let c = 0; c < 4; ++c) {
          const ia = 4*c + i, pa = 4*c + pivot;
          [a[ia], a[pa]] = [a[pa], a[ia]];
          const ii = 4*c + i, pi = 4*c + pivot;
          [inv[ii], inv[pi]] = [inv[pi], inv[ii]];
        }
      }
      // Normalize row i
      const diag = a[4*i + i];
      for (let c = 0; c < 4; ++c) {
        a[4*c + i] /= diag;
        inv[4*c + i] /= diag;
      }
      // Eliminate other rows
      for (let r = 0; r < 4; ++r) if (r !== i) {
        const f = a[4*i + r];
        for (let c = 0; c < 4; ++c) {
          a[4*c + r] -= f * a[4*c + i];
          inv[4*c + r] -= f * inv[4*c + i];
        }
      }
    }
    return new Mat4(inv);
  }

  static lookAt(eye, target, up) {
    // Right-handed view matrix
    const z = eye.clone().sub(target).normalize(); // forward
    const x = up.clone().cross(z).normalize();     // right
    const y = z.clone().cross(x);                  // up'

    const m = new Mat4([
      x.x, y.x, z.x, 0,
      x.y, y.y, z.y, 0,
      x.z, y.z, z.z, 0,
      0,   0,   0,   1
    ]);
    // Translate
    m.m[12] = - (x.x * eye.x + x.y * eye.y + x.z * eye.z);
    m.m[13] = - (y.x * eye.x + y.y * eye.y + y.z * eye.z);
    m.m[14] = - (z.x * eye.x + z.y * eye.y + z.z * eye.z);
    return m;
  }

  static fromQuat(q) {
    const x = q.x, y = q.y, z = q.z, w = q.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    return new Mat4([
      1 - (yy + zz), xy + wz,       xz - wy,       0,
      xy - wz,       1 - (xx + zz), yz + wx,       0,
      xz + wy,       yz - wx,       1 - (xx + yy), 0,
      0,             0,             0,             1
    ]);
  }
}

// friendly getters used in a couple tests
Object.defineProperties(Mat4.prototype, {
  m00: { get() { return this.m[0]; } },
  m01: { get() { return this.m[4]; } }
});
