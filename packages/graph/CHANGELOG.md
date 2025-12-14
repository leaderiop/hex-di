# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-13

### Added

- **Adapter Type** - Branded type `Adapter<TProvides, TRequires, TLifetime>` for service implementations
  - `TProvides` - The Port this adapter satisfies (single port)
  - `TRequires` - Union of Ports this adapter depends on (or `never` for no dependencies)
  - `TLifetime` - Lifetime scope literal (`'singleton'` | `'scoped'` | `'request'`)
  - Internal brand symbol ensures nominal typing
  - Zero runtime overhead - brand exists only at type level

- **createAdapter Function** - Factory function for creating typed adapters
  - Config object: `{ provides, requires, lifetime, factory }`
  - Full type inference - no explicit type annotations needed
  - Factory function receives typed dependencies object via `ResolvedDeps<TRequires>`
  - Returns frozen, immutable adapter object

- **Lifetime Type** - Union type for service lifetime scopes
  - `'singleton'` - One instance for entire application
  - `'scoped'` - One instance per scope (e.g., request)
  - `'request'` - New instance every resolution

- **GraphBuilder Class** - Immutable builder for dependency graph construction
  - `GraphBuilder.create()` - Creates empty builder with `TProvides = never, TRequires = never`
  - `.provide(adapter)` - Returns new builder with accumulated type parameters
  - `.build()` - Validates and returns `Graph<TProvides>` or error type
  - Follows Effect-TS immutable Layer composition pattern

- **Compile-Time Dependency Validation**
  - `UnsatisfiedDependencies<TProvides, TRequires>` - Computes missing dependencies via `Exclude`
  - `IsSatisfied<TProvides, TRequires>` - Boolean type predicate for satisfaction check
  - `ValidGraph<TProvides, TRequires>` - Conditional type for validation result

- **Compile-Time Error Message Types**
  - `MissingDependencyError<MissingPorts>` - Readable error with port names: `"Missing dependencies: Logger"`
  - `DuplicateProviderError<DuplicatePort>` - Readable error with port name: `"Duplicate provider for: Logger"`
  - `ExtractPortNames<Ports>` - Maps Port union to string literal union of names

- **Duplicate Provider Detection**
  - `HasOverlap<A, B>` - Type predicate for port overlap detection
  - `.provide()` returns `DuplicateProviderError` when same port provided twice
  - Clear error messages identify duplicated port

- **Type Inference Utilities**
  - `InferAdapterProvides<A>` - Extracts provided port from Adapter
  - `InferAdapterRequires<A>` - Extracts required ports union from Adapter
  - `InferAdapterLifetime<A>` - Extracts lifetime literal from Adapter
  - `InferGraphProvides<G>` - Extracts provided ports from GraphBuilder
  - `InferGraphRequires<G>` - Extracts required ports from GraphBuilder
  - All utilities return `never` for invalid inputs

- **Graph Type** - Result type from `GraphBuilder.build()`
  - `Graph<TProvides>` - Contains readonly adapters array
  - Tracks provided ports at type level
  - Designed for consumption by `@hex-di/runtime`

- **ResolvedDeps Utility Type**
  - Maps Port union to object type with port names as keys
  - Each key's value is the corresponding service type
  - Handles `never` case (empty object)

- **Package Infrastructure**
  - Dependency on `@hex-di/ports` (workspace reference)
  - Peer dependency on TypeScript 5.0+
  - ESM and CommonJS dual-package support
  - TypeScript declaration files with source maps
  - Comprehensive JSDoc documentation with examples
  - Full test coverage (unit tests and type tests)

### Technical Details

- Requires TypeScript 5.0+ for `const` type parameter modifier in `requires` tuple inference
- Requires Node.js 18.0+
- Uses `unique symbol` for adapter brand to guarantee nominal typing
- Adapter and Graph objects are frozen via `Object.freeze()` for immutability
- Uses union subtraction (`Exclude`) for compile-time dependency tracking
- Template literal types provide readable compile-time error messages

### Exported APIs

**Functions:**
- `createAdapter` - Create typed adapter with dependency metadata

**Classes:**
- `GraphBuilder` - Immutable builder for dependency graphs

**Types:**
- `Adapter` - Branded adapter type
- `Graph` - Validated dependency graph
- `Lifetime` - Lifetime scope union type
- `ResolvedDeps` - Maps port union to dependencies object

**Type Utilities:**
- `InferAdapterProvides`
- `InferAdapterRequires`
- `InferAdapterLifetime`
- `InferGraphProvides`
- `InferGraphRequires`
- `UnsatisfiedDependencies`
- `IsSatisfied`
- `ValidGraph`
- `HasOverlap`
- `ExtractPortNames`
- `MissingDependencyError`
- `DuplicateProviderError`

**Re-exports from @hex-di/ports:**
- `Port`
- `InferService`
- `InferPortName`
