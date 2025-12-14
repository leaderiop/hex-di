# Specification: @hex-di/testing Package

## Goal
Provide testing utilities for HexDI dependency injection library, enabling developers to override adapters, create type-safe mocks, and manage test container lifecycles with proper isolation and cleanup.

## User Stories
- As a developer, I want to override adapters in tests so I can isolate units under test from their real dependencies
- As a developer, I want type-safe mocks that validate against port contracts so I catch interface mismatches at compile time
- As a developer, I want automatic test container cleanup so my tests remain reliable and isolated without manual teardown

## Specific Requirements

**TestGraphBuilder with Override Method**
- Factory function pattern: `TestGraphBuilder.from(graph)` accepts an already-built Graph
- Returns a new immutable builder that wraps the production graph
- `.override(adapter)` replaces the adapter for a specific port, returning a new builder instance
- Multiple overrides can be chained: `.override(mockA).override(mockB).build()`
- `.build()` returns a new Graph with the overridden adapters
- Type-safe: Override adapter must provide the same port as an existing adapter in the graph
- Follows same immutability pattern as GraphBuilder (each operation returns new instance)

**createMockAdapter Factory Function**
- Signature: `createMockAdapter(port, partialImplementation)` returns Adapter
- Lenient mode by default: partial implementation allowed, missing methods throw at runtime
- Type inference: `partialImplementation` is typed as `Partial<InferService<Port>>`
- Missing methods create proxy that throws descriptive error when called
- Lifetime defaults to `'request'` for test isolation (configurable via options)
- Aligns with existing `createAdapter()` and `createPort()` API patterns

**createSpiedMockAdapter for Vitest**
- Signature: `createSpiedMockAdapter(port)` returns Adapter with all methods as `vi.fn()`
- Export from `@hex-di/testing/vitest` subpath (Vitest peer dependency)
- Automatically wraps all methods from port's service interface as Vitest mock functions
- Return type includes `MockedFunction` types for proper spy assertions
- Optional second parameter for default implementations: `createSpiedMockAdapter(port, defaults)`

**useTestContainer Vitest Hook**
- Signature: `useTestContainer(graphFactory: () => Graph)` returns `{ container, scope }`
- Automatic `beforeEach`: creates fresh container from graph factory before each test
- Automatic `afterEach`: awaits `container.dispose()` after each test completes
- Returns object with `container` and convenience `scope` (pre-created scope)
- Export from `@hex-di/testing/vitest` subpath
- Graph factory is called per-test to support test-specific overrides

**createAdapterTest Harness**
- Signature: `createAdapterTest(adapter, mockDependencies)` returns test harness
- Provides isolation for testing a single adapter's factory logic
- Returns `{ invoke, getDeps }` - `invoke()` calls factory with mocks, `getDeps()` returns mock references
- Mock dependencies object typed from adapter's `requires` ports
- Validates all required dependencies are provided at creation time

**Graph Assertions**
- `assertGraphComplete(graph)`: throws if graph has missing dependencies (runtime validation)
- `assertPortProvided(graph, port)`: throws if specific port is not provided in graph
- `assertLifetime(graph, port, lifetime)`: validates adapter lifetime matches expected value
- All assertions provide descriptive error messages with port names

**Graph Snapshots**
- `serializeGraph(graph)`: converts graph structure to deterministic JSON-serializable format
- Output includes: adapter port names, lifetimes, dependency relationships
- Excludes: factory functions, finalizers (non-serializable)
- Designed for use with `expect(...).toMatchSnapshot()` in Vitest
- Stable serialization order (sorted by port name) for consistent snapshots

**React Testing Library Integration**
- `renderWithContainer(element, graph)`: wraps element with ContainerProvider and renders
- Returns RTL render result plus `container` reference for assertions
- Export from main `@hex-di/testing` entry (RTL is peer dependency)
- Uses `@hex-di/react` ContainerProvider internally
- Optional third parameter for custom render options

## Existing Code to Leverage

**GraphBuilder Pattern from @hex-di/graph**
- Immutable builder with `.provide()` returning new instances
- Type accumulation via TypeScript generics for compile-time tracking
- Template literal types for error messages
- Follow same freezing pattern with `Object.freeze()` for returned objects

**Container and Scope from @hex-di/runtime**
- `createContainer(graph)` factory for container creation
- `Container.dispose()` async disposal pattern with LIFO finalizer ordering
- `Container.createScope()` for scope creation
- Reuse `Container<TProvides>` and `Scope<TProvides>` types

**createTypedHooks Factory from @hex-di/react**
- Factory pattern creating typed utilities bound to TProvides
- ContainerProvider component for React context
- Type inference from Port tokens pattern
- Use for `renderWithContainer` implementation

**Existing Test Fixtures and Patterns**
- Interface definitions with ports pattern (Logger, Database, UserService)
- Use of `vi.fn()` for spies throughout test suite
- Integration test patterns with full dependency chains
- Test fixture organization with describe/test blocks

**Port and Adapter Types from @hex-di/ports and @hex-di/graph**
- `Port<T, TName>` branded type with `InferService` and `InferPortName` utilities
- `Adapter<TProvides, TRequires, TLifetime>` type with inference utilities
- `ResolvedDeps<TRequires>` for typing factory dependencies
- Leverage for type-safe mock creation

## Out of Scope
- Auto-generated test fixtures from port definitions
- Visual diff tooling for dependency graphs (belongs in @hex-di/devtools)
- Jest, Sinon, or other test framework integrations (v1 focuses on Vitest only)
- Mocking of async factories with timing controls or delays
- Network/HTTP mocking utilities
- Test coverage instrumentation or reporting
- Snapshot diff visualization
- Parallel test runner configuration
- Custom test reporter for DI-related failures
- Mock persistence across test files
