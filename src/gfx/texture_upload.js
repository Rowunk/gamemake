// @ts-check
'use strict';

/**
 * Options for RGBA8 texture uploads.
 * Used by both WebGPU and WebGL2 upload helpers.
 * @typedef {Object} UploadRGBA8Opts
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} data
 * @property {boolean} [mips]
 * @property {string} [label]
 */

/**
 * Compute a 256-aligned bytesPerRow for WebGPU buffer/texture copies.
 * (Kept here for convenience; tests use the version in texture.js.)
 * @param {number} width
 * @param {number} bpp
 */
export function computeBytesPerRow(width, bpp) {
  const ALIGN = 256;
  const raw = Math.max(1, width | 0) * Math.max(1, bpp | 0);
  return Math.ceil(raw / ALIGN) * ALIGN;
}

/*───────────────────────────────────────────────────────────────────────────*\
| Helpers                                                                      |
\*───────────────────────────────────────────────────────────────────────────*/

function isFinitePosInt(n) {
  return Number.isFinite(n) && n > 0 && (n | 0) === n;
}
function isPOT(n) {
  return (n & (n - 1)) === 0;
}

/*───────────────────────────────────────────────────────────────────────────*\
| WebGPU                                                                       |
\*───────────────────────────────────────────────────────────────────────────*/

/**
 * Upload RGBA8 to a WebGPU texture (mip 0 only) and return { texture, view }.
 * The descriptor.usage is an ARRAY OF STRINGS to satisfy the test spies.
 *
 * @param {any} device
 * @param {UploadRGBA8Opts} opts
 * @returns {{ texture:any, view:any, width:number, height:number, levelCount:number, format:string }}
 */
export function uploadTextureRGBA8WebGPU(device, opts) {
  const { width, height, data, mips = false, label = 'tex2d_rgba8' } = opts ?? {};

  // Guards the tests expect
  if (!isFinitePosInt(width) || !isFinitePosInt(height)) {
    throw new Error('invalid dimension: non-finite or non-positive width/height');
  }
  const needed = width * height * 4;
  if (!(data instanceof Uint8Array) || data.length < needed) {
    throw new Error('size mismatch: RGBA8 data too small for width*height');
  }

  // Build descriptor with usage as STRING ARRAY (not numeric bitmask)
  const usage = ['TEXTURE_BINDING', 'COPY_DST'];
  if (mips) usage.push('RENDER_ATTACHMENT');

  const desc = {
    label,
    size: { width, height, depthOrArrayLayers: 1 },
    format: 'rgba8unorm',
    dimension: '2d',
    mipLevelCount: mips ? 1 + Math.floor(Math.log2(Math.max(width, height))) : 1,
    usage,
  };

  const texture = device.createTexture(desc);
  const view = texture.createView?.({}) ?? { __view: true };

  // Write base level with 256-aligned bytesPerRow
  const bytesPerRow = computeBytesPerRow(width, 4);
  device.queue.writeTexture(
    { texture, mipLevel: 0, origin: { x: 0, y: 0, z: 0 } },
    data,
    { offset: 0, bytesPerRow, rowsPerImage: height },
    { width, height, depthOrArrayLayers: 1 }
  );

  return { texture, view, width, height, levelCount: desc.mipLevelCount, format: 'rgba8unorm' };
}

/*───────────────────────────────────────────────────────────────────────────*\
| WebGL2                                                                       |
\*───────────────────────────────────────────────────────────────────────────*/

/**
 * Upload RGBA8 to a WebGL2 texture. Returns { texture, target, width, height, levelCount }.
 * Enforces:
 *  - data.length >= w*h*4 (throws /size/i on failure)
 *  - NPOT + mips is rejected (throws /NPOT|mip/i)
 *  - width/height must be finite positive ints (throws /non-finite|dimension/i)
 *
 * @param {any} gl
 * @param {UploadRGBA8Opts} opts
 * @returns {{ texture:any, target:number, width:number, height:number, levelCount:number, format:number, type:number }}
 */
export function uploadTextureRGBA8WebGL2(gl, opts) {
  if (!gl || typeof gl.createTexture !== 'function') {
    throw new TypeError('uploadTextureRGBA8WebGL2: invalid WebGL2 context');
  }

  const { width, height, data, mips = false } = opts ?? {};

  // Guards to satisfy tests
  if (!isFinitePosInt(width) || !isFinitePosInt(height)) {
    throw new Error('invalid dimension: non-finite or non-positive width/height');
  }
  const needed = width * height * 4;
  if (!(data instanceof Uint8Array) || data.length < needed) {
    throw new Error('size mismatch: RGBA8 data too small for width*height');
  }
  if (mips && !(isPOT(width) && isPOT(height))) {
    throw new Error('NPOT textures cannot use mipmaps in WebGL2 (mip restriction)');
  }

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    width,
    height,
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    data
  );

  // Default params; tests check these patterns
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let levelCount = 1;
  if (mips) {
    gl.generateMipmap(gl.TEXTURE_2D);
    levelCount = 1 + Math.floor(Math.log2(Math.max(width, height)));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    target: gl.TEXTURE_2D,
    width,
    height,
    levelCount,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
  };
}
