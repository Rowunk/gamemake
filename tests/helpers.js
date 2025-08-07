import assert from 'node:assert/strict';

/** ε-equality for scalars */
export const eq = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) <= eps, `|${a}−${b}| > ${eps}`);

/** ε-equality for VecN (2/3/4) */
export function eqVec(a, b, eps = 1e-6) {
  for (const k of Object.keys(a)) eq(a[k], b[k], eps);
}

