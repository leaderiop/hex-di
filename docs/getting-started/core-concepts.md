---
title: Core Concepts
description: Understand the fundamental concepts of HexDI including Ports, Adapters, Graphs, Containers, and Scopes.
sidebar_position: 2
---

# Core Concepts

This guide explains the fundamental concepts in HexDI: Ports, Adapters, Graphs, Containers, and Scopes.

## The HexDI Mental Model

HexDI follows a simple flow:

```
Define Interface → Create Port → Create Adapter → Build Graph → Create Container → Resolve Service
```

Let's explore each concept in detail.

## Ports

A **Port** is a typed token that represents a service contract. It serves two purposes:

1. **Runtime identifier** - A unique token to look up services
2. **Type carrier** - Carries the service interface type at compile time

### Creating Ports

```typescript
import { createPort } from '@hex-di/ports';

// Define the service interface
interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// Create a port
// createPort<'PortName', ServiceInterface>('PortName')
const LoggerPort = createPort<'Logger', Logger>('Logger');
```

### Port Naming Convention

The port name (string) should match the type parameter:

```typescript
// Good - names match
const LoggerPort = createPort<'Logger', Logger>('Logger');
const DatabasePort = createPort<'Database', Database>('Database');

// Avoid - inconsistent naming
const LoggerPort = createPort<'Log', Logger>('Logger'); // Confusing
```

### Why Ports?

Ports provide **nominal typing**. Two ports with the same interface are still distinct:

```typescript
interface Logger {
  log(message: string): void;
}

const ConsoleLoggerPort = createPort<'ConsoleLogger', Logger>('ConsoleLogger');
const FileLoggerPort = createPort<'FileLogger', Logger>('FileLogger');

// These are type-incompatible even though Logger interface is the same
// container.resolve(ConsoleLoggerPort) !== container.resolve(FileLoggerPort)
```

## Adapters

An **Adapter** implements a port and declares its dependencies. It's the "how" to the port's "what".

### Creating Adapters

```typescript
import { createAdapter } from '@hex-di/graph';

const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,      // Which port this implements
  requires: [],              // Dependencies (none here)
  lifetime: 'singleton',     // Instance lifecycle
  factory: () => ({          // How to create the service
    log: (msg) => console.log(`[INFO] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`)
  })
});
```

### Adapters with Dependencies

The `requires` array declares which ports this adapter depends on:

```typescript
interface UserService {
  getUser(id: string): Promise<User>;
}

const UserServicePort = createPort<'UserService', UserService>('UserService');

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],  // Declare dependencies
  lifetime: 'scoped',
  factory: (deps) => {
    // deps is automatically typed as:
    // { Logger: Logger; Database: Database }
    return {
      getUser: async (id) => {
        deps.Logger.log(`Fetching user ${id}`);
        const result = await deps.Database.query(
          'SELECT * FROM users WHERE id = ?',
          [id]
        );
        return result;
      }
    };
  }
});
```

### Adapter Configuration

| Property | Required | Description |
|----------|----------|-------------|
| `provides` | Yes | The port this adapter implements |
| `requires` | Yes | Array of dependency ports (use `[]` for none) |
| `lifetime` | Yes | `'singleton'`, `'scoped'`, or `'request'` |
| `factory` | Yes | Function that creates the service instance |
| `finalizer` | No | Cleanup function called on disposal |

### Finalizers

Adapters can specify cleanup logic:

```typescript
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: 'singleton',
  factory: () => new DatabasePool(),
  finalizer: async (pool) => {
    await pool.close();
    console.log('Database pool closed');
  }
});
```

## Graphs

A **Graph** is a validated collection of adapters. GraphBuilder composes adapters and validates dependencies at compile time.

### Building Graphs

```typescript
import { GraphBuilder } from '@hex-di/graph';

const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();
```

### Compile-Time Validation

The graph validates that all dependencies are satisfied:

```typescript
// This compiles - all dependencies are provided
const validGraph = GraphBuilder.create()
  .provide(LoggerAdapter)      // provides Logger
  .provide(DatabaseAdapter)    // provides Database
  .provide(UserServiceAdapter) // requires Logger, Database ✓
  .build();

// This fails to compile - missing dependencies
const invalidGraph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger, Database
  .build(); // Error: MissingDependencyError<typeof LoggerPort | typeof DatabasePort>
```

### Immutable Builder Pattern

Each `provide()` returns a NEW builder instance:

```typescript
const builder1 = GraphBuilder.create();
const builder2 = builder1.provide(LoggerAdapter);
const builder3 = builder2.provide(DatabaseAdapter);

// builder1 still has 0 adapters
// builder2 has 1 adapter (Logger)
// builder3 has 2 adapters (Logger, Database)
```

This enables safe composition patterns:

```typescript
// Create a base graph
const base = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(ConfigAdapter);

// Branch for different features
const withUsers = base.provide(UserServiceAdapter);
const withOrders = base.provide(OrderServiceAdapter);

// base is unchanged by either branch
```

### Duplicate Detection

Providing the same port twice causes a compile error:

```typescript
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(AnotherLoggerAdapter) // Same port!
  .build();
// Error: DuplicateProviderError<typeof LoggerPort>
```

## Containers

A **Container** is the runtime resolver that creates service instances from a graph.

### Creating Containers

```typescript
import { createContainer } from '@hex-di/runtime';

const container = createContainer(graph);
```

### Resolving Services

```typescript
// Resolve a service
const logger = container.resolve(LoggerPort);

// Type is inferred
logger.log('Hello!'); // TypeScript knows this is valid

// Invalid ports are compile errors
container.resolve(UnknownPort); // Error: not in graph
```

### Container Lifecycle

```typescript
const container = createContainer(graph);

// Use services...
const logger = container.resolve(LoggerPort);

// Cleanup when done (calls finalizers in reverse order)
await container.dispose();
```

## Scopes

A **Scope** is a child container for managing scoped service lifetimes.

### Why Scopes?

Scoped services need boundaries - typically per HTTP request or per user session:

```typescript
// Scoped service - one instance per scope
const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => ({ userId: getCurrentUserId() })
});
```

### Creating Scopes

```typescript
const container = createContainer(graph);

// Create a scope for this request
const scope = container.createScope();

// Resolve scoped services
const session = scope.resolve(UserSessionPort);

// Dispose when request is complete
await scope.dispose();
```

### Scope Behavior

| Lifetime | Root Container | Scope |
|----------|---------------|-------|
| `singleton` | Created once, cached | Same instance from container |
| `scoped` | Error (requires scope) | Created once per scope |
| `request` | Fresh each time | Fresh each time |

```typescript
// Singletons are shared
const logger1 = container.resolve(LoggerPort);
const logger2 = scope.resolve(LoggerPort);
logger1 === logger2; // true

// Scoped instances are isolated
const scope1 = container.createScope();
const scope2 = container.createScope();
const session1 = scope1.resolve(UserSessionPort);
const session2 = scope2.resolve(UserSessionPort);
session1 === session2; // false

// Request instances are always fresh
const notif1 = scope.resolve(NotificationPort);
const notif2 = scope.resolve(NotificationPort);
notif1 === notif2; // false
```

## Putting It All Together

Here's a complete example showing all concepts:

```typescript
import { createPort } from '@hex-di/ports';
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { createContainer } from '@hex-di/runtime';

// 1. Define interfaces
interface Logger {
  log(message: string): void;
}

interface UserSession {
  userId: string;
}

interface UserService {
  getCurrentUser(): Promise<User>;
}

// 2. Create ports
const LoggerPort = createPort<'Logger', Logger>('Logger');
const UserSessionPort = createPort<'UserSession', UserSession>('UserSession');
const UserServicePort = createPort<'UserService', UserService>('UserService');

// 3. Create adapters
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(`[App] ${msg}`)
  })
});

const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => ({
    userId: 'user-123' // In real app, from request context
  })
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, UserSessionPort],
  lifetime: 'scoped',
  factory: (deps) => ({
    getCurrentUser: async () => {
      deps.Logger.log(`Getting user ${deps.UserSession.userId}`);
      return { id: deps.UserSession.userId, name: 'Alice' };
    }
  })
});

// 4. Build graph (compile-time validated)
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserSessionAdapter)
  .provide(UserServiceAdapter)
  .build();

// 5. Create container
const container = createContainer(graph);

// 6. Use in request handler
async function handleRequest() {
  const scope = container.createScope();
  try {
    const userService = scope.resolve(UserServicePort);
    const user = await userService.getCurrentUser();
    console.log('Current user:', user);
  } finally {
    await scope.dispose();
  }
}

handleRequest();
```

## Summary

| Concept | Purpose | Created With |
|---------|---------|--------------|
| Port | Service contract + runtime token | `createPort()` |
| Adapter | Implementation + dependencies | `createAdapter()` |
| Graph | Validated adapter collection | `GraphBuilder.create().provide().build()` |
| Container | Runtime service resolver | `createContainer()` |
| Scope | Lifetime boundary for scoped services | `container.createScope()` |

## Next Steps

- Learn about [Lifetimes](./lifetimes.md) in detail
- Build your [First Application](./first-application.md)
- Explore [TypeScript Integration](./typescript-integration.md)
