// WebGPU rotating cube with depth testing.
// Expects <canvas id="gfx">.

const canvas = document.querySelector('#gfx');

const WGSL_VS = /* wgsl */`
struct VSOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) vColor : vec3<f32>,
};

struct Uniforms {
  mvp : mat4x4<f32>,
};
@group(0) @binding(0) var<uniform> U : Uniforms;

@vertex
fn main(@location(0) position: vec3<f32>, @location(1) color: vec3<f32>) -> VSOut {
  var out : VSOut;
  out.pos = U.mvp * vec4<f32>(position, 1.0);
  out.vColor = color;
  return out;
}
`;

const WGSL_FS = /* wgsl */`
@fragment
fn main(@location(0) vColor: vec3<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(vColor, 1.0);
}
`;

function makeCube() {
  // 24 unique verts (position + color by face) + 36 indices
  const P = [
    // +X
    1, -1, -1,   1, 0, 0,
    1,  1, -1,   1, 0, 0,
    1,  1,  1,   1, 0, 0,
    1, -1,  1,   1, 0, 0,
    // -X
   -1, -1,  1,   0, 1, 0,
   -1,  1,  1,   0, 1, 0,
   -1,  1, -1,   0, 1, 0,
   -1, -1, -1,   0, 1, 0,
    // +Y
   -1,  1, -1,   0, 0, 1,
   -1,  1,  1,   0, 0, 1,
    1,  1,  1,   0, 0, 1,
    1,  1, -1,   0, 0, 1,
    // -Y
   -1, -1,  1,   1, 1, 0,
   -1, -1, -1,   1, 1, 0,
    1, -1, -1,   1, 1, 0,
    1, -1,  1,   1, 1, 0,
    // +Z
   -1, -1,  1,   1, 0, 1,
    1, -1,  1,   1, 0, 1,
    1,  1,  1,   1, 0, 1,
   -1,  1,  1,   1, 0, 1,
    // -Z
    1, -1, -1,   0, 1, 1,
   -1, -1, -1,   0, 1, 1,
   -1,  1, -1,   0, 1, 1,
    1,  1, -1,   0, 1, 1,
  ];
  const I = [
    0,1,2, 0,2,3,  4,5,6, 4,6,7,
    8,9,10, 8,10,11, 12,13,14, 12,14,15,
    16,17,18, 16,18,19, 20,21,22, 20,22,23,
  ];
  return { vertices: new Float32Array(P), indices: new Uint16Array(I) };
}

function mat4_perspective(fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = (2 * far * near) * nf;
  return out;
}
function mat4_lookAt(eye, center, up) {
  const [ex,ey,ez] = eye, [cx,cy,cz] = center, [ux,uy,uz] = up;
  let zx = ex - cx, zy = ey - cy, zz = ez - cz;
  const zl = Math.hypot(zx,zy,zz); zx/=zl; zy/=zl; zz/=zl;
  let xx = uy*zz - uz*zy, xy = uz*zx - ux*zz, xz = ux*zy - uy*zx;
  const xl = Math.hypot(xx,xy,xz); xx/=xl; xy/=xl; xz/=xl;
  const yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx;
  const out = new Float32Array(16);
  out[0]=xx; out[4]=yx; out[8]=zx;  out[12]=-(xx*ex + yx*ey + zx*ez);
  out[1]=xy; out[5]=yy; out[9]=zy;  out[13]=-(xy*ex + yy*ey + zy*ez);
  out[2]=xz; out[6]=yz; out[10]=zz; out[14]=-(xz*ex + yz*ey + zz*ez);
  out[3]=0;  out[7]=0;  out[11]=0;   out[15]=1;
  return out;
}
function mat4_mul(a,b) {
  const o = new Float32Array(16);
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
    o[c+4*r]=a[0+4*r]*b[c+0]+a[1+4*r]*b[c+4]+a[2+4*r]*b[c+8]+a[3+4*r]*b[c+12];
  }
  return o;
}
function mat4_rotateY(a, rad) {
  const c=Math.cos(rad), s=Math.sin(rad);
  const R = new Float32Array([ c,0,-s,0,  0,1,0,0,  s,0,c,0,  0,0,0,1 ]);
  return mat4_mul(a,R);
}

(async function main() {
  if (!navigator.gpu) {
    document.body.insertAdjacentHTML('beforeend', `<p>WebGPU not available.</p>`);
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const { vertices, indices } = makeCube();

  const vbuf = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vbuf, 0, vertices);

  const ibuf = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(ibuf, 0, indices);

  const uniformBuf = device.createBuffer({
    size: 64, // mat4x4<f32>
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const depthFormat = 'depth24plus';
  let depthTex = makeDepthTex(device, canvas, depthFormat);

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [{
      binding: 0,
      visibility: GPUShaderStage.VERTEX,
      buffer: { type: 'uniform' }
    }]
  });
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
  });

  const pipeline = device.createRenderPipeline({
    layout: pipelineLayout,
    vertex: {
      module: device.createShaderModule({ code: WGSL_VS }),
      entryPoint: 'main',
      buffers: [
        { arrayStride: 24, attributes: [
          { shaderLocation: 0, offset: 0,  format: 'float32x3' },
          { shaderLocation: 1, offset: 12, format: 'float32x3' },
        ] }
      ]
    },
    fragment: {
      module: device.createShaderModule({ code: WGSL_FS }),
      entryPoint: 'main',
      targets: [{ format }]
    },
    primitive: { topology: 'triangle-list', cullMode: 'back' },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: true,
      depthCompare: 'less'
    }
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: uniformBuf } }]
  });

  const proj = mat4_perspective(Math.PI/3, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  const view = mat4_lookAt([3,2,4],[0,0,0],[0,1,0]);

  function onResize() {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      depthTex = makeDepthTex(device, canvas, depthFormat);
    }
  }
  window.addEventListener('resize', onResize);
  onResize();

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) * 0.001;
    const model = mat4_rotateY(new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]), t);
    const vp = mat4_mul(proj, view);
    const mvp = mat4_mul(vp, model);
    device.queue.writeBuffer(uniformBuf, 0, mvp.buffer || mvp);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.03, g: 0.03, b: 0.06, a: 1 },
      }],
      depthStencilAttachment: {
        view: depthTex.createView(),
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        depthClearValue: 1.0
      }
    });
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vbuf);
    pass.setIndexBuffer(ibuf, 'uint16');
    pass.setBindGroup(0, bindGroup);
    pass.drawIndexed(36);
    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

function makeDepthTex(device, canvas, format) {
  return device.createTexture({
    size: { width: canvas.width, height: canvas.height, depthOrArrayLayers: 1 },
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
}
