import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadTextureRGBA8WebGPU } from '../../src/gfx/texture_upload.js';
import { computeMipCount, computeBytesPerRow } from '../../src/gfx/texture.js';

function makeDeviceSpies() {
  const calls = { createTexture: [], writeTexture: [] };
  const texture = {
    __t: true,
    createView: (opts) => ({ __view: true, opts })
  };
  const device = {
    queue: {
      writeTexture: (src, data, layout, size) => {
        calls.writeTexture.push({ src, data, layout, size });
      }
    },
    createTexture: (desc) => {
      calls.createTexture.push(desc);
      return texture;
    }
  };
  return { device, calls, texture };
}

test('uploadTextureRGBA8WebGPU: creates texture with mip levels and writes base level', () => {
  const { device, calls, texture } = makeDeviceSpies();
  const width = 257, height = 129;
  const mips = true;
  const data = new Uint8Array(width * height * 4); // RGBA8

  const out = uploadTextureRGBA8WebGPU(device, { width, height, data, mips });

  // Descriptor validation
  const desc = calls.createTexture.at(-1);
  assert.ok(desc, 'createTexture not called');
  assert.equal(desc.dimension, '2d');
  assert.equal(desc.format, 'rgba8unorm');
  assert.equal(desc.size.width, width);
  assert.equal(desc.size.height, height);
  assert.equal(desc.size.depthOrArrayLayers, 1);
  assert.equal(desc.mipLevelCount, computeMipCount(width, height));
  assert.ok(Array.isArray(desc.usage) && desc.usage.includes('TEXTURE_BINDING') && desc.usage.includes('COPY_DST'));

  // Data upload (base level only for now)
  const wr = calls.writeTexture.at(-1);
  assert.ok(wr, 'queue.writeTexture not called');
  assert.equal(wr.src.texture, texture);
  assert.equal(wr.src.mipLevel, 0);
  assert.equal(wr.layout.bytesPerRow, computeBytesPerRow(width, 4));
  assert.equal(wr.size.width, width);
  assert.equal(wr.size.height, height);
  assert.equal(wr.size.depthOrArrayLayers, 1);

  // Return shape
  assert.ok(out && out.texture === texture);
  assert.ok(out.view && out.view.__view);
});

test('uploadTextureRGBA8WebGPU: guards input sizes and dimensions', () => {
  const { device } = makeDeviceSpies();
  const width = 10, height = 10;
  const data = new Uint8Array(width * height * 4 - 1); // too small
  assert.throws(() => uploadTextureRGBA8WebGPU(device, { width, height, data }), /size/i);

  assert.throws(() => uploadTextureRGBA8WebGPU(device, { width: NaN, height, data: new Uint8Array(4) }), /non-finite|dimension/i);
});
