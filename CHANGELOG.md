# Changelog
All notable changes to this project will be documented in this file.

## [0.0.1] - 2025-08-08
### Added
- Core math primitives: `Vec2`, `Vec3`, `Quat`, `Mat4`, `AABB`.
- Slab allocator for typed arrays with free-list coalescing.
- Strict guards:
  - `Vec3.normalize()` throws on non-finite inputs.
  - `Vec2.angleTo()` throws on non-finite inputs.
  - Allocator rejects foreign buffers and double-free.
- Test suite (Node `node:test`, zero-dep):
  - Deterministic fuzz for `Mat4` inverse round-trip and quat↔matrix equivalence.
  - Orthonormality of `lookAt`, projective `w` handling.
  - AABB boundary inclusivity and face-touch intersection.
  - Allocator fragmentation, order-independent coalescing, and 500-iter stress.
- Coverage workflow via V8 (`NODE_V8_COVERAGE`) + threshold checker.

### Notes
- Runtime is dependency-free; only Node ≥ 18 is required for tests.
