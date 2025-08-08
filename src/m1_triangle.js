// src/m1_triangle.js
'use strict';

import { selectBackend } from './gfx/backend.js';
import {
  buildColorPipelineDescriptor, WGSL_COLOR_VERT, WGSL_COLOR_FRAG,
  makeColorBindGroupDescriptor, computeColorAt
} from './gfx/color_pass.js';
import { createFullscreenTriangle } from './gfx/geometry.js';
import { resizeWebGPU, resizeWebGL2 } from './gfx/resize.js';
import { getAdapterInfo } from './gfx/adapter_info.js';
import { hudHtml } from './gfx/hud.js';
import { FpsCounter } from './core/time/fps.js';
import { makeClock } from './core/time/clock.js';
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

function toggleHUD(show) {
  if (!hudRoot) return;
  if (typeof show === 'boolean') hudRoot.classList.toggle('hidden', !show);
  else hudRoot.classList.toggle('hidden');
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
  } catch {
    hudRoot.innerHTML = hudHtml({ name: 'WebGL2 (no adapter info)', features: new Set(), limits: {} });
    toggleHUD(true);
  }
}

const fps = new FpsCounter({ window: 60 });
const clock = makeClock({ maxDelta: 0.25 });
let fpsStamp = 0;

function updateFpsLog(t) {
  // Update the log at ~2Hz
  if (t - fpsStamp > 0.5) {
    fpsStamp = t;
    if (logEl) {
      const line = `t=${t.toFixed(2)}s  fps=${fps.instant.toFixed(1)}  avg=${fps.avg.toFixed(1)}`;
      const lines = logEl.textContent.split('\n').filter(Boolean);
      // Keep last 8 lines max
      lines.push(line);
      while (lines.length > 8) lines.shift();
      logEl.textContent = lines.join('\n');
    }
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

  // Configure surface once with initial size
  {
    const [w, h] = targetSize();
    resizeWebGPU(canvas, context, device, format, { alphaMode: 'opaque' }, w, h);
  }

  // Build pipeline under a validation scope
  const desc = buildColorPipelineDescriptor(format);
  let pipeline;
  {
    const res = await withValidation(device, () => {
      const vs = device.createShaderModule({ code: WGSL_COLOR_VERT });
      const fs = device.createShaderModule({ code: WGSL_COLOR_FRAG });
      pipeline = device.createRenderPipeline({
        ...desc,
        vertex: { ...desc.vertex, module: vs },
        fragment: { ...desc.fragment, module: fs }
      });
    });
    if (!res.ok) {
      banner(`Validation error creating pipeline: ${res.message}`);
      log(`Validation error: ${res.message}`);
    }
  }

  // Geometry buffer
  const vbo = device.createBuffer({
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vbo, 0, vertexData);

  // Uniform buffer (vec4<f32>) + bind group
  const ubo = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  const bgl = pipeline.getBindGroupLayout(0);
  const bindGroup = device.createBindGroup({
    layout: bgl,
    entries: [{ binding: 0, resource: { buffer: ubo, offset: 0, size: 16 } }]
  });

  // HUD
  await mountHUDForWebGPU();

  function frame(ts_ms) {
    if (lost) return; // stop loop if device is lost
    const { t, dt } = clock.tick(ts_ms * 0.001);
    fps.sample(dt);

    const color = new Float32Array(computeColorAt(t));
    device.queue.writeBuffer(ubo, 0, color.buffer, color.byteOffset, color.byteLength);

    const [w, h] = targetSize();
    resizeWebGPU(canvas, context, device, format, { alphaMode: 'opaque' }, w, h);

    const encoder = device.createCommandEncoder();
    const view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 }
      }]
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vbo, 0, vertexData.byteLength);
    pass.draw(3, 1, 0, 0);
    pass.end();

    device.queue.submit([encoder.finish()]);
    updateFpsLog(t);
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

  // Triangle shaders with uniform color
  const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 o_col;
void main(){ o_col = uColor; }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(s) || 'Shader compile failed';
      gl.deleteShader(s);
      throw new Error(info);
    }
    return s;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, 'a_pos');
  gl.linkProgram(prog);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog) || 'Program link failed';
    gl.deleteProgram(prog);
    throw new Error(info);
  }

  const { vertexData } = createFullscreenTriangle();
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  gl.useProgram(prog);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  const uColorLoc = gl.getUniformLocation(prog, 'uColor');

  // HUD fallback
  hudRoot.innerHTML = hudHtml({ name: 'WebGL2 (no adapter info)', features: new Set(), limits: {} });
  toggleHUD(true);

  function frame(ts_ms) {
    const { t, dt } = clock.tick(ts_ms * 0.001);
    fps.sample(dt);
    const [r,g,b,a] = computeColorAt(t);

    const [w, h] = targetSize();
    resizeWebGL2(canvas, gl, w, h);      // sets viewport
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(prog);
    gl.uniform4f(uColorLoc, r, g, b, a);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    updateFpsLog(t);
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
    const preferred = selectBackend(env, []); // no special feature requirements
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

// HUD toggle
window.addEventListener('keydown', (ev) => { if (ev.key === 'h' || ev.key === 'H') { hudRoot.classList.toggle('hidden'); } });
// Per-frame handles resize; no extra work on 'resize' event.
