---
title: "@hex-di/runtime"
description: API reference for @hex-di/runtime providing Containers, Scopes, error classes, and type-safe service resolution.
sidebar_position: 3
sidebar_label: "@hex-di/runtime"
---

# @hex-di/runtime API Reference

The runtime layer of HexDI that creates containers from validated graphs and provides type-safe service resolution with lifetime management.

## Installation

```bash
pnpm add @hex-di/runtime
```

## Overview

`@hex-di/runtime` provides:
- `createContainer()` - Factory for creating containers
- `Container` and `Scope` types
- Error classes for runtime failures
- Type utilities for container introspection
- Inspector API for DevTools

## Functions

### createContainer

Creates an immutable container from a validated graph.

```typescript
function createContainer<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>,
  options?: ContainerOptions
): Container<TProvides>
```

**Parameters:**
- `graph` - A validated Graph from `GraphBuilder.build()`
- `options` - Optional configuration

**Returns:**
- `Container<TProvides>` - The container instance

**Example:**

```typescript
import { createContainer } from '@hex-di/runtime';

const container = createContainer(graph);
const logger = container.resolve(LoggerPort);
```

### ContainerOptions

```typescript
interface ContainerOptions {
  hooks?: ResolutionHooks;
}

interface ResolutionHooks {
  beforeResolve?: (context: ResolutionHookContext) => void;
  afterResolve?: (context: ResolutionResultContext) => void;
}

interface ResolutionHookContext {
  portName: string;
  lifetime: Lifetime;
  scopeId?: string;
}

interface ResolutionResultContext extends ResolutionHookContext {
  cached: boolean;
  duration: number;
  error?: Error;
}
```

**Example:**

```typescript
const container = createContainer(graph, {
  hooks: {
    beforeResolve: (ctx) => {
      console.log(`Resolving ${ctx.portName}`);
    },
    afterResolve: (ctx) => {
      console.log(`Resolved ${ctx.portName} in ${ctx.duration}ms`);
    }
  }
});
```

## Types

### `Container<TProvides>`

Root container for service resolution.

```typescript
interface Container<TProvides extends Port<unknown, string>> {
  resolve<P extends TProvides>(port: P): InferService<P>;
  createScope(): Scope<TProvides>;
  dispose(): Promise<void>;
}
```

#### container.resolve(port)

Resolves a singleton or request-scoped service.

```typescript
const logger = container.resolve(LoggerPort);
// logger: Logger

// Scoped services require a scope
container.resolve(UserSessionPort);
// Throws: ScopeRequiredError
```

#### container.createScope()

Creates a child scope for scoped services.

```typescript
const scope = container.createScope();
const session = scope.resolve(UserSessionPort);
```

#### container.dispose()

Disposes the container and calls all finalizers.

```typescript
await container.dispose();
// All singleton finalizers called in LIFO order
```

### `Scope<TProvides>`

Child scope for managing scoped service lifetimes.

```typescript
interface Scope<TProvides extends Port<unknown, string>> {
  resolve<P extends TProvides>(port: P): InferService<P>;
  createScope(): Scope<TProvides>;
  dispose(): Promise<void>;
}
```

#### scope.resolve(port)

Resolves a service within this scope.

```typescript
const scope = container.createScope();

// Singletons - same as container
scope.resolve(LoggerPort) === container.resolve(LoggerPort); // true

// Scoped - unique per scope
const session = scope.resolve(UserSessionPort);

// Request - fresh each time
scope.resolve(NotificationPort) !== scope.resolve(NotificationPort); // true
```

#### scope.createScope()

Creates a nested child scope.

```typescript
const parentScope = container.createScope();
const childScope = parentScope.createScope();
```

#### scope.dispose()

Disposes the scope and calls scoped service finalizers.

```typescript
await scope.dispose();
// Scoped service finalizers called
// Singletons NOT disposed (belong to container)
```

## Type Utilities

### `InferContainerProvides<C>`

Extracts the TProvides type from a Container.

```typescript
type Provides = InferContainerProvides<typeof container>;
// typeof LoggerPort | typeof UserServicePort | ...
```

### `InferScopeProvides<S>`

Extracts the TProvides type from a Scope.

```typescript
type Provides = InferScopeProvides<typeof scope>;
```

### `IsResolvable<C, P>`

Checks if a port is resolvable from a container.

```typescript
type CanResolve = IsResolvable<typeof container, typeof LoggerPort>;
// true or false
```

### `ServiceFromContainer<C, P>`

Gets the service type for a port from a container.

```typescript
type LoggerType = ServiceFromContainer<typeof container, typeof LoggerPort>;
// Logger
```

## Error Classes

### ContainerError

Base class for all container errors.

```typescript
abstract class ContainerError extends Error {
  readonly code: string;
  readonly isProgrammingError: boolean;
}
```

### CircularDependencyError

Thrown when circular dependency detected at resolution.

```typescript
class CircularDependencyError extends ContainerError {
  readonly code = 'CIRCULAR_DEPENDENCY';
  readonly isProgrammingError = true;
  readonly dependencyChain: string[];
}
```

**Example:**

```typescript
try {
  container.resolve(ServiceAPort);
} catch (error) {
  if (error instanceof CircularDependencyError) {
    console.log(error.dependencyChain);
    // ['ServiceA', 'ServiceB', 'ServiceA']
  }
}
```

### FactoryError

Thrown when an adapter's factory function throws.

```typescript
class FactoryError extends ContainerError {
  readonly code = 'FACTORY_FAILED';
  readonly isProgrammingError = false;
  readonly portName: string;
  readonly cause: Error;
}
```

**Example:**

```typescript
try {
  container.resolve(DatabasePort);
} catch (error) {
  if (error instanceof FactoryError) {
    console.log(error.portName); // 'Database'
    console.log(error.cause);    // Original error
  }
}
```

### DisposedScopeError

Thrown when resolving from a disposed scope.

```typescript
class DisposedScopeError extends ContainerError {
  readonly code = 'SCOPE_DISPOSED';
  readonly isProgrammingError = true;
}
```

### ScopeRequiredError

Thrown when resolving scoped service from root container.

```typescript
class ScopeRequiredError extends ContainerError {
  readonly code = 'SCOPE_REQUIRED';
  readonly isProgrammingError = true;
  readonly portName: string;
}
```

## Inspector API

For DevTools and debugging.

### INTERNAL_ACCESS

Symbol for accessing container internals.

```typescript
import { INTERNAL_ACCESS } from '@hex-di/runtime';

const accessor = container[INTERNAL_ACCESS];
const state = accessor();
```

### createInspector

Creates an inspector for a container.

```typescript
import { createInspector } from '@hex-di/runtime';

const inspector = createInspector(container);
const snapshot = inspector.snapshot();
```

**ContainerInspector:**

```typescript
interface ContainerInspector {
  snapshot(): ContainerSnapshot;
  getSingletons(): SingletonEntry[];
  getScopeTree(): ScopeTree;
}

interface ContainerSnapshot {
  singletons: SingletonEntry[];
  adapters: AdapterInfo[];
  scopes: ScopeTree;
}
```

## Captive Dependency Types

For compile-time prevention of captive dependencies.

### `LifetimeLevel<L>`

Maps lifetime to numeric level.

```typescript
type LifetimeLevel<L extends Lifetime> =
  L extends 'singleton' ? 3 :
  L extends 'scoped' ? 2 :
  L extends 'request' ? 1 : never;
```

### `CaptiveDependencyError<...>`

Error type for captive dependency violations.

```typescript
type CaptiveDependencyError<
  ConsumerPort,
  DependencyPort,
  ConsumerLifetime,
  DependencyLifetime
> = {
  __errorBrand: 'CaptiveDependencyError';
  __message: string;
  // ...
};
```

## Re-exports

`@hex-di/runtime` re-exports from sibling packages:
- From `@hex-di/ports`: `Port`, `InferService`, `InferPortName`
- From `@hex-di/graph`: `Graph`, `Adapter`, `Lifetime`, etc.

## Usage Example

```typescript
import {
  createContainer,
  ContainerError,
  CircularDependencyError,
  FactoryError
} from '@hex-di/runtime';

// Create container
const container = createContainer(graph);

// Resolve singleton
const logger = container.resolve(LoggerPort);

// Use scopes for scoped services
const scope = container.createScope();
try {
  const session = scope.resolve(UserSessionPort);
  const userService = scope.resolve(UserServicePort);
  await userService.doWork();
} catch (error) {
  if (error instanceof FactoryError) {
    logger.error(`Factory failed: ${error.portName}`);
  } else if (error instanceof CircularDependencyError) {
    logger.error(`Circular: ${error.dependencyChain.join(' -> ')}`);
  }
} finally {
  await scope.dispose();
}

// Cleanup
await container.dispose();
```
