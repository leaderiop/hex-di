# Task Breakdown: @hex-di/runtime Package

## Overview
Total Tasks: 67

## Task List

### Package Setup

#### Task Group 1: Package Infrastructure
**Dependencies:** None

- [x] 1.0 Complete package infrastructure setup
  - [x] 1.1 Create package directory structure
    - Create `/packages/runtime/` directory
    - Create `/packages/runtime/src/` directory
    - Create `/packages/runtime/tests/` directory
  - [x] 1.2 Create package.json following ports/graph pattern
    - Name: `@hex-di/runtime`
    - Type: `module`
    - ESM/CJS dual output exports
    - Dependencies: `@hex-di/ports: workspace:*`, `@hex-di/graph: workspace:*`
    - Scripts: build, clean, test, test:watch, test:types, typecheck
    - peerDependencies: typescript >=5.0
    - engines: node >=18.0.0
  - [x] 1.3 Create tsconfig.json extending root config
    - Extend `../../tsconfig.json`
    - rootDir: `.`
    - outDir: `./dist`
    - composite: true
    - include: `src/**/*.ts`, `tests/**/*.ts`
  - [x] 1.4 Create tsconfig.build.json for distribution
    - Follow ports/graph build config pattern
  - [x] 1.5 Create src/index.ts barrel export file
    - Empty initial exports
    - Will be populated as types and functions are created
  - [x] 1.6 Verify package setup
    - Run `pnpm install` to link workspace dependencies
    - Run `pnpm typecheck` to verify TypeScript configuration
    - Verify imports from `@hex-di/ports` and `@hex-di/graph` resolve correctly

**Acceptance Criteria:**
- Package directory structure matches ports/graph pattern
- package.json contains all required fields
- TypeScript configuration compiles successfully
- Workspace dependencies resolve correctly

---

### Core Types and Errors

#### Task Group 2: Error Hierarchy
**Dependencies:** Task Group 1

- [x] 2.0 Complete error hierarchy implementation
  - [x] 2.1 Write 5-8 focused tests for error classes
    - Test ContainerError base class properties (code, isProgrammingError, message)
    - Test CircularDependencyError with dependency chain
    - Test FactoryError wrapping original exception with cause
    - Test DisposedScopeError with port context
    - Test ScopeRequiredError with port context
    - Test error inheritance hierarchy (instanceof checks)
  - [x] 2.2 Create ContainerError abstract base class
    - Extend Error
    - Properties: `code: string`, `isProgrammingError: boolean`
    - Abstract constructor pattern with proper Error.captureStackTrace
    - Override `name` getter to return class name
  - [x] 2.3 Create CircularDependencyError class
    - Code: `"CIRCULAR_DEPENDENCY"`
    - isProgrammingError: `true`
    - Property: `dependencyChain: readonly string[]`
    - Message includes formatted dependency chain
  - [x] 2.4 Create FactoryError class
    - Code: `"FACTORY_FAILED"`
    - isProgrammingError: `false`
    - Property: `portName: string`
    - Property: `cause: unknown` (wrapped exception)
    - Message includes port name and original error message
  - [x] 2.5 Create DisposedScopeError class
    - Code: `"DISPOSED_SCOPE"`
    - isProgrammingError: `true`
    - Property: `portName: string`
    - Message indicates resolve attempted on disposed scope
  - [x] 2.6 Create ScopeRequiredError class
    - Code: `"SCOPE_REQUIRED"`
    - isProgrammingError: `true`
    - Property: `portName: string`
    - Message indicates scoped port resolved from root container
  - [x] 2.7 Export all error classes from index.ts
  - [x] 2.8 Ensure error hierarchy tests pass
    - Run ONLY the 5-8 tests written in 2.1
    - Verify all error properties are correct
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 5-8 tests written in 2.1 pass
- All error classes extend ContainerError
- Error codes are stable string constants
- Error messages are informative and include context

---

#### Task Group 3: Container and Scope Branded Types
**Dependencies:** Task Group 1

- [x] 3.0 Complete Container and Scope type definitions
  - [x] 3.1 Write 4-6 type tests for Container and Scope types
    - Test Container brand prevents structural compatibility
    - Test Container<TProvides> captures TProvides type parameter
    - Test Scope brand prevents structural compatibility
    - Test Scope<TProvides> captures TProvides type parameter
    - Test Container and Scope are distinct types (not interchangeable)
  - [x] 3.2 Create ContainerBrand unique symbol
    - Follow Port/Adapter brand pattern from sibling packages
    - `declare const ContainerBrand: unique symbol`
  - [x] 3.3 Create Container<TProvides> branded interface
    - Property: `resolve<P extends TProvides>(port: P): InferService<P>`
    - Property: `createScope(): Scope<TProvides>`
    - Property: `dispose(): Promise<void>`
    - Brand: `readonly [typeof ContainerBrand]: { provides: TProvides }`
  - [x] 3.4 Create ScopeBrand unique symbol
    - `declare const ScopeBrand: unique symbol`
  - [x] 3.5 Create Scope<TProvides> branded interface
    - Property: `resolve<P extends TProvides>(port: P): InferService<P>`
    - Property: `createScope(): Scope<TProvides>`
    - Property: `dispose(): Promise<void>`
    - Brand: `readonly [typeof ScopeBrand]: { provides: TProvides }`
  - [x] 3.6 Export Container and Scope types from index.ts
  - [x] 3.7 Ensure Container and Scope type tests pass
    - Run ONLY the 4-6 type tests written in 3.1
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 type tests written in 3.1 pass
- Container and Scope are nominally typed via brands
- TProvides type parameter is correctly captured
- Methods have correct type signatures

---

#### Task Group 4: Type Utility Functions
**Dependencies:** Task Group 3

- [x] 4.0 Complete type utility implementations
  - [x] 4.1 Write 4-6 type tests for utility types
    - Test InferContainerProvides extracts TProvides from Container
    - Test InferScopeProvides extracts TProvides from Scope
    - Test IsResolvable returns true when port is in TProvides
    - Test IsResolvable returns false when port is not in TProvides
    - Test ServiceFromContainer extracts correct service type
    - Test utilities return never for non-matching types
  - [x] 4.2 Create InferContainerProvides<T> utility type
    - Use conditional type with infer: `T extends Container<infer P> ? P : never`
  - [x] 4.3 Create InferScopeProvides<T> utility type
    - Use conditional type with infer: `T extends Scope<infer P> ? P : never`
  - [x] 4.4 Create IsResolvable<TContainer, TPort> utility type
    - Return `true` if TPort extends TProvides of TContainer
    - Return `false` otherwise
    - Works with both Container and Scope
  - [x] 4.5 Create ServiceFromContainer<TContainer, TPort> utility type
    - Extract service type for given port from container
    - Return `never` if port not resolvable
    - Use InferService from @hex-di/ports
  - [x] 4.6 Export all utility types from index.ts
  - [x] 4.7 Ensure type utility tests pass
    - Run ONLY the 4-6 type tests written in 4.1
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 type tests written in 4.1 pass
- All utility types correctly infer type parameters
- Utility types return never for invalid inputs
- Type inference works without explicit annotations

---

### Internal Implementation

#### Task Group 5: MemoMap Internal Class
**Dependencies:** Task Groups 2, 3

- [x] 5.0 Complete MemoMap internal implementation
  - [x] 5.1 Write 6-8 focused tests for MemoMap
    - Test getOrElseMemoize returns cached instance on subsequent calls
    - Test getOrElseMemoize calls factory only once per port
    - Test creation order is tracked correctly (LIFO)
    - Test fork() creates child with shared parent entries
    - Test fork() child has independent entries for new ports
    - Test dispose() calls finalizers in LIFO order
    - Test dispose() continues on finalizer error
    - Test dispose() aggregates multiple errors
  - [x] 5.2 Create MemoMap class (internal, not exported)
    - Private: `cache: Map<Port<unknown, string>, unknown>`
    - Private: `creationOrder: Array<{ port: Port, finalizer?: Function }>`
    - Private: `parent?: MemoMap`
    - Private: `disposed: boolean`
  - [x] 5.3 Implement getOrElseMemoize method
    - Signature: `getOrElseMemoize<T>(port: Port, factory: () => T, finalizer?: (instance: T) => void | Promise<void>): T`
    - Check parent cache first (for singleton inheritance)
    - Check own cache
    - Call factory if not cached
    - Track creation order with finalizer
    - Return cached/new instance
  - [x] 5.4 Implement has method
    - Signature: `has(port: Port): boolean`
    - Check both parent and own cache
  - [x] 5.5 Implement fork method
    - Signature: `fork(): MemoMap`
    - Create child MemoMap with `this` as parent
    - Child starts with empty own cache
  - [x] 5.6 Implement dispose method
    - Signature: `dispose(): Promise<void>`
    - Set disposed flag
    - Iterate creationOrder in reverse (LIFO)
    - Call each finalizer, catching errors
    - Aggregate errors and throw AggregateError if any failures
    - Clear cache after disposal
  - [x] 5.7 Implement isDisposed getter
    - Returns disposed flag
  - [x] 5.8 Ensure MemoMap tests pass
    - Run ONLY the 6-8 tests written in 5.1
    - Verify caching behavior works correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 5.1 pass
- MemoMap correctly caches instances
- fork() creates proper parent-child relationship
- dispose() follows LIFO ordering and handles errors

---

#### Task Group 6: Resolution Path Tracking
**Dependencies:** Task Group 2

- [x] 6.0 Complete resolution path tracking
  - [x] 6.1 Write 4-6 focused tests for resolution path tracking
    - Test path starts empty for new resolution
    - Test path tracks ports during resolution chain
    - Test circular detection throws CircularDependencyError
    - Test path is cleared after successful resolution
    - Test error includes full dependency chain
  - [x] 6.2 Create ResolutionContext class (internal)
    - Private: `path: Set<string>` (port names for O(1) lookup)
    - Private: `pathArray: string[]` (for error message ordering)
  - [x] 6.3 Implement enter method
    - Signature: `enter(portName: string): void`
    - Check if portName already in path (cycle detection)
    - Throw CircularDependencyError with full chain if cycle detected
    - Add portName to both path and pathArray
  - [x] 6.4 Implement exit method
    - Signature: `exit(portName: string): void`
    - Remove portName from path Set
    - Pop from pathArray
  - [x] 6.5 Implement getPath method
    - Signature: `getPath(): readonly string[]`
    - Return copy of pathArray for error messages
  - [x] 6.6 Ensure resolution path tests pass
    - Run ONLY the 4-6 tests written in 6.1
    - Verify circular dependency detection works
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 6.1 pass
- Circular dependencies are detected
- Error includes full dependency chain
- Path is correctly maintained during resolution

---

### Container Implementation

#### Task Group 7: createContainer Function
**Dependencies:** Task Groups 3, 5, 6

- [x] 7.0 Complete createContainer implementation
  - [x] 7.1 Write 6-8 focused tests for createContainer
    - Test createContainer returns frozen Container object
    - Test Container has resolve, createScope, dispose methods
    - Test resolve returns correct service instance
    - Test resolve throws for non-existent port (runtime check)
    - Test singleton instances are cached across resolves
    - Test request instances are fresh on each resolve
    - Test container disposal calls singleton finalizers
  - [x] 7.2 Create createContainer function signature
    - Signature: `createContainer<TProvides extends Port<unknown, string>>(graph: Graph<TProvides>): Container<TProvides>`
    - Import Graph type from @hex-di/graph
    - Import Port, InferService, InferPortName from @hex-di/ports
  - [x] 7.3 Implement internal ContainerImpl class
    - Private: `graph: Graph<TProvides>`
    - Private: `singletonMemo: MemoMap`
    - Private: `disposed: boolean`
    - Private: `resolutionContext: ResolutionContext`
  - [x] 7.4 Implement resolve method
    - Check disposed flag, throw DisposedScopeError if true
    - Lookup adapter from graph by port
    - Check lifetime for scoped, throw ScopeRequiredError if scoped port resolved from container
    - Enter resolution context (circular check)
    - Resolve dependencies recursively
    - Call factory with resolved deps
    - Cache if singleton lifetime
    - Exit resolution context
    - Return instance
  - [x] 7.5 Implement createScope method
    - Create new ScopeImpl with container as parent
    - Return Scope interface
  - [x] 7.6 Implement dispose method
    - Set disposed flag
    - Call singletonMemo.dispose()
    - Return Promise<void>
  - [x] 7.7 Implement createContainer function body
    - Create ContainerImpl instance
    - Freeze and return as Container<TProvides>
  - [x] 7.8 Export createContainer from index.ts
  - [x] 7.9 Ensure createContainer tests pass
    - Run ONLY the 6-8 tests written in 7.1
    - Verify container creation and resolution works
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 7.1 pass
- createContainer accepts Graph and returns Container
- resolve method is type-safe and correct
- Singleton caching works correctly

---

### Scope Implementation

#### Task Group 8: Scope Hierarchy
**Dependencies:** Task Group 7

- [x] 8.0 Complete Scope implementation
  - [x] 8.1 Write 6-8 focused tests for Scope behavior
    - Test createScope returns frozen Scope object
    - Test Scope inherits singleton instances from container
    - Test Scope creates own scoped instances
    - Test scoped instances are not shared with parent
    - Test scoped instances are not shared with sibling scopes
    - Test nested scopes work correctly
    - Test scope disposal calls scoped finalizers
    - Test scope disposal does not affect parent singletons
  - [x] 8.2 Create internal ScopeImpl class
    - Private: `container: ContainerImpl` (reference to root)
    - Private: `scopedMemo: MemoMap` (forked from parent)
    - Private: `disposed: boolean`
    - Private: `childScopes: Set<ScopeImpl>`
  - [x] 8.3 Implement Scope resolve method
    - Check disposed flag, throw DisposedScopeError if true
    - Lookup adapter from graph by port
    - Handle lifetimes:
      - singleton: delegate to container singleton memo
      - scoped: use scopedMemo
      - request: create new instance (no caching)
    - Enter/exit resolution context (share with container or create own)
    - Return instance
  - [x] 8.4 Implement Scope createScope method
    - Create child ScopeImpl with forked scopedMemo
    - Track child in childScopes set
    - Return Scope interface
  - [x] 8.5 Implement Scope dispose method
    - Set disposed flag
    - Dispose all child scopes first (propagate)
    - Call scopedMemo.dispose()
    - Remove self from parent's childScopes
    - Return Promise<void>
  - [x] 8.6 Ensure Scope hierarchy tests pass
    - Run ONLY the 6-8 tests written in 8.1
    - Verify scope inheritance works correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 8.1 pass
- Scopes inherit singletons from container
- Scoped instances are isolated per scope
- Disposal propagates to child scopes

---

### Lifetime Management

#### Task Group 9: Lifetime Behaviors
**Dependencies:** Task Groups 7, 8

- [x] 9.0 Complete lifetime management implementation
  - [x] 9.1 Write 6-8 focused tests for lifetime behaviors
    - Test singleton: same instance across container and all scopes
    - Test singleton: factory called only once ever
    - Test scoped: same instance within scope, different across scopes
    - Test scoped: factory called once per scope
    - Test request: new instance every resolve call
    - Test request: factory called every time
    - Test mixed lifetimes in dependency chain work correctly
  - [x] 9.2 Implement singleton lifetime handling
    - Check container's singletonMemo first
    - Create and cache if not present
    - Return same instance to all scopes
  - [x] 9.3 Implement scoped lifetime handling
    - Check scope's scopedMemo
    - Create and cache if not present
    - Different scopes get different instances
  - [x] 9.4 Implement request lifetime handling
    - Always call factory
    - Never cache
    - Track in MemoMap for disposal only if finalizer provided
  - [x] 9.5 Handle lifetime in dependency resolution
    - When resolving dependencies, respect their lifetimes
    - Singleton deps resolve from singleton memo
    - Scoped deps resolve from current scope's memo
    - Request deps always create fresh
  - [x] 9.6 Ensure lifetime behavior tests pass
    - Run ONLY the 6-8 tests written in 9.1
    - Verify all three lifetime behaviors work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 9.1 pass
- Singleton instances are shared globally
- Scoped instances are isolated per scope
- Request instances are always fresh

---

### Type-Level Validation

#### Task Group 10: Captive Dependency Prevention Types
**Dependencies:** Task Groups 3, 4

- [x] 10.0 Complete captive dependency type-level prevention
  - [x] 10.1 Write 6-8 type tests for captive dependency prevention
    - Test singleton depending on singleton compiles
    - Test singleton depending on scoped produces error type
    - Test singleton depending on request produces error type
    - Test scoped depending on singleton compiles
    - Test scoped depending on scoped compiles
    - Test scoped depending on request produces error type
    - Test request depending on any lifetime compiles
    - Test error type includes descriptive message
  - [x] 10.2 Create LifetimeLevel phantom type
    - Type: `type LifetimeLevel<L extends Lifetime> = ...`
    - Singleton = 1, Scoped = 2, Request = 3 (as type-level numbers)
  - [x] 10.3 Create ValidateCaptiveDependency type
    - Type: `type ValidateCaptiveDependency<TAdapter, TRequiredAdapter> = ...`
    - Compare lifetime levels
    - Return adapter type if valid
    - Return error type if invalid
  - [x] 10.4 Create CaptiveDependencyError type
    - Type: `type CaptiveDependencyError<TMessage extends string> = ...`
    - Use template literal types for clear error message
    - Include: which adapter, which dependency, their lifetimes
  - [x] 10.5 Integrate with Graph type (or document integration point)
    - Captive dependency validation should happen at graph construction
    - May require coordination with @hex-di/graph package
    - Document if validation happens in graph vs runtime package
  - [x] 10.6 Export captive dependency types if applicable
  - [x] 10.7 Ensure captive dependency type tests pass
    - Run ONLY the 6-8 type tests written in 10.1
    - Verify compile-time errors appear correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 type tests written in 10.1 pass
- Invalid captive dependencies produce compile errors
- Error messages clearly explain the violation
- Zero runtime cost

---

#### Task Group 11: Resolution Type Safety
**Dependencies:** Task Groups 7, 8

- [x] 11.0 Complete resolution type safety
  - [x] 11.1 Write 6-8 type tests for resolve method type safety
    - Test resolve accepts port in TProvides
    - Test resolve rejects port not in TProvides (compile error)
    - Test resolve return type matches InferService<P>
    - Test resolve works with Port union TProvides
    - Test Scope.resolve has same type safety as Container.resolve
    - Test type inference works without explicit annotations
  - [x] 11.2 Verify Container.resolve type signature
    - Method: `resolve<P extends TProvides>(port: P): InferService<P>`
    - Constraint `P extends TProvides` enforces compile-time port validation
  - [x] 11.3 Verify Scope.resolve type signature
    - Same signature as Container.resolve
    - Same type safety guarantees
  - [x] 11.4 Test complex TProvides scenarios
    - Large union types
    - Ports with complex service interfaces
    - Generic service interfaces
  - [x] 11.5 Ensure resolution type safety tests pass
    - Run ONLY the 6-8 type tests written in 11.1
    - Verify compile-time validation works
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 type tests written in 11.1 pass
- Resolving invalid ports produces compile error
- Return type correctly inferred from port
- Type inference is ergonomic

---

### Disposal System

#### Task Group 12: Disposal Implementation
**Dependencies:** Task Groups 5, 7, 8, 9

- [x] 12.0 Complete disposal implementation
  - [x] 12.1 Write 6-8 focused tests for disposal
    - Test dispose() calls finalizers in LIFO order
    - Test dispose() marks container/scope as disposed
    - Test resolve() throws DisposedScopeError after disposal
    - Test disposal propagates to child scopes before parent
    - Test disposal continues on finalizer error
    - Test AggregateError contains all finalizer failures
    - Test async finalizers are awaited
    - Test disposal is idempotent (second call is no-op)
  - [x] 12.2 Implement container disposal flow
    - Mark disposed
    - Dispose all child scopes (if any tracked)
    - Dispose singletonMemo
    - Return Promise
  - [x] 12.3 Implement scope disposal flow
    - Mark disposed
    - Dispose all child scopes first
    - Dispose scopedMemo
    - Remove from parent's child tracking
    - Return Promise
  - [x] 12.4 Implement finalizer error handling
    - Catch errors from finalizers
    - Continue disposing remaining instances
    - Aggregate all errors
    - Throw AggregateError if any failures
  - [x] 12.5 Implement async finalizer support
    - Finalizers can return Promise<void>
    - Await each finalizer before proceeding to next
    - Maintain LIFO order even with async
  - [x] 12.6 Ensure disposal tests pass
    - Run ONLY the 6-8 tests written in 12.1
    - Verify disposal behavior is correct
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 12.1 pass
- LIFO disposal ordering is maintained
- Finalizer errors are aggregated
- Disposal is idempotent

---

### Integration Testing

#### Task Group 13: Integration Tests
**Dependencies:** Task Groups 1-12

- [x] 13.0 Complete integration test suite
  - [x] 13.1 Write integration test: basic container workflow
    - Create ports, adapters, graph
    - Create container from graph
    - Resolve services
    - Verify correct instances returned
  - [x] 13.2 Write integration test: dependency chain resolution
    - Service A depends on B, B depends on C
    - Verify all dependencies resolved correctly
    - Verify factory calls receive correct deps
  - [x] 13.3 Write integration test: scope hierarchy
    - Create container with all three lifetimes
    - Create nested scopes
    - Verify singleton sharing
    - Verify scoped isolation
    - Verify request freshness
  - [x] 13.4 Write integration test: disposal workflow
    - Create container and scopes
    - Resolve services with finalizers
    - Dispose scopes and container
    - Verify LIFO order
    - Verify finalizers called
  - [x] 13.5 Write integration test: error scenarios
    - Test circular dependency detection
    - Test factory error wrapping
    - Test disposed scope error
    - Test scope required error
  - [x] 13.6 Write integration test: type safety end-to-end
    - Create realistic application structure
    - Verify all types flow correctly
    - No type assertions needed
  - [x] 13.7 Ensure all integration tests pass
    - Run integration test file
    - Verify end-to-end workflows work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- All integration tests pass
- End-to-end workflows verified
- Error scenarios handled correctly
- Types flow correctly through API

---

### Documentation and Exports

#### Task Group 14: Final Exports and Documentation
**Dependencies:** Task Groups 1-13

- [x] 14.0 Complete exports and documentation
  - [x] 14.1 Review and finalize index.ts exports
    - Export: `Container`, `Scope` types
    - Export: `createContainer` function
    - Export: `ContainerError`, `CircularDependencyError`, `FactoryError`, `DisposedScopeError`, `ScopeRequiredError`
    - Export: `InferContainerProvides`, `InferScopeProvides`, `IsResolvable`, `ServiceFromContainer`
    - Do NOT export internal classes (MemoMap, ResolutionContext, ContainerImpl, ScopeImpl)
  - [x] 14.2 Add JSDoc comments to all public exports
    - Document type parameters
    - Document method parameters and return types
    - Document error conditions
    - Add usage examples in JSDoc
  - [x] 14.3 Verify exports test
    - Write exports.test.ts to verify all public API is accessible
    - Test that internal classes are not exported
  - [x] 14.4 Ensure exports tests pass
    - Run exports test file
    - Verify public API is correct

**Acceptance Criteria:**
- All public API is exported
- Internal implementation details are not exported
- JSDoc documentation is complete
- Exports test passes

---

### Testing Review

#### Task Group 15: Test Review and Gap Analysis
**Dependencies:** Task Groups 1-14

- [x] 15.0 Review existing tests and fill critical gaps only
  - [x] 15.1 Review tests from Task Groups 2-14
    - Review error hierarchy tests (5-8 from 2.1)
    - Review Container/Scope type tests (4-6 from 3.1)
    - Review type utility tests (4-6 from 4.1)
    - Review MemoMap tests (6-8 from 5.1)
    - Review resolution path tests (4-6 from 6.1)
    - Review createContainer tests (6-8 from 7.1)
    - Review Scope hierarchy tests (6-8 from 8.1)
    - Review lifetime behavior tests (6-8 from 9.1)
    - Review captive dependency type tests (6-8 from 10.1)
    - Review resolution type safety tests (6-8 from 11.1)
    - Review disposal tests (6-8 from 12.1)
    - Review integration tests (6-7 from 13.x)
    - Total existing tests: approximately 60-80 tests
  - [x] 15.2 Analyze test coverage gaps for runtime package only
    - Identify critical user workflows lacking coverage
    - Focus ONLY on gaps related to runtime package requirements
    - Do NOT assess entire monorepo test coverage
    - Prioritize edge cases in resolution and disposal
  - [x] 15.3 Write up to 10 additional strategic tests maximum
    - Fill identified critical gaps
    - Focus on edge cases and error conditions
    - Test boundary conditions (empty graph, single adapter, etc.)
    - Do NOT write exhaustive coverage for all scenarios
  - [x] 15.4 Run full runtime package test suite
    - Run all tests related to @hex-di/runtime
    - Verify all tests pass
    - Expected total: approximately 70-90 tests maximum

**Acceptance Criteria:**
- All runtime package tests pass (approximately 70-90 tests)
- Critical user workflows are covered
- No more than 10 additional tests added for gap filling
- Testing focused exclusively on runtime package requirements

---

### Build and Verification

#### Task Group 16: Build and Final Verification
**Dependencies:** Task Group 15

- [x] 16.0 Complete build and final verification
  - [x] 16.1 Run full build
    - Execute `pnpm build` in packages/runtime
    - Verify dist/ output is generated
    - Verify both ESM and CJS outputs exist
    - Verify .d.ts type definitions are generated
  - [x] 16.2 Verify package can be imported
    - Test import from built package
    - Verify all exports are accessible
    - Test both ESM and CJS imports
  - [x] 16.3 Run final test suite
    - Execute `pnpm test` in packages/runtime
    - Execute `pnpm test:types` for type tests
    - Verify all tests pass
  - [x] 16.4 Run typecheck
    - Execute `pnpm typecheck`
    - Verify no type errors
  - [x] 16.5 Verify integration with sibling packages
    - Test that @hex-di/ports types work correctly
    - Test that @hex-di/graph types work correctly
    - Verify Graph<TProvides> flows into Container<TProvides>

**Acceptance Criteria:**
- Build completes without errors
- All tests pass
- Type checking passes
- Package integrates correctly with ports and graph packages

---

## Execution Order

Recommended implementation sequence:

1. **Package Setup** (Task Group 1)
   - Foundation for all other work

2. **Core Types and Errors** (Task Groups 2-4, parallel)
   - Task Group 2: Error Hierarchy
   - Task Group 3: Container and Scope Branded Types
   - Task Group 4: Type Utility Functions

3. **Internal Implementation** (Task Groups 5-6)
   - Task Group 5: MemoMap Internal Class
   - Task Group 6: Resolution Path Tracking

4. **Container Implementation** (Task Group 7)
   - Depends on Groups 3, 5, 6

5. **Scope Implementation** (Task Group 8)
   - Depends on Group 7

6. **Lifetime Management** (Task Group 9)
   - Depends on Groups 7, 8

7. **Type-Level Validation** (Task Groups 10-11, parallel)
   - Task Group 10: Captive Dependency Prevention Types
   - Task Group 11: Resolution Type Safety

8. **Disposal System** (Task Group 12)
   - Depends on Groups 5, 7, 8, 9

9. **Integration Testing** (Task Group 13)
   - Depends on Groups 1-12

10. **Documentation and Exports** (Task Group 14)
    - Depends on Groups 1-13

11. **Test Review and Gap Analysis** (Task Group 15)
    - Depends on Groups 1-14

12. **Build and Final Verification** (Task Group 16)
    - Final step, depends on Group 15

---

## Dependency Graph

```
Task Group 1 (Package Setup)
    |
    +---> Task Group 2 (Errors) --------+
    |                                   |
    +---> Task Group 3 (Types) ---------+---> Task Group 5 (MemoMap) ---+
    |         |                         |                               |
    |         +---> Task Group 4 (Utils)|                               |
    |                    |              +---> Task Group 6 (Path) ------+
    |                    |                                              |
    |                    +----------------------------------------------+
    |                                                                   |
    +-------------------------------------------------------------------+
                                        |
                                        v
                              Task Group 7 (Container)
                                        |
                                        v
                              Task Group 8 (Scope)
                                        |
                                        v
                              Task Group 9 (Lifetime)
                                        |
            +---------------------------+---------------------------+
            |                                                       |
            v                                                       v
    Task Group 10 (Captive)                               Task Group 12 (Disposal)
    Task Group 11 (Resolution Safety)                              |
            |                                                       |
            +---------------------------+---------------------------+
                                        |
                                        v
                              Task Group 13 (Integration)
                                        |
                                        v
                              Task Group 14 (Exports)
                                        |
                                        v
                              Task Group 15 (Test Review)
                                        |
                                        v
                              Task Group 16 (Build)
```

---

## Notes

- **Test-First Approach**: Each task group starts with writing focused tests (2-8 tests max per group) and ends with running only those tests.
- **Type Tests**: Use Vitest `expectTypeOf` for type-level tests in `.test-d.ts` files following patterns from @hex-di/ports and @hex-di/graph.
- **Internal Classes**: MemoMap, ResolutionContext, ContainerImpl, ScopeImpl are internal and should not be exported.
- **Zero External Dependencies**: The runtime package should have no external runtime dependencies beyond @hex-di/ports and @hex-di/graph.
- **Immutability**: Container and Scope objects should be frozen after creation.
- **Brand Patterns**: Follow the same branding patterns used in @hex-di/ports (Port) and @hex-di/graph (Adapter, Graph).
