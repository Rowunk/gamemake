// src/gfx/geometry.js
'use strict';

/**
 * Returns a canonical full-screen triangle in NDC. Two accepted patterns are common;
 * we emit (-1,-3), (-1,1), (3,1), which covers the viewport with a single triangle.
 *
 * @returns {{vertexData:Float32Array, arrayStride:number}}
 */
export function createFullscreenTriangle() {
  const vertexData = new Float32Array([
    -1, -3,
    -1,  1,
     3,  1
  ]);
  const arrayStride = 2 * 4; // bytes per vertex (vec2<f32>)
  return { vertexData, arrayStride };
}
