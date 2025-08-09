// Add this to tests/gfx/ as textured_cube_geometry.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTexturedCubeGeometry } from '../../src/gfx/mesh.js';

test('createTexturedCubeGeometry: returns typed arrays with expected sizes and UV ranges', () => {
  const geo = createTexturedCubeGeometry();
  assert.ok(geo && geo.positions && geo.uvs && geo.indices);

  assert.ok(geo.positions instanceof Float32Array);
  assert.ok(geo.uvs instanceof Float32Array);
  assert.ok(geo.indices instanceof Uint16Array);

  // 8-vertex cube with 36 indices (12 triangles)
  assert.equal(geo.positions.length, 8 * 3);
  assert.equal(geo.uvs.length, 8 * 2);
  assert.equal(geo.indices.length, 36);

  // Indices are in-range
  const maxIndex = Math.max(...geo.indices);
  assert.ok(maxIndex < 8);

  // UV coordinates should be in [0,1] range
  for (let i = 0; i < geo.uvs.length; i++) {
    const uv = geo.uvs[i];
    assert.ok(uv >= 0 && uv <= 1, `UV component ${i} (${uv}) should be in [0,1]`);
  }

  // Position bounds roughly in [-1,1]
  const xs = [], ys = [], zs = [];
  for (let i = 0; i < geo.positions.length; i += 3) {
    xs.push(geo.positions[i+0]);
    ys.push(geo.positions[i+1]);
    zs.push(geo.positions[i+2]);
  }
  const min = (a) => a.reduce((m,v)=>Math.min(m,v), Infinity);
  const max = (a) => a.reduce((m,v)=>Math.max(m,v), -Infinity);
  assert.ok(min(xs) <= -0.99 && max(xs) >= 0.99);
  assert.ok(min(ys) <= -0.99 && max(ys) >= 0.99);
  assert.ok(min(zs) <= -0.99 && max(zs) >= 0.99);
});