# Task Breakdown: @hex-di/graph Package

## Overview
Total Tasks: 42
Estimated Total Effort: L (Large)

This is the second core package in HexDI implementing the dependency graph construction and compile-time validation layer. It builds on `@hex-di/ports` and provides the `Adapter` type, `createAdapter` function, and `GraphBuilder` with type-level dependency tracking that produces actionable compile-time error messages.

## Task List

### Package Infrastructure

#### Task Group 1: Package Setup and Configuration
**Dependencies:** None
**Effort:** S (Small)

- [x] 1.0 Complete package infrastructure
  - [x] 1.1 Create `packages/graph` directory structure
    - Create `packages/graph/src/` for source files
    - Create `packages/graph/tests/` for test files
    - Follow pnpm monorepo conventions from `@hex-di/ports`
  - [x] 1.2 Configure `package.json`
    - Name: `@hex-di/graph`
    - Version: `0.1.0`
    - Main entry: `./dist/index.js`
    - Types entry: `./dist/index.d.ts`
    - Exports configuration for ESM/CJS
    - Dependency: `@hex-di/ports` (workspace reference)
    - Peer dependency: `typescript >= 5.0`
  - [x] 1.3 Configure `tsconfig.json`
    - Extend from root tsconfig if available
    - Enable strict mode
    - Add project reference to `@hex-di/ports`
    - Declaration: true
    - DeclarationMap: true for source navigation
  - [x] 1.4 Configure Vitest for the package
    - Create `vitest.config.ts`
    - Configure test patterns for `tests/**/*.test.ts`
    - Configure type test patterns for `tests/**/*.test-d.ts`
    - Reference: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/vitest.config.ts`
  - [x] 1.5 Verify package builds successfully
    - Run `pnpm build` in packages/graph
    - Verify dist output is generated
    - Verify `@hex-di/ports` imports resolve correctly

**Acceptance Criteria:**
- Package directory structure exists
- `pnpm install` works from root
- `pnpm build` produces dist folder with `.js` and `.d.ts` files
- TypeScript strict mode enabled
- Only `@hex-di/ports` as runtime dependency

---

### Core Type Definitions

#### Task Group 2: Adapter Type and Brand Symbol
**Dependencies:** Task Group 1
**Effort:** M (Medium)

- [x] 2.0 Complete Adapter type definition
  - [x] 2.1 Write 6-8 focused type tests for Adapter type
    - Test: Adapter type captures `TProvides` as single Port type
    - Test: Adapter type captures `TRequires` as Port union (or `never`)
    - Test: Adapter type captures `TLifetime` as literal ('singleton' | 'scoped' | 'request')
    - Test: Two adapters with same provides but different requires are distinct types
    - Test: Adapter brand symbol is not accessible at value level
    - Test: Adapter with `never` requires has no dependencies
    - Test: Adapter carries factory function type in metadata
    - Use `expectTypeOf` from vitest for type assertions
  - [x] 2.2 Define Lifetime type
    - Create `type Lifetime = 'singleton' | 'scoped' | 'request'`
    - Export for consumer use
    - Add JSDoc explaining each lifetime scope
  - [x] 2.3 Define unique adapter brand symbol
    - Declare `const __adapterBrand: unique symbol`
    - Symbol is `declare` only - no runtime value
    - Follows branded type pattern from `@hex-di/ports`
  - [x] 2.4 Define `Adapter<TProvides, TRequires, TLifetime>` type
    - Type structure includes:
      - `readonly [__adapterBrand]: [TProvides, TRequires, TLifetime]`
      - `readonly provides: TProvides`
      - `readonly requires: TRequires extends never ? [] : Port[]`
      - `readonly lifetime: TLifetime`
      - `readonly factory: (deps: ResolvedDeps<TRequires>) => InferService<TProvides>`
    - `TProvides extends Port<any, any>` - single port
    - `TRequires extends Port<any, any>` - union of ports or `never`
    - `TLifetime extends Lifetime`
  - [x] 2.5 Define `ResolvedDeps<TRequires>` helper type
    - Maps Port union to object with port names as keys
    - Each key's value is the corresponding `InferService<Port>`
    - Handles `never` case (empty object `{}`)
    - Use mapped types with `InferPortName` and `InferService`
  - [x] 2.6 Ensure type tests pass
    - Run `pnpm test:types` or equivalent
    - Verify all type-level assertions pass

**Acceptance Criteria:**
- 6-8 type tests pass
- `Adapter<TProvides, TRequires, TLifetime>` type correctly captures all metadata
- Nominal typing achieved via brand symbol
- `ResolvedDeps` correctly maps Port union to typed object
- Brand symbol not accessible at runtime

---

#### Task Group 3: createAdapter Function
**Dependencies:** Task Group 2
**Effort:** M (Medium)

- [x] 3.0 Complete createAdapter function
  - [x] 3.1 Write 6-8 focused unit and type tests for createAdapter
    - Test: createAdapter returns Adapter with correct provides type
    - Test: createAdapter infers requires from array as union type
    - Test: createAdapter preserves lifetime literal type
    - Test: Factory function receives correctly typed dependencies object
    - Test: Empty requires array results in `never` for TRequires
    - Test: Type inference works without explicit type annotations
    - Test: Factory return type must match `InferService<TProvides>`
    - Test: Returned adapter is frozen/immutable
  - [x] 3.2 Implement createAdapter function signature
    - Config object: `{ provides, requires, lifetime, factory }`
    - `provides` is single Port token
    - `requires` is array of Port tokens (tuple inference via `const` or `as const`)
    - `lifetime` is Lifetime literal
    - `factory` is `(deps: ResolvedDeps<...>) => InferService<...>`
    - Full type inference - no explicit annotations needed by consumers
  - [x] 3.3 Implement createAdapter function body
    - Return object with all config properties
    - Add brand property `[__adapterBrand]: undefined as any` (type-only)
    - Apply `Object.freeze()` for immutability
    - Store requires as readonly array
    - Zero unnecessary runtime overhead
  - [x] 3.4 Add JSDoc documentation
    - Document purpose: creates typed adapter with dependency metadata
    - Document config object properties
    - Document type inference behavior
    - Include comprehensive usage example
  - [x] 3.5 Ensure createAdapter tests pass
    - Run unit tests for createAdapter
    - Run type tests for createAdapter
    - Verify all assertions pass

**Acceptance Criteria:**
- 6-8 tests pass
- createAdapter returns correctly typed Adapter
- Full type inference works (no explicit annotations needed)
- Factory function receives correctly typed deps
- Minimal runtime footprint
- JSDoc documentation complete

---

### GraphBuilder Implementation

#### Task Group 4: GraphBuilder Core Structure
**Dependencies:** Task Group 3
**Effort:** M (Medium)

- [x] 4.0 Complete GraphBuilder core
  - [x] 4.1 Write 6-8 focused type tests for GraphBuilder core
    - Test: `GraphBuilder.create()` returns builder with `TProvides = never, TRequires = never`
    - Test: GraphBuilder is a class/interface with proper typing
    - Test: Builder type carries both TProvides and TRequires type parameters
    - Test: GraphBuilder instances are immutable
    - Test: Builder can hold internal adapter registry
    - Test: `InferGraphProvides` extracts TProvides from builder
    - Test: `InferGraphRequires` extracts TRequires from builder
    - Use `expectTypeOf` for compile-time assertions
  - [x] 4.2 Define GraphBuilder type structure
    - Type parameters: `TProvides extends Port<any, any> | never`, `TRequires extends Port<any, any> | never`
    - Internal adapters array (readonly)
    - Method signatures for `provide()` and `build()`
  - [x] 4.3 Implement `GraphBuilder.create()` static method
    - Returns new `GraphBuilder<never, never>`
    - Empty internal adapters array
    - Factory method pattern (no `new` keyword for consumers)
  - [x] 4.4 Implement internal GraphBuilder constructor
    - Private or protected constructor
    - Accepts adapters array
    - Freezes instance for immutability
  - [x] 4.5 Ensure GraphBuilder core tests pass
    - Run type tests
    - Verify `GraphBuilder.create()` returns correct type

**Acceptance Criteria:**
- 6-8 type tests pass
- `GraphBuilder.create()` returns correctly typed empty builder
- Immutable builder pattern established
- Type parameters correctly track provided/required ports

---

#### Task Group 5: GraphBuilder.provide() Method
**Dependencies:** Task Group 4
**Effort:** M (Medium)

- [x] 5.0 Complete provide() method
  - [x] 5.1 Write 6-8 focused type tests for provide()
    - Test: `provide(adapter)` returns NEW builder instance
    - Test: TProvides accumulates with union: `TProvides | AdapterProvides`
    - Test: TRequires accumulates: `TRequires | AdapterRequires`
    - Test: Multiple provide() calls correctly accumulate types
    - Test: Builder is immutable - original unchanged after provide()
    - Test: Adapter with `never` requires doesn't add to TRequires
    - Test: Chained provide() calls work fluently
    - Test: provide() accepts any valid Adapter type
  - [x] 5.2 Implement provide() method signature
    - Method: `provide<A extends Adapter<any, any, any>>(adapter: A): GraphBuilder<TProvides | InferAdapterProvides<A>, TRequires | InferAdapterRequires<A>>`
    - Returns new GraphBuilder with updated type parameters
    - Conditional handling for `never` in requires union
  - [x] 5.3 Implement provide() method body
    - Create new adapters array with added adapter
    - Return new GraphBuilder instance with updated array
    - Preserve immutability - don't mutate current instance
    - Follow Effect-TS Layer.provide pattern
  - [x] 5.4 Add JSDoc documentation
    - Document that method returns new builder
    - Document type accumulation behavior
    - Include chaining example
  - [x] 5.5 Ensure provide() tests pass
    - Run all provide() type tests
    - Verify union accumulation works correctly

**Acceptance Criteria:**
- 6-8 type tests pass
- `provide()` returns new builder with accumulated types
- Original builder unchanged (immutability)
- Chained calls work correctly
- Union types correctly merged

---

### Type-Level Validation

#### Task Group 6: Dependency Validation with Union Subtraction
**Dependencies:** Task Group 5
**Effort:** M (Medium)

- [x] 6.0 Complete dependency validation types
  - [x] 6.1 Write 6-8 focused type tests for validation
    - Test: `Exclude<TRequires, TProvides>` computes unsatisfied dependencies
    - Test: When all deps satisfied, `Exclude<...>` is `never`
    - Test: When deps missing, `Exclude<...>` is the missing Port union
    - Test: Partial satisfaction correctly shows remaining ports
    - Test: `never` requires always results in `never` unsatisfied
    - Test: Order of provide() calls doesn't affect validation result
    - Test: Validation works with complex multi-adapter graphs
    - Use `expectTypeOf` to verify conditional type behavior
  - [x] 6.2 Define `UnsatisfiedDependencies<TProvides, TRequires>` utility type
    - Implementation: `type UnsatisfiedDependencies<P, R> = Exclude<R, P>`
    - Handle edge cases with `never`
    - Export for debugging/consumer use
  - [x] 6.3 Define `IsSatisfied<TProvides, TRequires>` type predicate
    - Returns `true` when `Exclude<TRequires, TProvides>` extends `never`
    - Returns `false` otherwise
    - Use conditional type with proper distributivity handling
  - [x] 6.4 Define `ValidGraph<TProvides, TRequires>` conditional type
    - Evaluates to the graph type when satisfied
    - Evaluates to error type when unsatisfied
    - Foundation for `.build()` constraint
  - [x] 6.5 Ensure validation type tests pass
    - Run all validation type tests
    - Verify union subtraction works correctly

**Acceptance Criteria:**
- 6-8 type tests pass
- `Exclude<TRequires, TProvides>` correctly identifies missing deps
- Utility types handle `never` edge cases
- Validation works regardless of provide() order

---

#### Task Group 7: Compile-Time Error Messages
**Dependencies:** Task Group 6
**Effort:** M (Medium)

- [x] 7.0 Complete compile-time error messages
  - [x] 7.1 Write 4-6 focused type tests for error messages
    - Test: Error message contains "Missing dependencies:" prefix
    - Test: Error message lists missing port names
    - Test: Multiple missing ports shown in message
    - Test: Error type is unusable (forces compile error at call site)
    - Test: Error appears at `.build()` call, not deep in types
    - Use `expectTypeOf` to verify error type structure
  - [x] 7.2 Define `ExtractPortNames<Ports>` utility type
    - Maps Port union to string literal union of names
    - Uses `InferPortName` from `@hex-di/ports`
    - Handle `never` case
  - [x] 7.3 Define `MissingDependencyError<Ports>` template literal type
    - Pattern: `"Missing dependencies: ${PortNames}"`
    - Uses `ExtractPortNames` to build name list
    - Creates unassignable branded error type
  - [x] 7.4 Define `DuplicateProviderError<Port>` template literal type
    - Pattern: `"Duplicate provider for: ${PortName}"`
    - Uses `InferPortName` to extract single port name
    - Creates unassignable branded error type
  - [x] 7.5 Integrate error types with build() constraint
    - `.build()` returns error type when unsatisfied
    - Error message visible in IDE tooltip
    - Actionable - user knows exactly which ports to provide
  - [x] 7.6 Ensure error message tests pass
    - Run all error message type tests
    - Verify messages are readable and actionable

**Acceptance Criteria:**
- 4-6 type tests pass
- Error messages include specific port names
- Errors appear at call site (developer-friendly)
- Template literal types produce readable strings

---

#### Task Group 8: Duplicate Provider Detection
**Dependencies:** Task Group 7
**Effort:** S (Small)

- [x] 8.0 Complete duplicate detection
  - [x] 8.1 Write 4-6 focused type tests for duplicate detection
    - Test: Providing same port twice produces compile error
    - Test: Error message includes duplicated port name
    - Test: Different ports with same interface allowed
    - Test: First provide() succeeds, second triggers error
    - Test: Detection works across multiple provide() chains
    - Use `expectTypeOf` to verify error behavior
  - [x] 8.2 Define `HasOverlap<A, B>` type predicate
    - Returns `true` if `A & B` is not `never`
    - Used to detect if adapter provides already-provided port
    - Handle Port union comparison correctly
  - [x] 8.3 Update provide() signature with duplicate check
    - Add conditional type constraint
    - When overlap detected, return builder with error type
    - Pattern: `InferAdapterProvides<A> & TProvides extends never ? ... : DuplicateError`
  - [x] 8.4 Ensure duplicate detection tests pass
    - Run all duplicate detection type tests
    - Verify clear error messages produced

**Acceptance Criteria:**
- 4-6 type tests pass
- Duplicate provider detected at compile time
- Clear error message with port name
- Non-overlapping ports allowed

---

#### Task Group 9: GraphBuilder.build() Method
**Dependencies:** Task Groups 6, 7, 8
**Effort:** M (Medium)

- [x] 9.0 Complete build() method
  - [x] 9.1 Write 6-8 focused type tests for build()
    - Test: `build()` callable when all deps satisfied
    - Test: `build()` blocked with type error when deps missing
    - Test: Error message shows missing port names
    - Test: Empty graph (no adapters) builds successfully
    - Test: `build()` returns Graph with correct type information
    - Test: Built graph is immutable
    - Test: Built graph contains all registered adapters
    - Verify error appears at `.build()` call site
  - [x] 9.2 Define Graph type (build result)
    - Type: `Graph<TProvides>`
    - Contains readonly adapters array
    - Type parameter tracks what ports graph provides
    - Designed for consumption by `@hex-di/runtime`
  - [x] 9.3 Implement build() method signature with constraints
    - Constraint: Only callable when `IsSatisfied<TProvides, TRequires>` is true
    - Use conditional return type for error message
    - Pattern: `Exclude<TRequires, TProvides> extends never ? Graph<TProvides> : MissingDependencyError<...>`
  - [x] 9.4 Implement build() method body
    - Validate at runtime (optional - primarily compile-time)
    - Return frozen Graph object with adapters
    - Include adapters in dependency-resolution order if feasible
  - [x] 9.5 Add JSDoc documentation
    - Document constraint requirements
    - Document error conditions
    - Include success and failure examples
  - [x] 9.6 Ensure build() tests pass
    - Run all build() type tests and unit tests
    - Verify error messages are actionable

**Acceptance Criteria:**
- 6-8 tests pass
- `build()` succeeds only when all deps satisfied
- Clear compile-time error with port names when deps missing
- Returns properly typed `Graph<TProvides>`
- Immutable result

---

### Type Utilities

#### Task Group 10: Type Inference Utilities
**Dependencies:** Task Groups 2, 4
**Effort:** S (Small)

- [x] 10.0 Complete type utilities
  - [x] 10.1 Write 4-6 focused type tests for utilities
    - Test: `InferAdapterProvides<A>` extracts provided port
    - Test: `InferAdapterRequires<A>` extracts required ports union
    - Test: `InferAdapterLifetime<A>` extracts lifetime literal
    - Test: `InferGraphProvides<G>` extracts all provided ports from builder
    - Test: `InferGraphRequires<G>` extracts all required ports from builder
    - Test: Utilities return `never` for invalid input types
  - [x] 10.2 Implement `InferAdapterProvides<T>` utility type
    - Extract `TProvides` from `Adapter<TProvides, TRequires, TLifetime>`
    - Use conditional type with `infer`
    - Return `never` if T is not an Adapter
  - [x] 10.3 Implement `InferAdapterRequires<T>` utility type
    - Extract `TRequires` from Adapter
    - Handle `never` case correctly
    - Return `never` if T is not an Adapter
  - [x] 10.4 Implement `InferAdapterLifetime<T>` utility type
    - Extract `TLifetime` from Adapter
    - Return `never` if T is not an Adapter
  - [x] 10.5 Implement `InferGraphProvides<T>` and `InferGraphRequires<T>`
    - Extract type parameters from GraphBuilder
    - Work with any GraphBuilder type
    - Return `never` for non-GraphBuilder types
  - [x] 10.6 Ensure utility type tests pass
    - Run type tests
    - Verify inference works correctly

**Acceptance Criteria:**
- 4-6 type tests pass
- Utility types correctly infer Adapter and GraphBuilder components
- Clean type inference without `any` leakage
- `never` returned for invalid inputs

---

### Package Exports

#### Task Group 11: Export Configuration
**Dependencies:** Task Groups 2-10
**Effort:** XS (Extra Small)

- [x] 11.0 Complete export configuration
  - [x] 11.1 Write 3-4 tests for public API surface
    - Test: `createAdapter` is exported and callable
    - Test: `GraphBuilder` is exported with `create()` method
    - Test: `Adapter`, `Graph`, `Lifetime` types are exported
    - Test: All utility types are exported
  - [x] 11.2 Create main entry point (`src/index.ts`)
    - Export `createAdapter` function
    - Export `GraphBuilder` class/factory
    - Export types: `Adapter`, `Graph`, `Lifetime`, `ResolvedDeps`
    - Export utility types: `InferAdapterProvides`, `InferAdapterRequires`, `InferAdapterLifetime`, `InferGraphProvides`, `InferGraphRequires`
    - Export error types: `MissingDependencyError`, `DuplicateProviderError`
    - NO default exports - named exports only
  - [x] 11.3 Verify build produces correct exports
    - Build package
    - Verify `.d.ts` exports match source
    - Verify consumers can import all public APIs
    - Verify `@hex-di/ports` re-exports if needed
  - [x] 11.4 Ensure export tests pass
    - Run all package tests
    - Verify public API surface is correct

**Acceptance Criteria:**
- 3-4 tests pass
- All public APIs exportable
- Type exports work correctly
- No internal implementation details leaked

---

### Integration Testing

#### Task Group 12: Test Review and Integration Tests
**Dependencies:** Task Groups 1-11 (all completed)
**Effort:** S (Small)

- [x] 12.0 Review and fill testing gaps
  - [x] 12.1 Review tests from Task Groups 2-11
    - Review existing tests (approximately 245 tests)
    - Identify critical workflows lacking coverage
  - [x] 12.2 Analyze test coverage gaps for this feature
    - Identify critical workflows lacking coverage
    - Focus on end-to-end graph construction scenarios
    - Prioritize complex multi-adapter graph tests
  - [x] 12.3 Write up to 10 additional integration tests
    - Test: Complete workflow - create ports, adapters, graph, build
    - Test: Multi-layer dependency chain (A requires B, B requires C)
    - Test: Adapter with multiple dependencies
    - Test: Graph with mixed lifetime adapters
    - Test: Real-world usage pattern (Logger, Database, UserService)
    - Test: Error recovery - adding missing dependency fixes build
    - Test: Factory function receives correct dependency object shape
    - Test: Graph works correctly with `@hex-di/ports` imports
    - Test: Type inference in complex generic scenarios
    - Test: Edge case - adapter that requires itself (should error)
  - [x] 12.4 Run all feature-specific tests
    - Run all tests from groups 2-11 plus new tests
    - Verify all pass

**Acceptance Criteria:**
- All feature-specific tests pass
- Complete graph construction workflow covered
- No more than 10 additional tests added
- Complex multi-adapter scenarios verified

---

### Documentation

#### Task Group 13: Package Documentation
**Dependencies:** Task Groups 1-11
**Effort:** S (Small)

- [x] 13.0 Complete package documentation
  - [x] 13.1 Create README.md for `@hex-di/graph`
    - Package purpose and philosophy
    - Installation instructions (including `@hex-di/ports` peer)
    - Basic usage examples (createAdapter, GraphBuilder)
    - API reference for all exported symbols
    - Compile-time error examples
    - TypeScript requirements (5.0+)
  - [x] 13.2 Add inline code documentation
    - JSDoc for all exported symbols
    - Usage examples in JSDoc
    - Link to related types
    - Document type parameters thoroughly
  - [x] 13.3 Document type-level patterns
    - Explain union subtraction for dependency tracking
    - Explain template literal error messages
    - Explain immutable builder pattern
    - Explain Effect-TS influences
  - [x] 13.4 Create CHANGELOG.md
    - Initial version 0.1.0
    - Document initial feature set
    - List all exported APIs

**Acceptance Criteria:**
- README.md provides clear usage guidance
- All public APIs have JSDoc
- Type-level patterns documented
- CHANGELOG initialized

---

## Execution Order

Recommended implementation sequence:

```
Task Group 1: Package Setup (S)
    |
    v
Task Group 2: Adapter Type (M)
    |
    v
Task Group 3: createAdapter (M)
    |
    v
Task Group 4: GraphBuilder Core (M)
    |
    v
Task Group 5: provide() Method (M)
    |
    v
Task Group 6: Dependency Validation (M)
    |
    v
Task Group 7: Error Messages (M)
    |
    v
Task Group 8: Duplicate Detection (S)
    |
    v
Task Group 9: build() Method (M)
    |
    v
Task Group 10: Type Utilities (S)
    |
    v
Task Group 11: Exports (XS)
    |
    +---> Task Group 12: Integration Testing (S)
    |
    +---> Task Group 13: Documentation (S)
```

**Notes:**
- Task Groups 12 and 13 can be executed in parallel after Group 11
- Task Groups 6-9 form the core validation chain and must be sequential
- Each task group should be completed fully before moving to dependent groups
- Type tests should be run alongside unit tests throughout development

## Effort Summary

| Task Group | Effort | Dependencies |
|------------|--------|--------------|
| 1. Package Setup | S | None |
| 2. Adapter Type | M | Group 1 |
| 3. createAdapter | M | Group 2 |
| 4. GraphBuilder Core | M | Group 3 |
| 5. provide() Method | M | Group 4 |
| 6. Dependency Validation | M | Group 5 |
| 7. Error Messages | M | Group 6 |
| 8. Duplicate Detection | S | Group 7 |
| 9. build() Method | M | Groups 6,7,8 |
| 10. Type Utilities | S | Groups 2,4 |
| 11. Exports | XS | Groups 2-10 |
| 12. Integration Testing | S | Groups 1-11 |
| 13. Documentation | S | Groups 1-11 |

**Legend:**
- XS: < 1 hour
- S: 1-2 hours
- M: 2-4 hours
- L: 4-8 hours

**Total Estimated Effort:** 20-32 hours (Large overall)

## Key Implementation Notes

1. **TypeScript 5.0+ Required**: The `const` type parameter modifier and advanced template literal types require TypeScript 5.0 or higher.

2. **Immutable Builder Pattern**: Every `.provide()` call must return a NEW GraphBuilder instance. Follow Effect-TS Layer composition patterns.

3. **Compile-Time Focus**: This package is primarily about compile-time type safety. Runtime behavior is minimal - actual service instantiation happens in `@hex-di/runtime`.

4. **Union-Based Tracking**: Use `TProvides` and `TRequires` type parameters as Port unions. Use `Exclude<>` for set subtraction to find unsatisfied dependencies.

5. **Readable Error Messages**: Template literal types must produce actionable error messages. "Missing dependencies: Logger, Database" is better than an incomprehensible type error.

6. **Test-Driven Development**: Type tests (`*.test-d.ts`) are as important as unit tests. Use Vitest's `expectTypeOf` for compile-time assertions.

7. **Zero External Dependencies**: Only `@hex-di/ports` as internal dependency. No external runtime dependencies.

8. **Factory Function Type Safety**: The factory function in `createAdapter` must receive a properly typed dependencies object where each required port is resolved to its service type.

## Reference Files

- Package structure: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/package.json`
- Type patterns: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/src/index.ts`
- Test patterns: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/tests/port.test-d.ts`
- Vitest config: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports/vitest.config.ts`
