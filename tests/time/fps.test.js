import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FpsCounter } from '../../src/core/time/fps.js';

const approx = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;

test('FpsCounter: steady 60 FPS averages ~60', () => {
  const fps = new FpsCounter({ window: 60 });
  for (let i = 0; i < 60; i++) fps.sample(1 / 60);
  assert.ok(approx(fps.avg, 60));
  assert.ok(approx(fps.instant, 60));
});

test('FpsCounter: varying dt updates instant and windowed avg', () => {
  const fps = new FpsCounter({ window: 10 });
  // 30 FPS (dt=1/30) for 10 frames
  for (let i = 0; i < 10; i++) fps.sample(1 / 30);
  assert.ok(approx(fps.avg, 30, 0.25));

  // Then 60 FPS for 10 frames — average should move toward 60
  for (let i = 0; i < 10; i++) fps.sample(1 / 60);
  assert.ok(fps.avg > 40 && fps.avg < 60);
  assert.ok(approx(fps.instant, 60, 0.25));
});

test('FpsCounter: dt<=0 ignored, NaN guarded', () => {
  const fps = new FpsCounter({ window: 5 });
  fps.sample(0);
  fps.sample(-1);
  fps.sample(NaN);
  // No samples -> avg stays at 0
  assert.equal(fps.avg, 0);
  // Add one valid sample
  fps.sample(0.5); // 2 FPS
  assert.equal(fps.instant, 2);
  assert.equal(fps.avg, 2);
});
