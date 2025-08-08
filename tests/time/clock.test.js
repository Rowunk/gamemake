import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClock } from '../../src/core/time/clock.js';

test('makeClock: monotonic dt with cap', () => {
  let now = 0;
  const getTimeSec = () => now;
  const clock = makeClock({ getTimeSec, maxDelta: 0.25 }); // 250 ms cap

  // First tick — dt = 0
  let s = clock.tick(now);
  assert.equal(s.dt, 0);
  assert.equal(s.t, 0);

  // Advance 16ms
  now += 0.016;
  s = clock.tick(now);
  assert.ok(s.dt > 0 && s.dt <= 0.0161);
  assert.ok(s.t > 0);

  // Big jump gets clamped to 0.25
  now += 1.0;
  s = clock.tick(now);
  assert.equal(s.dt, 0.25);
});

test('makeClock: ignores time going backwards', () => {
  let now = 0.1;
  const getTimeSec = () => now;
  const clock = makeClock({ getTimeSec, maxDelta: 0.5 });

  clock.tick(now);
  // Move backwards (clock skew) — dt becomes 0
  now -= 1.0;
  const s = clock.tick(now);
  assert.equal(s.dt, 0);
  // Next forward tick works again
  now += 0.033;
  const s2 = clock.tick(now);
  assert.ok(s2.dt > 0);
});
