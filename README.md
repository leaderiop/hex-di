# HexDI

> Type-safe dependency injection for TypeScript with compile-time validation

HexDI is a modern dependency injection framework designed for TypeScript applications. It catches dependency errors at compile time, not runtime, and provides first-class React integration with zero global state.

## Key Features

- **Compile-Time Validation** - Missing dependencies cause TypeScript errors, not runtime crashes
- **Type-Safe Resolution** - Full type inference, no explicit type annotations needed
- **Three Lifetime Scopes** - Singleton, scoped, and request lifetimes with proper isolation
- **Immutable Builder Pattern** - Effect-TS inspired composition that enables graph branching
- **React Integration** - Typed hooks and providers with automatic scope lifecycle
- **DevTools** - Visualize dependency graphs and trace service resolution
- **Zero Runtime Overhead** - Phantom types and optional features add no cost when unused

## Quick Start

```typescript
import { createPort } from '@hex-di/ports';
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { createContainer } from '@hex-di/runtime';

// 1. Define your service interface
interface Logger {
  log(message: string): void;
}

// 2. Create a port (contract + runtime token)
const LoggerPort = createPort<'Logger', Logger>('Logger');

// 3. Create an adapter (implementation)
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(`[App] ${msg}`)
  })
});

// 4. Build the graph (validated at compile time)
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

// 5. Create container and resolve services
const container = createContainer(graph);
const logger = container.resolve(LoggerPort);
logger.log('Hello, HexDI!');
```

## Installation

### Core Packages (Required)

```bash
# Using pnpm (recommended)
pnpm add @hex-di/ports @hex-di/graph @hex-di/runtime

# Using npm
npm install @hex-di/ports @hex-di/graph @hex-di/runtime

# Using yarn
yarn add @hex-di/ports @hex-di/graph @hex-di/runtime
```

### Optional Packages

```bash
# React integration
pnpm add @hex-di/react

# DevTools for visualization
pnpm add @hex-di/devtools

# Testing utilities
pnpm add -D @hex-di/testing
```

### All Packages

```bash
pnpm add @hex-di/ports @hex-di/graph @hex-di/runtime @hex-di/react @hex-di/devtools
pnpm add -D @hex-di/testing
```

## Packages Overview

| Package | Description | Required |
|---------|-------------|----------|
| [`@hex-di/ports`](./packages/ports) | Port token system - define service contracts | Yes |
| [`@hex-di/graph`](./packages/graph) | GraphBuilder with compile-time dependency validation | Yes |
| [`@hex-di/runtime`](./packages/runtime) | Container creation and service resolution | Yes |
| [`@hex-di/react`](./packages/react) | React hooks and providers | No |
| [`@hex-di/devtools`](./packages/devtools) | Graph visualization and tracing | No |
| [`@hex-di/testing`](./packages/testing) | Mocking, overrides, and test utilities | No |

## Core Concepts

### Ports

Ports are typed tokens that represent service contracts. They serve as both runtime identifiers and compile-time type carriers.

```typescript
import { createPort } from '@hex-di/ports';

interface UserService {
  getUser(id: string): Promise<User>;
}

// createPort<'PortName', ServiceInterface>('PortName')
const UserServicePort = createPort<'UserService', UserService>('UserService');
```

### Adapters

Adapters implement ports and declare their dependencies. The factory function receives typed dependencies automatically.

```typescript
import { createAdapter } from '@hex-di/graph';

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],  // Dependencies
  lifetime: 'scoped',
  factory: (deps) => {
    // deps is typed as { Logger: Logger; Database: Database }
    return {
      getUser: async (id) => {
        deps.Logger.log(`Fetching user ${id}`);
        return deps.Database.query('SELECT * FROM users WHERE id = ?', [id]);
      }
    };
  }
});
```

### GraphBuilder

GraphBuilder composes adapters into a validated dependency graph using an immutable, fluent API.

```typescript
import { GraphBuilder } from '@hex-di/graph';

const graph = GraphBuilder.create()
  .provide(LoggerAdapter)      // singleton, no deps
  .provide(DatabaseAdapter)    // singleton, no deps
  .provide(UserServiceAdapter) // scoped, requires Logger & Database
  .build(); // Compile error if dependencies are missing!
```

### Container & Scopes

Containers resolve services from the graph. Scopes provide isolation for scoped services.

```typescript
import { createContainer } from '@hex-di/runtime';

const container = createContainer(graph);

// Resolve singleton services directly
const logger = container.resolve(LoggerPort);

// Create scopes for scoped services
const scope = container.createScope();
const userService = scope.resolve(UserServicePort);

// Cleanup when done
await scope.dispose();
await container.dispose();
```

## Lifetime Scopes

| Lifetime | Instance Creation | Use Case |
|----------|-------------------|----------|
| `singleton` | Once per container | Stateless services, shared resources |
| `scoped` | Once per scope | Request context, user sessions |
| `request` | Every resolution | Fresh instances, isolation |

```typescript
// Singleton - shared across entire app
const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ apiUrl: 'https://api.example.com' })
});

// Scoped - one per scope (e.g., per HTTP request)
const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => ({ userId: getCurrentUserId() })
});

// Request - new instance every time
const NotificationAdapter = createAdapter({
  provides: NotificationPort,
  requires: [],
  lifetime: 'request',
  factory: () => ({ id: generateId(), createdAt: new Date() })
});
```

## React Integration

```typescript
import { createTypedHooks } from '@hex-di/react';
import { createContainer } from '@hex-di/runtime';

// Create typed hooks for your app's ports
const {
  ContainerProvider,
  AutoScopeProvider,
  usePort
} = createTypedHooks<AppPorts>();

// App setup
const container = createContainer(graph);

function App() {
  return (
    <ContainerProvider container={container}>
      <Dashboard />
    </ContainerProvider>
  );
}

// Use services in components
function Dashboard() {
  const logger = usePort(LoggerPort);

  useEffect(() => {
    logger.log('Dashboard mounted');
  }, [logger]);

  return (
    <AutoScopeProvider>
      <UserProfile />
    </AutoScopeProvider>
  );
}

function UserProfile() {
  const session = usePort(UserSessionPort); // Scoped to AutoScopeProvider
  return <div>Welcome, {session.user.name}</div>;
}
```

## Compile-Time Safety

HexDI catches errors at compile time with readable error messages:

```typescript
// Missing dependency
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger, Database
  .build();
// Error: Expected 1 argument, but got 0.
// Shows: MissingDependencyError<typeof LoggerPort | typeof DatabasePort>

// Duplicate provider
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(AnotherLoggerAdapter) // same port
  .build();
// Error: DuplicateProviderError<typeof LoggerPort>

// Invalid port resolution
container.resolve(UnknownPort);
// Error: Argument of type 'typeof UnknownPort' is not assignable...
```

## DevTools

Visualize your dependency graph and trace service resolution:

```typescript
import { DevToolsFloating, createTracingContainer } from '@hex-di/devtools';

// Create a tracing container for detailed insights
const container = createTracingContainer(graph);

// Add DevTools to your app
function App() {
  return (
    <ContainerProvider container={container}>
      <MyApp />
      <DevToolsFloating
        graph={graph}
        container={container}
        position="bottom-right"
      />
    </ContainerProvider>
  );
}
```

Export graphs for documentation:

```typescript
import { toMermaid, toDOT, toJSON } from '@hex-di/devtools';

// Generate Mermaid diagram
console.log(toMermaid(graph));

// Generate Graphviz DOT
console.log(toDOT(graph));

// Export as JSON
console.log(JSON.stringify(toJSON(graph), null, 2));
```

## Testing

Override adapters for testing without touching production code:

```typescript
import { TestGraphBuilder, createMockAdapter } from '@hex-di/testing';
import { createContainer } from '@hex-di/runtime';

// Create mock adapters
const mockLogger = createMockAdapter(LoggerPort, {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
});

// Build test graph with overrides
const testGraph = TestGraphBuilder.from(productionGraph)
  .override(mockLogger)
  .build();

// Create test container
const container = createContainer(testGraph);

// Test your services
const userService = container.resolve(UserServicePort);
await userService.getUser('123');

expect(mockLogger.log).toHaveBeenCalledWith('Fetching user 123');
```

## Error Handling

All container errors extend `ContainerError` with stable error codes:

```typescript
import {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError
} from '@hex-di/runtime';

try {
  const service = container.resolve(SomePort);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.error('Circular dependency detected:', error.dependencyChain);
    console.error('Code:', error.code); // 'CIRCULAR_DEPENDENCY'
  } else if (error instanceof FactoryError) {
    console.error('Factory failed for:', error.portName);
    console.error('Original error:', error.cause);
  } else if (error instanceof ScopeRequiredError) {
    console.error('Must resolve from scope:', error.portName);
  } else if (error instanceof DisposedScopeError) {
    console.error('Cannot resolve from disposed scope');
  }
}
```

## Documentation

- [Getting Started Guide](./docs/getting-started/README.md) - Installation, core concepts, first application
- [API Reference](./docs/api/README.md) - Complete API documentation for all packages
- [Guides](./docs/guides/README.md) - React integration, testing strategies, DevTools usage
- [Patterns](./docs/patterns/README.md) - Project structure, composing graphs, best practices
- [Examples](./docs/examples/README.md) - Real-world examples and code snippets

## Examples

See the [React Showcase](./examples/react-showcase) for a complete example demonstrating:

- All three lifetime scopes (singleton, scoped, request)
- React integration with typed hooks
- Automatic scope lifecycle management
- DevTools integration
- Reactive updates with subscriptions

## TypeScript Configuration

HexDI requires TypeScript 5.0+ with strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022"
  }
}
```

## Design Philosophy

HexDI is built on these principles:

1. **Compile-Time over Runtime** - Catch errors before your code runs
2. **Type Inference** - Let TypeScript do the work, no explicit annotations needed
3. **Immutability** - GraphBuilder returns new instances, enabling safe composition
4. **Zero Overhead** - Phantom types and optional features add no runtime cost
5. **Framework Agnostic** - Core packages work anywhere, React integration is optional

## Inspiration

HexDI draws inspiration from:

- **Effect-TS** - Layer composition pattern and immutable builder design
- **Hexagonal Architecture** - Ports and adapters terminology
- **InversifyJS** - Container-based dependency injection for TypeScript

## Contributing

Contributions are welcome! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) for details.
