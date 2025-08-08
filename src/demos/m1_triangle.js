// Minimal WebGL2 triangle with a pulsing color.
// Expects <canvas id="gfx">.

const canvas = document.querySelector('#gfx');
const gl = canvas.getContext('webgl2', { antialias: true });
if (!gl) {
  throw new Error('WebGL2 not available');
}

const vsSrc = `#version 300 es
layout(location=0) in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const fsSrc = `#version 300 es
precision highp float;
uniform float uT;
out vec4 outColor;
void main() {
  float r = 0.5 + 0.5 * sin(uT*1.7);
  float g = 0.5 + 0.5 * sin(uT*1.1 + 2.1);
  float b = 0.5 + 0.5 * sin(uT*0.7 + 4.2);
  outColor = vec4(r,g,b,1.0);
}`;

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'shader compile failed');
  }
  return sh;
}
function program(vs, fs) {
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
  }
  return prog;
}

const prog = program(compile(gl.VERTEX_SHADER, vsSrc), compile(gl.FRAGMENT_SHADER, fsSrc));
const uTLoc = gl.getUniformLocation(prog, 'uT');

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const verts = new Float32Array([
  0,  0.8,
 -0.8, -0.8,
  0.8, -0.8,
]);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

gl.bindVertexArray(null);

gl.useProgram(prog);

let t0 = performance.now();
function frame(now) {
  const t = (now - t0) * 0.001;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.05, 0.05, 0.07, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(prog);
  gl.uniform1f(uTLoc, t);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
