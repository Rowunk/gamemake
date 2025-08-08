// tests/gfx/mipgen.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMipGenerator } from '../../src/gfx/mipgen.js';

// ------- Fakes -------
class FakePipeline {
  getBindGroupLayout(i) { return { __t: 'layout', index: i }; }
}

class FakeDevice {
  constructor() {
    this.samplerDescs = [];
    this.pipelineDescs = [];
    this.bindGroups = [];
    this.modules = [];
  }
  createSampler(desc) { this.samplerDescs.push(desc); return { __t: 'sampler' }; }
  createShaderModule(mod) { this.modules.push(mod); return { __t: 'module', code: mod.code }; }
  createRenderPipeline(desc) { this.pipelineDescs.push(desc); return new FakePipeline(); }
  createBindGroup(desc) { this.bindGroups.push(desc); return { __t: 'bind', desc }; }
}

class FakePass {
  constructor(rec) { this._rec = rec; }
  setPipeline(p) { this._rec.pipeline = p; }
  setBindGroup(slot, bg) { (this._rec.binds ||= []).push({ slot, bg }); }
  draw(n) { this._rec.draw = n; }
  end() { this._rec.ended = true; }
}

class FakeEncoder {
  constructor(rec) { this._rec = rec; }
  beginRenderPass(desc) {
    const passRec = { desc };
    this._rec.passes.push(passRec);
    return new FakePass(passRec);
  }
}

class FakeTexture {
  constructor() { this.views = []; }
  createView(opts) {
    const v = { __t: 'view', ...opts };
    this.views.push(v);
    return v;
  }
}
// -----------------------

test('no-op when mipLevelCount <= 1 (pipeline not built)', () => {
  const dev = new FakeDevice();
  const gen = makeMipGenerator(dev, { format: 'rgba8unorm' });
  const rec = { passes: [] };
  const enc = new FakeEncoder(rec);
  const tex = new FakeTexture();

  gen.generate(enc, tex, 256, 256, 1);
  assert.equal(rec.passes.length, 0);
  assert.equal(dev.pipelineDescs.length, 0);
});

test('generates N-1 passes, one per mip level', () => {
  const dev = new FakeDevice();
  const gen = makeMipGenerator(dev, { format: 'rgba8unorm' });
  const rec = { passes: [] };
  const enc = new FakeEncoder(rec);
  const tex = new FakeTexture();

  gen.generate(enc, tex, 64, 32, 6); // levels 0..5 -> 5 passes

  assert.equal(rec.passes.length, 5);
  assert.equal(dev.pipelineDescs.length, 1, 'pipeline built once');
  assert.equal(dev.samplerDescs.length, 1, 'sampler created once');

  // Verify bind groups: source is previous level each time
  assert.equal(dev.bindGroups.length, 5);
  for (let i = 0; i < 5; i++) {
    const bg = dev.bindGroups[i];
    const entries = bg.entries;
    assert.equal(entries.length, 2);
    // binding 0 sampler, binding 1 sampled texture view
    const samp = entries.find(e => e.binding === 0)?.resource;
    const texView = entries.find(e => e.binding === 1)?.resource;
    assert.ok(samp && samp.__t === 'sampler');
    assert.ok(texView && texView.__t === 'view' && texView.baseMipLevel === i && texView.mipLevelCount === 1);
  }

  // Verify color attachment goes to dest mip level
  for (let i = 0; i < 5; i++) {
    const pass = rec.passes[i];
    const color = pass.desc.colorAttachments[0];
    const view = color.view;
    assert.ok(view && view.__t === 'view');
    assert.equal(view.baseMipLevel, i + 1);
    assert.equal(view.mipLevelCount, 1);
    // draw(3) FS triangle
    assert.equal(pass.draw, 3);
    assert.ok(pass.ended);
  }

  // Fragment target format wired
  const tgt = dev.pipelineDescs[0].fragment.targets[0].format;
  assert.equal(tgt, 'rgba8unorm');
});

test('invalid sizes throw', () => {
  const dev = new FakeDevice();
  const gen = makeMipGenerator(dev, {});
  const rec = { passes: [] };
  const enc = new FakeEncoder(rec);
  const tex = new FakeTexture();

  assert.throws(() => gen.generate(enc, tex, 0, 32, 2));
  assert.throws(() => gen.generate(enc, tex, 32, 0, 2));
  assert.throws(() => gen.generate(enc, tex, Infinity, 32, 2));
});
