// tests/gfx/image_loader.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadImageBitmap,
  imageBitmapToRGBA8,
  loadRGBA8FromURL,
} from '../../src/gfx/image_loader.js';

test('loadImageBitmap calls fetch + createImageBitmap with merged opts', async () => {
  let fetched = null;
  let cibOpts = null;

  const fakeFetch = async (url) => {
    fetched = url;
    return {
      ok: true,
      async blob() { return { tag: 'blob' }; }
    };
  };

  const fakeCreateImageBitmap = async (blob, opts) => {
    cibOpts = opts;
    return { width: 4, height: 2 }; // shape only
  };

  const bmp = await loadImageBitmap(
    'https://example.com/tex.png',
    { imageOrientation: 'none', premultiplyAlpha: 'none' },
    { fetch: fakeFetch, createImageBitmap: fakeCreateImageBitmap }
  );

  assert.equal(fetched, 'https://example.com/tex.png');
  assert.ok(bmp && bmp.width === 4 && bmp.height === 2);
  // defaults + overrides are accepted; we check a couple keys exist
  assert.equal(cibOpts.imageOrientation, 'none');
  assert.equal(cibOpts.premultiplyAlpha, 'none');
  assert.equal(cibOpts.colorSpaceConversion, 'none');
});

test('imageBitmapToRGBA8 uses OffscreenCanvas 2D and returns tight RGBA8 copy', () => {
  // Seed a predictable buffer for getImageData
  const W = 3, H = 2, N = W * H * 4;
  const raw = new Uint8ClampedArray(N);
  for (let i = 0; i < N; i++) raw[i] = (i * 7) & 255;

  class OffscreenCanvasFake {
    constructor(w, h) { this.width = w; this.height = h; }
    getContext(kind) {
      assert.equal(kind, '2d');
      return {
        drawImage() { /* no-op */ },
        getImageData: () => ({ data: raw })
      };
    }
  }

  const out = imageBitmapToRGBA8({ width: W, height: H }, { OffscreenCanvas: OffscreenCanvasFake });
  assert.equal(out.width, W);
  assert.equal(out.height, H);
  assert.ok(out.data instanceof Uint8Array);
  assert.equal(out.data.byteLength, N);
  // Must be a copy, not the same instance
  assert.notEqual(out.data.buffer, raw.buffer);
  // Spot-check a few values
  assert.equal(out.data[0], raw[0]);
  assert.equal(out.data[5], raw[5]);
  assert.equal(out.data[N - 1], raw[N - 1]);
});

test('loadRGBA8FromURL end-to-end shape', async () => {
  const fakeFetch = async () => ({
    ok: true,
    async blob() { return { tag: 'blob' }; }
  });
  const fakeCreateImageBitmap = async () => ({ width: 8, height: 4 });
  class OffscreenCanvasFake {
    constructor(w, h) { this.width = w; this.height = h; }
    getContext() {
      return {
        drawImage() {},
        getImageData: () => ({ data: new Uint8ClampedArray(8 * 4 * 4) })
      };
    }
  }

  const img = await loadRGBA8FromURL('x.png', {}, {
    fetch: fakeFetch,
    createImageBitmap: fakeCreateImageBitmap,
    OffscreenCanvas: OffscreenCanvasFake
  });

  assert.equal(img.width, 8);
  assert.equal(img.height, 4);
  assert.ok(img.data instanceof Uint8Array);
  assert.equal(img.data.byteLength, 8 * 4 * 4);
});
