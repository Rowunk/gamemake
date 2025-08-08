// src/demos/textured_quad.js
// Minimal WebGPU textured quad demo using our M2b pipeline utilities.
// Zero external deps; generates a checkerboard at runtime.

import { buildTexture2DPipelineDescriptor } from '../gfx/pipeline_texture2d.js';
import { createTexturedQuadGeometry } from '../gfx/mesh_quad.js';
import { makeTextureBindGroupDescriptor } from '../gfx/texture_bindgroup.js';

// --- tiny mat4 helpers (identity + ortho) for a 2D scene --------------------
function mat4Identity() {
  return new Float32Array([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1,
  ]);
}

// --- runtime checkerboard generation ----------------------------------------
async function makeCheckerboardBitmap(w = 256, h = 256, cell = 32) {
  // Prefer OffscreenCanvas; fall back to a hidden canvas element.
  let cnv, ctx;
  if (typeof OffscreenCanvas !== 'undefined') {
    cnv = new OffscreenCanvas(w, h);
    ctx = cnv.getContext('2d');
  } else {
    cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    ctx = cnv.getContext('2d');
  }

  // Paint checkerboard
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const i = ((x / cell) | 0) + ((y / cell) | 0);
      ctx.fillStyle = (i & 1) ? '#f59e0b' : '#3b82f6'; // amber / blue
      ctx.fillRect(x, y, cell, cell);
    }
  }

  // Draw a white “X” to make sampling obvious
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,h); ctx.moveTo(w,0); ctx.lineTo(0,h); ctx.stroke();

  // Convert to ImageBitmap
  if (cnv instanceof OffscreenCanvas) {
    return await createImageBitmap(cnv);
  }
  return await new Promise(resolve => {
    cnv.toBlob(async (blob) => resolve(await createImageBitmap(blob)));
  });
}

// --- WebGPU init -------------------------------------------------------------
async function initWebGPU(canvas) {
  const out = { ok: false, message: '' };

  if (!('gpu' in navigator)) {
    out.message = 'WebGPU not available in this browser.';
    return out;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    out.message = 'No GPU adapter.';
    return out;
  }
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');

  // Choose preferred format for this user agent.
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format,
    alphaMode: 'opaque',
  });

  out.ok = true;
  out.adapter = adapter;
  out.device = device;
  out.context = context;
  out.format = format;
  return out;
}

// --- buffer helpers ----------------------------------------------------------
function createBuffer(device, typedArray, usage) {
  const buf = device.createBuffer({
    size: (typedArray.byteLength + 3) & ~3, // 4-byte align
    usage,
    mappedAtCreation: true,
  });
  const dst = new typedArray.constructor(buf.getMappedRange());
  dst.set(typedArray);
  buf.unmap();
  return buf;
}

// --- main --------------------------------------------------------------------
(async function main(){
  const canvas = document.getElementById('c');
  const gpuBadge = document.getElementById('gpu');
  const msg = document.getElementById('msg');

  const gpu = await initWebGPU(canvas);
  if (!gpu.ok) { msg.textContent = gpu.message; return; }
  const { device, context, format, adapter } = gpu;

  gpuBadge.textContent = `Adapter: ${(adapter.info && (adapter.info.description || adapter.info.vendor)) || 'Unknown GPU'}`;

  // Geometry buffers
  const { positions, uvs, indices } = createTexturedQuadGeometry();
  const vbPos = createBuffer(device, positions, GPUBufferUsage.VERTEX);
  const vbUV  = createBuffer(device, uvs, GPUBufferUsage.VERTEX);
  const ibo   = createBuffer(device, indices, GPUBufferUsage.INDEX);

  // Uniforms: MVP matrix (identity)
  const uMVPData = mat4Identity();
  const ubo = createBuffer(device, uMVPData, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  // Create texture + sampler
  const bitmap = await makeCheckerboardBitmap(256, 256, 32);
  const texture = device.createTexture({
    size: { width: bitmap.width, height: bitmap.height },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture },
    { width: bitmap.width, height: bitmap.height }
  );
  const view = texture.createView();
  const sampler = device.createSampler({
    magFilter: 'nearest',
    minFilter: 'nearest',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
  });

  // Pipeline
  const pipeDesc = buildTexture2DPipelineDescriptor(format);
  const pipeline = device.createRenderPipeline(pipeDesc);

  // Bind group (layout 0)
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    ...makeTextureBindGroupDescriptor(ubo, sampler, view),
  });

  // Animation state
  let t0 = performance.now();

  function frame() {
    const t1 = performance.now();
    const dt = Math.min(0.1, (t1 - t0) / 1000);
    t0 = t1;

    // Optionally animate something: here, nothing—keep MVP=I for pixel-perfect-ish quad.
    device.queue.writeBuffer(ubo, 0, uMVPData.buffer, uMVPData.byteOffset, uMVPData.byteLength);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: { r: 0.07, g: 0.08, b: 0.12, a: 1.0 },
        storeOp: 'store',
      }],
    });

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vbPos);
    pass.setVertexBuffer(1, vbUV);
    pass.setIndexBuffer(ibo, 'uint16');
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(6, 1, 0, 0, 0);
    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})().catch(err => {
  const msg = document.getElementById('msg');
  msg.textContent = `Error: ${err?.message || err}`;
  console.error(err);
});
