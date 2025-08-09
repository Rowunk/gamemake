# Gamemake

**Gamemake** is the foundation for a browser-native game engine built with WebGPU and WebGL2, designed to have **no runtime dependencies**.
It focuses on performance, test-driven development, and a clean, documented public API.

## Features

- **No runtime dependencies** — zero external libraries in shipped builds.
- **WebGPU / WebGL2 rendering primitives** — low-level graphics API access.
- **Core math utilities** — vectors, matrices, quaternions.
- **Memory-efficient allocators** — slab allocator and handle pools.
- **Deterministic runtime loop** — fixed-step simulation with panic handling.
- **Test-driven development** — >95% line coverage target.
- **Strict API rules** — public API exposed via `src/index.js` only.

## Folder Structure

```text
src/            # Source code
  core/         # Math, allocators, low-level utilities
  gfx/          # Rendering primitives for WebGPU/WebGL2
  runtime/      # Game loop, time, and runtime management
  index.js      # Public API entry point
tests/          # Unit tests (TDD approach)
public/         # Static assets and demos
tools/          # Development utilities
```

## Scripts

```bash
npm run serve       # Serve public/ via Python HTTP server
npm run test        # Run unit tests
npm run lint        # Lint code with ESLint
npm run format      # Format code with Prettier
npm run typecheck   # Static type checking with TypeScript via JSDoc
npm run docs        # Generate API documentation
npm run cov         # Run coverage report
```

## Public API Surface

The public API is defined **only** by exports from:

```
src/index.js
```

Everything else is internal and may change without notice.

## Development Rules

- **TDD** — Write a failing test before writing code or fixing bugs.
- **Strict naming conventions** — short, concrete, single-purpose names.
- **JSDoc for all public exports** — types, params, returns, errors, examples.
- **No breaking API changes** without SemVer version bumps and deprecation path.
- **No per-frame heap allocations** in hot paths unless documented.

For full rules, see [PROJECT_RULES.md](PROJECT_RULES.md).

## License

UNLICENSED
