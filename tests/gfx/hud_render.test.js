import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hudHtml } from '../../src/gfx/hud.js';

function sampleInfo() {
  return {
    name: 'Mock GPU 9000',
    features: new Set(['timestamp-query', 'texture-compression-bc']),
    limits: { maxBindGroups: 4, maxBufferSize: 123 }
  };
}

test('hudHtml: includes adapter name, sorted features, and limits', () => {
  const info = sampleInfo();
  const html = hudHtml(info);

  assert.match(html, /Mock GPU 9000/);
  // Features should be sorted alphabetically
  const a = html.indexOf('texture-compression-bc');
  const b = html.indexOf('timestamp-query');
  assert.ok(a < b, 'features should be sorted');

  // Limits present
  assert.match(html, /maxBindGroups/);
  assert.match(html, /4/);
  assert.match(html, /maxBufferSize/);
  assert.match(html, /123/);
});

test('hudHtml: when no features/limits, shows (none)', () => {
  const info = { name: 'X', features: new Set(), limits: {} };
  const html = hudHtml(info);
  assert.match(html, /\(none\)/);
});
