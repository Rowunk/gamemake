import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCubeGeometry } from '../../src/gfx/mesh.js';

test('createCubeGeometry: returns typed arrays with expected sizes and ranges', () => {
  const geo = createCubeGeometry();
  assert.ok(geo && geo.positions && geo.colors && geo.indices);

  assert.ok(geo.positions instanceof Float32Array);
  assert.ok(geo.colors instanceof Float32Array);
  assert.ok(geo.indices instanceof Uint16Array);

  // Classic 8-vertex cube with 36 indices (12 triangles)
  assert.equal(geo.positions.length, 8 * 3);
  assert.equal(geo.colors.length, 8 * 3);
  assert.equal(geo.indices.length, 36);

  // Indices are in-range
  const maxIndex = Math.max(...geo.indices);
  assert.ok(maxIndex < 8);

  // Bounds roughly in [-1,1]
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
