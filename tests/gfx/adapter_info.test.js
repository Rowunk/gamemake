import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAdapterInfo, summarizeAdapterInfo } from '../../src/gfx/adapter_info.js';

function setToSortedArray(s) { return Array.from(s).sort(); }

test('getAdapterInfo: uses adapterInfo.description when available', async () => {
  const adapter = {
    features: new Set(['texture-compression-bc', 'timestamp-query']),
    limits: { maxBindGroups: 4, maxBufferSize: 123 },
    requestAdapterInfo: async () => ({ description: 'Mock GPU 9000' }),
  };
  const env = { gpu: { requestAdapter: async () => adapter } };

  const info = await getAdapterInfo(env);

  assert.equal(info.name, 'Mock GPU 9000');
  assert.deepEqual(setToSortedArray(info.features),
                   ['texture-compression-bc', 'timestamp-query']);
  assert.equal(info.limits.maxBindGroups, 4);
  assert.equal(info.limits.maxBufferSize, 123);

  const summary = summarizeAdapterInfo(info);
  assert.match(summary, /Mock GPU 9000/);
  assert.match(summary, /maxBindGroups:\s*4/);
});

test('getAdapterInfo: falls back to "Unknown GPU" when requestAdapterInfo is missing', async () => {
  const adapter = {
    features: new Set(['depth-clip-control']),
    limits: { maxBindGroups: 1 },
    // no requestAdapterInfo
  };
  const env = { gpu: { requestAdapter: async () => adapter } };

  const info = await getAdapterInfo(env);

  assert.equal(info.name, 'Unknown GPU');
  assert.deepEqual(setToSortedArray(info.features), ['depth-clip-control']);
  assert.equal(info.limits.maxBindGroups, 1);

  const summary = summarizeAdapterInfo(info);
  assert.match(summary, /Unknown GPU/);
});

test('getAdapterInfo: throws when WebGPU not available', async () => {
  await assert.rejects(() => getAdapterInfo({}), /WebGPU not available/i);
});
