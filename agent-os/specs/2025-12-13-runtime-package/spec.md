# Specification: @hex-di/runtime Package

## Goal
Implement the runtime layer of HexDI that creates immutable containers from validated graphs and provides type-safe service resolution with lifetime management, circular dependency detection, and structured error handling.

## User Stories
- As a developer, I want to create a container from a validated Graph so that I can resolve services at runtime with full type safety.
- As a developer, I want to create child scopes from a container so that I can manage request-scoped and transient services with proper lifecycle isolation.

## Specific Requirements

**Container Type and Creation**
- Define `Container<TProvides>` as a branded interface with TProvides tracking available ports
- `createContainer(graph: Graph<TProvides>)` factory function accepts only validated Graph from @hex-di/graph
- Container is immutable (Object.freeze) with no dynamic registration post-creation
- Container carries type parameter for compile-time resolution validation
- Brand symbol follows same pattern as Port and Adapter from sibling packages

**Type-Safe Resolution**
- `resolve<P extends TProvides>(port: P): InferService<P>` method constrained to TProvides union
- Compile-time error when resolving port not in TProvides (use conditional type returning never or error type)
- Return type correctly inferred from port's phantom service type via InferService
- Resolution is synchronous - all factory functions are sync by design decision

**Scope Hierarchy and Lifetime Management**
- Three lifetime scopes: singleton (container-level), scoped (scope-level), request (transient per-call)
- `createScope(): Scope<TProvides>` method on Container creates child scope
- `Scope<TProvides>` interface mirrors Container API with identical type safety
- Singleton: created once in root container, inherited by all child scopes (shared reference)
- Scoped: created once per scope instance, not shared with parent or sibling scopes
- Request: created fresh on every resolve() call, never cached

**MemoMap for Instance Caching**
- Internal `MemoMap` class manages instance caching per scope/container
- `getOrElseMemoize(port, factory, finalizer?)` method for lazy instantiation with optional cleanup
- Track creation order in a list/stack for LIFO disposal ordering
- `fork()` method creates child MemoMap with shared singleton references but fresh scoped/request tracking
- Use Map with port reference as key for O(1) lookup

**Disposal with LIFO Ordering**
- `dispose(): Promise<void>` method on both Container and Scope interfaces
- Dispose instances in LIFO order (last created first disposed) using MemoMap creation tracking
- Adapters can declare optional `finalizer?: (instance: T) => void | Promise<void>` in createAdapter config
- Disposal propagates to child scopes before disposing parent instances
- Mark scope as disposed after disposal; subsequent resolve() throws DisposedScopeError
- Continue disposing remaining instances if one finalizer throws (aggregate errors)

**Captive Dependency Prevention (Type-Level)**
- Phantom types encode lifetime levels: Singleton=1, Scoped=2, Request=3
- Type constraint: adapter with shorter lifetime cannot depend on adapter with longer lifetime
- Use conditional types and template literal types for clear compile-time error messages
- Example: singleton requiring scoped service produces `CaptiveDependencyError<"Singleton cannot depend on Scoped: ${PortName}">`
- Zero runtime cost - validation purely at type level

**Circular Dependency Detection (Lazy Runtime)**
- Track resolution path as Set<Port> or array during resolve() call stack
- Detect cycle when same port encountered in current resolution path
- Throw `CircularDependencyError` with full dependency chain (array of port names)
- Detection at runtime during resolution, not eagerly at container creation
- Clear resolution path tracking after each top-level resolve completes

**ContainerError Hierarchy**
- Abstract `ContainerError` base class extending Error with: `code: string`, `isProgrammingError: boolean`
- `CircularDependencyError`: code "CIRCULAR_DEPENDENCY", isProgrammingError true, includes dependency chain
- `FactoryError`: code "FACTORY_FAILED", isProgrammingError false, wraps factory exception with cause
- `DisposedScopeError`: code "DISPOSED_SCOPE", isProgrammingError true, attempted resolve on disposed scope
- `ScopeRequiredError`: code "SCOPE_REQUIRED", isProgrammingError true, scoped port resolved from root container
- All errors include resolution context: port name being resolved, current resolution path

**Type Utilities**
- `InferContainerProvides<T>` extracts TProvides from Container<TProvides> using conditional inference
- `InferScopeProvides<T>` extracts TProvides from Scope<TProvides> using conditional inference
- `IsResolvable<TContainer, TPort>` returns true/false based on whether TPort extends TContainer's TProvides
- `ServiceFromContainer<TContainer, TPort>` extracts service type for given port from container

## Visual Design
No visual assets provided - this is a runtime library package without UI components.

## Existing Code to Leverage

**@hex-di/ports branded type pattern**
- Use identical branding approach with unique symbol for Container and Scope types
- Follow `createPort` pattern for `createContainer` factory function
- Reuse `InferService` and `InferPortName` utilities for resolution type inference

**@hex-di/graph types and patterns**
- Import `Graph<TProvides>` as input type for createContainer
- Import `Adapter`, `Lifetime`, `InferAdapterLifetime`, `InferAdapterRequires` for resolution logic
- Follow template literal type pattern from `MissingDependencyError` for runtime error messages
- Follow `ResolvedDeps` pattern for building factory dependency objects

**Test file organization from sibling packages**
- Co-located tests in `tests/` directory with `.test.ts` suffix for runtime tests
- Separate `.test-d.ts` files for type-level tests using Vitest `expectTypeOf`
- Test file naming: `container.test.ts`, `scope.test.ts`, `disposal.test.ts`, `errors.test.ts`, etc.
- Integration test file for end-to-end scenarios

**Package structure from @hex-di/graph**
- Single `index.ts` barrel export in `src/` directory
- package.json with ESM/CJS dual output and workspace dependency on @hex-di/ports and @hex-di/graph
- TypeScript strict mode with tsconfig.build.json for distribution

## Out of Scope
- Async factory functions - all factories must be synchronous by design decision
- Dynamic registration - container is immutable after creation, no post-creation provider registration
- Eager circular dependency detection - detection happens lazily at resolution time only
- React integration (Provider components, hooks) - deferred to @hex-di/react package
- Testing utilities (.override(), mock helpers) - deferred to @hex-di/testing package
- DevTools (inspection, tracing, visualization) - deferred to @hex-di/devtools package
- Auto-wiring or reflection-based registration - explicit adapter registration only
- Named/tagged bindings for same port - single provider per port enforced by Graph
- Optional dependencies - all declared dependencies must be satisfied
- Property injection - constructor/factory injection only
