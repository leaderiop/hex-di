---
title: TypeScript Integration
description: Leverage HexDI's TypeScript type inference, utilities, and compile-time validation for type-safe dependency injection.
sidebar_position: 5
---

# TypeScript Integration

HexDI is designed for TypeScript and leverages its type system for compile-time validation. This guide covers type inference, utilities, and best practices.

## Zero-Annotation Design

HexDI requires no explicit type annotations in most cases. TypeScript infers everything:

```typescript
// No type annotations needed!
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: 'scoped',
  factory: (deps) => {
    // TypeScript knows: deps = { Logger: Logger; Database: Database }
    deps.Logger.log('Creating user service');
    return {
      getUser: async (id) => {
        return deps.Database.query('SELECT * FROM users WHERE id = ?', [id]);
      }
    };
  }
});
```

## How Type Inference Works

### Port Type Inference

`createPort<'Name', Service>('Name')` captures both the name and service type:

```typescript
const LoggerPort = createPort<'Logger', Logger>('Logger');

// TypeScript sees:
// LoggerPort: Port<Logger, 'Logger'>
```

The name becomes a literal type, not just `string`.

### Adapter Type Inference

`createAdapter()` infers types from the configuration object:

```typescript
const adapter = createAdapter({
  provides: LoggerPort,           // infers TProvides
  requires: [DatabasePort],       // infers TRequires as tuple
  lifetime: 'singleton',          // infers literal 'singleton'
  factory: (deps) => ({ /* ... */ })
});

// TypeScript sees:
// adapter: Adapter<typeof LoggerPort, typeof DatabasePort, 'singleton'>
```

### GraphBuilder Type Accumulation

Each `.provide()` accumulates type information:

```typescript
const builder1 = GraphBuilder.create();
// builder1: GraphBuilder<never, never>

const builder2 = builder1.provide(LoggerAdapter);
// builder2: GraphBuilder<typeof LoggerPort, never>

const builder3 = builder2.provide(UserServiceAdapter);
// builder3: GraphBuilder<
//   typeof LoggerPort | typeof UserServicePort,
//   typeof LoggerPort | typeof DatabasePort
// >
```

### Container Type Inference

Container knows which ports can be resolved:

```typescript
const container = createContainer(graph);
// container: Container<typeof LoggerPort | typeof DatabasePort | ...>

const logger = container.resolve(LoggerPort);
// logger: Logger (inferred from Port)

container.resolve(UnknownPort);
// Error: Argument of type 'typeof UnknownPort' is not assignable...
```

## Type Utilities

HexDI exports utilities for extracting type information.

### Port Utilities

```typescript
import { InferService, InferPortName } from '@hex-di/ports';

const LoggerPort = createPort<'Logger', Logger>('Logger');

// Extract service type from port
type LoggerServiceType = InferService<typeof LoggerPort>;
// LoggerServiceType = Logger

// Extract port name
type LoggerPortName = InferPortName<typeof LoggerPort>;
// LoggerPortName = 'Logger'
```

### Adapter Utilities

```typescript
import {
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime
} from '@hex-di/graph';

// Extract what adapter provides
type Provides = InferAdapterProvides<typeof UserServiceAdapter>;
// Provides = typeof UserServicePort

// Extract what adapter requires
type Requires = InferAdapterRequires<typeof UserServiceAdapter>;
// Requires = typeof LoggerPort | typeof DatabasePort

// Extract lifetime
type Life = InferAdapterLifetime<typeof UserServiceAdapter>;
// Life = 'scoped'
```

### GraphBuilder Utilities

```typescript
import { InferGraphProvides, InferGraphRequires } from '@hex-di/graph';

const builder = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter);

// What ports are provided
type Provided = InferGraphProvides<typeof builder>;
// Provided = typeof LoggerPort | typeof UserServicePort

// What ports are required (before satisfaction)
type Required = InferGraphRequires<typeof builder>;
// Required = typeof LoggerPort | typeof DatabasePort
```

### Container Utilities

```typescript
import {
  InferContainerProvides,
  ServiceFromContainer,
  IsResolvable
} from '@hex-di/runtime';

// Extract what container can provide
type Provides = InferContainerProvides<typeof container>;
// Provides = typeof LoggerPort | typeof DatabasePort | ...

// Get service type for a port from container
type LoggerType = ServiceFromContainer<typeof container, typeof LoggerPort>;
// LoggerType = Logger

// Check if port is resolvable
type CanResolve = IsResolvable<typeof container, typeof LoggerPort>;
// CanResolve = true
```

## Creating Type-Safe Collections

### AppPorts Type

Define a union type of all ports in your application:

```typescript
// In ports.ts
export const LoggerPort = createPort<'Logger', Logger>('Logger');
export const DatabasePort = createPort<'Database', Database>('Database');
export const UserServicePort = createPort<'UserService', UserService>('UserService');

// Union of all ports
export type AppPorts =
  | typeof LoggerPort
  | typeof DatabasePort
  | typeof UserServicePort;
```

### Type-Safe React Hooks

Use the AppPorts type with React:

```typescript
import { createTypedHooks } from '@hex-di/react';
import type { AppPorts } from './ports';

// Hooks are now typed to only accept AppPorts
const { usePort, ContainerProvider } = createTypedHooks<AppPorts>();

// In components
function MyComponent() {
  const logger = usePort(LoggerPort);    // Works - LoggerPort is in AppPorts
  // const unknown = usePort(UnknownPort); // Error - not in AppPorts
}
```

## Compile-Time Error Messages

HexDI provides readable compile-time errors.

### Missing Dependency Error

```typescript
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger, Database
  .build();
```

Error message:
```
Argument of type '[]' is not assignable to parameter of type
'[error: MissingDependencyError<typeof LoggerPort | typeof DatabasePort>]'.
```

The error shows exactly which ports are missing.

### Duplicate Provider Error

```typescript
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(AnotherLoggerAdapter); // same port!
```

Error message:
```
Type 'DuplicateProviderError<typeof LoggerPort>' is not assignable to type
'GraphBuilder<...>'.
```

### Invalid Resolution Error

```typescript
container.resolve(UnregisteredPort);
```

Error message:
```
Argument of type 'Port<Unknown, "Unknown">' is not assignable to
parameter of type 'typeof LoggerPort | typeof DatabasePort | ...'.
```

## Type-Level Dependency Tracking

HexDI tracks dependencies at the type level using TypeScript's conditional types.

### ResolvedDeps Type

The factory function's `deps` parameter is typed using `ResolvedDeps`:

```typescript
// Internal type (for understanding)
type ResolvedDeps<TRequires> = {
  [P in TRequires as InferPortName<P>]: InferService<P>;
};

// Example
type MyDeps = ResolvedDeps<typeof LoggerPort | typeof DatabasePort>;
// MyDeps = { Logger: Logger; Database: Database }
```

### Dependency Validation Types

```typescript
import { UnsatisfiedDependencies, IsSatisfied } from '@hex-di/graph';

type Provided = typeof LoggerPort;
type Required = typeof LoggerPort | typeof DatabasePort;

// What's missing?
type Missing = UnsatisfiedDependencies<Provided, Required>;
// Missing = typeof DatabasePort

// Is everything satisfied?
type Satisfied = IsSatisfied<Provided, Required>;
// Satisfied = false
```

## Advanced Type Patterns

### Extracting Port Type from Graph

```typescript
import type { Graph } from '@hex-di/graph';

// Extract TProvides from a graph
type AppPorts = typeof appGraph extends Graph<infer P> ? P : never;
```

### Type-Safe Service Lookup

Create type-safe lookup functions:

```typescript
function getService<P extends AppPorts>(
  container: Container<AppPorts>,
  port: P
): InferService<P> {
  return container.resolve(port);
}

const logger = getService(container, LoggerPort);
// logger: Logger
```

### Conditional Types for Lifetime

```typescript
type IsSingleton<A> = InferAdapterLifetime<A> extends 'singleton' ? true : false;

type Test1 = IsSingleton<typeof LoggerAdapter>;  // true
type Test2 = IsSingleton<typeof UserAdapter>;    // false (scoped)
```

## Best Practices

### 1. Let TypeScript Infer

Avoid explicit type annotations when possible:

```typescript
// Good - TypeScript infers
const adapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: console.log })
});

// Unnecessary - explicit type
const adapter: Adapter<typeof LoggerPort, never, 'singleton'> = createAdapter({
  // ...
});
```

### 2. Use `typeof` for Port Types

When you need to reference a port's type:

```typescript
// Good
function logWithPort(port: typeof LoggerPort) { /* ... */ }

// Also good - using AppPorts union
function resolveAny(port: AppPorts) { /* ... */ }
```

### 3. Export AppPorts Type

Always export a union type of all ports:

```typescript
// ports.ts
export type AppPorts =
  | typeof LoggerPort
  | typeof DatabasePort
  | typeof UserServicePort;
```

### 4. Use const for Literal Types

The `const` modifier preserves literal types:

```typescript
// createPort uses const internally
const LoggerPort = createPort<'Logger', Logger>('Logger');
// Name is literal 'Logger', not string
```

### 5. Validate Graph at Module Level

Build graphs at module level to catch errors early:

```typescript
// graph.ts - errors caught at compile time
export const appGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build(); // Compile error if invalid
```

## Troubleshooting

### "Type 'never' is not assignable"

Usually means a dependency chain is broken:

```typescript
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger
  .build(); // Error: never is not assignable...
```

Solution: Add missing adapters.

### "Cannot find name 'typeof'"

Make sure you're using `typeof` with the port value:

```typescript
// Wrong
type MyPort = LoggerPort;

// Right
type MyPort = typeof LoggerPort;
```

### "Expected 0 arguments, but got 1"

The `.build()` method expects an error argument when dependencies are missing:

```typescript
// This is HexDI's way of forcing you to see the error
.build() // Shows: Expected 1 argument, got 0
// The argument type shows what's missing
```

## Next Steps

- Explore [Testing Strategies](../guides/testing-strategies.md)
- Learn about [Error Handling](../guides/error-handling.md)
- See [API Reference](../api/README.md) for complete documentation
