// Simple textured quad (procedural 2x2 checker) using WebGPU.
// Expects <canvas id="gfx">.

const canvas = document.querySelector('#gfx');

const WGSL_VS = /* wgsl */`
struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) vUV : vec2<f32>,
};
@group(0) @binding(0) var<uniform> U : mat4x4<f32>;
@vertex
fn main(@location(0) position: vec3<f32>, @location(1) uv: vec2<f32>) -> VSOut {
  var out : VSOut;
  out.pos = U * vec4<f32>(position, 1.0);
  out.vUV = uv;
  return out;
}
`;

const WGSL_FS = /* wgsl */`
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var tex0 : texture_2d<f32>;

@fragment
fn main(@location(0) vUV: vec2<f32>) -> @location(0) vec4<f32> {
  return textureSample(tex0, samp, vUV);
}
`;

(async function main() {
  if (!navigator.gpu) {
    document.body.insertAdjacentHTML('beforeend', `<p>WebGPU not available.</p>`);
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format });

  // Quad geometry (pos, uv)
  const positions = new Float32Array([
    -0.8, -0.8, 0.0,
     0.8, -0.8, 0.0,
     0.8,  0.8, 0.0,
    -0.8,  0.8, 0.0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);
  const indices = new Uint16Array([0,1,2, 0,2,3]);

  const posBuf = device.createBuffer({ size: positions.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const uvBuf  = device.createBuffer({ size: uvs.byteLength,       usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const idxBuf = device.createBuffer({ size: indices.byteLength,   usage: GPUBufferUsage.INDEX  | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(posBuf, 0, positions);
  device.queue.writeBuffer(uvBuf,  0, uvs);
  device.queue.writeBuffer(idxBuf, 0, indices);

  // MVP (identity)
  const ubo = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(ubo, 0, new Float32Array([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1,
  ]));

  // 2x2 checker texture
  const tex = device.createTexture({
    size: { width: 2, height: 2 },
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
  });
  const data = new Uint8Array([
    255,  64,  64,255,   64, 255, 64,255,
     64,  64, 255,255,  255, 255, 64,255,
  ]);
  device.queue.writeTexture(
    { texture: tex },
    data,
    { bytesPerRow: 2 * 4, rowsPerImage: 2 },
    { width: 2, height: 2 }
  );

  const sampler = device.createSampler({
    magFilter: 'nearest',
    minFilter: 'nearest',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX,  buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    ]
  });
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: {
      module: device.createShaderModule({ code: WGSL_VS }),
      entryPoint: 'main',
      buffers: [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
        { arrayStride: 8,  attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x2' }] },
      ]
    },
    fragment: {
      module: device.createShaderModule({ code: WGSL_FS }),
      entryPoint: 'main',
      targets: [{ format }]
    },
    primitive: { topology: 'triangle-list', cullMode: 'none' }
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: ubo } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: tex.createView() },
    ]
  });

  function frame() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.04, g: 0.05, b: 0.07, a: 1 }
      }]
    });
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, posBuf);
    pass.setVertexBuffer(1, uvBuf);
    pass.setIndexBuffer(idxBuf, 'uint16');
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
