import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTexturedQuadGeometry } from '../../src/gfx/mesh_quad.js';

test('createTexturedQuadGeometry: positions(4*3), uvs(4*2), indices(6), ranges ok', () => {
  const g = createTexturedQuadGeometry();
  assert.ok(g && g.positions && g.uvs && g.indices);
  assert.ok(g.positions instanceof Float32Array);
  assert.ok(g.uvs instanceof Float32Array);
  assert.ok(g.indices instanceof Uint16Array);

  assert.equal(g.positions.length, 12);
  assert.equal(g.uvs.length, 8);
  assert.equal(g.indices.length, 6);

  // UV range [0,1]
  for (const u of g.uvs) assert.ok(u >= 0 && u <= 1);

  // Bounds roughly [-1,1] in x,y and z==0
  const xs=[], ys=[], zs=[];
  for (let i=0;i<g.positions.length;i+=3){
    xs.push(g.positions[i+0]);
    ys.push(g.positions[i+1]);
    zs.push(g.positions[i+2]);
  }
  const min = a => a.reduce((m,v)=>Math.min(m,v), +Infinity);
  const max = a => a.reduce((m,v)=>Math.max(m,v), -Infinity);
  assert.ok(min(xs) <= -0.99 && max(xs) >= 0.99);
  assert.ok(min(ys) <= -0.99 && max(ys) >= 0.99);
  assert.equal(min(zs), 0);
  assert.equal(max(zs), 0);
});
