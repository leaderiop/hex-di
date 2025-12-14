# @hex-di/graph

The compile-time validation layer of HexDI providing dependency graph construction with type-safe adapter registration and actionable error messages.

## Installation

```bash
npm install @hex-di/graph @hex-di/ports
# or
pnpm add @hex-di/graph @hex-di/ports
# or
yarn add @hex-di/graph @hex-di/ports
```

> **Note:** `@hex-di/ports` is a peer dependency and must be installed alongside `@hex-di/graph`.

## Requirements

- **TypeScript 5.0+** - Required for the `const` type parameter modifier that preserves tuple types in `requires` arrays
- **Node.js 18.0+** - Minimum supported runtime version

## Quick Start

```typescript
import { createPort } from '@hex-di/ports';
import { createAdapter, GraphBuilder } from '@hex-di/graph';

// Define service interfaces
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// Create port tokens
const LoggerPort = createPort<'Logger', Logger>('Logger');
const DatabasePort = createPort<'Database', Database>('Database');
const UserServicePort = createPort<'UserService', UserService>('UserService');

// Create adapters
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(msg)
  })
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: 'singleton',
  factory: (deps) => {
    // deps is typed as { Logger: Logger }
    deps.Logger.log('Initializing database...');
    return {
      query: async (sql) => { /* ... */ }
    };
  }
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: 'scoped',
  factory: (deps) => {
    // deps is typed as { Logger: Logger; Database: Database }
    return {
      getUser: async (id) => {
        deps.Logger.log(`Fetching user ${id}`);
        const result = await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
        return result as { id: string; name: string };
      }
    };
  }
});

// Build the dependency graph
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();

// graph is ready for use with @hex-di/runtime
```

## Core Concepts

### Adapters

An adapter is a typed declaration that connects a service implementation to a port. It captures:

1. **Provides** - Which port this adapter satisfies
2. **Requires** - Which ports this adapter depends on
3. **Lifetime** - How long service instances should live
4. **Factory** - A function that creates the service instance

```typescript
const MyAdapter = createAdapter({
  provides: MyPort,           // Single port this adapter implements
  requires: [DepA, DepB],     // Array of port dependencies
  lifetime: 'singleton',      // 'singleton' | 'scoped' | 'request'
  factory: (deps) => {        // Receives typed dependencies object
    return new MyServiceImpl(deps.DepA, deps.DepB);
  }
});
```

### GraphBuilder

The `GraphBuilder` is an immutable builder that accumulates adapters and tracks dependencies at the type level:

```typescript
const builder1 = GraphBuilder.create();                    // GraphBuilder<never, never>
const builder2 = builder1.provide(LoggerAdapter);          // GraphBuilder<LoggerPort, never>
const builder3 = builder2.provide(UserServiceAdapter);     // GraphBuilder<LoggerPort | UserServicePort, LoggerPort | DatabasePort>
```

Each `.provide()` call returns a **new** builder instance. The original is unchanged.

### Lifetime Scopes

| Lifetime | Description | Use Case |
|----------|-------------|----------|
| `'singleton'` | One instance for entire application | Shared resources, connection pools |
| `'scoped'` | One instance per scope (e.g., request) | Request-specific state, transactions |
| `'request'` | New instance every resolution | Stateful services, isolation needed |

### Compile-Time Validation

The graph validates dependencies at compile time. When you call `.build()`, TypeScript checks that all required ports are provided:

```typescript
// This compiles - all dependencies satisfied
const valid = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)  // requires Logger - satisfied
  .build();

// This produces a compile error - Database is missing
const invalid = GraphBuilder.create()
  .provide(UserServiceAdapter)  // requires Logger AND Database
  .provide(LoggerAdapter)       // provides Logger, but Database missing
  .build();
// Error: Type 'MissingDependencyError<typeof DatabasePort>' is not assignable...
// __message: "Missing dependencies: Database"
```

## Compile-Time Error Examples

### Missing Dependencies

When required dependencies are not provided, you get a clear error message:

```typescript
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  // ...
});

const graph = GraphBuilder.create()
  .provide(UserServiceAdapter)
  .build();  // Error!
```

**Error message in IDE:**
```
Type 'MissingDependencyError<...>' is not assignable to type 'Graph<...>'
  __message: "Missing dependencies: Logger" | "Missing dependencies: Database"
```

**Fix:** Add the missing adapters:
```typescript
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();  // OK!
```

### Duplicate Providers

When the same port is provided twice, you get an error:

```typescript
const ConsoleLoggerAdapter = createAdapter({
  provides: LoggerPort,
  // ...
});

const FileLoggerAdapter = createAdapter({
  provides: LoggerPort,  // Same port!
  // ...
});

const graph = GraphBuilder.create()
  .provide(ConsoleLoggerAdapter)
  .provide(FileLoggerAdapter)  // Error!
  .build();
```

**Error message in IDE:**
```
Type 'DuplicateProviderError<...>' is not assignable...
  __message: "Duplicate provider for: Logger"
```

## API Reference

### `createAdapter(config)`

Creates a typed adapter with dependency metadata.

#### Config Properties

| Property | Type | Description |
|----------|------|-------------|
| `provides` | `Port<T, string>` | The port this adapter implements |
| `requires` | `readonly Port[]` | Array of port dependencies (empty array for none) |
| `lifetime` | `Lifetime` | Service lifetime: `'singleton'`, `'scoped'`, or `'request'` |
| `factory` | `(deps) => T` | Factory function receiving resolved dependencies |

#### Returns

`Adapter<TProvides, TRequires, TLifetime>` - A frozen adapter object.

#### Example

```typescript
import { createAdapter } from '@hex-di/graph';

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: 'singleton',
  factory: (deps) => {
    const ttl = deps.Config.get('cache.ttl');
    return new RedisCache({ ttl });
  }
});
```

### `GraphBuilder.create()`

Creates a new empty GraphBuilder.

#### Returns

`GraphBuilder<never, never>` - An empty, frozen builder.

### `GraphBuilder.provide(adapter)`

Registers an adapter with the graph, returning a new builder.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `adapter` | `Adapter` | The adapter to register |

#### Returns

- On success: `GraphBuilder<TProvides | AdapterProvides, TRequires | AdapterRequires>`
- On duplicate: `DuplicateProviderError<DuplicatePort>`

### `GraphBuilder.build()`

Validates and builds the dependency graph.

#### Returns

- On success: `Graph<TProvides>` - The validated graph
- On missing deps: `MissingDependencyError<MissingPorts>` - Error type

### Type Utilities

#### `Adapter<TProvides, TRequires, TLifetime>`

The branded adapter type capturing the full contract.

```typescript
type MyAdapter = Adapter<typeof LoggerPort, never, 'singleton'>;
```

#### `Graph<TProvides>`

The validated graph returned by `.build()`.

```typescript
type MyGraph = Graph<typeof LoggerPort | typeof DatabasePort>;
```

#### `Lifetime`

Union type of lifetime options.

```typescript
type Lifetime = 'singleton' | 'scoped' | 'request';
```

#### `ResolvedDeps<TRequires>`

Maps a port union to a typed dependencies object.

```typescript
type Deps = ResolvedDeps<typeof LoggerPort | typeof DatabasePort>;
// { Logger: Logger; Database: Database }
```

#### `InferAdapterProvides<A>`

Extracts the provided port from an adapter.

```typescript
type Provided = InferAdapterProvides<typeof LoggerAdapter>;
// typeof LoggerPort
```

#### `InferAdapterRequires<A>`

Extracts the required ports union from an adapter.

```typescript
type Required = InferAdapterRequires<typeof UserServiceAdapter>;
// typeof LoggerPort | typeof DatabasePort
```

#### `InferAdapterLifetime<A>`

Extracts the lifetime literal from an adapter.

```typescript
type Life = InferAdapterLifetime<typeof LoggerAdapter>;
// 'singleton'
```

#### `InferGraphProvides<G>`

Extracts provided ports from a GraphBuilder.

```typescript
type Provided = InferGraphProvides<typeof builder>;
// typeof LoggerPort | typeof DatabasePort
```

#### `InferGraphRequires<G>`

Extracts required ports from a GraphBuilder.

```typescript
type Required = InferGraphRequires<typeof builder>;
// typeof ConfigPort
```

#### `UnsatisfiedDependencies<TProvides, TRequires>`

Computes missing dependencies via union subtraction.

```typescript
type Missing = UnsatisfiedDependencies<
  typeof LoggerPort,
  typeof LoggerPort | typeof DatabasePort
>;
// typeof DatabasePort
```

#### `IsSatisfied<TProvides, TRequires>`

Boolean type predicate for dependency satisfaction.

```typescript
type Satisfied = IsSatisfied<
  typeof LoggerPort | typeof DatabasePort,
  typeof LoggerPort
>;
// true
```

#### `MissingDependencyError<MissingPorts>`

Error type with readable message for missing dependencies.

```typescript
type Error = MissingDependencyError<typeof LoggerPort>;
// { __message: "Missing dependencies: Logger"; ... }
```

#### `DuplicateProviderError<DuplicatePort>`

Error type with readable message for duplicate providers.

```typescript
type Error = DuplicateProviderError<typeof LoggerPort>;
// { __message: "Duplicate provider for: Logger"; ... }
```

## Type-Level Patterns

### Union Subtraction for Dependency Tracking

The graph tracks dependencies using TypeScript's union types and `Exclude`:

```typescript
// Provided ports accumulate via union
type Provided = LoggerPort | DatabasePort;

// Required ports also accumulate via union
type Required = LoggerPort | DatabasePort | ConfigPort;

// Missing = Required - Provided
type Missing = Exclude<Required, Provided>;
// = ConfigPort
```

This pattern, inspired by Effect-TS, enables compile-time dependency verification without runtime checks.

### Template Literal Error Messages

Error types use template literal types to produce readable messages:

```typescript
type MissingDependencyError<P> = {
  __message: `Missing dependencies: ${InferPortName<P>}`;
};

// When P = typeof LoggerPort | typeof DatabasePort
// __message = "Missing dependencies: Logger" | "Missing dependencies: Database"
```

### Immutable Builder Pattern

Following Effect-TS Layer composition, each `.provide()` returns a new builder:

```typescript
const base = GraphBuilder.create().provide(LoggerAdapter);
const withDb = base.provide(DatabaseAdapter);
const withCache = base.provide(CacheAdapter);

// base is unchanged - both withDb and withCache branch from it
```

This enables safe composition patterns without mutation concerns.

### Branded Types for Nominal Typing

Adapters use a branded type pattern for nominal typing:

```typescript
declare const __adapterBrand: unique symbol;

type Adapter<P, R, L> = {
  [__adapterBrand]: [P, R, L];  // Brand carries type params
  // ... other properties
};
```

This ensures two adapters with different type parameters are never compatible, even if structurally similar.

## Integration with HexDI

This package is part of the HexDI ecosystem:

- **@hex-di/ports** - Port token system (peer dependency)
- **@hex-di/graph** - Dependency graph construction (this package)
- **@hex-di/runtime** - Container implementation that consumes graphs
- **@hex-di/react** - React bindings for dependency injection
- **@hex-di/testing** - Testing utilities and mock helpers

## License

MIT
