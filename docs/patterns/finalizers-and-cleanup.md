---
title: Finalizers and Cleanup
description: Resource cleanup patterns using finalizers for database connections, file handles, event listeners, and graceful shutdown.
sidebar_position: 4
---

# Finalizers and Cleanup

This guide covers resource cleanup patterns using finalizers and proper disposal.

## Understanding Finalizers

Finalizers are optional cleanup functions that run when containers or scopes are disposed.

```typescript
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: 'singleton',
  factory: () => new DatabasePool({ maxConnections: 10 }),
  finalizer: async (pool) => {
    await pool.close();
    console.log('Database pool closed');
  }
});
```

## Disposal Order

Finalizers are called in **LIFO order** (Last In, First Out):

```typescript
// Creation order: A → B → C
const a = container.resolve(APort); // Created 1st
const b = container.resolve(BPort); // Created 2nd
const c = container.resolve(CPort); // Created 3rd

await container.dispose();
// Disposal order: C → B → A
```

This ensures dependencies are still available during cleanup.

## Common Finalizer Patterns

### Database Connections

```typescript
const DatabasePoolAdapter = createAdapter({
  provides: DatabasePoolPort,
  requires: [ConfigPort, LoggerPort],
  lifetime: 'singleton',
  factory: (deps) => {
    deps.Logger.log('Creating database pool');
    return new Pool({
      connectionString: deps.Config.databaseUrl,
      max: deps.Config.maxConnections
    });
  },
  finalizer: async (pool) => {
    console.log('Closing database pool...');
    await pool.end();
    console.log('Database pool closed');
  }
});
```

### HTTP Clients

```typescript
const HttpClientAdapter = createAdapter({
  provides: HttpClientPort,
  requires: [LoggerPort],
  lifetime: 'singleton',
  factory: (deps) => {
    const client = axios.create({
      timeout: 30000
    });
    deps.Logger.log('HTTP client created');
    return client;
  },
  finalizer: (client) => {
    // Cancel any pending requests
    client.defaults.cancelToken?.cancel('Client disposed');
  }
});
```

### WebSocket Connections

```typescript
const WebSocketAdapter = createAdapter({
  provides: WebSocketPort,
  requires: [ConfigPort],
  lifetime: 'singleton',
  factory: (deps) => {
    const ws = new WebSocket(deps.Config.wsUrl);
    return ws;
  },
  finalizer: (ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Container disposed');
    }
  }
});
```

### File Handles

```typescript
const LogFileAdapter = createAdapter({
  provides: LogFilePort,
  requires: [ConfigPort],
  lifetime: 'singleton',
  factory: (deps) => {
    const stream = fs.createWriteStream(deps.Config.logPath, { flags: 'a' });
    return {
      write: (msg: string) => stream.write(`${msg}\n`)
    };
  },
  finalizer: (logFile) => {
    return new Promise<void>((resolve, reject) => {
      logFile.stream.end(() => resolve());
      logFile.stream.on('error', reject);
    });
  }
});
```

### Event Listeners

```typescript
const EventBusAdapter = createAdapter({
  provides: EventBusPort,
  requires: [LoggerPort],
  lifetime: 'singleton',
  factory: (deps) => {
    const emitter = new EventEmitter();
    const handlers = new Map<string, Function[]>();

    return {
      on: (event: string, handler: Function) => {
        if (!handlers.has(event)) {
          handlers.set(event, []);
        }
        handlers.get(event)!.push(handler);
        emitter.on(event, handler);
      },
      emit: (event: string, data: unknown) => {
        emitter.emit(event, data);
      },
      _handlers: handlers,
      _emitter: emitter
    };
  },
  finalizer: (bus) => {
    // Remove all listeners
    bus._emitter.removeAllListeners();
    bus._handlers.clear();
  }
});
```

### Cache Cleanup

```typescript
const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [LoggerPort],
  lifetime: 'singleton',
  factory: (deps) => {
    const cache = new Map<string, CacheEntry>();
    const timers = new Map<string, NodeJS.Timeout>();

    return {
      set: (key: string, value: unknown, ttl: number) => {
        cache.set(key, { value, expiry: Date.now() + ttl });
        const timer = setTimeout(() => cache.delete(key), ttl);
        timers.set(key, timer);
      },
      get: (key: string) => {
        const entry = cache.get(key);
        if (!entry || entry.expiry < Date.now()) {
          cache.delete(key);
          return undefined;
        }
        return entry.value;
      },
      _timers: timers
    };
  },
  finalizer: (cache) => {
    // Clear all timers
    for (const timer of cache._timers.values()) {
      clearTimeout(timer);
    }
    cache._timers.clear();
  }
});
```

## Scoped Service Finalizers

Finalizers also work for scoped services:

```typescript
const RequestLoggerAdapter = createAdapter({
  provides: RequestLoggerPort,
  requires: [RequestContextPort],
  lifetime: 'scoped',
  factory: (deps) => {
    const logs: string[] = [];
    const { requestId } = deps.RequestContext;

    return {
      log: (msg: string) => logs.push(`[${requestId}] ${msg}`),
      getLogs: () => [...logs],
      requestId
    };
  },
  finalizer: async (logger) => {
    // Flush logs to storage at end of request
    if (logger.getLogs().length > 0) {
      await saveRequestLogs(logger.requestId, logger.getLogs());
    }
  }
});
```

## Async Finalizers

Finalizers can be async:

```typescript
finalizer: async (service) => {
  // Async cleanup operations
  await service.flush();
  await service.close();
  await service.cleanup();
}
```

The disposal process waits for all finalizers to complete.

## Error Handling in Finalizers

Errors in finalizers are caught and logged:

```typescript
const UnsafeAdapter = createAdapter({
  provides: UnsafePort,
  requires: [],
  lifetime: 'singleton',
  factory: () => ({}),
  finalizer: () => {
    throw new Error('Cleanup failed!');
  }
});

// Disposal continues despite errors
await container.dispose();
// Error is logged but other finalizers still run
```

To handle errors explicitly:

```typescript
finalizer: async (service) => {
  try {
    await service.close();
  } catch (error) {
    console.error('Failed to close service:', error);
    // Don't re-throw - allow other finalizers to run
  }
}
```

## Container Disposal

### Basic Disposal

```typescript
const container = createContainer(graph);

// Use container...
const service = container.resolve(ServicePort);
await service.doWork();

// Cleanup
await container.dispose();
```

### Disposing with Active Scopes

Dispose scopes before container:

```typescript
const container = createContainer(graph);
const scopes: Scope[] = [];

// Track scopes
function createRequestScope() {
  const scope = container.createScope();
  scopes.push(scope);
  return scope;
}

// Cleanup
async function shutdown() {
  // Dispose all scopes first
  await Promise.all(scopes.map(s => s.dispose()));

  // Then dispose container
  await container.dispose();
}
```

### Graceful Shutdown

```typescript
const container = createContainer(graph);
let isShuttingDown = false;

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('Shutting down...');

  // Stop accepting new requests
  server.close();

  // Wait for in-flight requests (with timeout)
  await Promise.race([
    waitForInflightRequests(),
    delay(30000) // 30 second timeout
  ]);

  // Dispose container
  await container.dispose();

  console.log('Shutdown complete');
  process.exit(0);
});
```

## Scope Disposal

### Manual Scope Management

```typescript
async function handleRequest(req: Request) {
  const scope = container.createScope();

  try {
    const service = scope.resolve(RequestServicePort);
    return await service.process(req);
  } finally {
    // Always dispose
    await scope.dispose();
  }
}
```

### Auto-Disposal with Resources

```typescript
// Using async disposal pattern
async function withScope<T>(
  container: Container,
  fn: (scope: Scope) => Promise<T>
): Promise<T> {
  const scope = container.createScope();
  try {
    return await fn(scope);
  } finally {
    await scope.dispose();
  }
}

// Usage
const result = await withScope(container, async (scope) => {
  const service = scope.resolve(ServicePort);
  return service.doWork();
});
```

## React Cleanup

### AutoScopeProvider Cleanup

`AutoScopeProvider` handles cleanup automatically:

```typescript
function Feature() {
  return (
    <AutoScopeProvider>
      {/* Scope disposed when Feature unmounts */}
      <FeatureContent />
    </AutoScopeProvider>
  );
}
```

### Manual Hook Cleanup

```typescript
function useScopedService<T>(port: Port<T, string>): T {
  const container = useContainer();
  const scopeRef = useRef<Scope | null>(null);
  const serviceRef = useRef<T | null>(null);

  useEffect(() => {
    scopeRef.current = container.createScope();
    serviceRef.current = scopeRef.current.resolve(port);

    return () => {
      scopeRef.current?.dispose();
    };
  }, [container, port]);

  return serviceRef.current!;
}
```

## Finalizer Best Practices

### 1. Keep Finalizers Idempotent

```typescript
finalizer: async (service) => {
  if (service.isClosed) return; // Already cleaned up
  service.isClosed = true;
  await service.close();
}
```

### 2. Don't Block Forever

```typescript
finalizer: async (service) => {
  // Add timeout to prevent hanging
  await Promise.race([
    service.close(),
    delay(5000).then(() => {
      console.warn('Service close timed out');
    })
  ]);
}
```

### 3. Log Cleanup Activities

```typescript
finalizer: async (service) => {
  console.log(`Closing ${service.name}...`);
  const start = Date.now();
  await service.close();
  console.log(`Closed ${service.name} in ${Date.now() - start}ms`);
}
```

### 4. Order-Dependent Cleanup

If services depend on each other for cleanup, rely on LIFO order:

```typescript
// Created first, disposed last
const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  // ...
  finalizer: async (db) => {
    // Can assume all dependent services are already cleaned up
    await db.close();
  }
});

// Created second, disposed first
const UserRepositoryAdapter = createAdapter({
  provides: UserRepositoryPort,
  requires: [DatabasePort],
  // ...
  finalizer: async (repo) => {
    // Runs before DatabaseAdapter finalizer
    await repo.flushCache();
  }
});
```

### 5. Test Finalizers

```typescript
describe('DatabaseAdapter finalizer', () => {
  it('closes the connection pool', async () => {
    const container = createContainer(graph);
    const db = container.resolve(DatabasePort);

    expect(db.pool.ended).toBe(false);

    await container.dispose();

    expect(db.pool.ended).toBe(true);
  });
});
```

## Next Steps

- Learn [Error Handling](../guides/error-handling.md)
- Explore [Scoped Services](./scoped-services.md)
- See [Testing Strategies](../guides/testing-strategies.md)
