// M1 Clear demo: pick WebGPU when available, otherwise WebGL2.
// Expects a <canvas id="gfx"> in the HTML.

const canvas = document.querySelector('#gfx');

(async function main() {
  if (navigator.gpu) {
    await runWebGPU();
  } else {
    runWebGL2();
  }
})();

async function runWebGPU() {
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) * 0.001;
    const r = 0.5 + 0.5 * Math.sin(t * 1.7);
    const g = 0.5 + 0.5 * Math.sin(t * 1.1 + 2.1);
    const b = 0.5 + 0.5 * Math.sin(t * 0.7 + 4.2);

    const encoder = device.createCommandEncoder();
    const view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r, g, b, a: 1 }
      }]
    });
    pass.end();
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function runWebGL2() {
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) {
    document.body.insertAdjacentHTML('beforeend', `<p>WebGL2 not available.</p>`);
    return;
  }

  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) * 0.001;
    const r = 0.5 + 0.5 * Math.sin(t * 1.7);
    const g = 0.5 + 0.5 * Math.sin(t * 1.1 + 2.1);
    const b = 0.5 + 0.5 * Math.sin(t * 0.7 + 4.2);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(r, g, b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
