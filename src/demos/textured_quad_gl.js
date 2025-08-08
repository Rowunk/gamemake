// src/demos/textured_quad_gl.js
// WebGL2 textured quad demo matching the WebGPU one. Zero deps.

'use strict';

// --- tiny mat4 (identity) ----------------------------------------------------
function mat4Identity() {
  return new Float32Array([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1,
  ]);
}

// --- checkerboard as ImageBitmap --------------------------------------------
async function makeCheckerboardBitmap(w = 256, h = 256, cell = 32) {
  let cnv, ctx;
  if (typeof OffscreenCanvas !== 'undefined') {
    cnv = new OffscreenCanvas(w, h);
    ctx = cnv.getContext('2d');
  } else {
    cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    ctx = cnv.getContext('2d');
  }

  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const i = ((x / cell) | 0) + ((y / cell) | 0);
      ctx.fillStyle = (i & 1) ? '#f59e0b' : '#3b82f6';
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,h); ctx.moveTo(w,0); ctx.lineTo(0,h); ctx.stroke();

  if (cnv instanceof OffscreenCanvas) return await createImageBitmap(cnv);
  return await new Promise(res => cnv.toBlob(async b => res(await createImageBitmap(b))));
}

// --- GL helpers --------------------------------------------------------------
function createShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile failed: ${info}`);
  }
  return sh;
}

function createProgram(gl, vsSrc, fsSrc) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Program link failed: ${info}`);
  }
  return prog;
}

// --- main --------------------------------------------------------------------
(async function main() {
  const canvas = document.getElementById('c');
  const msg = document.getElementById('msg');

  /** @type {WebGL2RenderingContext} */
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) { msg.textContent = 'WebGL2 unavailable.'; return; }

  // Shaders: location 0 = position, 1 = uv
  const VS = `#version 300 es
  layout(location=0) in vec3 position;
  layout(location=1) in vec2 uv;
  uniform mat4 uMVP;
  out vec2 vUV;
  void main() {
    gl_Position = uMVP * vec4(position, 1.0);
    vUV = uv;
  }`;
  const FS = `#version 300 es
  precision mediump float;
  in vec2 vUV;
  uniform sampler2D uTex;
  out vec4 fragColor;
  void main() {
    fragColor = texture(uTex, vUV);
  }`;

  const prog = createProgram(gl, VS, FS);
  gl.useProgram(prog);
  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  gl.uniformMatrix4fv(uMVP, false, mat4Identity());

  // Geometry: identical to WebGPU demo
  const positions = new Float32Array([
    -1, -1, 0,
     1, -1, 0,
    -1,  1, 0,
     1,  1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0, 1,
    1, 1,
  ]);
  const indices = new Uint16Array([0,1,2, 2,1,3]);

  // Buffers
  const vboPos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vboPos);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  const vboUV = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vboUV);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

  const ebo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  // Texture
  const bmp = await makeCheckerboardBitmap(256, 256, 32);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp);

  // State & loop
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.07, 0.08, 0.12, 1.0);

  function frame() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})().catch(e => {
  document.getElementById('msg').textContent = `Error: ${e?.message || e}`;
  console.error(e);
});
