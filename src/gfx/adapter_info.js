// @ts-check
'use strict';

/**
 * @file Adapter/adapterInfo utilities for WebGPU, with safe fallbacks for tests.
 * The tests assert:
 *  - uses `adapterInfo.description` when available
 *  - falls back to "Unknown GPU" when `requestAdapterInfo` is missing
 *  - throws when WebGPU is not available
 */

/**
 * Minimal shape of `navigator.gpu` (or injected mock).
 * Keep JSDoc types simple to play nicely with jsdoc.
 * @typedef {Object} GpuRoot
 * @property {Function} [requestAdapter]
 */

/**
 * Environment object that can inject a GPU root (for tests/mocks).
 * @typedef {Object} AdapterEnv
 * @property {GpuRoot} [gpu]
 */

/**
 * Minimal shape of a WebGPU adapter (real or mocked).
 * @typedef {Object} GpuAdapterLike
 * @property {Set<string>} [features]
 * @property {Map<string, number>|Record<string, number>} [limits]
 * @property {Function} [requestAdapterInfo]
 */

/**
 * Plain, serializable adapter info returned by {@link getAdapterInfo}.
 * @typedef {Object} BasicAdapterInfo
 * @property {string} name Human-readable adapter description, or "Unknown GPU".
 * @property {string[]} features Sorted list of feature names (may be empty).
 * @property {Record<string, number>} limits Plain object with numeric limits (may be empty).
 */

/**
 * Convert various iterable shapes (Set/Map/WebGPU-ish objects) to plain arrays/objects,
 * in a way that’s friendly to node tests and docs.
 * @param {unknown} features
 * @param {unknown} limits
 * @returns {{ features: string[], limits: Record<string, number> }}
 */
function normalizeFeaturesAndLimits(features, limits) {
  /** @type {string[]} */
  let feat = [];
  if (features && typeof (/** @type {any} */ (features).forEach) === 'function') {
    /** @type {any} */ (features).forEach((v) => {
      if (typeof v === 'string') feat.push(v);
    });
  } else if (Array.isArray(features)) {
    feat = features.filter((v) => typeof v === 'string');
  }
  feat.sort();

  /** @type {Record<string, number>} */
  const lim = {};
  if (limits) {
    const any = /** @type {any} */ (limits);
    if (typeof any.entries === 'function') {
      for (const [k, v] of any.entries()) {
        if (typeof k === 'string' && Number.isFinite(+v)) lim[k] = +v;
      }
    } else if (typeof any === 'object') {
      for (const k of Object.keys(any)) {
        const v = any[k];
        if (Number.isFinite(+v)) lim[k] = +v;
      }
    }
  }
  return { features: feat, limits: lim };
}

/**
 * Get a small, portable snapshot of the current WebGPU adapter.
 *
 * Looks up the GPU root from `env.gpu` first (for tests), then falls back to
 * `navigator.gpu` if present. Throws if neither is available.
 *
 * If the adapter exposes `requestAdapterInfo()`, its `description` is used as the
 * human-readable name. Otherwise, the name falls back to `"Unknown GPU"`.
 *
 * @param {AdapterEnv} [env]
 * @returns {Promise<BasicAdapterInfo>}
 * @throws {Error} If WebGPU is not available (no `gpu` root can be found).
 *
 * @example
 * const info = await getAdapterInfo();
 * console.log(info.name, info.features, info.limits);
 */
export async function getAdapterInfo(env = {}) {
  const gpu =
    (env && env.gpu) || /** @type {any} */ (globalThis.navigator && globalThis.navigator.gpu);

  if (!gpu || typeof gpu.requestAdapter !== 'function') {
    throw new Error('WebGPU not available: no gpu.requestAdapter');
  }

  /** @type {GpuAdapterLike|undefined} */
  const adapter = /** @type {any} */ (await gpu.requestAdapter({}));

  let name = 'Unknown GPU';
  if (adapter && typeof adapter.requestAdapterInfo === 'function') {
    try {
      const info = await /** @type {any} */ (adapter.requestAdapterInfo());
      if (info && typeof info.description === 'string' && info.description) {
        name = info.description;
      }
    } catch {
      // keep fallback name
    }
  }

  const norm = normalizeFeaturesAndLimits(
    adapter && /** @type {any} */ (adapter).features,
    adapter && /** @type {any} */ (adapter).limits
  );

  /** @type {BasicAdapterInfo} */
  const result = {
    name,
    features: norm.features,
    limits: norm.limits,
  };
  return result;
}

/**
 * Create a concise, human-readable one-line summary.
 * Used by tests to assert presence of name and some limits.
 * @param {BasicAdapterInfo} info
 * @returns {string}
 *
 * @example
 * summarizeAdapterInfo({ name:'GPU', features:['a'], limits:{maxBindGroups:4} })
 * // "GPU — features: a; limits: maxBindGroups: 4"
 */
export function summarizeAdapterInfo(info) {
  const feats =
    info.features && info.features.length
      ? `features: ${info.features.join(', ')}`
      : 'features: (none)';

  const limsEntries = Object.entries(info.limits || {});
  const lims =
    limsEntries.length > 0
      ? 'limits: ' + limsEntries.map(([k, v]) => `${k}: ${v}`).join(', ')
      : 'limits: (none)';

  return `${info.name} — ${feats}; ${lims}`;
}
