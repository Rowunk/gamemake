'use strict';
export const DEMOS = [
  // Rendering
  { id:'render-clear',            title:'Clear (WebGPU/WebGL2)',             path:'./demos/render/clear.html',             category:'Rendering', backends:['WebGPU','WebGL2'], tags:['basics'] },
  { id:'render-triangle',         title:'Triangle (WebGPU/WebGL2)',          path:'./demos/render/triangle.html',          category:'Rendering', backends:['WebGPU','WebGL2'], tags:['basics'] },
  { id:'render-textured-quad',    title:'Textured Quad (WebGPU/WebGL2)',     path:'./demos/render/textured_quad.html',     category:'Rendering', backends:['WebGPU','WebGL2'], tags:['textures'] },
  { id:'render-blending',         title:'Blending Modes (WebGPU/WebGL2)',    path:'./demos/render/blending.html',          category:'Rendering', backends:['WebGPU','WebGL2'], tags:['blend','alpha'] },
  { id:'render-rtt',              title:'Render to Texture (WebGPU/WebGL2)', path:'./demos/render/rtt.html',               category:'Rendering', backends:['WebGPU','WebGL2'], tags:['post','rtt'] },

  // 2D
  { id:'2d-sprite-batch',         title:'2D Sprite Batch (WebGPU/WebGL2)',   path:'./demos/2d/sprite_batch.html',          category:'2D',        backends:['WebGPU','WebGL2'], tags:['instancing','textures'] },

  // 3D
  { id:'3d-cube-depth',           title:'Indexed Cube + Depth (WebGPU/WebGL2)', path:'./demos/3d/cube_depth.html',        category:'3D',        backends:['WebGPU','WebGL2'], tags:['depth','mvp'] },
  { id:'3d-lambert',              title:'Lambert-lit Cube (WebGPU/WebGL2)',     path:'./demos/3d/lambert.html',           category:'3D',        backends:['WebGPU','WebGL2'], tags:['lighting','depth'] },
  { id:'3d-instanced-cubes',       title:'Instanced Cubes (WebGPU/WebGL2)',    path:'./demos/3d/instanced_cubes.html',   category:'3D',        backends:['WebGPU','WebGL2'], tags:['instancing','depth','mvp'] },
  { id:'3d-textured-cube',       title:'Textured Cube + Mipmaps (WebGPU/WebGL2)', path:'./demos/3d/textured_cube.html',     category:'3D',        backends:['WebGPU','WebGL2'], tags:['textures','depth','mipmaps','mvp'] },

  // Runtime
  { id:'runtime-device-lost',     title:'Device Lost (WebGPU/WebGL2)',       path:'./demos/runtime/device_lost.html',      category:'Runtime',   backends:['WebGPU','WebGL2'], tags:['robustness'] },

  // Tools
  { id:'tools-adapter-info',      title:'Adapter Info HUD (WebGPU/WebGL2)',  path:'./demos/tools/adapter_info.html',       category:'Tools',     backends:['WebGPU','WebGL2'], tags:['introspection'] },
];
