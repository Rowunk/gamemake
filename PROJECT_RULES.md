# Project Rules (Strict)

## 1) Source of Truth for Public API
- **Public API** = only what’s exported from `src/index.js`.
- Everything else is internal. If you must expose something, re-export it from `src/index.js` and add docs + tests in the same PR.
- **No breaking changes** to public API without a minor/major version bump (see §9) and a deprecation path (§10).

## 2) Naming & Structure
- Names are **short, concrete, single-purpose**:
  - Systems: `createX`, `XOptions`, `XState`, `XResult`.
  - Pure utility: verbs + clear subject (`computeBytesPerRow`, `makeAABB`).
  - **No** “manager/helper/utils2” junk.
- **One module = one responsibility.** If a file exceeds ~300 lines or mixes concerns, split it.
- **Folders** (already mostly set):  
  `src/core`, `src/gfx`, `src/runtime`, `public`, `tests`.  
  Add `src/index.js` for the public API surface.

## 3) Type Discipline (without TypeScript)
- Every public function must have **JSDoc types**; enable `// @ts-check` at the top of each file.
- No `any` in public JSDoc. Prefer union/literals for options.
- Validate inputs:
  - `TypeError` for wrong types
  - `RangeError` for out-of-range
  - `Error` for runtime invariants

## 4) Testing Rules (TDD)
- **Red → Green → Refactor**. Write a failing test before new code or bugfix.
- Each exported symbol must have **unit tests** in `tests/**` with behavioral assertions (not implementation details).
- When a bug is found, first write a **regression test**, then fix.
- **Coverage target**:  
  - Line: 95%  
  - Branch: 90%  
  (Enforce once CI is wired.)

## 5) WebGPU/WebGL Determinism & Mocks
- Tests never hit real GPU. Use **spies/mocks** and assert descriptor shapes + call sequences.
- Never rely on browser globals in tests; pass dependencies in (DI) or feature-detect behind small shims.

## 6) Linting, Formatting, Style
- **Prettier** for formatting, **ESLint** for correctness, **EditorConfig** for editors.
- CI rejects code if `npm run lint` or `npm run typecheck` fails.
- No unused exports, no implicit globals, no `var`, no mutation of imported bindings.

## 7) Docs: JSDoc + Autogen
- Every public symbol has a **JSDoc block** with:
  1. 1-sentence purpose.
  2. Parameters (types + constraints).
  3. Return type and shape.
  4. Error conditions.
  5. Short example.
- Generate HTML/MD docs (e.g., `npm run docs`) on CI for `main`.

## 8) Performance Budgets
- Micro budgets in comments/JSDoc where relevant (e.g., “O(n) per frame, alloc-free in hot path”).
- No per-frame heap allocations in render/update loops; if you must, explain why in code comments.

## 9) Versioning & Commits
- **Semantic Versioning (SemVer)**:
  - `fix:` = patch  
  - `feat:` = minor  
  - `feat!:`, `refactor!:` = major
- **Conventional Commits** required. Example:  
  `feat(runtime): add pause/resume to runner`
- Changelog generated from commits (later).

## 10) Deprecation Policy
- Mark deprecated APIs with `@deprecated` JSDoc, keep for **one minor** release, then remove in the next **major**.
- Add console warn **only** in dev builds (not in tests).

## 11) Error Messages
- Must be **actionable**: mention the parameter name and expected range/type.
- Tests assert error **type** and **regex** of message.

## 12) CI Gates (to add)
- On every PR: `lint`, `typecheck` (`tsc --noEmit` via JSDoc), `test`, `coverage`, `docs`.
- Block merge if any gate fails.
