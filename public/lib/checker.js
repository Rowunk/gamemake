'use strict';
export function makeCheckerRGBA8(w = 256, h = 256, cells = 8) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const c = ((((x * cells / w) | 0) ^ ((y * cells / h) | 0)) & 1) ? 220 : 60;
    data[i+0]=c; data[i+1]=c; data[i+2]=255; data[i+3]=255;
  }
  return { width:w, height:h, data };
}
