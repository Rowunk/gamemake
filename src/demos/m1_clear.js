// src/m1_clear.js
'use strict';

import { selectBackend } from './gfx/backend.js';
import { buildClearPipelineDescriptor } from './gfx/renderer.js';
import { WGSL_CLEAR_VERT, WGSL_CLEAR_FRAG } from './gfx/shaders.js';
import { createFullscreenTriangle } from './gfx/geometry.js';
import { beginRenderPassDescriptor, applyGLClear } from './gfx/clearcolor.js';
import { resizeWebGPU, resizeWebGL2 } from './gfx/resize.js';
import { getAdapterInfo } from './gfx/adapter_info.js';
import { hudHtml } from './gfx/hud.js';
import { withValidation, onDeviceLost } from './gfx/webgpu_runtime.js';

const logEl = document.getElementById('log');
const hudRoot = document.getElementById('hud-root');
const canvas = document.getElementById('viewport');
const DPR = Math.max(1, window.devicePixelRatio || 1);
const log = (...a) => { console.log(...a); if (logEl) logEl.textContent += a.join(' ') + '\n'; };

function targetSize() {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width  * DPR));
  const h = Math.max(1, Math.floor(rect.height * DPR));
  return [w, h];
}

// parse ?clear=r,g,b[,a] — defaults to 0.08,0.08,0.08,1
function readClearParam() {
  try {
    const qs = new URLSearchParams(location.search);
    const raw = (qs.get('clear') || '').trim();
    if (!raw) return [0.08, 0.08, 0.08, 1];
    const parts = raw.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
    if (parts.length === 3) parts.push(1);
    if (parts.length !== 4) return [0.08, 0.08, 0.08, 1];
    return parts;
  } catch {
    return [0.08, 0.08, 0.08, 1];
  }
}

function toggleHUD(show) {
  if (!hudRoot) return;
  if (typeof show === 'boolean') {
    hudRoot.classList.toggle('hidden', !show);
  } else {
    hudRoot.classList.toggle('hidden');
  }
}

function banner(msg) {
  if (!hudRoot) return;
  const box = document.createElement('div');
  box.style.cssText = 'margin-top:8px;padding:6px;border:1px solid #833;background:#310;color:#fcc;border-radius:6px;';
  box.textContent = String(msg);
  hudRoot.appendChild(box);
  hudRoot.classList.remove('hidden');
}

async function mountHUDForWebGPU() {
  try {
    const info = await getAdapterInfo();
    hudRoot.innerHTML = hudHtml(info);
    toggleHUD(true);
  } catch (e) {
    const html = hudHtml({ name: 'WebGL2 (no adapter info)', features: new Set(), limits: {} });
    hudRoot.innerHTML = html;
    toggleHUD(true);
    log('HUD fallback: WebGL2, no adapter info.');
  }
}

async function runWebGPU() {
  if (!('gpu' in navigator)) return null;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return null;

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) return null;

  // Device-lost handling
  let lost = false;
  onDeviceLost(device, (info) => {
    lost = true;
    const msg = `WebGPU device lost: reason=${info?.reason || 'unknown'} message=${info?.message || ''}`;
    console.warn(msg);
    banner(msg);
  });

  const format = navigator.gpu.getPreferredCanvasFormat();
  const { vertexData } = createFullscreenTriangle();

  // Initial configure
  {
    const [w, h] = targetSize();
    resizeWebGPU(canvas, context, device, format, { alphaMode: 'opaque' }, w, h);
  }

  // Pipeline under validation scope
  const desc = buildClearPipelineDescriptor(format);
  let pipeline;
  {
    const res = await withValidation(device, () => {
      const vs = device.createShaderModule({ code: WGSL_CLEAR_VERT });
      const fs = device.createShaderModule({ code: WGSL_CLEAR_FRAG });
      pipeline = device.createRenderPipeline({
        ...desc,
        vertex: { ...desc.vertex, module: vs },
        fragment: { ...desc.fragment, module: fs }
      });
    });
    if (!res.ok) {
      banner(`Validation error creating clear pipeline: ${res.message}`);
      log(`Validation error: ${res.message}`);
    }
  }

  // Geometry buffer
  const vbo = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vbo, 0, vertexData);

  const clear = readClearParam();

  // Mount HUD (WebGPU path)
  await mountHUDForWebGPU();

  function frame() {
    if (lost) return; // stop loop if device is lost
    // Resize (reconfigure only when dimensions change)
    const [w, h] = targetSize();
    resizeWebGPU(canvas, context, device, format, { alphaMode: 'opaque' }, w, h);

    const encoder = device.createCommandEncoder();
    const view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass(beginRenderPassDescriptor(view, clear));
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vbo, 0, vertexData.byteLength);
    pass.draw(3, 1, 0, 0);
    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return { backend: 'webgpu', device, adapter, context };
}

function runWebGL2() {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) return null;

  // Context loss logging
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    const msg = 'WebGL2 context lost';
    console.warn(msg);
    banner(msg);
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    const msg = 'WebGL2 context restored — reload page to resume';
    console.warn(msg);
    banner(msg);
  }, false);

  // Minimal passthrough pipeline (GLSL ES 3.00)
  const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;
  const FRAG = `#version 300 es
precision highp float;
out vec4 o_col;
void main(){ o_col = vec4(0.08, 0.08, 0.08, 1.0); }`;

  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, VERT);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vs) || 'Vertex shader compile failed';
    gl.deleteShader(vs);
    throw new Error(info);
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, FRAG);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fs) || 'Fragment shader compile failed';
    gl.deleteShader(fs);
    gl.deleteShader(vs);
    throw new Error(info);
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) || 'Program link failed';
    gl.deleteProgram(prog);
    throw new Error(info);
  }

  // Geometry
  const { vertexData } = createFullscreenTriangle();
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  gl.useProgram(prog);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

  // HUD (WebGL2 fallback message)
  hudRoot.innerHTML = hudHtml({ name: 'WebGL2 (no adapter info)', features: new Set(), limits: {} });
  toggleHUD(true);

  const clear = readClearParam();

  function frame() {
    const [w, h] = targetSize();
    resizeWebGL2(canvas, gl, w, h);      // sets canvas size + viewport
    applyGLClear(gl, clear);             // validated clearColor + gl.clear
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return { backend: 'webgl2', gl };
}

(async function main() {
  try {
    const env = {
      webgpu: { available: 'gpu' in navigator, features: new Set() },
      webgl2: { available: !!canvas.getContext('webgl2') }
    };
    const preferred = selectBackend(env, []); // no feature requirements for M1
    const started = preferred === 'webgpu'
      ? await runWebGPU() || runWebGL2()
      : runWebGL2() || await runWebGPU();

    if (!started) throw new Error('No WebGPU or WebGL2 context available');
    log(`Backend: ${started.backend}`);
  } catch (e) {
    console.error(e);
    log(String(e));
  }
})();

// Toggle HUD with 'h'
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'h' || ev.key === 'H') toggleHUD();
});
