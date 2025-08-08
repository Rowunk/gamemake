'use strict';
export const $ = (sel, root = document) => root.querySelector(sel);
export function el(tag, attrs = {}, parent = document.body) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) (k === 'text') ? (n.textContent = v) : n.setAttribute(k, v);
  parent.appendChild(n); return n;
}
export function rafLoop(fn) {
  let id = 0; const tick = (t) => { id = requestAnimationFrame(tick); fn(t); };
  id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id);
}
export function onResize(cb) {
  let id = 0;
  const sched = () => { if (!id) id = requestAnimationFrame(() => { id = 0; cb(); }); };
  addEventListener('resize', sched); sched();
}
