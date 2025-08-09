// public/lib/testkit.js
'use strict';

/**
 * Tiny test harness for the demo pages.
 * - parseFlags(): reads ?backend, ?expect, ?headless, ?seed
 * - applyHeadless(): hides panels in headless/CI mode
 * - makeTester(): PASS/FAIL with readable console output + stable "[SMOKE]" lines
 * - makeRng(): deterministic Mulberry32 RNG
 *
 * Exports:
 *   - Flags
 *   - parseFlags, applyHeadless, makeTester, makeRng
 */

// ------------------------------ flags ------------------------------
export function parseFlags() {
  const sp = new URLSearchParams(location.search);
  const backend  = (sp.get('backend')  || '').toLowerCase() || null; // 'webgpu' | 'webgl2' | null
  const expect   = (sp.get('expect')   || '').toLowerCase() || null; // expected backend label
  const headless = sp.has('headless');                               // hide UI panels
  const seed     = sp.has('seed') ? Number(sp.get('seed')) : null;   // deterministic RNG
  return { backend, expect, headless, seed };
}

export const Flags = parseFlags();

// ------------------------------ headless UI ------------------------------
export function applyHeadless(on = true) {
  if (!on) return;
  const s = document.createElement('style');
  s.textContent = `.panel{display:none !important}`;
  document.head.appendChild(s);
}

// ------------------------------ console styling helpers ------------------------------
const supportsCssConsole =
  typeof window !== 'undefined' &&
  typeof window.navigator !== 'undefined' &&
  // Headless Chrome still *accepts* %c but doesn't colorize; that's fine.
  // We enable CSS but always include a plain, greppable line too.
  true;

const C = {
  pass: 'font-weight:600;padding:1px 4px;border-radius:3px;background:#163d16;color:#b7ffb7',
  fail: 'font-weight:600;padding:1px 4px;border-radius:3px;background:#4a1212;color:#ffb7b7',
  tag : 'opacity:.7;font-weight:600',
  dim : 'opacity:.7',
};

// ------------------------------ tester ------------------------------
/**
 * makeTester(label)
 *    t.ok(cond, msg?)
 *    t.eq(a, b, msg?)
 *    t.close(a, b, eps=1e-3, msg?)
 *    t.summary() -> { pass, fail }
 *
 * Behavior:
 *   - Paints a floating PASS/FAIL badge (#test-status) on the page
 *   - Logs colorized lines for humans + a stable "[SMOKE] ..." line for CI
 *   - Exposes window.__SMOKE_GET_SUMMARY__() for headless runners
 */
export function makeTester(label = '') {
  const statusEl =
    document.getElementById('test-status') ||
    (() => {
      const d = document.createElement('div');
      d.id = 'test-status';
      d.className = 'panel small';
      d.style.right = '8px';
      d.style.left = 'auto';
      d.style.top = '8px';
      d.style.position = 'fixed';
      d.style.zIndex = '9999';
      document.body.appendChild(d);
      return d;
    })();

  let pass = 0, fail = 0;

  const update = () => {
    statusEl.textContent = `${label ? label + ' · ' : ''}PASS ${pass} / FAIL ${fail}`;
    statusEl.style.color = fail ? '#ff9a9a' : '#c8ffc8';
  };

  const emit = (ok, msg, exp, got) => {
    const tag = ok ? 'PASS' : 'FAIL';

    // 1) Human-friendly line (colorized in DevTools)
    if (supportsCssConsole) {
      const parts = [];
      const styles = [];

      parts.push('%c' + tag);                styles.push(ok ? C.pass : C.fail);
      if (label) { parts.push('%c' + label); styles.push(C.tag); }
      if (msg)   { parts.push('%c' + msg);   styles.push(''); }

      if (exp !== undefined || got !== undefined) {
        parts.push('%c expected=%s got=%s');
        styles.push(C.dim);
        styles.push('');
        styles.push('');
        // choose sink based on ok
        (ok ? console.debug : console.error).apply(console, [...parts, ...styles, String(exp), String(got)]);
      } else {
        (ok ? console.debug : console.error).apply(console, [...parts, ...styles]);
      }
    }

    // 2) Stable, greppable line for CI/log parsers
    const stable = (() => {
      const bits = ['[SMOKE]', tag];
      if (label) bits.push(`${label}:`);
      if (msg) bits.push(msg);
      if (exp !== undefined || got !== undefined) bits.push(`expected=${exp} got=${got}`);
      return bits.join(' ');
    })();
    console.log(stable);              // always in stdout
    if (!ok) console.error(stable);   // also mark as error
  };

  const t = {
    ok(cond, msg) {
      const ok = !!cond;
      ok ? pass++ : fail++;
      emit(ok, msg);
      update();
      return ok;
    },
    eq(a, b, msg) {
      const ok = Object.is(a, b);
      ok ? pass++ : fail++;
      emit(ok, msg, b, a);
      update();
      return ok;
    },
    close(a, b, eps = 1e-3, msg) {
      const ok = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= eps;
      ok ? pass++ : fail++;
      emit(ok, msg, `${b}±${eps}`, a);
      update();
      return ok;
    },
    summary() { update(); return { pass, fail }; }
  };

  update();

  // Hook for headless runner
  window.__SMOKE_GET_SUMMARY__ = () => ({
    label,
    pass,
    fail,
    text: statusEl.textContent
  });

  return t;
}

// ------------------------------ deterministic RNG ------------------------------
export function makeRng(seed = 1337) {
  let s = (seed >>> 0) || 1;
  return () => {
    // Mulberry32
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
