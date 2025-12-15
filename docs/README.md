---
title: HexDI Documentation
description: Complete documentation for HexDI, a type-safe dependency injection framework for TypeScript with compile-time validation.
sidebar_position: 1
sidebar_label: Overview
---

# HexDI Documentation

Welcome to the HexDI documentation. HexDI is a type-safe dependency injection framework for TypeScript with compile-time validation.

## Quick Navigation

### Getting Started

New to HexDI? Start here:

1. [Installation](./getting-started/installation.md) - Install packages and configure TypeScript
2. [Core Concepts](./getting-started/core-concepts.md) - Understand ports, adapters, graphs, and containers
3. [First Application](./getting-started/first-application.md) - Build your first DI-powered app
4. [Lifetimes](./getting-started/lifetimes.md) - Singleton, scoped, and request lifetimes
5. [TypeScript Integration](./getting-started/typescript-integration.md) - Type inference and utilities

### Guides

In-depth guides for specific use cases:

- [React Integration](./guides/react-integration.md) - Hooks, providers, and scope management
- [Testing Strategies](./guides/testing-strategies.md) - Mocking, overrides, and test patterns
- [DevTools Usage](./guides/devtools-usage.md) - Visualization and tracing
- [Error Handling](./guides/error-handling.md) - Error hierarchy and recovery patterns

### Patterns

Best practices and common patterns:

- [Project Structure](./patterns/project-structure.md) - Organizing your DI code
- [Composing Graphs](./patterns/composing-graphs.md) - Base graphs, modules, and branching
- [Scoped Services](./patterns/scoped-services.md) - Request contexts and user sessions
- [Finalizers & Cleanup](./patterns/finalizers-and-cleanup.md) - Resource disposal patterns

### API Reference

Complete API documentation for each package:

- [@hex-di/ports](./api/ports.md) - Port token system
- [@hex-di/graph](./api/graph.md) - GraphBuilder and adapters
- [@hex-di/runtime](./api/runtime.md) - Container and scopes
- [@hex-di/react](./api/react.md) - React integration
- [@hex-di/devtools](./api/devtools.md) - Visualization and tracing
- [@hex-di/testing](./api/testing.md) - Testing utilities

### Examples

- [Examples Overview](./examples/README.md) - Real-world examples and code snippets

## Learning Path

### Beginner Path

If you're new to dependency injection:

1. Read [Core Concepts](./getting-started/core-concepts.md) to understand the mental model
2. Follow [First Application](./getting-started/first-application.md) to build something
3. Learn about [Lifetimes](./getting-started/lifetimes.md) for proper instance management
4. Explore [Project Structure](./patterns/project-structure.md) for organizing code

### Experienced DI Developer Path

If you're familiar with DI from other frameworks:

1. Skim [Core Concepts](./getting-started/core-concepts.md) for HexDI terminology
2. Review the [API Reference](./api/README.md) for available APIs
3. Check [Composing Graphs](./patterns/composing-graphs.md) for advanced patterns
4. Explore [TypeScript Integration](./getting-started/typescript-integration.md) for type utilities

### React Developer Path

If you're building a React application:

1. Complete the beginner path above
2. Read [React Integration](./guides/react-integration.md) thoroughly
3. Study [Scoped Services](./patterns/scoped-services.md) for user session patterns
4. Review [Testing Strategies](./guides/testing-strategies.md) for component testing

## Package Overview

```
                      ┌─────────────────┐
                      │  Your App       │
                      └────────┬────────┘
                               │ uses
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ @hex-di/react│    │@hex-di/devtools   │@hex-di/testing
│  (optional)  │    │  (optional)  │    │  (optional)  │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │ depend on
                           ▼
                  ┌─────────────────┐
                  │ @hex-di/runtime │
                  │    (core)       │
                  └────────┬────────┘
                           │ depends on
                           ▼
                  ┌─────────────────┐
                  │  @hex-di/graph  │
                  │    (core)       │
                  └────────┬────────┘
                           │ depends on
                           ▼
                  ┌─────────────────┐
                  │  @hex-di/ports  │
                  │  (foundation)   │
                  └─────────────────┘
```

## Key Design Principles

### 1. Compile-Time Validation

HexDI catches dependency errors at compile time:

```typescript
const graph = GraphBuilder.create()
  .provide(UserServiceAdapter) // requires Logger, Database
  .build();
// TypeScript Error: MissingDependencyError<typeof LoggerPort | typeof DatabasePort>
```

### 2. Full Type Inference

No explicit type annotations needed - TypeScript infers everything:

```typescript
const adapter = createAdapter({
  provides: UserPort,
  requires: [LoggerPort, DatabasePort],
  lifetime: 'scoped',
  factory: (deps) => {
    // deps is automatically typed as { Logger: Logger; Database: Database }
    return { /* ... */ };
  }
});
```

### 3. Immutable Builder Pattern

Each `provide()` returns a new builder, enabling safe composition:

```typescript
const base = GraphBuilder.create()
  .provide(LoggerAdapter);

// Branch A - doesn't modify base
const withUsers = base.provide(UserServiceAdapter);

// Branch B - doesn't modify base either
const withOrders = base.provide(OrderServiceAdapter);
```

### 4. Zero Runtime Overhead

Phantom types and optional features add no cost when unused:

- Port types carry service information at compile-time only
- DevTools tracing is opt-in
- React hooks only exist if you import them

## Getting Help

- [GitHub Issues](https://github.com/your-org/hex-di/issues) - Bug reports and feature requests
- [Examples](./examples/README.md) - Working code examples
- [API Reference](./api/README.md) - Complete API documentation
