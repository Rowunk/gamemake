'use strict';
export const hasWebGPU = () => !!(navigator && navigator.gpu);
export const hasWebGL2 = (canvas) => !!canvas.getContext('webgl2');
export function hexToRGBA1(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n>>16)&255)/255, ((n>>8)&255)/255, (n&255)/255, 1];
}
