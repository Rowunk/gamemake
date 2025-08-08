// src/gfx/mipgen.js
'use strict';

/**
 * Minimal render-based mipmap generator for 2D RGBA textures.
 *
 * Usage:
 *   const gen = makeMipGenerator(device, { format: 'rgba8unorm' });
 *   const enc = device.createCommandEncoder();
 *   gen.generate(enc, texture, baseWidth, baseHeight, mipLevelCount);
 *   device.queue.submit([enc.finish()]);
 *
 * Requirements:
 *  - texture was created with usage including TEXTURE_BINDING | RENDER_ATTACHMENT
 *  - format matches the pipeline's color target (default 'rgba8unorm')
 *  - sampling between mips is filtered via a linear sampler
 */

const WGSL_VS = /* wgsl */`
struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn main(@builtin(vertex_index) i : u32) -> VSOut {
  // Fullscreen triangle
  var P = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 3.0,  1.0)
  );
  let p = P[i];
  var o : VSOut;
  o.pos = vec4<f32>(p, 0.0, 1.0);
  o.uv  = p * 0.5 + vec2<f32>(0.5, 0.5);
  return o;
}
`;

const WGSL_FS = /* wgsl */`
@group(0) @binding(0) var uSampler : sampler;
@group(0) @binding(1) var uTex     : texture_2d<f32>;

@fragment
fn main(@location(0) uv : vec2<f32>) -> @location(0) vec4<f32> {
  // Sample previous mip via view at baseMipLevel (i-1)
  return textureSample(uTex, uSampler, uv);
}
`;

function assertDim(v, name) {
  if (!Number.isFinite(v) || v <= 0) throw new TypeError(`${name} must be a positive finite number`);
  return Math.max(1, v | 0);
}

/**
 * Create a reusable mip generator.
 * @param {GPUDevice} device
 * @param {{format?:string}} [opts]
 */
export function makeMipGenerator(device, opts = {}) {
  const format = opts.format || 'rgba8unorm';

  let pipeline = null;
  let sampler = null;

  function ensurePipeline() {
    if (!pipeline) {
      const vs = device.createShaderModule({ code: WGSL_VS });
      const fs = device.createShaderModule({ code: WGSL_FS });
      pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: vs, entryPoint: 'main' },
        fragment: { module: fs, entryPoint: 'main', targets: [{ format }] },
        primitive: { topology: 'triangle-list' }
      });
    }
    if (!sampler) {
      sampler = device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear',
        mipmapFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        addressModeW: 'clamp-to-edge'
      });
    }
  }

  /**
   * Schedule render passes to downsample each mip level of `texture`.
   * @param {GPUCommandEncoder} encoder
   * @param {GPUTexture & {createView:Function}} texture
   * @param {number} baseWidth
   * @param {number} baseHeight
   * @param {number} mipLevelCount
   */
  function generate(encoder, texture, baseWidth, baseHeight, mipLevelCount) {
    const W0 = assertDim(baseWidth, 'baseWidth');
    const H0 = assertDim(baseHeight, 'baseHeight');
    const levels = Math.max(1, mipLevelCount | 0);
    if (levels <= 1) return; // nothing to do

    ensurePipeline();

    // For each destination level i (1..levels-1), sample from source i-1
    for (let i = 1; i < levels; i++) {
      const srcView = texture.createView({ baseMipLevel: i - 1, mipLevelCount: 1 });
      const dstView = texture.createView({ baseMipLevel: i,     mipLevelCount: 1 });

      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: srcView },
        ]
      });

      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: dstView,
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 }
        }]
      });

      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bind);
      pass.draw(3);
      pass.end();
    }
  }

  return { generate };
}
