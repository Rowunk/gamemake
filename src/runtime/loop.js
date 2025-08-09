// src/runtime/loop.js
'use strict';

/*───────────────────────────────────────────────────────────────────────────*\
| Pure fixed-step accumulator                                                 |
\*───────────────────────────────────────────────────────────────────────────*/

/**
 * Create a fixed-step accumulator.
 *
 * Options:
 *   - stepSeconds (number, >0)        size of a fixed update step in seconds (default 1/60)
 *   - maxUpdatesPerAdvance (integer)  max fixed steps to run in a single advance() call (default 240)
 *
 * Returns:
 *   {
 *     advance(elapsedMs, update),
 *     step(elapsedMs, update) // alias of advance
 *   }
 *
 * advance() result:
 *   { steps, updates, alpha, panic, dropped }
 *     - steps/updates: how many fixed updates ran
 *     - alpha       : leftover fraction in [0,1)
 *     - panic/dropped: backlog was discarded (hit maxUpdatesPerAdvance)
 */
export function createStepper(options = {}) {
  const stepSeconds =
    Number.isFinite(options.stepSeconds) && options.stepSeconds > 0
      ? +options.stepSeconds
      : 1 / 60;

  const maxUpdates =
    (options.maxUpdatesPerAdvance | 0) > 0
      ? (options.maxUpdatesPerAdvance | 0)
      : 240;

  let carrySeconds = 0;
  const EPS = 1e-12;

  function advance(elapsedMs, update) {
    if (!Number.isFinite(elapsedMs)) throw new TypeError('elapsedMs must be finite');
    if (typeof update !== 'function') throw new TypeError('update must be a function');

    // clamp negatives to 0, convert ms → s
    carrySeconds += Math.max(0, +elapsedMs) / 1000;

    let steps = 0;
    while (carrySeconds + EPS >= stepSeconds && steps < maxUpdates) {
      update(stepSeconds);
      carrySeconds -= stepSeconds;
      steps++;
    }

    let panic = false;
    if (carrySeconds + EPS >= stepSeconds) {
      // backlog too large → drop remainder to avoid spiral-of-death
      carrySeconds = 0;
      panic = true;
    }

    if (carrySeconds < 0) carrySeconds = 0;
    const alpha = Math.max(0, Math.min(1 - Number.EPSILON, carrySeconds / stepSeconds));

    return {
      steps,
      updates: steps,
      alpha,
      panic,
      dropped: panic,
    };
  }

  const step = (elapsedMs, update) => advance(elapsedMs, update);
  return { advance, step };
}

/*───────────────────────────────────────────────────────────────────────────*\
| Real-time runner (RAF)                                                      |
\*───────────────────────────────────────────────────────────────────────────*/

/**
 * Create a real-time loop runner built on top of createStepper().
 *
 * Options:
 *   - stepSeconds (default 1/60)
 *   - maxUpdatesPerAdvance (default 240)
 *   - maxFrameSeconds  (frame clamp, default 0.25s)
 *   - now   : () => seconds   (defaults to performance.now()/1000 or Date.now()/1000)
 *   - raf   : (cb) => handle  (defaults to requestAnimationFrame / setTimeout)
 *   - caf   : (handle) => void
 *   - onPanic?: ({ steps }) => void
 *
 * API:
 *   - start(update, render)
 *   - stop()
 *   - setUpdate(fn)
 *   - setRender(fn)
 *   - running (getter)
 */
export function createRunner({
  stepSeconds = 1 / 60,
  maxUpdatesPerAdvance = 240,
  maxFrameSeconds = 0.25,
  now,
  raf,
  caf,
  onPanic,
} = {}) {
  const defaultNow =
    (typeof performance !== 'undefined' && typeof performance.now === 'function')
      ? () => performance.now() / 1000
      : () => Date.now() / 1000;

  const _now = typeof now === 'function' ? now : defaultNow;

  const defaultRaf =
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame.bind(globalThis)
      : (cb) => setTimeout(() => cb(_now() * 1000), 16);

  const defaultCaf =
    typeof cancelAnimationFrame === 'function'
      ? cancelAnimationFrame.bind(globalThis)
      : clearTimeout;

  const _raf = raf || defaultRaf;
  const _caf = caf || defaultCaf;

  const stepper = createStepper({ stepSeconds, maxUpdatesPerAdvance });

  let update = () => {};
  let render = () => {};
  let running = false;
  let handle = 0;
  let last = 0;
  let fpsEma = 60;

  function tick() {
    if (!running) return;

    const t = _now();
    let frameSeconds = t - last;
    last = t;

    if (frameSeconds < 0) frameSeconds = 0;
    if (frameSeconds > maxFrameSeconds) frameSeconds = maxFrameSeconds;

    const { steps, alpha, panic } = stepper.advance(frameSeconds * 1000, update);
    if (panic && typeof onPanic === 'function') onPanic({ steps });

    const instFps = frameSeconds > 0 ? (1 / frameSeconds) : fpsEma;
    fpsEma = fpsEma * 0.9 + instFps * 0.1;

    render(alpha, { fps: fpsEma, dt: frameSeconds, now: t, stepsThisFrame: steps });

    handle = _raf(tick);
  }

  return {
    start(u, r) {
      if (u) update = u;
      if (r) render = r;
      if (running) return;
      running = true;
      last = _now();
      handle = _raf(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      _caf(handle);
    },
    setUpdate(fn) {
      if (typeof fn !== 'function') throw new TypeError('setUpdate(fn): fn must be a function');
      update = fn;
    },
    setRender(fn) {
      if (typeof fn !== 'function') throw new TypeError('setRender(fn): fn must be a function');
      render = fn;
    },
    get running() {
      return running;
    },
  };
}

export default createStepper;
