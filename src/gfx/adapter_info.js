// src/gfx/adapter_info.js
'use strict';

/**
 * @typedef {{name:string, features:Set<string>, limits:Object}} AdapterInfo
 */

/**
 * Obtain adapter name, features, and limits from WebGPU (testable via injected env).
 * - Uses adapter.requestAdapterInfo()?.description when available
 * - Falls back to "Unknown GPU" if not
 * - Returns features as a Set<string> and limits as a shallow-copied object
 *
 * @param {{gpu?: {requestAdapter:Function}}} env
 * @returns {Promise<AdapterInfo>}
 */
export async function getAdapterInfo(env = {}) {
  const gpu = env.gpu ?? (typeof navigator !== 'undefined' ? navigator.gpu : undefined);
  if (!gpu) throw new Error('WebGPU not available');

  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error('No suitable GPU adapter');

  let name = 'Unknown GPU';
  if (typeof adapter.requestAdapterInfo === 'function') {
    try {
      const ai = await adapter.requestAdapterInfo();
      if (ai && typeof ai.description === 'string' && ai.description.length) {
        name = ai.description;
      }
    } catch {
      // Some implementations may reject; keep fallback name.
    }
  }

  // Normalize features to a Set<string>
  const features =
    adapter.features instanceof Set ? new Set(adapter.features)
    : Array.isArray(adapter.features) ? new Set(adapter.features)
    : new Set();

  // Shallow-copy limits to detach from the adapter object for safety
  const limits = adapter.limits ? { ...adapter.limits } : {};

  return { name, features, limits };
}

/**
 * Produce a human-readable summary string for debug HUDs.
 * Includes name, a sorted feature list, and common limits (all present keys are listed).
 *
 * @param {AdapterInfo} info
 * @returns {string}
 */
export function summarizeAdapterInfo(info) {
  const name = info?.name ?? 'Unknown GPU';
  const feats = info?.features instanceof Set ? Array.from(info.features).sort() : [];
  const lims = info?.limits && typeof info.limits === 'object' ? info.limits : {};

  const lines = [
    `Adapter: ${name}`,
    feats.length ? `Features: ${feats.join(', ')}` : 'Features: (none)'
  ];

  const limitEntries = Object.entries(lims);
  if (limitEntries.length) {
    lines.push('Limits:');
    for (const [k, v] of limitEntries) lines.push(`  ${k}: ${v}`);
  } else {
    lines.push('Limits: (none)');
  }

  return lines.join('\n');
}
