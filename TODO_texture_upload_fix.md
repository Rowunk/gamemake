# TODO: Fix texture_upload.js WebGPU usage descriptor

## Issue Summary
WebGPU initialization fails with:
"Failed to read the 'usage' property from 'GPUTextureDescriptor': Value is not of type 'unsigned long'."

## Root Cause
- In `src/gfx/texture_upload.js`, the `usage` property is defined as an array of strings:
  ```js
  ['TEXTURE_BINDING', 'COPY_DST']
  ```
  This is incorrect; WebGPU requires a numeric bitmask (unsigned long).
- When generating mipmaps, `GPUTextureUsage.RENDER_ATTACHMENT` must also be included in the usage flags.
- Missing correct conditional logic for including `RENDER_ATTACHMENT` when `mipLevelCount > 1`.

## Planned Fix
- Change usage definition to:
  ```js
  let usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;
  if (mipLevelCount > 1) {
      usage |= GPUTextureUsage.RENDER_ATTACHMENT;
  }
  ```
- Keep export names consistent with `textured_cube.html`:
  ```js
  export function uploadTextureRGBA8WebGPU(...) { ... }
  export function uploadTextureRGBA8WebGL2(...) { ... }
  ```

## Notes
- HTML (`textured_cube.html`) is fine; imports must match function names.
- The issue is entirely in the script, not the HTML.
