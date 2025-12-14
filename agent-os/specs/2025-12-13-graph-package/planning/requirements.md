# Spec Requirements: @hex-di/graph

## Initial Description

Build the `@hex-di/graph` package - the second core package in the HexDI dependency injection library. This package implements the Graph Builder Foundation, Graph Validation/Build, and Compile-Time Error Messages (roadmap items 3-5). It depends only on `@hex-di/ports` and provides the type-level dependency graph construction and validation layer.

## Requirements Discussion

### First Round Questions

**Q1:** Which package are you building next? Looking at the roadmap, the natural progression would be either `@hex-di/graph` or `@hex-di/runtime`. Which direction are we heading?
**Answer:** Building `@hex-di/graph` package.

**Q2:** What is the scope of this spec? Should this cover an entire package or a specific subset of features?
**Answer:** Entire package scope - covering Graph Builder Foundation, Graph Validation/Build, and Compile-Time Error Messages.

**Q3:** Are there specific design decisions already made? For example, how should the builder API look?
**Answer:** Research completed. Recommended API design follows Effect-TS patterns with immutable fluent builder: `GraphBuilder.create().provide(adapter1).provide(adapter2).build()`.

**Q4:** What's the priority for compile-time error messages?
**Answer:** CORE requirement. Template literal types for readable, actionable error messages are essential, not optional.

**Q5:** Are there any API patterns from other libraries you want to emulate or avoid?
**Answer:** Reference Effect-TS patterns specifically: union-based dependency tracking via `R` type parameter, `Exclude<>` for removing satisfied dependencies, Layer composition patterns.

**Q6:** Is there anything explicitly out of scope for this feature?
**Answer:** Research completed - clear boundaries established between graph (compile-time) and runtime (execution-time) concerns.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: `@hex-di/ports` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports`
  - Follow similar patterns for branded types, type-level programming
  - Reference existing test patterns and type-test patterns
  - Maintain consistent API style and conventions

**External Reference:**
- Effect-TS patterns for:
  - Union-based dependency tracking
  - Layer composition (`Layer.provide`, `Layer.merge`)
  - MemoMap concepts for service memoization
  - Template literal type error messages

### Follow-up Questions

No follow-up questions were needed - research provided comprehensive answers.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - This is a type-level library package without UI components.

## Requirements Summary

### Functional Requirements

**Adapter Metadata Structure:**
- Define `Adapter<TProvides, TRequires, TLifetime>` type that captures:
  - Provided port (what this adapter satisfies)
  - Required ports (dependencies this adapter needs)
  - Lifetime scope (singleton, scoped, request)
  - Factory function signature with full type inference
- Implement `createAdapter({ provides, requires, lifetime, factory })` function

**Graph Builder:**
- Immutable fluent builder pattern: `GraphBuilder.create().provide(adapter).build()`
- Type-level accumulation of provided ports
- Type-level tracking of remaining required ports
- Each `.provide()` call returns new builder instance with updated type state

**Type-Level Dependency Validation:**
- Port unions with conditional type subtraction (Effect-TS `Exclude<>` pattern)
- Validate all required ports are satisfied at compile-time
- `.build()` only callable when all dependencies satisfied
- Produce compile errors for unsatisfied dependencies

**Compile-Time Error Messages:**
- Template literal types producing readable, actionable error messages
- Clear messages for:
  - Missing dependencies (which ports are unsatisfied)
  - Duplicate providers (same port provided twice)
  - Type mismatches (adapter provides wrong type for port)

**Type Utility Functions:**
- `InferAdapterProvides<T>` - Extract provided port from adapter
- `InferAdapterRequires<T>` - Extract required ports from adapter
- `InferAdapterLifetime<T>` - Extract lifetime from adapter
- Additional inference utilities as needed

**Duplicate Provider Detection:**
- Detect when same port is provided multiple times
- Produce clear compile-time error

**Optional: Circular Dependency Detection:**
- Detect circular dependencies in the graph
- May be deferred if implementation complexity is high

### Reusability Opportunities

- Branded type patterns from `@hex-di/ports`
- Test file organization and naming conventions
- Type-test patterns using Vitest `expectTypeOf`
- Template literal type patterns for error messages
- Immutable builder patterns

### Scope Boundaries

**In Scope:**
- Adapter metadata type and `createAdapter` function
- `GraphBuilder` with `.create()`, `.provide()`, `.build()` methods
- Type-level dependency tracking and validation
- Template literal compile-time error messages
- Type inference utilities
- Duplicate provider detection
- Unit tests and type tests

**Out of Scope:**
- **Runtime concerns** (deferred to `@hex-di/runtime`):
  - Container creation from validated graph
  - Service resolution (`resolve(Port)`)
  - Instance caching and memoization
  - Lifetime management (singleton/scoped/request execution)
  - Factory function execution
- **React integration** (deferred to `@hex-di/react`):
  - Provider components
  - Hooks (`usePort`, `useContainer`)
  - React context
- **Testing utilities** (deferred to `@hex-di/testing`):
  - `.override()` method for test graphs
  - Mock adapter creation helpers
  - Test container isolation
- **DevTools** (deferred to `@hex-di/devtools`):
  - Graph visualization export
  - Runtime inspection
  - Resolution tracing

### Technical Considerations

**Package Dependencies:**
- Depends only on `@hex-di/ports` (zero external dependencies)
- Must be compatible with both browser and Node.js environments
- Pure TypeScript with no runtime DOM requirements

**Type-Level Design Patterns:**
- Union-based dependency tracking (Effect-TS `R` parameter pattern)
- Conditional types with `Exclude<>` for dependency subtraction
- Template literal types for error message generation
- Branded types for nominal typing (from ports package)

**API Design Principles:**
- Immutable builders - all methods return new instances
- Type inference should work without explicit type annotations
- Errors should appear at the call site, not deep in type definitions
- API should be discoverable and self-documenting

**Testing Requirements:**
- Co-located tests (`*.test.ts` next to source)
- Type tests (`*.type-test.ts`) for compile-time behavior
- Use Vitest with `expectTypeOf` for type assertions
- Test both happy path and error cases

**Build and Distribution:**
- TypeScript strict mode
- ESM and CJS output (if following ports package pattern)
- Barrel exports via `index.ts`
- kebab-case file naming
