// public/lib/testkit.js
'use strict';

// Parse ?backend=webgpu|webgl2, ?expect=..., ?headless, ?seed=123
export function parseFlags() {
  const sp = new URLSearchParams(location.search);
  const backend = (sp.get('backend') || '').toLowerCase() || null;
  const expect  = (sp.get('expect')  || '').toLowerCase() || null;
  const headless = sp.has('headless');
  const seed = sp.has('seed') ? Number(sp.get('seed')) : null;
  return { backend, expect, headless, seed };
}

// Hide panels in headless/CI
export function applyHeadless(on = true) {
  if (!on) return;
  const s = document.createElement('style');
  s.textContent = `.panel{display:none !important}`;
  document.head.appendChild(s);
}

// Minimal assertion helper that paints a PASS/FAIL badge
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
      document.body.appendChild(d);
      return d;
    })();

  let pass = 0, fail = 0;
  const update = () => {
    statusEl.textContent = `${label ? label + ' · ' : ''}PASS ${pass} / FAIL ${fail}`;
    statusEl.style.color = fail ? '#ff9a9a' : '#c8ffc8';
  };
  const log = (ok, msg, exp, got) => {
    const tag = ok ? 'PASS' : 'FAIL';
    const parts = [`[${tag}] ${msg || ''}`];
    if (exp !== undefined || got !== undefined) parts.push(`expected=${exp} got=${got}`);
    (ok ? console.debug : console.error)(parts.join(' '));
  };

  const t = {
    ok(cond, msg) { const ok = !!cond; ok ? pass++ : fail++; log(ok, msg); update(); return ok; },
    eq(a, b, msg) { const ok = Object.is(a, b); ok ? pass++ : fail++; log(ok, msg, b, a); update(); return ok; },
    close(a, b, eps = 1e-3, msg) {
      const ok = Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= eps;
      ok ? pass++ : fail++; log(ok, msg, `${b}±${eps}`, a); update(); return ok;
    },
    summary() { update(); return { pass, fail }; }
  };
  update();
  return t;
}

// Tiny seeded RNG (for demos that want determinism)
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

export const Flags = parseFlags();
