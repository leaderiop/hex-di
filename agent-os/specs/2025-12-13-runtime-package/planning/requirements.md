# Spec Requirements: @hex-di/runtime

## Initial Description

Build the `@hex-di/runtime` package - the third core package in the HexDI dependency injection library. This package implements Container Creation, Service Resolution, Lifetime Scopes, Circular Dependency Detection, and Error Handling (roadmap items 6-10). It depends on `@hex-di/ports` and `@hex-di/graph` packages and provides the runtime functionality to instantiate and resolve services from a validated dependency graph.

## Requirements Discussion

### Design Decisions Made

**Q1:** How should the Container expose its available ports at the type level?
**Answer:** Full Type Exposure - `Container<TProvides>` with resolve constrained to TProvides. Compile-time error if resolving unknown port.

**Q2:** Should the Container support dynamic registration after creation?
**Answer:** Immutable - Container is frozen at creation from validated Graph. No post-creation changes. Maximum predictability.

**Q3:** Should factory functions support async initialization?
**Answer:** Sync Only - All factories are synchronous. Simpler mental model. Async init handled externally before container creation.

**Q4:** How should child scopes inherit instances from parent scopes?
**Answer:** Option A: Inherit Singletons - Child inherits singleton instances from parent. Creates own scoped/request instances. Clear ownership boundaries.

**Q5:** Should the Container and Scopes support disposal with resource cleanup?
**Answer:** Yes with LIFO + Finalizers - dispose() method with LIFO ordering. Adapters can declare finalizers for resource cleanup.

**Q6:** How should captive dependency violations be detected?
**Answer:** Type-Level Prevention - Phantom types encode lifetime levels. Compile-time error for violations. Zero runtime cost.

**Q7:** When should circular dependencies be detected?
**Answer:** Lazy During Resolution - Track resolution path at runtime. Detect cycles when encountered during service resolution.

**Q8:** Should errors follow a structured hierarchy with error codes?
**Answer:** Yes - ContainerError Hierarchy - Base ContainerError with code, typed subclasses following Clean Architecture patterns.

### Existing Code to Reference

**Similar Features Identified:**
- Feature: `@hex-di/ports` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports`
  - Branded type patterns for nominal typing
  - Port<T, TName> type and InferService utility
  - Test patterns and type-test patterns

- Feature: `@hex-di/graph` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/graph`
  - Adapter<TProvides, TRequires, TLifetime> type
  - GraphBuilder with compile-time validation
  - Graph<TProvides> output type
  - Template literal type error messages

**External Reference:**
- Effect-TS patterns for:
  - MemoMap for service memoization
  - Scope hierarchy and disposal
  - LIFO disposal ordering

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - This is a runtime library package without UI components.

## Requirements Summary

### Functional Requirements

**Container Type and Creation:**
- Define `Container<TProvides>` branded interface exposing available ports at type level
- Container is immutable - frozen at creation from validated Graph
- `createContainer(graph: Graph<TProvides>)` function creates container from validated graph
- Container carries `TProvides` type parameter for compile-time resolution safety
- No dynamic registration - all providers come from the Graph

**Type-Safe Resolution:**
- `resolve<P extends TProvides>(port: P): InferService<P>` method constrained to available ports
- Compile-time error when attempting to resolve port not in TProvides
- Return type correctly inferred from port's service type
- Resolution is synchronous (all factories are sync)

**Scope Hierarchy and Lifetime Management:**
- Three lifetime scopes: singleton, scoped, request (transient)
- `createScope(): Scope<TProvides>` method creates child scope
- `Scope<TProvides>` interface mirrors Container with same type safety
- **Singleton behavior**: Created once per container, inherited by all child scopes
- **Scoped behavior**: Created once per scope, not shared with children
- **Request behavior**: Created fresh on every resolution call

**Scope Inheritance Model (Option A):**
- Child scopes inherit singleton instances from root container
- Child scopes create their own scoped instances (not shared with parent or siblings)
- Child scopes create their own request instances (not shared)
- Clear ownership: singletons owned by container, scoped owned by creating scope

**MemoMap Pattern for Instance Caching:**
- Internal MemoMap class for instance caching per scope
- `getOrElseMemoize(port, factory, finalizer?)` method
- Track creation order for LIFO disposal
- `fork()` method for child scopes (inherits singleton references)

**Disposal with LIFO Ordering:**
- `dispose(): Promise<void>` method on both Container and Scope
- Disposal runs in LIFO order (last created, first disposed)
- Adapters can declare optional finalizer functions
- Disposal propagates to child scopes
- Disposed scope throws DisposedScopeError on subsequent resolve calls

**Captive Dependency Prevention (Type-Level):**
- Phantom types encode lifetime levels (Singleton=1, Scoped=2, Request=3)
- Type-level constraint: shorter-lived cannot depend on longer-lived
- Compile-time error with clear message for violations
- `CaptiveDependencyError` type with template literal message

**Circular Dependency Detection (Lazy):**
- Track resolution path during resolve calls
- Detect cycles when same port encountered in resolution path
- Throw `CircularDependencyError` with full dependency chain
- Detection happens at runtime during resolution, not eagerly at creation

**Error Hierarchy (Clean Architecture):**
- Abstract `ContainerError` base class with:
  - `code: string` - Stable error code for programmatic handling
  - `isProgrammingError: boolean` - Whether this is a developer mistake
  - `message: string` - Human-readable description
- Concrete error classes:
  - `CircularDependencyError` - code: "CIRCULAR_DEPENDENCY", isProgrammingError: true
  - `FactoryError` - code: "FACTORY_FAILED", isProgrammingError: false (wraps factory exceptions)
  - `DisposedScopeError` - code: "DISPOSED_SCOPE", isProgrammingError: true
  - `ScopeRequiredError` - code: "SCOPE_REQUIRED", isProgrammingError: true (scoped port resolved from container)
- Errors include resolution context (port name, resolution path)

**Type Utility Functions:**
- `InferContainerProvides<T>` - Extract TProvides from Container type
- `InferScopeProvides<T>` - Extract TProvides from Scope type
- `IsResolvable<TContainer, TPort>` - Check if port is resolvable from container
- `ServiceFromContainer<TContainer, TPort>` - Get service type for port from container

### Reusability Opportunities

- Branded type patterns from `@hex-di/ports`
- Test file organization and naming conventions from existing packages
- Type-test patterns using Vitest `expectTypeOf`
- Template literal type patterns for error messages from `@hex-di/graph`
- Graph<TProvides> type as input to createContainer

### Scope Boundaries

**In Scope:**
- Container<TProvides> type and createContainer function
- Scope<TProvides> type and createScope method
- Type-safe resolve method with compile-time port validation
- Lifetime management: singleton, scoped, request
- MemoMap for instance caching with LIFO disposal
- Disposal mechanism with finalizers
- Type-level captive dependency prevention
- Runtime circular dependency detection
- ContainerError hierarchy with typed subclasses
- Type inference utilities
- Unit tests and type tests

**Out of Scope:**
- **Async factories** (decision: sync only)
- **Dynamic registration** (decision: immutable container)
- **Eager circular dependency detection** (decision: lazy)
- **React integration** (deferred to `@hex-di/react`):
  - Provider components
  - Hooks (`usePort`, `useContainer`)
  - React context
- **Testing utilities** (deferred to `@hex-di/testing`):
  - `.override()` method for test graphs
  - Mock adapter creation helpers
  - Test container isolation
- **DevTools** (deferred to `@hex-di/devtools`):
  - Container inspection
  - Resolution tracing
  - Graph visualization

### Technical Considerations

**Package Dependencies:**
- Depends on `@hex-di/ports` (Port, InferService, InferPortName)
- Depends on `@hex-di/graph` (Graph, Adapter, InferAdapterLifetime)
- Zero external runtime dependencies
- Must be compatible with both browser and Node.js environments

**Type-Level Design Patterns:**
- Branded interface pattern for Container and Scope
- Constrained generic methods for type-safe resolution
- Phantom types for lifetime level encoding
- Template literal types for captive dependency error messages
- Conditional types for IsResolvable and utility types

**API Design Principles:**
- Immutable container and scopes
- Type inference should work without explicit annotations
- Errors should appear at call site, not deep in types
- API should be discoverable and self-documenting
- Clear separation between container (root) and scope (child)

**Testing Requirements:**
- Co-located tests (`*.test.ts` next to source)
- Type tests (`*.test-d.ts`) for compile-time behavior
- Use Vitest with `expectTypeOf` for type assertions
- Test both happy path and error cases
- Test scope hierarchy and lifetime behaviors
- Test disposal order and finalizer execution
- Test circular dependency detection with various graph shapes

**Build and Distribution:**
- TypeScript strict mode
- ESM and CJS output (following ports/graph pattern)
- Barrel exports via `index.ts`
- kebab-case file naming

**Performance Considerations:**
- MemoMap should use efficient lookup (Map with port identity)
- Resolution path tracking should not allocate excessively
- Disposal should handle errors gracefully (continue disposing on failure)
