# Roadmap

Status legend: ✅ done · 🔸 in progress · ⏭️ next · 🧭 planned

## M0 — Foundations ✅ (v0.0.1)
- Math: Vec2/Vec3/Quat/Mat4/AABB with strict guards and property tests.
- Memory: typed-array slab allocator (coalescing, double-free/foreign protection).
- Time: frame clock + FPS EMA counter.
- Quality: deterministic fuzz, V8 coverage gate.

**DoD:** `npm test` green; coverage ≥95%.

---

## M1 — Render Basics 🔸
- WebGPU/WebGL2 clear + color pass; backend selection; resize helpers.
- Adapter info + HUD HTML; WGSL stubs validated via regex tests.

**Remaining:** smoke tests in browser (headless optional).

---

## M2 — Geometry, Textures, Depth 🔸
- Indexed cube + depth, textured quad (present).
- **⏭️ Gaps**
  - Texture pipeline: image loader, mip generation, sampler presets.
  - Camera utilities: perspective/ortho helpers; orbit controller.
  - Resource handles: typed IDs using slab allocator; safe create/destroy.

**DoD:** demo renders textured cube with mips + orbit camera; leaks guarded by handles.

---

## M3 — Data & Scene Plumbing 🧭
- Minimal transform hierarchy (parent/child world matrices).
- Resource manager (meshes/textures/materials) built on slab allocator.
- Tiny frame graph/command queue (encoders, passes).

---

## M4 — Materials & Lighting 🧭
- Unlit/vertex-color/texture materials consolidated.
- Simple lit material (Lambert/Blinn-Phong); uniform blocks.

---

## M5 — IO & Tooling 🧭
- Asset loading/caching; profiler/HUD (frame times, draws).
- Headless shader smoke tests (browser).

---

## M6 — UX & Input 🧭
- Input abstraction; orbit/FPS controllers.
- Deterministic demo harness (record/replay).

---

## Notes & Risks
- WebGPU surfacing may shift; keep descriptor “shape-only” tests in Node.
- Feature detection per demo via required feature sets.
- Licensing: currently UNLICENSED; decide before public release.
