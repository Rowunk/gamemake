// src/gfx/hud.js
'use strict';

/**
 * Generate HTML for an adapter info HUD.
 * Pure function: safe to test in Node (no DOM).
 *
 * @param {{name:string, features:Set<string>, limits:Record<string,number>}} info
 * @returns {string} HTML string
 */
export function hudHtml(info) {
  const name = info?.name ?? 'Unknown GPU';
  const features = info?.features instanceof Set ? Array.from(info.features).sort() : [];
  const limits = info?.limits && typeof info.limits === 'object' ? info.limits : {};

  const featsHtml = features.length
    ? `<ul class="hud-features">${features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
    : `<div class="hud-features none">(none)</div>`;

  const limitsHtml = Object.keys(limits).length
    ? `<table class="hud-limits">${Object.entries(limits)
        .map(([k,v]) => `<tr><td class="k">${escapeHtml(k)}</td><td class="v">${String(v)}</td></tr>`)
        .join('')}</table>`
    : `<div class="hud-limits none">(none)</div>`;

  return `
<div class="hud">
  <div class="hud-title">Adapter</div>
  <div class="hud-name">${escapeHtml(name)}</div>
  <div class="hud-section">Features</div>
  ${featsHtml}
  <div class="hud-section">Limits</div>
  ${limitsHtml}
  <div class="hud-hint">Press <b>H</b> to toggle</div>
</div>`.trim();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}
