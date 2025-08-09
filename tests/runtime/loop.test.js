import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from '../helpers.js';
import { createStepper } from '../../src/runtime/loop.js';

function rec() {
  const calls = [];
  return { fn: (dt) => calls.push(dt), calls };
}

describe('stepper: edge cases & precision', () => {
  it('zero elapsed → no updates, alpha unchanged (0)', () => {
    const s = createStepper({ stepSeconds: 1 / 60, maxUpdatesPerAdvance: 10 });
    const { fn, calls } = rec();

    const r = s.advance(0, fn);
    assert.equal(r.steps, 0);
    eq(r.alpha, 0, 1e-12);
    assert.equal(r.panic, false);
    assert.equal(calls.length, 0);
  });

  it('negative elapsed is ignored (clamped to 0)', () => {
    const s = createStepper({ stepSeconds: 1 / 60, maxUpdatesPerAdvance: 10 });
    const { fn, calls } = rec();

    const r = s.advance(-1000 /* ms */, fn);
    assert.equal(r.steps, 0);
    eq(r.alpha, 0, 1e-12);
    assert.equal(r.panic, false);
    assert.equal(calls.length, 0);
  });

  it('non-finite elapsed throws', () => {
    const s = createStepper({ stepSeconds: 1 / 60, maxUpdatesPerAdvance: 10 });
    assert.throws(() => s.advance(NaN, () => {}), /finite/i);
    assert.throws(() => s.advance(Infinity, () => {}), /finite/i);
  });

  it('update is called with a constant dt each time', () => {
    const stepSeconds = 1 / 60;
    const s = createStepper({ stepSeconds, maxUpdatesPerAdvance: 10 });
    const { fn, calls } = rec();

    // 3.2 steps worth of time
    const r = s.advance(3.2 * stepSeconds * 1000, fn);
    assert.equal(r.steps, 3);
    calls.forEach((d) => eq(d, stepSeconds, 1e-12));
  });

  it('accumulation is stable under tiny fractions (epsilon guard)', () => {
    const stepSeconds = 1 / 60;
    const s = createStepper({ stepSeconds, maxUpdatesPerAdvance: 100 });
    const { fn, calls } = rec();

    // Add 0.1 step ten times → should exactly produce 1 step, alpha≈0
    for (let i = 0; i < 10; i++) {
      const r = s.advance(0.1 * stepSeconds * 1000, fn);
      // no assertion per sub-advance; we assert at the end
      if (i === 9) {
        assert.equal(r.steps, 1);
        eq(r.alpha, 0, 1e-10);
      }
    }
    assert.equal(calls.length, 1);
    eq(calls[0], stepSeconds, 1e-12);
  });

  it('respects maxUpdatesPerAdvance and reports panic, clearing backlog', () => {
    const stepSeconds = 1 / 60;
    const s = createStepper({ stepSeconds, maxUpdatesPerAdvance: 2 });
    const { fn, calls } = rec();

    // 5 steps worth of time; only 2 allowed this advance
    const r = s.advance(5 * stepSeconds * 1000, fn);
    assert.equal(r.steps, 2);
    assert.equal(r.panic, true);
    // alpha should be reset to ~0 after dropping backlog
    eq(r.alpha, 0, 1e-12);
    assert.equal(calls.length, 2);
  });

  it('step() alias behaves exactly like advance()', () => {
    const stepSeconds = 1 / 60;
    const s = createStepper({ stepSeconds, maxUpdatesPerAdvance: 10 });
    const a = s.advance(0.5 * stepSeconds * 1000, () => {});
    const b = s.step(0.6 * stepSeconds * 1000, () => {}); // alias

    // After two calls, total 1.1 → second call should have produced 1 step, alpha 0.1
    assert.equal(b.steps, 1);
    eq(b.alpha, 0.1, 1e-12);
    assert.equal(b.panic, false);
  });
});
