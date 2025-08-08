// src/gfx/camera.js
'use strict';

import { Vec3 } from '../core/math/vec3.js';
import { Mat4 } from '../core/math/mat4.js';

/**
 * Column-major perspective matrix (RH, NDZ = [-1,1] view space, projective divide in Mat4).
 * Guards parameters strictly; radians expected.
 */
export function perspective(fovY, aspect, near, far) {
  if (![fovY, aspect, near, far].every(Number.isFinite))
    throw new TypeError('perspective: non-finite');
  if (fovY <= 0 || aspect <= 0 || near <= 0 || far <= near)
    throw new RangeError('perspective: bad params');

  const f = 1 / Math.tan(fovY * 0.5);
  // Column-major layout
  return new Mat4([
    f / aspect, 0, 0, 0,
    0,          f, 0, 0,
    0,          0, (far + near) / (near - far), -1,
    0,          0, (2 * far * near) / (near - far), 0
  ]);
}

/**
 * Column-major orthographic matrix (RH).
 */
export function orthographic(left, right, bottom, top, near, far) {
  for (const v of [left, right, bottom, top, near, far])
    if (!Number.isFinite(v)) throw new TypeError('orthographic: non-finite');
  if (right === left || top === bottom || far === near)
    throw new RangeError('orthographic: degenerate');

  const sx = 2 / (right - left);
  const sy = 2 / (top - bottom);
  const sz = 2 / (near - far); // RH depth (note sign)
  const tx = - (right + left) / (right - left);
  const ty = - (top + bottom) / (top - bottom);
  const tz =   (far + near) / (near - far);

  return new Mat4([
    sx, 0,  0, 0,
    0,  sy, 0, 0,
    0,  0,  sz, 0,
    tx, ty, tz, 1
  ]);
}

/**
 * Minimal orbit controller (math-only; no DOM). Maintains yaw/pitch/distance around a target.
 * - yaw/pitch in radians; clamp pitch; clamp distance; wrap yaw to [-PI, PI] for stability.
 * - getEye(): world-space camera position.
 * - getViewMatrix(): Mat4.lookAt(eye, target, up=[0,1,0]).
 */
export function makeOrbitController({
  target = new Vec3(0, 0, 0),
  yaw = 0,
  pitch = 0,
  distance = 5,
  minPitch = -1.40,     // ~ -80°
  maxPitch =  1.40,     // ~  80°
  minDistance = 0.1,
  maxDistance = 100
} = {}) {
  if (!(target instanceof Vec3)) throw new TypeError('makeOrbitController: target must be Vec3');
  let _yaw = +yaw, _pitch = +pitch, _dist = +distance;

  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const wrapPi = (a) => {
    // Wrap to [-PI, PI]
    const t = Math.atan2(Math.sin(a), Math.cos(a));
    return Number.isFinite(t) ? t : 0;
  };

  function getEye() {
    const cp = Math.cos(_pitch), sp = Math.sin(_pitch);
    const cy = Math.cos(_yaw),   sy = Math.sin(_yaw);
    // Spherical around target (RH, Y up)
    const x = target.x + _dist * cp * cy;
    const y = target.y + _dist * sp;
    const z = target.z + _dist * cp * sy;
    return new Vec3(x, y, z);
  }

  return {
    /** Increment yaw/pitch (radians) and dolly (distance delta). */
    update(dYaw = 0, dPitch = 0, dDolly = 0) {
      if (![dYaw, dPitch, dDolly].every(Number.isFinite)) return;
      _yaw   = wrapPi(_yaw + dYaw);
      _pitch = clamp(_pitch + dPitch, minPitch, maxPitch);
      _dist  = clamp(_dist + dDolly,  minDistance, maxDistance);
    },
    setTarget(v) {
      if (!(v instanceof Vec3)) throw new TypeError('setTarget: Vec3 required');
      target = v.clone();
    },
    setDistance(d) { if (Number.isFinite(d)) _dist = clamp(d, minDistance, maxDistance); },
    setAngles(y, p) {
      if (Number.isFinite(y)) _yaw = wrapPi(y);
      if (Number.isFinite(p)) _pitch = clamp(p, minPitch, maxPitch);
    },
    get state() { return { yaw: _yaw, pitch: _pitch, distance: _dist, target: target.clone() }; },
    getEye,
    getViewMatrix() { return Mat4.lookAt(getEye(), target, new Vec3(0, 1, 0)); }
  };
}
