# @hex-di/graph API Reference

The compile-time validation layer of HexDI. Provides Adapter type, createAdapter function, and GraphBuilder with type-level dependency tracking.

## Installation

```bash
pnpm add @hex-di/graph
```

## Overview

`@hex-di/graph` provides:
- `Adapter<TProvides, TRequires, TLifetime>` - Branded adapter type
- `createAdapter()` - Factory to create adapters
- `GraphBuilder` - Immutable builder for dependency graphs
- Type utilities for validation and extraction
- Error types for compile-time messages

## Types

### Lifetime

Lifetime scope for an adapter's service instance.

```typescript
type Lifetime = 'singleton' | 'scoped' | 'request';
```

| Value | Description |
|-------|-------------|
| `'singleton'` | One instance for entire application |
| `'scoped'` | One instance per scope |
| `'request'` | New instance every resolution |

### Adapter<TProvides, TRequires, TLifetime>

A branded adapter type that captures the complete contract for a service implementation.

```typescript
type Adapter<
  TProvides extends Port<unknown, string>,
  TRequires extends Port<unknown, string> | never,
  TLifetime extends Lifetime
> = {
  readonly provides: TProvides;
  readonly requires: TRequires extends never
    ? readonly []
    : readonly Port<unknown, string>[];
  readonly lifetime: TLifetime;
  readonly factory: (deps: ResolvedDeps<TRequires>) => InferService<TProvides>;
  finalizer?(instance: InferService<TProvides>): void | Promise<void>;
};
```

**Type Parameters:**
- `TProvides` - The Port this adapter provides
- `TRequires` - Union of Ports required, or `never`
- `TLifetime` - The lifetime literal type

### ResolvedDeps<TRequires>

Maps a union of Port types to a dependencies object type.

```typescript
type ResolvedDeps<TRequires extends Port<unknown, string> | never> =
  [TRequires] extends [never]
    ? Record<string, unknown>
    : { [P in TRequires as InferPortName<P>]: InferService<P> };
```

**Example:**

```typescript
type Deps = ResolvedDeps<typeof LoggerPort | typeof DatabasePort>;
// { Logger: Logger; Database: Database }
```

### Graph<TProvides>

The validated dependency graph returned by `GraphBuilder.build()`.

```typescript
type Graph<TProvides extends Port<unknown, string> | never> = {
  readonly adapters: readonly Adapter<...>[];
  readonly __provides: TProvides;
};
```

## Functions

### createAdapter

Creates a typed adapter with dependency metadata.

```typescript
function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime
>(config: {
  provides: TProvides;
  requires: TRequires;
  lifetime: TLifetime;
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => InferService<TProvides>;
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime>
```

**Configuration:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `provides` | `Port` | Yes | The port this adapter implements |
| `requires` | `Port[]` | Yes | Dependencies (use `[]` for none) |
| `lifetime` | `Lifetime` | Yes | Instance lifecycle |
| `factory` | `Function` | Yes | Creates the service instance |
| `finalizer` | `Function` | No | Cleanup on disposal |

**Example:**

```typescript
// No dependencies
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({
    log: (msg) => console.log(msg)
  })
});

// With dependencies
const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: 'scoped',
  factory: (deps) => ({
    // deps: { Logger: Logger; Database: Database }
    getUser: async (id) => {
      deps.Logger.log(`Fetching ${id}`);
      return deps.Database.query('...');
    }
  })
});

// With finalizer
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: 'singleton',
  factory: () => new DatabasePool(),
  finalizer: async (pool) => {
    await pool.close();
  }
});
```

## Classes

### GraphBuilder<TProvides, TRequires>

An immutable builder for constructing dependency graphs with compile-time validation.

```typescript
class GraphBuilder<
  TProvides extends Port<unknown, string> | never = never,
  TRequires extends Port<unknown, string> | never = never
> {
  readonly adapters: readonly Adapter<...>[];

  static create(): GraphBuilder<never, never>;

  provide<A extends Adapter<...>>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, A>;

  build(
    ..._: IsSatisfied<TProvides, TRequires> extends true
      ? []
      : [error: MissingDependencyError<...>]
  ): Graph<TProvides>;
}
```

#### GraphBuilder.create()

Creates a new empty GraphBuilder.

```typescript
const builder = GraphBuilder.create();
// GraphBuilder<never, never>
```

#### builder.provide(adapter)

Registers an adapter, returning a NEW builder with updated types.

```typescript
const builder1 = GraphBuilder.create();
const builder2 = builder1.provide(LoggerAdapter);
const builder3 = builder2.provide(UserServiceAdapter);

// Each builder is immutable
builder1.adapters.length; // 0
builder2.adapters.length; // 1
builder3.adapters.length; // 2
```

**Return Type:**
- Success: `GraphBuilder` with accumulated types
- Duplicate: `DuplicateProviderError<Port>`

#### builder.build()

Validates and builds the dependency graph.

```typescript
// Complete graph - succeeds
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();

// Incomplete graph - compile error
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger
  .build(); // Error!
```

## Type Utilities

### InferAdapterProvides<A>

Extracts the provided port from an Adapter type.

```typescript
type Provides = InferAdapterProvides<typeof UserServiceAdapter>;
// typeof UserServicePort
```

### InferAdapterRequires<A>

Extracts the required ports union from an Adapter type.

```typescript
type Requires = InferAdapterRequires<typeof UserServiceAdapter>;
// typeof LoggerPort | typeof DatabasePort
```

### InferAdapterLifetime<A>

Extracts the lifetime from an Adapter type.

```typescript
type Life = InferAdapterLifetime<typeof LoggerAdapter>;
// 'singleton'
```

### InferGraphProvides<G>

Extracts the provided ports union from a GraphBuilder type.

```typescript
type Provides = InferGraphProvides<typeof builder>;
// typeof LoggerPort | typeof UserServicePort
```

### InferGraphRequires<G>

Extracts the required ports union from a GraphBuilder type.

```typescript
type Requires = InferGraphRequires<typeof builder>;
// typeof LoggerPort | typeof DatabasePort
```

## Validation Types

### UnsatisfiedDependencies<TProvides, TRequires>

Computes missing dependencies.

```typescript
type Missing = UnsatisfiedDependencies<
  typeof LoggerPort,
  typeof LoggerPort | typeof DatabasePort
>;
// typeof DatabasePort
```

### IsSatisfied<TProvides, TRequires>

Boolean predicate for dependency satisfaction.

```typescript
type Complete = IsSatisfied<
  typeof LoggerPort | typeof DatabasePort,
  typeof LoggerPort
>;
// true
```

### ValidGraph<TProvides, TRequires>

Conditional type for validation result.

```typescript
type Result = ValidGraph<TProvides, TRequires>;
// { __valid: true; provides: TProvides } or
// { __valid: false; __missing: ... }
```

## Error Types

### MissingDependencyError<MissingPorts>

Compile-time error type for missing dependencies.

```typescript
type Error = MissingDependencyError<typeof LoggerPort>;
// {
//   __valid: false;
//   __errorBrand: 'MissingDependencyError';
//   __message: 'Missing dependencies: Logger';
//   __missing: typeof LoggerPort;
// }
```

### DuplicateProviderError<DuplicatePort>

Compile-time error type for duplicate providers.

```typescript
type Error = DuplicateProviderError<typeof LoggerPort>;
// {
//   __valid: false;
//   __errorBrand: 'DuplicateProviderError';
//   __message: 'Duplicate provider for: Logger';
//   __duplicate: typeof LoggerPort;
// }
```

## Re-exports

`@hex-di/graph` re-exports from `@hex-di/ports`:
- `Port`
- `InferService`
- `InferPortName`

## Usage Example

```typescript
import { createAdapter, GraphBuilder } from '@hex-di/graph';
import { createPort } from '@hex-di/ports';

// Define interfaces
interface Logger {
  log(msg: string): void;
}

interface UserService {
  getUser(id: string): Promise<User>;
}

// Create ports
const LoggerPort = createPort<'Logger', Logger>('Logger');
const UserServicePort = createPort<'UserService', UserService>('UserService');

// Create adapters
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: console.log })
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: 'scoped',
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Fetching ${id}`);
      return { id, name: 'User' };
    }
  })
});

// Build graph (compile-time validated)
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(UserServiceAdapter)
  .build();
```
