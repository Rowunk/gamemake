// src/m2_cube.js
'use strict';

import { selectBackend } from './gfx/backend.js';
import { createCubeGeometry } from './gfx/mesh.js';
import {
  WGSL_COLOR3D_VERT, WGSL_COLOR3D_FRAG,
  buildColor3DPipelineDescriptor, makeMVPBindGroupDescriptor
} from './gfx/pipeline_color3d.js';
import { chooseDepthFormat, beginDepthRenderPassDescriptor } from './gfx/depth.js';
import { resizeWebGPU, resizeWebGL2 } from './gfx/resize.js';
import { getAdapterInfo } from './gfx/adapter_info.js';
import { hudHtml } from './gfx/hud.js';
import { withValidation, onDeviceLost } from './gfx/webgpu_runtime.js';
import { makeClock } from './core/time/clock.js';
import { FpsCounter } from './core/time/fps.js';

// ---------- DOM & helpers ----------
const canvas = document.getElementById('viewport');
const hudRoot = document.getElementById('hud-root');
const logEl = document.getElementById('log');
const DPR = Math.max(1, window.devicePixelRatio || 1);
const log = (...a) => { console.log(...a); if (logEl) logEl.textContent += a.join(' ') + '\n'; };

const fps = new FpsCounter();
const clock = makeClock({ maxDelta: 0.25 });

function targetSize() {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, (r.width|0) * DPR);
  const h = Math.max(1, (r.height|0) * DPR);
  return [w, h];
}

function toggleHUD(show) {
  if (!hudRoot) return;
  if (typeof show === 'boolean') hudRoot.classList.toggle('hidden', !show);
  else hudRoot.classList.toggle('hidden');
}
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'h' || ev.key === 'H') toggleHUD();
});

// ---------- Tiny mat4 utilities (column-major) ----------
function mat4Identity() {
  const m = new Float32Array(16);
  m[0]=1; m[5]=1; m[10]=1; m[15]=1;
  return m;
}
function mat4Mul(a,b) {
  const m = new Float32Array(16);
  for (let c=0;c<4;c++) {
    const bc0=b[c*4+0], bc1=b[c*4+1], bc2=b[c*4+2], bc3=b[c*4+3];
    m[c*4+0] = a[0]*bc0 + a[4]*bc1 + a[8]*bc2 + a[12]*bc3;
    m[c*4+1] = a[1]*bc0 + a[5]*bc1 + a[9]*bc2 + a[13]*bc3;
    m[c*4+2] = a[2]*bc0 + a[6]*bc1 + a[10]*bc2 + a[14]*bc3;
    m[c*4+3] = a[3]*bc0 + a[7]*bc1 + a[11]*bc2 + a[15]*bc3;
  }
  return m;
}
function mat4Perspective(fovyRad, aspect, near, far) {
  const f = 1 / Math.tan(0.5 * fovyRad);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[11]= -1;
  if (far === Infinity) {
    m[10] = -1;
    m[14] = -near;
  } else {
    m[10] = (far + near) / (near - far);
    m[14] = (2 * far * near) / (near - far);
  }
  return m;
}
function mat4LookAt(eye, center, up) {
  const ex=eye[0], ey=eye[1], ez=eye[2];
  const cx=center[0], cy=center[1], cz=center[2];
  const ux=up[0], uy=up[1], uz=up[2];

  // f = normalize(center - eye)
  let fx=cx-ex, fy=cy-ey, fz=cz-ez;
  const fl = Math.hypot(fx,fy,fz) || 1; fx/=fl; fy/=fl; fz/=fl;

  // s = normalize(f × up)
  let sx = fy*uz - fz*uy;
  let sy = fz*ux - fx*uz;
  let sz = fx*uy - fy*ux;
  const sl = Math.hypot(sx,sy,sz) || 1; sx/=sl; sy/=sl; sz/=sl;

  // u = s × f
  const rx = sy*fz - sz*fy;
  const ry = sz*fx - sx*fz;
  const rz = sx*fy - sy*fx;

  const m = new Float32Array(16);
  m[0]=sx; m[4]=sy; m[8]=sz;  m[12]=-(sx*ex + sy*ey + sz*ez);
  m[1]=rx; m[5]=ry; m[9]=rz;  m[13]=-(rx*ex + ry*ey + rz*ez);
  m[2]=-fx; m[6]=-fy; m[10]=-fz; m[14]=(fx*ex + fy*ey + fz*ez);
  m[3]=0;  m[7]=0;  m[11]=0;   m[15]=1;
  return m;
}
function mat4RotateY(a, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  const R = new Float32Array([c,0,-s,0,  0,1,0,0,  s,0,c,0,  0,0,0,1]);
  return mat4Mul(a, R);
}
function mat4RotateX(a, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  const R = new Float32Array([1,0,0,0,  0,c,s,0,  0,-s,c,0,  0,0,0,1]);
  return mat4Mul(a, R);
}

// ---------- WebGPU path ----------
async function runWebGPU() {
  if (!('gpu' in navigator)) return null;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;
  const device = await adapter.requestDevice();

  // HUD
  try {
    const info = await getAdapterInfo();
    hudRoot.innerHTML = hudHtml(info);
  } catch {
    hudRoot.innerHTML = hudHtml({ name: 'WebGPU (adapter info unavailable)', features: new Set(), limits: {} });
  }
  toggleHUD(true);

  const context = canvas.getContext('webgpu');
  if (!context) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();

  // Device lost handling
  let lost = false;
  onDeviceLost(device, (info) => {
    lost = true;
    const msg = `WebGPU device lost: ${info?.reason || 'unknown'} ${info?.message || ''}`;
    console.warn(msg);
    if (logEl) logEl.textContent += msg + '\n';
  });

  // Geometry
  const { positions, colors, indices } = createCubeGeometry();

  const vboPos = device.createBuffer({
    size: positions.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vboPos, 0, positions);

  const vboCol = device.createBuffer({
    size: colors.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vboCol, 0, colors);

  const ibo = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(ibo, 0, indices);

  // Uniform buffer (MVP, 64 bytes)
  const ubo = device.createBuffer({
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  // Pipeline
  const baseDesc = buildColor3DPipelineDescriptor(format, 'depth24plus');
  let pipeline;
  {
    const res = await withValidation(device, () => {
      const vs = device.createShaderModule({ code: WGSL_COLOR3D_VERT });
      const fs = device.createShaderModule({ code: WGSL_COLOR3D_FRAG });
      pipeline = device.createRenderPipeline({
        ...baseDesc,
        vertex: { ...baseDesc.vertex, module: vs },
        fragment: { ...baseDesc.fragment, module: fs }
      });
    });
    if (!res.ok) {
      if (logEl) logEl.textContent += `Validation: ${res.message}\n`;
    }
  }

  // Bind group
  const bgl = pipeline.getBindGroupLayout(0);
  const bindGroup = device.createBindGroup({
    layout: bgl,
    entries: [{ binding: 0, resource: { buffer: ubo, offset: 0, size: 64 } }]
  });

  // Depth
  const depthFormat = chooseDepthFormat(new Set(['depth24plus','depth32float']));
  let depthTex = null, depthView = null;
  function ensureDepth(w,h) {
    if (depthTex && depthTex.width === w && depthTex.height === h) return;
    depthTex?.destroy?.();
    depthTex = device.createTexture({
      size: { width: w, height: h, depthOrArrayLayers: 1 },
      format: depthFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
    // NOTE: we stash width/height for quick reuse checks
    depthTex.width = w; depthTex.height = h;
    depthView = depthTex.createView();
  }

  // Initial configure
  {
    const [w, h] = targetSize();
    resizeWebGPU(canvas, context, device, format, { alphaMode: 'opaque' }, w, h);
    ensureDepth(w, h);
  }

  function frame(ts_ms) {
    if (lost) return;
    const { t, dt } = clock.tick(ts_ms * 0.001);
    fps.sample(dt);

    const [w, h] = targetSize();
    resizeWebGPU(canvas, context, device, format, { alphaMode: 'opaque' }, w, h);
    ensureDepth(w, h);

    // Build MVP
    const proj = mat4Perspective(Math.PI/3, w/h, 0.1, 100.0);
    const view = mat4LookAt([2.6, 2.0, 3.0], [0,0,0], [0,1,0]);
    let model = mat4Identity();
    model = mat4RotateY(model, t * 0.7);
    model = mat4RotateX(model, t * 0.3);
    const mvp = mat4Mul(mat4Mul(proj, view), model);
    device.queue.writeBuffer(ubo, 0, mvp.buffer, mvp.byteOffset, mvp.byteLength);

    const encoder = device.createCommandEncoder();
    const colorView = context.getCurrentTexture().createView();
    const passDesc = beginDepthRenderPassDescriptor(
      colorView, depthView,
      { r: 0.02, g: 0.02, b: 0.02, a: 1 },
      1.0
    );
    const pass = encoder.beginRenderPass(passDesc);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vboPos);
    pass.setVertexBuffer(1, vboCol);
    pass.setIndexBuffer(ibo, 'uint16');
    pass.drawIndexed(36, 1, 0, 0, 0);
    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { backend: 'webgpu' };
}

// ---------- WebGL2 fallback (indexed cube + depth) ----------
function runWebGL2() {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, depth: true });
  if (!gl) return null;

  hudRoot.innerHTML = hudHtml({ name: 'WebGL2 (fallback)', features: new Set(), limits: {} });
  toggleHUD(true);

  // Shaders
  const VERT = `#version 300 es
  layout(location=0) in vec3 a_pos;
  layout(location=1) in vec3 a_col;
  uniform mat4 uMVP;
  out vec3 v_col;
  void main() {
    v_col = a_col;
    gl_Position = uMVP * vec4(a_pos, 1.0);
  }`;
  const FRAG = `#version 300 es
  precision highp float;
  in vec3 v_col;
  out vec4 o_col;
  void main() {
    o_col = vec4(v_col, 1.0);
  }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s) || 'shader compile failed';
      gl.deleteShader(s);
      throw new Error(info);
    }
    return s;
  }
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.bindAttribLocation(prog, 1, 'a_col');
  gl.linkProgram(prog);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) || 'program link failed';
    gl.deleteProgram(prog);
    throw new Error(info);
  }

  // Geometry
  const { positions, colors, indices } = createCubeGeometry();
  const vboPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const vboCol = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, vboCol);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

  const uMVPLoc = gl.getUniformLocation(prog, 'uMVP');

  // Depth setup
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.clearDepth(1.0);

  function frame(ts_ms) {
    const { t, dt } = clock.tick(ts_ms * 0.001);
    fps.sample(dt);

    const [w, h] = targetSize();
    resizeWebGL2(canvas, gl, w, h); // sets canvas size + viewport

    const proj = mat4Perspective(Math.PI/3, w/h, 0.1, 100.0);
    const view = mat4LookAt([2.6, 2.0, 3.0], [0,0,0], [0,1,0]);
    let model = mat4Identity();
    model = mat4RotateY(model, t * 0.7);
    model = mat4RotateX(model, t * 0.3);
    const mvp = mat4Mul(mat4Mul(proj, view), model);

    gl.clearColor(0.02, 0.02, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniformMatrix4fv(uMVPLoc, false, mvp);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { backend: 'webgl2' };
}

// ---------- Bootstrap ----------
(async function main() {
  try {
    const env = {
      webgpu: { available: 'gpu' in navigator, features: new Set() },
      webgl2: { available: !!canvas.getContext('webgl2') }
    };
    const pref = selectBackend(env, []);
    const started =
      (pref === 'webgpu' ? await runWebGPU() || runWebGL2() : runWebGL2() || await runWebGPU());

    if (!started) throw new Error('No WebGPU or WebGL2 context available');
    log(`Backend: ${started.backend}`);
  } catch (e) {
    console.error(e);
    log(String(e));
  }
})();
