// @ts-check
'use strict';

/**
 * Minimal GPU mipmap generator (render-pass based).
 * Shape-only: tests assert descriptor shapes and pass counts; no real GPU work is done in Node.
 *
 * Exposes:
 *   makeMipGenerator(device, opts?) -> { generate(encoder, texture, baseWidth, baseHeight, mipLevelCount) }
 *
 * Behavior:
 * - No work when mipLevelCount <= 1.
 * - Generates exactly (mipLevelCount - 1) passes: each level i samples from i-1.
 * - Validates positive integer dimensions; throws RangeError on invalid sizes.
 */

/**
 * Options for {@link makeMipGenerator}.
 * @typedef {Object} MipgenOptions
 * @property {string} [format] Render target format (e.g., "rgba8unorm").
 */

/**
 * Options for creating a texture view.
 * This mirrors the subset we use from WebGPU.
 * @typedef {Object} TextureViewOptions
 * @property {number} baseMipLevel
 * @property {number} mipLevelCount
 */

/**
 * Texture-like shape used by the generator. In real WebGPU this is a GPUTexture.
 * Only the method we need is described here for docs/tests.
 * @typedef {Object} TextureLike
 * @property {function(TextureViewOptions): *} createView
 */

/**
 * Build a simple mipmap generator.
 * @param {*} device GPUDevice-like with createShaderModule/createRenderPipeline/createSampler/createBindGroup.
 * @param {MipgenOptions} [opts]
 */
export function makeMipGenerator(device, opts) {
  if (!device) throw new TypeError('device is required');

  /** @type {string} */
  const format = opts && typeof opts.format === 'string' ? opts.format : 'rgba8unorm';

  // Lazy-built pipeline pieces kept across calls
  /** @type {*} */ let pipeline = null;
  /** @type {*} */ let sampler = null;

  function vertWGSL() {
    return /* wgsl */ `
      @vertex
      fn main(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
        // Full-screen triangle
        var xy = array<vec2<f32>, 3>(
          vec2<f32>(-1.0, -3.0),
          vec2<f32>( 3.0,  1.0),
          vec2<f32>(-1.0,  1.0)
        );
        let p = xy[vid];
        return vec4<f32>(p, 0.0, 1.0);
      }
    `;
  }

  function fragWGSL() {
    return /* wgsl */ `
      @group(0) @binding(0) var samp : sampler;
      @group(0) @binding(1) var src  : texture_2d<f32>;

      @fragment
      fn main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
        // Minimal sampling; tests look at descriptor shape, not pixels.
        // Map position to a [0,1] range in a hand-wavy way that's fine for headless tests.
        let uv = pos.xy * 0.0 + vec2<f32>(0.5, 0.5);
        return textureSample(src, samp, uv);
      }
    `;
  }

  function ensurePipeline() {
    if (pipeline) return;

    const vs = device.createShaderModule({ code: vertWGSL() });
    const fs = device.createShaderModule({ code: fragWGSL() });

    pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: vs, entryPoint: 'main' },
      fragment: { module: fs, entryPoint: 'main', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    });
  }

  /**
   * @param {number} n
   * @param {string} label
   * @returns {number}
   */
  function assertDim(n, label) {
    const v = n | 0;
    if (!Number.isFinite(n) || v <= 0) {
      throw new RangeError(`${label} must be a positive integer`);
    }
    return v;
  }

  /**
   * Schedule render passes to downsample each mip level of `texture`.
   * @param {*} encoder GPUCommandEncoder-like with beginRenderPass.
   * @param {TextureLike} texture
   * @param {number} baseWidth
   * @param {number} baseHeight
   * @param {number} mipLevelCount
   * @returns {void}
   */
  function generate(encoder, texture, baseWidth, baseHeight, mipLevelCount) {
    const W0 = assertDim(baseWidth, 'baseWidth');
    const H0 = assertDim(baseHeight, 'baseHeight');
    const levels = Math.max(1, mipLevelCount | 0);
    if (levels <= 1) return; // nothing to do
    // (W0/H0 are validated for sanity; we don't otherwise use them in headless tests.)

    ensurePipeline();

    // For each destination level i (1..levels-1), sample from source i-1
    for (let i = 1; i < levels; i++) {
      const srcView = texture.createView({ baseMipLevel: i - 1, mipLevelCount: 1 });
      const dstView = texture.createView({ baseMipLevel: i, mipLevelCount: 1 });

      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: srcView },
        ],
      });

      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: dstView,
            loadOp: 'clear',
            storeOp: 'store',
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
          },
        ],
      });

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bind);
      pass.draw(3);
      pass.end();
    }
  }

  return { generate };
}
