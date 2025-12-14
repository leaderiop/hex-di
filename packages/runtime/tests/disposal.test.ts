/**
 * Disposal implementation unit tests.
 *
 * Comprehensive tests for disposal behavior including:
 * - LIFO disposal ordering
 * - Disposal state tracking
 * - DisposedScopeError on post-disposal resolution
 * - Child scope cascade disposal
 * - Finalizer error handling and aggregation
 * - Async finalizer support
 * - Idempotent disposal
 *
 * @packageDocumentation
 */

// Global declarations for Node.js types used in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function setTimeout(callback: (...args: any[]) => void, ms?: number): unknown;

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "../src/container.js";
import { DisposedScopeError } from "../src/errors.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface Cache {
  get(key: string): unknown;
}

interface RequestContext {
  requestId: string;
}

interface SessionStore {
  sessionId: string;
}

interface UserService {
  getUser(id: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");
const SessionStorePort = createPort<"SessionStore", SessionStore>("SessionStore");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// LIFO Disposal Order Tests
// =============================================================================

describe("Disposal LIFO ordering", () => {
  test("dispose() calls finalizers in LIFO order for container", async () => {
    const disposalOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => { disposalOrder.push("Logger"); },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
      finalizer: () => { disposalOrder.push("Database"); },
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn() }),
      finalizer: () => { disposalOrder.push("Cache"); },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve in order: Logger, Database, Cache
    container.resolve(LoggerPort);
    container.resolve(DatabasePort);
    container.resolve(CachePort);

    await container.dispose();

    // LIFO: Cache (last created) -> Database -> Logger (first created)
    expect(disposalOrder).toEqual(["Cache", "Database", "Logger"]);
  });

  test("dispose() calls finalizers in LIFO order for scope", async () => {
    const disposalOrder: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "1" }),
      finalizer: () => { disposalOrder.push("RequestContext"); },
    });

    const SessionAdapter = createAdapter({
      provides: SessionStorePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ sessionId: "1" }),
      finalizer: () => { disposalOrder.push("SessionStore"); },
    });

    const graph = GraphBuilder.create()
      .provide(RequestContextAdapter)
      .provide(SessionAdapter)
      .build();

    const container = createContainer(graph);
    const scope = container.createScope();

    // Resolve in order: RequestContext, SessionStore
    scope.resolve(RequestContextPort);
    scope.resolve(SessionStorePort);

    await scope.dispose();

    // LIFO: SessionStore (last created) -> RequestContext (first created)
    expect(disposalOrder).toEqual(["SessionStore", "RequestContext"]);
  });
});

// =============================================================================
// Disposal State Tracking Tests
// =============================================================================

describe("Disposal state tracking", () => {
  test("dispose() marks container as disposed", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    await container.dispose();

    // Attempting to resolve should throw DisposedScopeError
    expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  test("dispose() marks scope as disposed", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "1" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    await scope.dispose();

    // Attempting to resolve should throw DisposedScopeError
    expect(() => scope.resolve(RequestContextPort)).toThrow(DisposedScopeError);
  });

  test("resolve() throws DisposedScopeError after container disposal", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // First resolve succeeds
    const logger = container.resolve(LoggerPort);
    expect(logger).toBeDefined();

    await container.dispose();

    // Post-disposal resolve throws
    expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);

    // Verify error properties
    try {
      container.resolve(LoggerPort);
    } catch (error) {
      expect(error).toBeInstanceOf(DisposedScopeError);
      expect((error as DisposedScopeError).portName).toBe("Logger");
    }
  });

  test("resolve() throws DisposedScopeError after scope disposal", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "1" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    // First resolve succeeds
    const context = scope.resolve(RequestContextPort);
    expect(context).toBeDefined();

    await scope.dispose();

    // Post-disposal resolve throws with correct port name
    try {
      scope.resolve(RequestContextPort);
      expect.fail("Expected DisposedScopeError");
    } catch (error) {
      expect(error).toBeInstanceOf(DisposedScopeError);
      expect((error as DisposedScopeError).portName).toBe("RequestContext");
    }
  });
});

// =============================================================================
// Child Scope Cascade Disposal Tests
// =============================================================================

describe("Child scope cascade disposal", () => {
  test("disposal propagates to child scopes before parent", async () => {
    const callOrder: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "parent" }),
      finalizer: () => { callOrder.push("parent-scoped"); },
    });

    const SessionAdapter = createAdapter({
      provides: SessionStorePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ sessionId: "child" }),
      finalizer: () => { callOrder.push("child-scoped"); },
    });

    const graph = GraphBuilder.create()
      .provide(RequestContextAdapter)
      .provide(SessionAdapter)
      .build();

    const container = createContainer(graph);
    const parentScope = container.createScope();
    const childScope = parentScope.createScope();

    // Resolve in parent scope
    parentScope.resolve(RequestContextPort);
    // Resolve in child scope
    childScope.resolve(SessionStorePort);

    // Dispose parent - should dispose child first
    await parentScope.dispose();

    // Child scope's finalizers should be called before parent's
    expect(callOrder).toEqual(["child-scoped", "parent-scoped"]);
  });

  test("container disposal propagates to all child scopes first", async () => {
    const callOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => { callOrder.push("singleton"); },
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "scope1" }),
      finalizer: () => { callOrder.push("scope1"); },
    });

    const SessionAdapter = createAdapter({
      provides: SessionStorePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ sessionId: "scope2" }),
      finalizer: () => { callOrder.push("scope2"); },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .provide(SessionAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve singleton
    container.resolve(LoggerPort);

    // Create two sibling scopes
    const scope1 = container.createScope();
    const scope2 = container.createScope();

    scope1.resolve(RequestContextPort);
    scope2.resolve(SessionStorePort);

    // Dispose container
    await container.dispose();

    // Both scopes should be disposed before the singleton
    expect(callOrder).toContain("scope1");
    expect(callOrder).toContain("scope2");
    expect(callOrder[callOrder.length - 1]).toBe("singleton");
  });

  test("deeply nested scope hierarchy disposes correctly", async () => {
    const callOrder: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "any" }),
      finalizer: (instance) => { callOrder.push(instance.requestId); },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    // Create nested scopes
    const scope1 = container.createScope();
    const scope2 = scope1.createScope();
    const scope3 = scope2.createScope();

    // Resolve in each scope with unique IDs
    // Using the same adapter but tracking via manual ID
    let counter = 0;
    const RequestContextAdapterWithId = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: `scope${++counter}` }),
      finalizer: (instance) => { callOrder.push(instance.requestId); },
    });

    const graphWithId = GraphBuilder.create().provide(RequestContextAdapterWithId).build();
    const containerWithId = createContainer(graphWithId);

    const nestedScope1 = containerWithId.createScope();
    const nestedScope2 = nestedScope1.createScope();
    const nestedScope3 = nestedScope2.createScope();

    nestedScope1.resolve(RequestContextPort); // scope1
    nestedScope2.resolve(RequestContextPort); // scope2
    nestedScope3.resolve(RequestContextPort); // scope3

    // Dispose top-level scope
    await nestedScope1.dispose();

    // Should dispose deepest first: scope3 -> scope2 -> scope1
    expect(callOrder).toEqual(["scope3", "scope2", "scope1"]);
  });
});

// =============================================================================
// Finalizer Error Handling Tests
// =============================================================================

describe("Finalizer error handling", () => {
  test("disposal continues on finalizer error", async () => {
    const disposalOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        disposalOrder.push("Logger");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
      finalizer: () => {
        disposalOrder.push("Database");
        throw new Error("Database finalizer failed");
      },
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn() }),
      finalizer: () => {
        disposalOrder.push("Cache");
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .build();

    const container = createContainer(graph);

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);
    container.resolve(CachePort);

    // Dispose should throw but continue disposing all
    await expect(container.dispose()).rejects.toThrow();

    // All finalizers should have been called (LIFO order)
    expect(disposalOrder).toEqual(["Cache", "Database", "Logger"]);
  });

  test("AggregateError contains all finalizer failures", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        throw new Error("Logger finalizer failed");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
      finalizer: () => {
        throw new Error("Database finalizer failed");
      },
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: vi.fn() }),
      finalizer: () => {
        // This one succeeds
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .build();

    const container = createContainer(graph);

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);
    container.resolve(CachePort);

    try {
      await container.dispose();
      expect.fail("Expected AggregateError");
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const aggregateError = error as AggregateError;
      expect(aggregateError.errors).toHaveLength(2);

      // Verify error messages
      const errorMessages = aggregateError.errors.map((e) => (e as Error).message);
      expect(errorMessages).toContain("Database finalizer failed");
      expect(errorMessages).toContain("Logger finalizer failed");
    }
  });
});

// =============================================================================
// Async Finalizer Tests
// =============================================================================

describe("Async finalizer support", () => {
  test("async finalizers are awaited", async () => {
    const disposalOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        disposalOrder.push("Logger");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
      finalizer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        disposalOrder.push("Database");
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const container = createContainer(graph);

    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    await container.dispose();

    // LIFO order maintained even with async: Database (last created, shorter delay) -> Logger
    expect(disposalOrder).toEqual(["Database", "Logger"]);
  });

  test("async finalizers maintain LIFO order even with different durations", async () => {
    const disposalOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: async () => {
        // Logger has a LONGER delay but should complete SECOND because LIFO
        await new Promise((resolve) => setTimeout(resolve, 100));
        disposalOrder.push("Logger");
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
      finalizer: async () => {
        // Database has a SHORTER delay but should complete FIRST because LIFO
        await new Promise((resolve) => setTimeout(resolve, 10));
        disposalOrder.push("Database");
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve in order: Logger first, Database second
    container.resolve(LoggerPort);
    container.resolve(DatabasePort);

    await container.dispose();

    // LIFO: Database (last created) completes first, then Logger
    // Each finalizer is awaited before the next one starts
    expect(disposalOrder).toEqual(["Database", "Logger"]);
  });

  test("async finalizer errors are properly captured", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("Async logger cleanup failed");
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    container.resolve(LoggerPort);

    try {
      await container.dispose();
      expect.fail("Expected AggregateError");
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const aggregateError = error as AggregateError;
      expect(aggregateError.errors).toHaveLength(1);
      expect((aggregateError.errors[0] as Error).message).toBe("Async logger cleanup failed");
    }
  });
});

// =============================================================================
// Idempotent Disposal Tests
// =============================================================================

describe("Idempotent disposal", () => {
  test("container disposal is idempotent (second call is no-op)", async () => {
    const finalizerCalls = { count: 0 };

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        finalizerCalls.count++;
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    container.resolve(LoggerPort);

    // First disposal
    await container.dispose();
    expect(finalizerCalls.count).toBe(1);

    // Second disposal should be no-op
    await container.dispose();
    expect(finalizerCalls.count).toBe(1); // Still 1, not 2
  });

  test("scope disposal is idempotent (second call is no-op)", async () => {
    const finalizerCalls = { count: 0 };

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "1" }),
      finalizer: () => {
        finalizerCalls.count++;
      },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    scope.resolve(RequestContextPort);

    // First disposal
    await scope.dispose();
    expect(finalizerCalls.count).toBe(1);

    // Second disposal should be no-op
    await scope.dispose();
    expect(finalizerCalls.count).toBe(1); // Still 1, not 2
  });

  test("idempotent disposal does not throw on second call", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Multiple dispose calls should not throw
    await container.dispose();
    await container.dispose();
    await container.dispose();
    // No assertion needed - test passes if no error thrown
  });

  test("idempotent disposal returns immediately on subsequent calls", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    container.resolve(LoggerPort);

    // First disposal takes time
    const start1 = Date.now();
    await container.dispose();
    const duration1 = Date.now() - start1;

    // Second disposal should be nearly instant
    const start2 = Date.now();
    await container.dispose();
    const duration2 = Date.now() - start2;

    expect(duration1).toBeGreaterThanOrEqual(90); // First call waits for finalizer
    expect(duration2).toBeLessThan(50); // Second call is immediate
  });
});
