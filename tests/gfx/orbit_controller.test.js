import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vec3 } from '../../src/core/math/vec3.js';
import { makeOrbitController } from '../../src/gfx/camera.js';

test('makeOrbitController: eye/view consistency (yaw=+90° gives +Z eye)', () => {
  const c = makeOrbitController({ target: new Vec3(0,0,0), yaw: Math.PI/2, pitch: 0, distance: 5 });
  const eye = c.getEye();
  // Expect (0, 0, +5) within numerical noise
  assert.ok(Math.abs(eye.x - 0) < 1e-9);
  assert.ok(Math.abs(eye.y - 0) < 1e-9);
  assert.ok(Math.abs(eye.z - 5) < 1e-9);

  // Look-at should place target at z = -distance in view space
  const V = c.getViewMatrix();
  const p = V.transformVec3(new Vec3(0,0,0));
  assert.ok(Math.abs(p.x) < 1e-6);
  assert.ok(Math.abs(p.y) < 1e-6);
  assert.ok(Math.abs(p.z + 5) < 1e-5);
});

test('makeOrbitController: clamps pitch and distance; wraps yaw', () => {
  const c = makeOrbitController({ pitch: 0, distance: 1, minPitch: -0.5, maxPitch: 0.5, minDistance: 0.5, maxDistance: 2 });
  c.update(10*Math.PI,  10,  10); // big deltas
  const s = c.state;
  assert.ok(s.pitch <= 0.5 && s.pitch >= -0.5);
  assert.ok(s.distance <= 2 && s.distance >= 0.5);
  // yaw stays finite in [-PI, PI]
  assert.ok(s.yaw <= Math.PI && s.yaw >= -Math.PI);
});
