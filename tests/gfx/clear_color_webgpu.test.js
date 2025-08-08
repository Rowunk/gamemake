import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginRenderPassDescriptor } from '../../src/gfx/clearcolor.js';

test('beginRenderPassDescriptor wires view and normalized clear value', () => {
  const fakeView = { __id: 'view' }; // identity check only
  const desc = beginRenderPassDescriptor(fakeView, [0.1, 0.2, 0.3, 0.4]);

  assert.ok(desc && desc.colorAttachments && Array.isArray(desc.colorAttachments));
  const ca = desc.colorAttachments[0];

  // View identity must be preserved
  assert.strictEqual(ca.view, fakeView);

  // load/store ops
  assert.equal(ca.loadOp, 'clear');
  assert.equal(ca.storeOp, 'store');

  // Clear value equality
  assert.deepStrictEqual(ca.clearValue, { r: 0.1, g: 0.2, b: 0.3, a: 0.4 });
});
