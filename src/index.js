// @ts-check
// src/index.js
// The single source of truth for the PUBLIC API.
// Anything not exported here is internal and may change without notice.

/* ─── Runtime ─────────────────────────────────────────────────────────── */
export { createFixedStepStepper } from './runtime/loop.js';
export { GameLoop } from './runtime/loop.js';

/* ─── Time ────────────────────────────────────────────────────────────── */
export { makeClock } from './core/time/clock.js';
export { FpsCounter } from './core/time/fps.js';

/* ─── Math (essentials) ───────────────────────────────────────────────── */
export { Vec2 } from './core/math/vec2.js';
export { Vec3 } from './core/math/vec3.js';
export { Quat } from './core/math/quat.js';
export { Mat4 } from './core/math/mat4.js';
export { AABB } from './core/math/aabb.js';

/* ─── GFX: backend + setup + resize ───────────────────────────────────── */
export { selectBackend } from './gfx/backend.js';
export { setupWebGPU } from './gfx/webgpu_runtime.js';
export { resizeWebGL2 } from './gfx/resize.js';
export { resizeWebGPU } from './gfx/resize.js';

/* ─── GFX: geometry helpers ───────────────────────────────────────────── */
export { createCubeGeometry } from './gfx/geometry.js';
export { createTexturedQuadGeometry } from './gfx/mesh_quad.js';

/* ─── GFX: textures + samplers ────────────────────────────────────────── */
export { createTextureFromURLWebGPU } from './gfx/texture_from_url.js';
export { computeMipCount } from './gfx/texture.js';
export { computeBytesPerRow } from './gfx/texture_upload.js';
export { createSamplerPreset } from './gfx/sampler.js';
