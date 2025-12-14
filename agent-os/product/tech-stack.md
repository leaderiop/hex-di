# Tech Stack

## Language and Runtime

| Technology | Purpose | Notes |
|------------|---------|-------|
| TypeScript | Primary language | Strict mode, advanced type-level programming for compile-time validation |
| Node.js 18+ | Runtime for tooling and tests | Also supports 20.x and 22.x |

## Package Management and Monorepo

| Technology | Purpose | Notes |
|------------|---------|-------|
| pnpm | Package manager | Workspace support for monorepo |
| pnpm workspaces | Monorepo management | Six packages: ports, graph, runtime, react, testing, devtools |

## Testing

| Technology | Purpose | Notes |
|------------|---------|-------|
| Vitest | Test runner and framework | Workspace mode for monorepo, TypeScript-native |
| `expectTypeOf` | Type-level testing | Built into Vitest for testing type inference |

## Build and Development

| Technology | Purpose | Notes |
|------------|---------|-------|
| TypeScript Compiler (tsc) | Type checking and compilation | `--noEmit` for type checking in CI |
| ESLint | Linting | TypeScript-aware rules |
| Prettier | Code formatting | Consistent style enforcement |

## CI/CD

| Technology | Purpose | Notes |
|------------|---------|-------|
| GitHub Actions | CI/CD platform | PR checks, releases, nightly runs |
| Changesets | Version management and changelog | Automated release PRs and npm publishing |

## Documentation

| Technology | Purpose | Notes |
|------------|---------|-------|
| Docusaurus | Documentation site | Deployed to GitHub Pages |
| TypeDoc | API documentation | Generated from TSDoc comments |

## Framework Integration

| Technology | Purpose | Notes |
|------------|---------|-------|
| React 18+ | UI framework integration | Peer dependency for @hex-di/react |

## Package Distribution

| Technology | Purpose | Notes |
|------------|---------|-------|
| npm registry | Package distribution | Public packages with provenance attestation |
| GitHub Releases | Release artifacts | Auto-generated from Changesets |

## Development Conventions

| Convention | Description |
|------------|-------------|
| Immutable builders | All builder methods return new instances |
| Branded types | Port tokens use branded types for type safety |
| Template literal types | Readable compile-time error messages |
| Co-located tests | `*.test.ts` files next to source |
| Type tests | `*.type-test.ts` for type inference testing |
| Barrel exports | `index.ts` defines public API surface |
| kebab-case files | Consistent file naming |
| PascalCase types | Types, interfaces, and classes |
| camelCase functions | Functions and variables |

## Package Architecture

```
@hex-di/ports      <- Zero dependencies, innermost layer
    ^
@hex-di/graph      <- Depends on ports
    ^
@hex-di/runtime    <- Depends on graph, ports
    ^
@hex-di/react      <- Depends on runtime (React as peer dep)
@hex-di/testing    <- Depends on runtime, graph
@hex-di/devtools   <- Depends on all (optional package)
```

## Browser and Node Compatibility

| Package | Browser | Node.js | Notes |
|---------|---------|---------|-------|
| @hex-di/ports | Yes | Yes | Pure TypeScript, no DOM |
| @hex-di/graph | Yes | Yes | Pure TypeScript, no DOM |
| @hex-di/runtime | Yes | Yes | Framework-agnostic |
| @hex-di/react | Yes | Yes (SSR) | Requires React 18+ |
| @hex-di/testing | Yes | Yes | Test environment only |
| @hex-di/devtools | Yes | Yes | Development only |
