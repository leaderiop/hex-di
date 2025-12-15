---
title: Getting Started
description: Learn how to install and configure HexDI in your TypeScript project with step-by-step guidance.
sidebar_position: 1
---

# Getting Started with HexDI

This section will guide you through installing and using HexDI in your TypeScript project.

## Prerequisites

- Node.js 18.0 or later
- TypeScript 5.0 or later
- A package manager (pnpm, npm, or yarn)

## Sections

1. **[Installation](./installation.md)** - Install HexDI packages and configure TypeScript
2. **[Core Concepts](./core-concepts.md)** - Understand ports, adapters, graphs, and containers
3. **[First Application](./first-application.md)** - Build a complete working example step-by-step
4. **[Lifetimes](./lifetimes.md)** - Master singleton, scoped, and request service lifetimes
5. **[TypeScript Integration](./typescript-integration.md)** - Leverage type inference and utilities

## Quick Overview

HexDI uses four main concepts to manage dependencies:

```
Port → Adapter → Graph → Container
```

1. **Port** - A typed token that represents a service contract
2. **Adapter** - An implementation of a port with its dependencies declared
3. **Graph** - A validated collection of adapters (validated at compile-time)
4. **Container** - A runtime resolver that creates service instances

```typescript
// 1. Port - the contract
const LoggerPort = createPort<'Logger', Logger>('Logger');

// 2. Adapter - the implementation
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({ log: console.log })
});

// 3. Graph - validated composition
const graph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .build();

// 4. Container - runtime resolution
const container = createContainer(graph);
const logger = container.resolve(LoggerPort);
```

## What Makes HexDI Different?

### Compile-Time Validation

Unlike other DI frameworks that fail at runtime, HexDI catches errors at compile time:

```typescript
// This fails to compile - not at runtime!
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger
  .build(); // Error: Missing dependencies: Logger
```

### Full Type Inference

No decorators, no explicit types, no configuration files:

```typescript
// TypeScript infers everything
const adapter = createAdapter({
  provides: MyPort,
  requires: [LoggerPort],
  lifetime: 'scoped',
  factory: (deps) => {
    deps.Logger.log('Hello'); // TypeScript knows this is valid
    return { /* ... */ };
  }
});
```

### Immutable Composition

GraphBuilder is immutable - each `provide()` returns a new builder:

```typescript
const base = GraphBuilder.create().provide(LoggerAdapter);
const withDb = base.provide(DatabaseAdapter);    // base unchanged
const withCache = base.provide(CacheAdapter);   // base unchanged
```

## Next Steps

Start with [Installation](./installation.md) to set up your project.
