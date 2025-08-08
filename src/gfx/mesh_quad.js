// src/gfx/mesh_quad.js
'use strict';

/**
 * Fullscreen-ish quad on Z=0 with CCW triangles and [0,1] UVs.
 * positions: 4 * (x,y,z)
 * uvs:       4 * (u,v)
 * indices:   6 (two triangles)
 */
export function createTexturedQuadGeometry() {
  // [-1,1] bounds in XY, Z=0 for all vertices
  const positions = new Float32Array([
    -1, -1, 0,  // v0
     1, -1, 0,  // v1
    -1,  1, 0,  // v2
     1,  1, 0   // v3
  ]);

  // Standard UVs (no Y-flip here; handle in shader/sampler if desired)
  const uvs = new Float32Array([
    0, 0,  // v0
    1, 0,  // v1
    0, 1,  // v2
    1, 1   // v3
  ]);

  // Two triangles: (0,1,2) and (2,1,3)
  const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

  return { positions, uvs, indices };
}
