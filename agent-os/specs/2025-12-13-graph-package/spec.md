# Specification: @hex-di/graph Package

## Goal
Implement the dependency graph construction and compile-time validation layer for HexDI. This package provides the `Adapter` type, `createAdapter` function, and `GraphBuilder` with type-level dependency tracking that produces actionable compile-time error messages when the graph is incomplete.

## User Stories
- As a developer, I want to define adapters with explicit provides/requires declarations so that my dependency relationships are clear and type-checked at compile time
- As a developer, I want compile-time errors with readable messages when I forget to provide a required dependency so that I catch configuration errors before runtime

## Specific Requirements

**Adapter Metadata Type Definition**
- Define `Adapter<TProvides, TRequires, TLifetime>` branded type capturing the full adapter contract
- `TProvides` is the Port this adapter satisfies (single port, not union)
- `TRequires` is a union of Ports this adapter depends on (or `never` for zero dependencies)
- `TLifetime` is a literal type: `'singleton'`, `'scoped'`, or `'request'`
- Include factory function type in metadata: `(deps: ResolvedDeps<TRequires>) => InferService<TProvides>`
- Use branded type pattern from `@hex-di/ports` for nominal typing

**createAdapter Function Implementation**
- Function signature accepts config object: `{ provides, requires, lifetime, factory }`
- `provides` is a single Port token (the port this adapter satisfies)
- `requires` is an array of Port tokens (dependencies), inferred as tuple type
- `lifetime` is one of the three literal values
- `factory` receives resolved dependencies as object and returns the service instance
- Full type inference - no explicit type annotations should be needed by consumers

**GraphBuilder with Fluent Immutable Pattern**
- Static `GraphBuilder.create()` returns empty builder with `TProvides = never` and `TRequires = never`
- Each `.provide(adapter)` call returns NEW builder instance (immutability)
- Type accumulates provided ports: `TProvides | AdapterProvides`
- Type accumulates required ports: `TRequires | AdapterRequires`
- Builder carries both `TProvides` (what's available) and `TRequires` (what's needed) at type level
- Follow Effect-TS immutable Layer composition pattern

**Type-Level Dependency Validation with Union Subtraction**
- Compute unsatisfied dependencies: `Exclude<TRequires, TProvides>`
- If unsatisfied is `never`, all dependencies are satisfied
- `.build()` method only callable when `Exclude<TRequires, TProvides>` extends `never`
- Use conditional types to block `.build()` when dependencies are missing
- Constraint should produce readable error at call site, not deep in type definitions

**Template Literal Compile-Time Error Messages**
- When `.build()` is blocked, error message should include missing port names
- Pattern: `"Missing dependencies: ${PortNames}"` using template literal types
- Extract port names from Port union using mapped types and `InferPortName`
- Error messages should be actionable - user knows exactly which ports to provide
- Consider duplicate detection message: `"Duplicate provider for: ${PortName}"`

**Type Inference Utility Functions**
- `InferAdapterProvides<T>` - Extract provided port type from Adapter
- `InferAdapterRequires<T>` - Extract required ports union from Adapter
- `InferAdapterLifetime<T>` - Extract lifetime literal type from Adapter
- `InferGraphProvides<T>` - Extract all provided ports from GraphBuilder
- `InferGraphRequires<T>` - Extract all required ports from GraphBuilder
- All utilities return `never` for invalid input types

**Duplicate Provider Detection**
- Detect when `.provide()` adds adapter for already-provided port
- Use intersection/overlap check: `AdapterProvides & TProvides extends never ? ... : Error`
- Produce clear compile-time error with port name in message
- Prevents multiple implementations for same port at compile time

## Existing Code to Leverage

**@hex-di/ports Package - Port and Branded Types**
- Import `Port`, `InferService`, `InferPortName` from `@hex-di/ports`
- Follow branded type pattern: `declare const __brand: unique symbol` for nominal typing
- Adapter branding follows same phantom type pattern as Port
- Reference file: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/src/index.ts`

**@hex-di/ports Package - Test Patterns**
- Use same test file organization: unit tests (`*.test.ts`) and type tests (`*.test-d.ts`)
- Use Vitest with `expectTypeOf` for compile-time type assertions
- Test both happy path and error cases (type errors should NOT compile)
- Reference file: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/tests/port.test-d.ts`

**@hex-di/ports Package - Package Structure**
- Follow same package.json structure with ESM/CJS dual exports
- Same TypeScript configuration patterns (strict mode, tsconfig.build.json)
- Barrel export via `src/index.ts`
- Reference file: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/package.json`

**Effect-TS Patterns (External Reference)**
- Union-based dependency tracking via `R` type parameter
- `Exclude<>` for removing satisfied dependencies from required set
- Immutable Layer composition (`Layer.provide`, `Layer.merge`)
- Template literal types for readable error messages

## Out of Scope
- Container creation from validated graph (belongs to `@hex-di/runtime`)
- Service resolution and `resolve(Port)` method (belongs to `@hex-di/runtime`)
- Instance caching and memoization logic (belongs to `@hex-di/runtime`)
- Lifetime management execution (singleton/scoped/request behavior at runtime)
- Factory function execution (compile-time only in this package)
- React Provider components and hooks (belongs to `@hex-di/react`)
- `.override()` method for test graphs (belongs to `@hex-di/testing`)
- Mock adapter creation helpers (belongs to `@hex-di/testing`)
- Graph visualization export (belongs to `@hex-di/devtools`)
- Circular dependency detection (may be deferred if complexity is high)
