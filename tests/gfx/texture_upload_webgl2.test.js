import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadTextureRGBA8WebGL2 } from '../../src/gfx/texture_upload.js';

function makeGlSpies() {
  const calls = [];
  const gl = {
    TEXTURE_2D: 0x0DE1,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    LINEAR: 0x2601,
    NEAREST: 0x2600,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    CLAMP_TO_EDGE: 0x812F,
    REPEAT: 0x2901,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    UNPACK_ALIGNMENT: 0x0CF5,
    createTexture: () => ({ __tex: true }),
    bindTexture: (t, h) => calls.push(['bindTexture', t, !!h]),
    pixelStorei: (p, v) => calls.push(['pixelStorei', p, v]),
    texParameteri: (t, p, v) => calls.push(['texParameteri', t, p, v]),
    texImage2D: (target, level, internalFmt, w, h, border, fmt, type, data) =>
      calls.push(['texImage2D', target, level, internalFmt, w, h, border, fmt, type, !!data]),
    generateMipmap: (t) => calls.push(['generateMipmap', t])
  };
  return { gl, calls };
}

test('uploadTextureRGBA8WebGL2: NPOT + no mips → CLAMP + LINEAR, no generateMipmap', () => {
  const { gl, calls } = makeGlSpies();
  const width = 257, height = 129; // NPOT
  const data = new Uint8Array(width * height * 4);

  const out = uploadTextureRGBA8WebGL2(gl, { width, height, data, mips: false });

  // Params: clamp + linear
  const p = calls.filter(c => c[0] === 'texParameteri');
  const get = (prop) => p.filter(c => c[2] === prop).map(c => c[3]);
  // WRAP_S/T should be CLAMP_TO_EDGE
  assert.ok(get(gl.TEXTURE_WRAP_S).includes(gl.CLAMP_TO_EDGE));
  assert.ok(get(gl.TEXTURE_WRAP_T).includes(gl.CLAMP_TO_EDGE));
  // MIN/MAG filters
  assert.ok(get(gl.TEXTURE_MIN_FILTER).includes(gl.LINEAR));
  assert.ok(get(gl.TEXTURE_MAG_FILTER).includes(gl.LINEAR));

  // Mipmap not generated
  assert.ok(!calls.find(c => c[0] === 'generateMipmap'));

  // Upload happened
  const up = calls.find(c => c[0] === 'texImage2D');
  assert.ok(up, 'texImage2D not called');
  assert.ok(out && out.texture && out.texture.__tex);
});

test('uploadTextureRGBA8WebGL2: POT + mips → LINEAR_MIPMAP_LINEAR + generateMipmap', () => {
  const { gl, calls } = makeGlSpies();
  const width = 256, height = 128; // POT
  const data = new Uint8Array(width * height * 4);

  uploadTextureRGBA8WebGL2(gl, { width, height, data, mips: true });

  const has = (name, val) => calls.some(c => c[0] === name && c.includes(val));
  // MIN_FILTER uses trilinear
  assert.ok(has('texParameteri', gl.LINEAR_MIPMAP_LINEAR));
  // Mips generated
  assert.ok(calls.some(c => c[0] === 'generateMipmap'));
});

test('uploadTextureRGBA8WebGL2: guards sizes and dims; NPOT+mips rejected', () => {
  const { gl } = makeGlSpies();
  assert.throws(() => uploadTextureRGBA8WebGL2(gl, { width: NaN, height: 10, data: new Uint8Array(4) }), /non-finite|dimension/i);

  const w = 257, h = 129;
  const data = new Uint8Array(w * h * 4);
  assert.throws(() => uploadTextureRGBA8WebGL2(gl, { width: w, height: h, data, mips: true }), /NPOT|mip/i);

  const tooSmall = new Uint8Array(w * h * 4 - 1);
  assert.throws(() => uploadTextureRGBA8WebGL2(gl, { width: w, height: h, data: tooSmall }), /size/i);
});
