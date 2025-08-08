// tests/gfx/texture_from_url.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTextureFromURLWebGPU } from '../../src/gfx/texture_from_url.js';

test('createTextureFromURLWebGPU: loads, uploads, and generates mips', async () => {
  // ---- fakes / spies ----
  const calls = { load: 0, upload: 0, gen: 0, encoders: 0, submits: 0 };

  const device = {
    queue: { submit: (arr) => { calls.submits++; assert.ok(Array.isArray(arr)); } },
    createCommandEncoder() {
      calls.encoders++;
      return { finish(){ return { __t: 'cmds' }; } };
    }
  };

  const deps = {
    async loadRGBA8FromURL(url, _opts, _env) {
      calls.load++; assert.equal(url, 'tex://foo.png');
      // 64x32 so mip count = 7 (levels 0..6)
      return { width: 64, height: 32, data: new Uint8Array(64*32*4) };
    },
    uploadTextureRGBA8WebGPU(_device, img) {
      calls.upload++; assert.equal(img.width, 64); assert.equal(img.height, 32);
      return { texture: { __t: 'texture' }, view: { __t: 'view' } };
    },
    makeMipGenerator(_device, _opts) {
      return {
        generate(encoder, texture, w, h, levels) {
          calls.gen++;
          assert.ok(encoder && texture && w === 64 && h === 32 && levels === 7);
        }
      };
    }
  };

  const out = await createTextureFromURLWebGPU(device, 'tex://foo.png', { generateMips: true }, deps);

  assert.equal(calls.load, 1);
  assert.equal(calls.upload, 1);
  assert.equal(calls.gen, 1, 'mipgen called once');
  assert.equal(calls.encoders, 1, 'one encoder used');
  assert.equal(calls.submits, 1, 'one submit done');
  assert.ok(out.texture && out.view);
});

test('createTextureFromURLWebGPU: skip mipgen when disabled', async () => {
  const device = {
    queue: { submit() {} },
    createCommandEncoder(){ return { finish(){ return {}; } }; }
  };
  const deps = {
    async loadRGBA8FromURL(){ return { width: 8, height: 8, data: new Uint8Array(8*8*4) }; },
    uploadTextureRGBA8WebGPU(){ return { texture: { __t: 't' }, view: { __t: 'v' } }; },
    makeMipGenerator(){ return { generate(){ throw new Error('should not run'); } }; },
  };
  const out = await createTextureFromURLWebGPU(device, 'x', { generateMips: false }, deps);
  assert.ok(out.texture && out.view);
});
