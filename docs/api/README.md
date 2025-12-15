# API Reference

Complete API documentation for all HexDI packages.

## Packages

### Core Packages

- **[@hex-di/ports](./ports.md)** - Port token system (foundation)
- **[@hex-di/graph](./graph.md)** - GraphBuilder and adapters
- **[@hex-di/runtime](./runtime.md)** - Container and scopes

### Optional Packages

- **[@hex-di/react](./react.md)** - React integration
- **[@hex-di/devtools](./devtools.md)** - Visualization and tracing
- **[@hex-di/testing](./testing.md)** - Testing utilities

## Quick Reference

### Creating Services

```typescript
// 1. Create a port
const LoggerPort = createPort<'Logger', Logger>('Logger');

// 2. Create an adapter
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: console.log })
});

// 3. Build graph
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

// 4. Create container
const container = createContainer(graph);

// 5. Resolve service
const logger = container.resolve(LoggerPort);
```

### Type Utilities

| Utility | Package | Purpose |
|---------|---------|---------|
| `InferService<P>` | ports | Extract service type from port |
| `InferPortName<P>` | ports | Extract port name |
| `InferAdapterProvides<A>` | graph | Extract provided port from adapter |
| `InferAdapterRequires<A>` | graph | Extract required ports from adapter |
| `InferContainerProvides<C>` | runtime | Extract ports from container |
| `ServiceFromContainer<C, P>` | runtime | Get service type for port |

### Error Classes

| Error | Code | Programming Error |
|-------|------|-------------------|
| `CircularDependencyError` | `CIRCULAR_DEPENDENCY` | Yes |
| `FactoryError` | `FACTORY_FAILED` | No |
| `DisposedScopeError` | `SCOPE_DISPOSED` | Yes |
| `ScopeRequiredError` | `SCOPE_REQUIRED` | Yes |

## Package Dependencies

```
@hex-di/ports (foundation - zero dependencies)
    ↑
@hex-di/graph (depends on ports)
    ↑
@hex-di/runtime (depends on ports, graph)
    ↑
├── @hex-di/react (depends on ports, runtime)
├── @hex-di/devtools (depends on ports, graph, runtime)
└── @hex-di/testing (depends on ports, graph, runtime)
```
