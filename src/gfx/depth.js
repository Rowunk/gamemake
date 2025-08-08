// src/gfx/depth.js
'use strict';

/**
 * Choose a supported depth format.
 * @param {Set<string>} supported - e.g., adapter/device-supported texture formats
 * @param {string[]} fallbacks - priority list to try
 * @returns {string} chosen format
 * @throws if none of the fallbacks are supported
 */
export function chooseDepthFormat(
  supported = new Set(),
  fallbacks = ['depth24plus', 'depth32float']
) {
  for (const fmt of fallbacks) {
    if (supported.has(fmt)) return fmt;
  }
  throw new Error('No supported depth format available');
}

/**
 * Build a render pass descriptor with color + depth attachments, both using clear/load/store
 * semantics expected by tests.
 *
 * @param {any} colorView
 * @param {any} depthView
 * @param {{r:number,g:number,b:number,a:number}} clearColor
 * @param {number} clearDepth
 */
export function beginDepthRenderPassDescriptor(
  colorView,
  depthView,
  clearColor = { r: 0, g: 0, b: 0, a: 1 },
  clearDepth = 1.0
) {
  return {
    colorAttachments: [
      {
        view: colorView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: clearColor,
      },
    ],
    depthStencilAttachment: {
      view: depthView,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      depthClearValue: clearDepth,
      // Stencil not used in M2a
    },
  };
}
