// src/gfx/mesh.js
'use strict';

/**
 * Classic unit cube centered at origin with 8 unique vertices and 12 triangles (36 indices).
 * Positions in [-1, 1]. Per-vertex colors are simple RGB derived from position signs.
 */
export function createCubeGeometry() {
  // 8 vertices
  const positions = new Float32Array([
    // x,   y,   z
    -1, -1, -1, // 0
     1, -1, -1, // 1
     1,  1, -1, // 2
    -1,  1, -1, // 3
    -1, -1,  1, // 4
     1, -1,  1, // 5
     1,  1,  1, // 6
    -1,  1,  1, // 7
  ]);

  // Simple color per vertex: map position from [-1,1] -> [0,1]
  const c = (v) => 0.5 * (v + 1);
  const colors = new Float32Array([
    c(-1), c(-1), c(-1), // 0
    c( 1), c(-1), c(-1), // 1
    c( 1), c( 1), c(-1), // 2
    c(-1), c( 1), c(-1), // 3
    c(-1), c(-1), c( 1), // 4
    c( 1), c(-1), c( 1), // 5
    c( 1), c( 1), c( 1), // 6
    c(-1), c( 1), c( 1), // 7
  ]);

  // 12 triangles (two per face), CCW winding
  const indices = new Uint16Array([
    // +Z (front)
    4, 5, 6,  4, 6, 7,
    // -Z (back)
    1, 0, 3,  1, 3, 2,
    // +X (right)
    5, 1, 2,  5, 2, 6,
    // -X (left)
    0, 4, 7,  0, 7, 3,
    // +Y (top)
    3, 7, 6,  3, 6, 2,
    // -Y (bottom)
    0, 1, 5,  0, 5, 4,
  ]);

  return { positions, colors, indices };
}

/**
 * Create a textured unit cube with UV coordinates for proper texture mapping.
 * Unlike createCubeGeometry() which has per-vertex colors, this provides UV coords.
 * 
 * Returns:
 * - positions: 8 vertices * 3 components (xyz)  
 * - uvs: 8 vertices * 2 components (uv)
 * - indices: 36 indices for 12 triangles
 */
export function createTexturedCubeGeometry() {
  // 8 vertices in standard cube layout
  const positions = new Float32Array([
    // x,   y,   z
    -1, -1, -1, // 0: left-bottom-back
     1, -1, -1, // 1: right-bottom-back  
     1,  1, -1, // 2: right-top-back
    -1,  1, -1, // 3: left-top-back
    -1, -1,  1, // 4: left-bottom-front
     1, -1,  1, // 5: right-bottom-front
     1,  1,  1, // 6: right-top-front
    -1,  1,  1, // 7: left-top-front
  ]);

  // Simple UV mapping - each vertex gets a UV coordinate
  // This creates a basic box mapping where each face gets the full [0,1] UV range
  const uvs = new Float32Array([
    0, 0, // 0
    1, 0, // 1
    1, 1, // 2  
    0, 1, // 3
    1, 0, // 4
    0, 0, // 5
    0, 1, // 6
    1, 1, // 7
  ]);

  // Same triangle winding as the color cube for consistency
  const indices = new Uint16Array([
    // +Z face (front)
    4, 5, 6,  4, 6, 7,
    // -Z face (back)
    1, 0, 3,  1, 3, 2,
    // +X face (right)  
    5, 1, 2,  5, 2, 6,
    // -X face (left)
    0, 4, 7,  0, 7, 3,
    // +Y face (top)
    3, 7, 6,  3, 6, 2,
    // -Y face (bottom)
    0, 1, 5,  0, 5, 4,
  ]);

  return { positions, uvs, indices };
}