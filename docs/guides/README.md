# Guides

In-depth guides for specific HexDI use cases and integrations.

## Available Guides

### [React Integration](./react-integration.md)

Complete guide to using HexDI with React applications:
- Setting up typed hooks and providers
- Using `ContainerProvider`, `ScopeProvider`, and `AutoScopeProvider`
- Scope lifecycle management
- SSR considerations

### [Testing Strategies](./testing-strategies.md)

How to test HexDI-powered applications:
- Unit testing adapters with `createAdapterTest()`
- Integration testing with `TestGraphBuilder`
- Creating mock adapters with `createMockAdapter()`
- Component testing with `renderWithContainer()`
- Vitest integration with `useTestContainer()`

### [DevTools Usage](./devtools-usage.md)

Visualizing and debugging your dependency graphs:
- Exporting graphs to JSON, DOT, and Mermaid formats
- Filtering and transforming exports
- Using the React DevTools component
- Tracing service resolution

### [Error Handling](./error-handling.md)

Understanding and handling HexDI errors:
- Error hierarchy and error codes
- Handling `CircularDependencyError`
- Handling `FactoryError`
- Best practices for error recovery

## Quick Links by Task

| I want to... | Guide |
|--------------|-------|
| Use HexDI in a React app | [React Integration](./react-integration.md) |
| Write tests for my services | [Testing Strategies](./testing-strategies.md) |
| Visualize my dependency graph | [DevTools Usage](./devtools-usage.md) |
| Understand runtime errors | [Error Handling](./error-handling.md) |
| Mock dependencies in tests | [Testing Strategies](./testing-strategies.md#mock-adapters) |
| Debug service resolution | [DevTools Usage](./devtools-usage.md#tracing) |
