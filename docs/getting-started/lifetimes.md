---
title: Service Lifetimes
description: Master singleton, scoped, and request service lifetimes in HexDI for proper instance management.
sidebar_position: 4
sidebar_label: Lifetimes
---

# Service Lifetimes

HexDI provides three lifetime scopes that control when service instances are created and how long they live.

## Overview

| Lifetime | Instance Creation | Scope Required | Use Case |
|----------|-------------------|----------------|----------|
| `singleton` | Once per container | No | Shared resources, stateless services |
| `scoped` | Once per scope | Yes | Request context, user sessions |
| `request` | Every resolution | No | Fresh instances, isolation |

## Singleton Lifetime

Singleton services are created once and shared across the entire application.

### When to Use Singleton

- Stateless services (loggers, validators)
- Shared resources (database pools, HTTP clients)
- Configuration services
- Expensive-to-create services

### Example

```typescript
const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: 'singleton',
  factory: () => {
    console.log('Logger created'); // Only logged once
    return {
      log: (msg) => console.log(`[App] ${msg}`)
    };
  }
});
```

### Behavior

```typescript
const container = createContainer(graph);

// First resolution creates the instance
const logger1 = container.resolve(LoggerPort);

// Subsequent resolutions return the same instance
const logger2 = container.resolve(LoggerPort);

console.log(logger1 === logger2); // true

// Same instance in scopes too
const scope = container.createScope();
const logger3 = scope.resolve(LoggerPort);

console.log(logger1 === logger3); // true
```

### Singleton Dependencies

Singletons can only depend on other singletons. This prevents the "captive dependency" anti-pattern:

```typescript
// This would be problematic (caught at compile-time in strict mode)
const BadSingletonAdapter = createAdapter({
  provides: BadServicePort,
  requires: [ScopedServicePort], // Scoped service as dependency!
  lifetime: 'singleton',        // Singleton depending on scoped = bug
  factory: (deps) => ({ /* ... */ })
});
```

## Scoped Lifetime

Scoped services are created once per scope and shared within that scope.

### When to Use Scoped

- Request-specific state (HTTP request context)
- User sessions
- Database transactions
- Per-request caching

### Example

```typescript
const UserSessionAdapter = createAdapter({
  provides: UserSessionPort,
  requires: [],
  lifetime: 'scoped',
  factory: () => {
    console.log('UserSession created'); // Logged once per scope
    return {
      userId: getCurrentUserId(),
      startedAt: new Date()
    };
  }
});
```

### Behavior

```typescript
const container = createContainer(graph);

// Cannot resolve scoped services from root container
// container.resolve(UserSessionPort); // Error: ScopeRequiredError

// Must use a scope
const scope1 = container.createScope();
const session1a = scope1.resolve(UserSessionPort);
const session1b = scope1.resolve(UserSessionPort);

console.log(session1a === session1b); // true - same scope

// Different scopes get different instances
const scope2 = container.createScope();
const session2 = scope2.resolve(UserSessionPort);

console.log(session1a === session2); // false - different scopes

// Don't forget to dispose!
await scope1.dispose();
await scope2.dispose();
```

### Scoped Dependencies

Scoped services can depend on:
- Singletons (safe - longer-lived than scope)
- Other scoped services (same lifetime)

```typescript
const ChatServiceAdapter = createAdapter({
  provides: ChatServicePort,
  requires: [LoggerPort, UserSessionPort], // singleton + scoped
  lifetime: 'scoped',
  factory: (deps) => ({
    sendMessage: (content) => {
      deps.Logger.log(`${deps.UserSession.userId} sent: ${content}`);
    }
  })
});
```

## Request Lifetime

Request services create a fresh instance every time they're resolved.

### When to Use Request

- Services needing unique identifiers
- Stateful services where state shouldn't be shared
- When isolation between calls is important
- Transient operations

### Example

```typescript
let instanceCounter = 0;

const NotificationAdapter = createAdapter({
  provides: NotificationPort,
  requires: [],
  lifetime: 'request',
  factory: () => {
    instanceCounter++;
    console.log(`Notification instance #${instanceCounter} created`);
    return {
      id: `notif-${instanceCounter}`,
      createdAt: new Date(),
      send: (message) => {
        console.log(`[Notification #${instanceCounter}] ${message}`);
      }
    };
  }
});
```

### Behavior

```typescript
const container = createContainer(graph);

// Each resolution creates a new instance
const notif1 = container.resolve(NotificationPort);
const notif2 = container.resolve(NotificationPort);

console.log(notif1 === notif2); // false
console.log(notif1.id === notif2.id); // false

// Same in scopes - still fresh each time
const scope = container.createScope();
const notif3 = scope.resolve(NotificationPort);
const notif4 = scope.resolve(NotificationPort);

console.log(notif3 === notif4); // false
```

### Request Dependencies

Request services can depend on any lifetime (they're the shortest-lived):

```typescript
const RequestServiceAdapter = createAdapter({
  provides: RequestServicePort,
  requires: [LoggerPort, UserSessionPort, NotificationPort],
  lifetime: 'request',
  factory: (deps) => ({
    // Fresh instance every time, but deps follow their own lifetimes
    // - Logger: same singleton each time
    // - UserSession: same scoped instance within scope
    // - Notification: fresh instance each time
  })
});
```

## Lifetime Hierarchy

Lifetimes have a hierarchy based on how long instances live:

```
singleton (longest) > scoped > request (shortest)
```

### Dependency Rules

A service can only depend on services with **equal or longer** lifetimes:

| Service Lifetime | Can Depend On |
|------------------|---------------|
| `singleton` | `singleton` only |
| `scoped` | `singleton`, `scoped` |
| `request` | `singleton`, `scoped`, `request` |

### Captive Dependency Prevention

A "captive dependency" occurs when a longer-lived service captures a shorter-lived one:

```typescript
// BAD: Singleton holding onto scoped service
const BadAdapter = createAdapter({
  provides: BadServicePort,
  requires: [UserSessionPort], // scoped
  lifetime: 'singleton',       // singleton
  factory: (deps) => {
    // This UserSession is captured forever!
    // It won't update when the user changes.
    const session = deps.UserSession;
    return { getUser: () => session.userId };
  }
});
```

HexDI helps prevent this with compile-time validation in strict mode.

## Scope Management Patterns

### HTTP Request Pattern

```typescript
async function handleRequest(req: Request, res: Response) {
  const scope = container.createScope();
  try {
    const userService = scope.resolve(UserServicePort);
    const result = await userService.processRequest(req);
    res.json(result);
  } finally {
    await scope.dispose();
  }
}
```

### React Pattern (AutoScopeProvider)

```typescript
function UserDashboard() {
  return (
    <AutoScopeProvider>
      {/* Children get scoped services */}
      <UserProfile />
      <UserSettings />
    </AutoScopeProvider>
  );
}
```

### Worker Thread Pattern

```typescript
function processJob(jobId: string) {
  const scope = container.createScope();
  try {
    const processor = scope.resolve(JobProcessorPort);
    return processor.process(jobId);
  } finally {
    scope.dispose();
  }
}
```

## Disposal and Cleanup

### Finalizers

Adapters can define cleanup logic via finalizers:

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

### Disposal Order

Finalizers are called in **reverse creation order** (LIFO):

```typescript
// Creation order: A → B → C
// Disposal order: C → B → A
```

This ensures dependencies are available during cleanup.

### Scope Disposal

When a scope is disposed:
1. Scoped service finalizers are called (LIFO)
2. Request services don't have finalizers (too many instances)
3. Singletons are NOT disposed (they belong to the container)

```typescript
const scope = container.createScope();
const userSession = scope.resolve(UserSessionPort); // scoped
const logger = scope.resolve(LoggerPort);           // singleton

await scope.dispose();
// Only userSession's finalizer is called
// logger (singleton) stays alive
```

### Container Disposal

When the container is disposed:
1. All scopes should already be disposed (warning if not)
2. Singleton finalizers are called (LIFO)

```typescript
await container.dispose();
// All singleton finalizers called
// Container can no longer resolve services
```

## Choosing the Right Lifetime

### Decision Flowchart

```
Is the service stateless?
├─ Yes → Consider singleton
└─ No → Does state need to persist across requests?
         ├─ Yes → Is it per-user/per-request?
         │        ├─ Yes → Use scoped
         │        └─ No → Use singleton
         └─ No → Use request
```

### Common Patterns

| Service Type | Recommended Lifetime |
|--------------|---------------------|
| Logger | `singleton` |
| Configuration | `singleton` |
| Database pool | `singleton` |
| HTTP client | `singleton` |
| User session | `scoped` |
| Request context | `scoped` |
| Database transaction | `scoped` |
| Notification sender | `request` |
| Request ID generator | `request` |

## Next Steps

- Explore [TypeScript Integration](./typescript-integration.md)
- Learn [React Integration](../guides/react-integration.md) patterns
- See [Scoped Services](../patterns/scoped-services.md) patterns
