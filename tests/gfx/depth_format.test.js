import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseDepthFormat, beginDepthRenderPassDescriptor } from '../../src/gfx/depth.js';

test('chooseDepthFormat: picks depth24plus if supported, else first fallback, else throws', () => {
  const s1 = new Set(['depth24plus', 'rgba8unorm']);
  assert.equal(chooseDepthFormat(s1), 'depth24plus');

  const s2 = new Set(['depth32float']);
  assert.equal(chooseDepthFormat(s2, ['depth32float', 'depth24plus']), 'depth32float');

  assert.throws(() => chooseDepthFormat(new Set(['rgba8unorm'])), /no supported depth/i);
});

test('beginDepthRenderPassDescriptor: wires color + depth clear/load/store', () => {
  const colorView = { __view: 'color' };
  const depthView = { __view: 'depth' };

  const desc = beginDepthRenderPassDescriptor(colorView, depthView, { r: 0.1, g: 0.2, b: 0.3, a: 1 }, 1.0);
  // Color
  assert.equal(desc.colorAttachments[0].view, colorView);
  assert.equal(desc.colorAttachments[0].loadOp, 'clear');
  assert.equal(desc.colorAttachments[0].storeOp, 'store');
  assert.deepEqual(desc.colorAttachments[0].clearValue, { r: 0.1, g: 0.2, b: 0.3, a: 1 });
  // Depth
  assert.equal(desc.depthStencilAttachment.view, depthView);
  assert.equal(desc.depthStencilAttachment.depthLoadOp, 'clear');
  assert.equal(desc.depthStencilAttachment.depthStoreOp, 'store');
  assert.equal(desc.depthStencilAttachment.depthClearValue, 1.0);
});
