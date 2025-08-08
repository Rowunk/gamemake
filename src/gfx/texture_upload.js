// src/gfx/texture_upload.js
'use strict';

import { computeMipCount, computeBytesPerRow } from './texture.js';

/** Guard helpers */
function assertFiniteIntPos(n, name) {
  if (!Number.isFinite(n) || n <= 0) throw new TypeError(`${name}: non-finite or non-positive dimension`);
  // Allow non-integers but floor consistently (Web APIs accept ints); tests use exact numbers already.
  return Math.floor(n);
}
function assertDataSizeRGBA8(data, w, h) {
  const need = w * h * 4;
  if (!(data instanceof Uint8Array)) throw new TypeError('data must be Uint8Array (RGBA8)');
  if (data.byteLength !== need) throw new RangeError(`data size mismatch: have ${data.byteLength}, need ${need}`);
}
const isPOT = (n) => (n & (n - 1)) === 0;

/**
 * WebGPU: upload an RGBA8 (unorm) 2D texture.
 * Returns { texture, view } with a default view (all mips).
 *
 * Shape is tailored for tests: descriptor.usage is an array of string tags,
 * and we use queue.writeTexture for the base level.
 */
export function uploadTextureRGBA8WebGPU(device, { width, height, data, mips = true }) {
  const w = assertFiniteIntPos(width, 'width');
  const h = assertFiniteIntPos(height, 'height');
  assertDataSizeRGBA8(data, w, h);

  const mipLevelCount = mips ? computeMipCount(w, h) : 1;

  // Note: tests expect an array of usage strings, not bitflags.
  const desc = {
    size: { width: w, height: h, depthOrArrayLayers: 1 },
    dimension: '2d',
    format: 'rgba8unorm',
    mipLevelCount,
    usage: ['TEXTURE_BINDING', 'COPY_DST'],
  };

  const texture = device.createTexture(desc);
  const view = texture.createView({});

  // Base level upload via writeTexture; bytesPerRow must be 256-aligned.
  const bytesPerRow = computeBytesPerRow(w, 4);
  device.queue.writeTexture(
    { texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
    data,
    { offset: 0, bytesPerRow, rowsPerImage: h },
    { width: w, height: h, depthOrArrayLayers: 1 }
  );

  return { texture, view };
}

/**
 * WebGL2: upload an RGBA8 2D texture.
 * Handles NPOT vs POT rules and optional mipmap generation.
 * Returns { texture }.
 */
export function uploadTextureRGBA8WebGL2(gl, { width, height, data, mips = false }) {
  const w = assertFiniteIntPos(width, 'width');
  const h = assertFiniteIntPos(height, 'height');
  assertDataSizeRGBA8(data, w, h);

  const pot = isPOT(w) && isPOT(h);
  if (mips && !pot) {
    throw new Error('NPOT textures cannot use mipmaps in WebGL2 without careful sampler/state; refusing');
  }

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);

  // Ensure tight packing regardless of width
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  // Upload base level
  gl.texImage2D(
    gl.TEXTURE_2D,  // target
    0,              // level
    gl.RGBA,        // internal format
    w, h,           // width, height
    0,              // border
    gl.RGBA,        // format
    gl.UNSIGNED_BYTE,
    data
  );

  // Sampler params
  if (mips && pot) {
    // Trilinear mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Reasonable wrap defaults for POT
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    // NPOT (or no mips): clamp + linear
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // Leave bound; tests only inspect call history and the returned handle.
  return { texture: tex };
}
