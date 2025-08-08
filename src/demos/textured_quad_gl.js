// WebGL2 textured quad (procedural 2x2 checker).
// Expects <canvas id="gfx">.

const canvas = document.querySelector('#gfx');
const gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) throw new Error('WebGL2 not available');

const vsSrc = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec2 aUV;
out vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPos, 1.0);
}`;
const fsSrc = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
out vec4 outColor;
void main() {
  outColor = texture(uTex, vUV);
}`;

function sh(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s));
  }
  return s;
}
function prog(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p));
  }
  return p;
}

const program = prog(sh(gl.VERTEX_SHADER, vsSrc), sh(gl.FRAGMENT_SHADER, fsSrc));
gl.useProgram(program);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const positions = new Float32Array([
  -0.8, -0.8, 0,
   0.8, -0.8, 0,
   0.8,  0.8, 0,
  -0.8,  0.8, 0,
]);
const uvs = new Float32Array([
  0,0,
  1,0,
  1,1,
  0,1,
]);
const indices = new Uint16Array([0,1,2, 0,2,3]);

const posBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

const uvBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

const ibo = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

gl.bindVertexArray(null);

const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
const data = new Uint8Array([
  255,  64,  64,255,   64,255, 64,255,
   64,  64, 255,255,  255,255, 64,255,
]);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

const uTexLoc = gl.getUniformLocation(program, 'uTex');
gl.useProgram(program);
gl.uniform1i(uTexLoc, 0);

function frame() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.04, 0.05, 0.07, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
