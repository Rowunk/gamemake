import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WGSL_COLOR_VERT, WGSL_COLOR_FRAG } from '../../src/gfx/color_pass.js';

test('WGSL color pass: vertex & fragment entry points exist', () => {
  assert.match(WGSL_COLOR_VERT, /@vertex\s+fn\s+main/i);
  assert.match(WGSL_COLOR_FRAG, /@fragment\s+fn\s+main/i);
});

test('WGSL color pass: fragment declares uniform color at @group(0) @binding(0)', () => {
  assert.match(WGSL_COLOR_FRAG, /@group\(0\)\s*@binding\(0\)\s*var<uniform>\s+uColor/i);
  assert.match(WGSL_COLOR_FRAG, /struct\s+Color\s*{[^}]*color\s*:\s*vec4<f32>[^}]*}/is);
});
