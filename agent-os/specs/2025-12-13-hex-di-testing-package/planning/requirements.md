# Spec Requirements: @hex-di/testing Package

## Initial Description

Build the `@hex-di/testing` package - testing utilities for HexDI dependency injection library. This covers roadmap items 14-16:

- Item 14: Test Graph Builder with `.override(Port, TestAdapter)` method for explicit adapter replacement
- Item 15: Mock Adapter Utilities - helper functions for creating type-checked mock adapters with minimal boilerplate and spy integration
- Item 16: Test Container Isolation - test container utilities ensuring fresh containers per test with proper cleanup and parallel test safety

This package will depend on @hex-di/ports, @hex-di/graph, and @hex-di/runtime.

## Requirements Discussion

### First Round Questions

**Q1:** Override Method Design - Should `.override()` return a new immutable builder (following the existing GraphBuilder pattern), or work differently for tests?

**Answer:** Wrap Built Graph - `TestGraphBuilder.from(graph).override(adapter).build()`. This takes an already-built Graph and allows overriding specific adapters while maintaining immutability.

**Q2:** Test Graph Builder API Surface - Should the test builder be a subclass/wrapper of GraphBuilder, a separate builder, or a factory function?

**Answer:** Factory function pattern with `TestGraphBuilder.from(graph)` that accepts an existing Graph and allows overrides. This keeps production GraphBuilder unchanged and provides clear separation between production and test code.

**Q3:** Mock Adapter Creation Pattern - Should mocks be created via factory function, builder pattern, or partial implementation?

**Answer:** Factory function - `createMockAdapter(port, implementation)`. Simple and familiar API pattern that aligns with existing `createAdapter()` and `createPort()` functions.

**Q4:** Spy Integration Strategy - Given the project uses Vitest, how should spy integration work?

**Answer:** Spied Mock Adapter - `createSpiedMockAdapter(port)` with all methods as `vi.fn()`. This provides a dedicated utility for creating fully-spied adapters, keeping concerns separated from `createMockAdapter()`.

**Q5:** Type Safety Level for Mocks - What level of type checking for mock return values?

**Answer:** Lenient as default - partial implementation allowed, missing methods throw at runtime. This provides flexibility during test setup while still catching errors when tests actually exercise missing methods.

**Q6:** Test Container Isolation Pattern - How should "fresh container per test" isolation work?

**Answer:** Vitest Hook Helper - `useTestContainer(() => graph)` with auto cleanup. This provides automatic `beforeEach`/`afterEach` integration with Vitest for seamless test isolation.

**Q7:** Parallel Test Safety - How should we ensure containers don't share state in parallel tests?

**Answer:** By design - Each container creation is independent state. The `useTestContainer` hook creates fresh containers per test, and the existing immutable container pattern naturally isolates state.

**Q8:** What should be explicitly OUT of scope for this initial implementation?

**Answer:** Auto-generated test fixtures and visual diff tooling (belongs in @hex-di/devtools).

### Existing Code to Reference

**Similar Features Identified:**

- Feature: GraphBuilder Pattern - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/graph/src/index.ts`
  - Immutable builder with `.provide()` method returning new instances
  - Type accumulation via TypeScript generics
  - Template literal types for error messages

- Feature: Container/Scope Types - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/container.ts`
  - Container creation and disposal patterns
  - Scope hierarchy and isolation
  - LIFO disposal ordering

- Feature: createTypedHooks Factory - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/react/`
  - Factory pattern for creating typed utilities
  - Type inference from Port tokens

- Feature: Existing Test Patterns - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/tests/`
  - Test fixtures with interfaces and ports
  - Use of `vi.fn()` for spies
  - Integration test patterns with full dependency chains

### Follow-up Questions

No follow-up questions needed - design decisions were clearly specified.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A

## Design Decisions Made

### 1. Override API: Wrap Built Graph

```typescript
TestGraphBuilder.from(graph).override(adapter).build()
```

- Takes an already-built Graph from production code
- Allows overriding specific adapters while maintaining the rest
- Returns a new test-specific Graph that can be passed to `createContainer()`
- Maintains immutability - each `.override()` returns a new builder

### 2. Mock Strictness: Lenient Default

- Partial implementations are allowed
- Missing methods throw at runtime when called
- Provides flexibility during test setup
- Catches errors when tests actually exercise missing methods

### 3. Mock API: Factory Function

```typescript
createMockAdapter(LoggerPort, {
  log: (msg) => { /* test implementation */ }
})
```

- Aligns with existing `createAdapter()` and `createPort()` patterns
- Simple and familiar API
- Type-safe partial implementations

### 4. Spy Integration: Spied Mock Adapter

```typescript
createSpiedMockAdapter(LoggerPort)
// Returns adapter with all methods as vi.fn()
```

- Dedicated utility for fully-spied adapters
- All methods automatically wrapped as `vi.fn()`
- Keeps concerns separated from `createMockAdapter()`

### 5. Test Isolation: Vitest Hook Helper

```typescript
const { container, scope } = useTestContainer(() => graph)
```

- Automatic `beforeEach`/`afterEach` integration
- Fresh container created before each test
- Automatic disposal after each test
- Handles async cleanup properly

### 6. Type Inference: Port-Aware

- All utilities infer types from Port tokens
- `createMockAdapter(LoggerPort, impl)` - `impl` is typed as `Partial<Logger>`
- `createSpiedMockAdapter(LoggerPort)` - returns adapter with `MockedFunction` types
- No manual type annotations needed

### 7. Package Exports: Subpath Exports

- `@hex-di/testing` - Core utilities (framework-agnostic)
- `@hex-di/testing/vitest` - Vitest-specific integration (`useTestContainer`, spied adapters)

## v1 Feature Set (Full Featured)

### 1. TestGraphBuilder

Immutable builder wrapping built Graph with `.override()` method.

```typescript
const testGraph = TestGraphBuilder.from(productionGraph)
  .override(createMockAdapter(LoggerPort, { log: vi.fn() }))
  .override(createMockAdapter(DatabasePort, mockDb))
  .build();
```

### 2. Mock Adapter Utilities

`createMockAdapter()` with lenient mode, type-safe partial implementations.

```typescript
const mockLogger = createMockAdapter(LoggerPort, {
  log: vi.fn(),
  // error() not implemented - will throw if called
});
```

### 3. Spied Mock Adapters

`createSpiedMockAdapter()` with all methods wrapped as `vi.fn()`.

```typescript
const spiedLogger = createSpiedMockAdapter(LoggerPort);
// spiedLogger.factory() returns { log: vi.fn(), error: vi.fn() }
```

### 4. useTestContainer Hook

Vitest integration with automatic beforeEach/afterEach cleanup.

```typescript
describe('UserService', () => {
  const { container } = useTestContainer(() =>
    TestGraphBuilder.from(graph)
      .override(mockLoggerAdapter)
      .build()
  );

  test('gets user', () => {
    const userService = container.resolve(UserServicePort);
    // ...
  });
});
```

### 5. Adapter Test Harness

`createAdapterTest(adapter)` for testing adapters in isolation.

```typescript
const { invoke, getDeps } = createAdapterTest(UserServiceAdapter, {
  Logger: mockLogger,
  Database: mockDatabase,
});

const service = invoke();
expect(getDeps().Logger.log).toHaveBeenCalled();
```

### 6. Graph Assertions

Assertion utilities for validating graph structure.

```typescript
assertGraphComplete(graph); // Throws if missing dependencies
assertPortProvided(graph, LoggerPort); // Throws if port not provided
assertLifetime(graph, LoggerPort, 'singleton'); // Validates lifetime
```

### 7. Graph Snapshots

Serialize graph structure for regression testing.

```typescript
expect(serializeGraph(graph)).toMatchSnapshot();
// or
expect(graphToJson(graph)).toEqual(expectedStructure);
```

### 8. React Testing Library Integration

`renderWithContainer()` helper for React component testing.

```typescript
const { getByText } = renderWithContainer(
  <MyComponent />,
  testGraph
);
```

## Requirements Summary

### Functional Requirements

- Override specific adapters in a built graph for testing
- Create type-safe mock adapters with partial implementations
- Create fully-spied adapters for verification
- Automatic container lifecycle management per test
- Test adapters in isolation with controlled dependencies
- Assert graph structure and completeness
- Serialize graphs for snapshot testing
- Integrate with React Testing Library

### Reusability Opportunities

- GraphBuilder immutable pattern (from @hex-di/graph)
- Container creation and disposal (from @hex-di/runtime)
- Factory function patterns (createPort, createAdapter)
- Type inference from Port tokens
- Test fixture patterns from existing tests

### Scope Boundaries

**In Scope:**

- TestGraphBuilder with `.override()` method
- `createMockAdapter()` factory function
- `createSpiedMockAdapter()` for Vitest
- `useTestContainer()` Vitest hook
- `createAdapterTest()` harness
- Graph assertion utilities
- Graph serialization for snapshots
- React Testing Library `renderWithContainer()` helper
- Subpath exports for framework-specific code

**Out of Scope:**

- Auto-generated test fixtures
- Visual diff tooling (belongs in @hex-di/devtools)
- Jest/Sinon/other test framework integrations (v1 focuses on Vitest)
- Mocking of async factories with timing controls
- Network/HTTP mocking utilities

### Technical Considerations

- Package depends on @hex-di/ports, @hex-di/graph, @hex-di/runtime
- Vitest is a peer dependency (optional, for /vitest subpath)
- @testing-library/react is a peer dependency (optional, for RTL integration)
- Must maintain immutability patterns consistent with core packages
- Type inference should require no manual annotations
- Lenient mock mode throws at runtime, not compile time
- All test utilities should work with parallel test execution
- Container disposal must be properly awaited in cleanup hooks
