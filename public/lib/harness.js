'use strict';

// DOM helpers
export const $ = (sel, root = document) => root.querySelector(sel);
export function el(tag, attrs = {}, parent = document.body) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) (k === 'text' ? (n.textContent = v) : n.setAttribute(k, v));
  parent.appendChild(n); return n;
}

// Loops & resize
export function rafLoop(fn) { let id=0; const tick=t=>{ id=requestAnimationFrame(tick); fn(t); }; id=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(id); }
export function onResize(cb){ let id=0; const sched=()=>{ if(!id) id=requestAnimationFrame(()=>{ id=0; cb(); }); }; addEventListener('resize', sched); sched(); }
export function fitCanvasToDisplaySize(canvas) {
  const dpr = Math.max(1, Math.min(2, self.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width  * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w, h, dpr };
}

// GPU presence
export const hasWebGPU = () => !!(navigator && navigator.gpu);
export const hasWebGL2 = (canvas) => !!canvas.getContext('webgl2');

// Small util
export function hexToRGBA1(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255, 1];
}

// Tiny texture: checkerboard
export function makeCheckerRGBA8(w = 256, h = 256, cells = 8) {
  const data = new Uint8Array(w*h*4);
  for (let y=0;y<h;y++) for (let x=0;x<w;x++){
    const i=(y*w+x)*4;
    const c = ((((x*cells/w)|0) ^ ((y*cells/h)|0)) & 1) ? 220 : 60;
    data[i+0]=c; data[i+1]=c; data[i+2]=255; data[i+3]=255;
  }
  return { width:w, height:h, data };
}
