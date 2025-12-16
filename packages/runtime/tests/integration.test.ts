/**
 * Integration tests for @hex-di/runtime.
 *
 * These tests exercise the full flow from createPort -> createAdapter -> GraphBuilder
 * -> createContainer -> resolve, verifying that all three packages (@hex-di/ports,
 * @hex-di/graph, @hex-di/runtime) work together correctly.
 *
 * @packageDocumentation
 */

// Global declarations for Node.js types used in tests
declare function setTimeout(callback: (...args: unknown[]) => void, ms?: number): unknown;

import { describe, test, expect, vi, expectTypeOf } from "vitest";
import { createPort } from "@hex-di/ports";
import type { Port, InferService } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import type { Graph, Adapter, Lifetime } from "@hex-di/graph";
import {
  createContainer,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
} from "../src/index.js";
import type { Container, Scope } from "../src/index.js";

// =============================================================================
// Realistic Service Interfaces
// =============================================================================

/**
 * Logger service interface - typically a singleton for application-wide logging.
 */
interface Logger {
  log(message: string): void;
  error(message: string, error?: unknown): void;
}

/**
 * Configuration service interface - provides application configuration.
 */
interface Config {
  get(key: string): string | undefined;
  getOrThrow(key: string): string;
}

/**
 * Database service interface - typically a singleton connection pool.
 */
interface Database {
  query<T>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

/**
 * Cache service interface - typically a singleton cache manager.
 */
interface Cache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  invalidate(key: string): void;
}

/**
 * User repository interface - data access for users.
 */
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

/**
 * User entity type.
 */
interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * User service interface - business logic for user operations.
 */
interface UserService {
  getUser(id: string): Promise<User | null>;
  createUser(name: string, email: string): Promise<User>;
}

/**
 * Request context interface - per-request state.
 */
interface RequestContext {
  requestId: string;
  userId: string | null;
  timestamp: number;
}

/**
 * Authentication service interface - scoped to handle per-request auth.
 */
interface AuthService {
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
}

/**
 * Notification service interface - sends notifications.
 */
interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendPush(userId: string, message: string): Promise<void>;
}

// =============================================================================
// Port Definitions
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const ConfigPort = createPort<"Config", Config>("Config");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");
const UserRepositoryPort = createPort<"UserRepository", UserRepository>("UserRepository");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");
const AuthServicePort = createPort<"AuthService", AuthService>("AuthService");
const NotificationServicePort = createPort<"NotificationService", NotificationService>("NotificationService");

// =============================================================================
// Test Group 13.1: Basic Container Workflow
// =============================================================================

describe("Integration: Basic Container Workflow", () => {
  test("full flow: createPort -> createAdapter -> GraphBuilder -> createContainer -> resolve", () => {
    // Step 1: Create ports (already created above as module-level constants)
    // Step 2: Create adapters
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        error: vi.fn(),
      }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: (key: string) => `value-for-${key}`,
        getOrThrow: (key: string) => `value-for-${key}`,
      }),
    });

    // Step 3: Build graph
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .build();

    // Step 4: Create container
    const container = createContainer(graph);

    // Step 5: Resolve services
    const logger = container.resolve(LoggerPort);
    const config = container.resolve(ConfigPort);

    // Step 6: Verify correct instances returned
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
    expect(typeof logger.error).toBe("function");

    expect(config).toBeDefined();
    expect(config.get("test")).toBe("value-for-test");
    expect(config.getOrThrow("test")).toBe("value-for-test");
  });

  test("container and scope are frozen (immutable)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    expect(Object.isFrozen(container)).toBe(true);
    expect(Object.isFrozen(scope)).toBe(true);
  });

  test("services are usable after resolution", () => {
    const logMessages: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: (msg: string) => logMessages.push(msg),
        error: (msg: string) => logMessages.push(`ERROR: ${msg}`),
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const logger = container.resolve(LoggerPort);
    logger.log("Hello, world!");
    logger.error("Something went wrong");

    expect(logMessages).toEqual(["Hello, world!", "ERROR: Something went wrong"]);
  });
});

// =============================================================================
// Test Group 13.2: Dependency Chain Resolution
// =============================================================================

describe("Integration: Dependency Chain Resolution", () => {
  test("Service A depends on B, B depends on C - all dependencies resolved correctly", () => {
    // C: Config (no deps)
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: (key: string) => `config-${key}`,
        getOrThrow: (key: string) => `config-${key}`,
      }),
    });

    // B: Logger (depends on Config)
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: (deps) => {
        const logLevel = deps.Config.get("logLevel");
        return {
          log: vi.fn().mockImplementation((msg: string) => `[${logLevel}] ${msg}`),
          error: vi.fn(),
        };
      },
    });

    // A: Database (depends on Logger)
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: (deps) => ({
        query: vi.fn().mockImplementation(async <T>(sql: string) => {
          deps.Logger.log(`Executing query: ${sql}`);
          return [] as T;
        }),
        execute: vi.fn().mockImplementation(async (sql: string) => {
          deps.Logger.log(`Executing: ${sql}`);
        }),
      }),
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve A (Database) - should trigger resolution of B (Logger) and C (Config)
    const database = container.resolve(DatabasePort);
    const logger = container.resolve(LoggerPort);

    // Verify database works (which requires logger to work, which requires config to work)
    expect(database).toBeDefined();
    database.execute("SELECT 1");

    // Logger should have been called
    expect(logger.log).toHaveBeenCalledWith("Executing: SELECT 1");
  });

  test("factory calls receive correctly typed deps object", () => {
    const receivedDeps: Array<Record<string, unknown>> = [];

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: () => "test",
        getOrThrow: () => "test",
      }),
    });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: (deps) => {
        receivedDeps.push({ ...deps });
        return { log: vi.fn(), error: vi.fn() };
      },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort, ConfigPort],
      lifetime: "singleton",
      factory: (deps) => {
        receivedDeps.push({ ...deps });
        return {
          query: vi.fn().mockResolvedValue([]),
          execute: vi.fn().mockResolvedValue(undefined),
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const container = createContainer(graph);
    container.resolve(DatabasePort);

    // Check that dependencies were passed correctly
    expect(receivedDeps).toHaveLength(2);

    // Logger received Config
    const loggerDeps = receivedDeps[0];
    expect(loggerDeps).toBeDefined();
    expect(loggerDeps).toHaveProperty("Config");
    expect(typeof (loggerDeps as Record<string, unknown>)["Config"]).toBe("object");

    // Database received both Logger and Config
    expect(receivedDeps[1]).toHaveProperty("Logger");
    expect(receivedDeps[1]).toHaveProperty("Config");
  });

  test("deep dependency chain (4 levels) resolves correctly", () => {
    const callOrder: string[] = [];

    // Level 4: Config (no deps)
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        callOrder.push("Config");
        return { get: () => "test", getOrThrow: () => "test" };
      },
    });

    // Level 3: Logger (depends on Config)
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: () => {
        callOrder.push("Logger");
        return { log: vi.fn(), error: vi.fn() };
      },
    });

    // Level 2: Cache (depends on Logger)
    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => {
        callOrder.push("Cache");
        return {
          get: () => undefined,
          set: vi.fn(),
          invalidate: vi.fn(),
        };
      },
    });

    // Level 1: UserRepository (depends on Cache)
    const UserRepositoryAdapter = createAdapter({
      provides: UserRepositoryPort,
      requires: [CachePort],
      lifetime: "singleton",
      factory: () => {
        callOrder.push("UserRepository");
        return {
          findById: vi.fn().mockResolvedValue(null),
          save: vi.fn().mockResolvedValue(undefined),
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .provide(CacheAdapter)
      .provide(UserRepositoryAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve level 1 - should trigger entire chain
    container.resolve(UserRepositoryPort);

    // Verify dependencies were resolved in correct order (deepest first)
    expect(callOrder).toEqual(["Config", "Logger", "Cache", "UserRepository"]);
  });
});

// =============================================================================
// Test Group 13.3: Scope Hierarchy
// =============================================================================

describe("Integration: Scope Hierarchy", () => {
  test("all three lifetimes work correctly together", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn(), error: vi.fn() }));
    const scopedFactory = vi.fn(() => ({
      requestId: Math.random().toString(),
      userId: null,
      timestamp: Date.now(),
    }));
    const requestFactory = vi.fn(() => ({
      sendEmail: vi.fn().mockResolvedValue(undefined),
      sendPush: vi.fn().mockResolvedValue(undefined),
    }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: singletonFactory,
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: scopedFactory,
    });

    const NotificationAdapter = createAdapter({
      provides: NotificationServicePort,
      requires: [],
      lifetime: "request",
      factory: requestFactory,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .provide(NotificationAdapter)
      .build();

    const container = createContainer(graph);
    const scope = container.createScope();

    // Singleton: same instance everywhere
    const containerLogger = container.resolve(LoggerPort);
    const scopeLogger = scope.resolve(LoggerPort);
    expect(scopeLogger).toBe(containerLogger);
    expect(singletonFactory).toHaveBeenCalledTimes(1);

    // Scoped: same instance within scope, cannot be resolved from container
    const scopedContext1 = scope.resolve(RequestContextPort);
    const scopedContext2 = scope.resolve(RequestContextPort);
    expect(scopedContext1).toBe(scopedContext2);
    expect(scopedFactory).toHaveBeenCalledTimes(1);

    // Request: new instance every time
    const notification1 = scope.resolve(NotificationServicePort);
    const notification2 = scope.resolve(NotificationServicePort);
    expect(notification1).not.toBe(notification2);
    expect(requestFactory).toHaveBeenCalledTimes(2);
  });

  test("nested scopes maintain singleton sharing", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn(), error: vi.fn() }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: singletonFactory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    const scope1 = container.createScope();
    const scope2 = scope1.createScope();
    const scope3 = scope2.createScope();

    const containerLogger = container.resolve(LoggerPort);
    const scope1Logger = scope1.resolve(LoggerPort);
    const scope2Logger = scope2.resolve(LoggerPort);
    const scope3Logger = scope3.resolve(LoggerPort);

    // All should be the same singleton instance
    expect(scope1Logger).toBe(containerLogger);
    expect(scope2Logger).toBe(containerLogger);
    expect(scope3Logger).toBe(containerLogger);
    expect(singletonFactory).toHaveBeenCalledTimes(1);
  });

  test("nested scopes maintain scoped isolation", () => {
    const scopedFactory = vi.fn(() => ({
      requestId: Math.random().toString(),
      userId: null,
      timestamp: Date.now(),
    }));

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: scopedFactory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const childOfScope1 = scope1.createScope();

    const context1 = scope1.resolve(RequestContextPort);
    const context2 = scope2.resolve(RequestContextPort);
    const childContext = childOfScope1.resolve(RequestContextPort);

    // Each scope gets its own instance
    expect(context1).not.toBe(context2);
    expect(context1).not.toBe(childContext);
    expect(context2).not.toBe(childContext);

    // Same instance within each scope
    expect(scope1.resolve(RequestContextPort)).toBe(context1);
    expect(scope2.resolve(RequestContextPort)).toBe(context2);
    expect(childOfScope1.resolve(RequestContextPort)).toBe(childContext);

    expect(scopedFactory).toHaveBeenCalledTimes(3);
  });

  test("request lifetime creates fresh instances in all scopes", () => {
    const requestFactory = vi.fn(() => ({
      sendEmail: vi.fn().mockResolvedValue(undefined),
      sendPush: vi.fn().mockResolvedValue(undefined),
    }));

    const NotificationAdapter = createAdapter({
      provides: NotificationServicePort,
      requires: [],
      lifetime: "request",
      factory: requestFactory,
    });

    const graph = GraphBuilder.create().provide(NotificationAdapter).build();
    const container = createContainer(graph);

    const scope1 = container.createScope();
    const scope2 = container.createScope();

    // Every resolve creates a new instance
    const containerNotif1 = container.resolve(NotificationServicePort);
    const containerNotif2 = container.resolve(NotificationServicePort);
    const scope1Notif1 = scope1.resolve(NotificationServicePort);
    const scope1Notif2 = scope1.resolve(NotificationServicePort);
    const scope2Notif = scope2.resolve(NotificationServicePort);

    // All instances should be different
    const allInstances = [containerNotif1, containerNotif2, scope1Notif1, scope1Notif2, scope2Notif];
    for (let i = 0; i < allInstances.length; i++) {
      for (let j = i + 1; j < allInstances.length; j++) {
        expect(allInstances[i]).not.toBe(allInstances[j]);
      }
    }

    expect(requestFactory).toHaveBeenCalledTimes(5);
  });

  test("complex scenario: scoped service depending on singleton", () => {
    const logMessages: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: (msg: string) => logMessages.push(msg),
        error: vi.fn(),
      }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: (deps) => {
        const requestId = Math.random().toString(36).slice(2);
        deps.Logger.log(`Creating request context: ${requestId}`);
        return {
          requestId,
          userId: null,
          timestamp: Date.now(),
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph);

    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const ctx1 = scope1.resolve(RequestContextPort);
    const ctx2 = scope2.resolve(RequestContextPort);

    // Both contexts should have been logged
    expect(logMessages).toHaveLength(2);
    expect(logMessages[0]).toContain("Creating request context");
    expect(logMessages[1]).toContain("Creating request context");

    // Contexts should be different
    expect(ctx1.requestId).not.toBe(ctx2.requestId);
  });
});

// =============================================================================
// Test Group 13.4: Disposal Workflow
// =============================================================================

describe("Integration: Disposal Workflow", () => {
  test("disposal calls finalizers in LIFO order", async () => {
    const callOrder: string[] = [];

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "test", getOrThrow: () => "test" }),
      finalizer: () => { callOrder.push("Config disposed"); },
    });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
      finalizer: () => { callOrder.push("Logger disposed"); },
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({
        query: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(undefined),
      }),
      finalizer: () => { callOrder.push("Database disposed"); },
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve all services to trigger creation
    container.resolve(DatabasePort);
    container.resolve(LoggerPort);
    container.resolve(ConfigPort);

    await container.dispose();

    // LIFO order: last created (Database) should be disposed first
    // Creation order: Config -> Logger -> Database
    // Disposal order: Database -> Logger -> Config
    expect(callOrder).toEqual([
      "Database disposed",
      "Logger disposed",
      "Config disposed",
    ]);
  });

  test("scope disposal disposes child scopes before parent", async () => {
    const callOrder: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: Math.random().toString(),
        userId: null,
        timestamp: Date.now(),
      }),
      finalizer: (instance) => { callOrder.push(`Scope ${instance.requestId} disposed`); },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    const parentScope = container.createScope();
    const childScope = parentScope.createScope();
    const grandchildScope = childScope.createScope();

    // Resolve in all scopes to create instances
    const parentCtx = parentScope.resolve(RequestContextPort);
    const childCtx = childScope.resolve(RequestContextPort);
    const grandchildCtx = grandchildScope.resolve(RequestContextPort);

    // Dispose parent - should cascade to children
    await parentScope.dispose();

    // Grandchild -> Child -> Parent order
    expect(callOrder).toEqual([
      `Scope ${grandchildCtx.requestId} disposed`,
      `Scope ${childCtx.requestId} disposed`,
      `Scope ${parentCtx.requestId} disposed`,
    ]);
  });

  test("async finalizers are awaited", async () => {
    const callOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
      finalizer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        callOrder.push("Logger finalized");
      },
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "test", getOrThrow: () => "test" }),
      finalizer: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        callOrder.push("Config finalized");
      },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve to create instances
    container.resolve(ConfigPort);
    container.resolve(LoggerPort);

    const startTime = Date.now();
    await container.dispose();
    const duration = Date.now() - startTime;

    // Should have waited for both async finalizers
    expect(duration).toBeGreaterThanOrEqual(100);
    expect(callOrder).toHaveLength(2);
  });

  test("container disposal is idempotent", async () => {
    const finalizerCalls = { count: 0 };

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
      finalizer: () => { finalizerCalls.count++; },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    container.resolve(LoggerPort);

    await container.dispose();
    await container.dispose();
    await container.dispose();

    expect(finalizerCalls.count).toBe(1);
  });

  test("mixed scope and container disposal", async () => {
    const callOrder: string[] = [];

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
      finalizer: () => { callOrder.push("Singleton Logger disposed"); },
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: "test",
        userId: null,
        timestamp: Date.now(),
      }),
      finalizer: () => { callOrder.push("Scoped RequestContext disposed"); },
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph);
    const scope = container.createScope();

    // Resolve singleton from both
    container.resolve(LoggerPort);
    scope.resolve(LoggerPort);

    // Resolve scoped from scope
    scope.resolve(RequestContextPort);

    // Dispose container (should dispose scopes first, then singletons)
    await container.dispose();

    // Scoped should be disposed before singleton
    expect(callOrder).toEqual([
      "Scoped RequestContext disposed",
      "Singleton Logger disposed",
    ]);
  });
});

// =============================================================================
// Test Group 13.5: Error Scenarios
// =============================================================================

describe("Integration: Error Scenarios", () => {
  test("circular dependency detection", () => {
    // Create a circular dependency: A -> B -> A
    // We need to carefully construct ports that reference each other

    interface ServiceA {
      name: string;
    }
    interface ServiceB {
      name: string;
    }

    const ServiceAPort = createPort<"ServiceA", ServiceA>("ServiceA");
    const ServiceBPort = createPort<"ServiceB", ServiceB>("ServiceB");

    const ServiceAAdapter = createAdapter({
      provides: ServiceAPort,
      requires: [ServiceBPort],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const ServiceBAdapter = createAdapter({
      provides: ServiceBPort,
      requires: [ServiceAPort],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    const graph = GraphBuilder.create()
      .provide(ServiceAAdapter)
      .provide(ServiceBAdapter)
      .build();

    const container = createContainer(graph);

    expect(() => container.resolve(ServiceAPort)).toThrow(CircularDependencyError);

    try {
      container.resolve(ServiceAPort);
    } catch (error) {
      expect(error).toBeInstanceOf(CircularDependencyError);
      const circularError = error as CircularDependencyError;
      expect(circularError.code).toBe("CIRCULAR_DEPENDENCY");
      expect(circularError.isProgrammingError).toBe(true);
      expect(circularError.dependencyChain).toContain("ServiceA");
      expect(circularError.dependencyChain).toContain("ServiceB");
    }
  });

  test("factory error wrapping", () => {
    const factoryError = new Error("Database connection failed");

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw factoryError;
      },
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    expect(() => container.resolve(DatabasePort)).toThrow(FactoryError);

    try {
      container.resolve(DatabasePort);
    } catch (error) {
      expect(error).toBeInstanceOf(FactoryError);
      const wrappedError = error as FactoryError;
      expect(wrappedError.code).toBe("FACTORY_FAILED");
      expect(wrappedError.isProgrammingError).toBe(false);
      expect(wrappedError.portName).toBe("Database");
      expect(wrappedError.cause).toBe(factoryError);
    }
  });

  test("disposed scope error", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: "test",
        userId: null,
        timestamp: Date.now(),
      }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph);
    const scope = container.createScope();

    await scope.dispose();

    expect(() => scope.resolve(RequestContextPort)).toThrow(DisposedScopeError);

    try {
      scope.resolve(RequestContextPort);
    } catch (error) {
      expect(error).toBeInstanceOf(DisposedScopeError);
      const disposedError = error as DisposedScopeError;
      expect(disposedError.code).toBe("DISPOSED_SCOPE");
      expect(disposedError.isProgrammingError).toBe(true);
      expect(disposedError.portName).toBe("RequestContext");
    }
  });

  test("scope required error", () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: "test",
        userId: null,
        timestamp: Date.now(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    expect(() => container.resolve(RequestContextPort)).toThrow(ScopeRequiredError);

    try {
      container.resolve(RequestContextPort);
    } catch (error) {
      expect(error).toBeInstanceOf(ScopeRequiredError);
      const scopeError = error as ScopeRequiredError;
      expect(scopeError.code).toBe("SCOPE_REQUIRED");
      expect(scopeError.isProgrammingError).toBe(true);
      expect(scopeError.portName).toBe("RequestContext");
    }
  });

  test("error propagation through dependency chain", () => {
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("Config initialization failed");
      },
    });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .build();

    const container = createContainer(graph);

    // Resolving Logger should fail because its dependency (Config) fails
    expect(() => container.resolve(LoggerPort)).toThrow(FactoryError);
  });

  test("disposal continues on finalizer error (aggregates errors)", async () => {
    const finalizerResults: string[] = [];

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "test", getOrThrow: () => "test" }),
      finalizer: () => {
        finalizerResults.push("Config started");
        throw new Error("Config finalizer failed");
      },
    });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
      finalizer: () => {
        finalizerResults.push("Logger completed");
      },
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve in order: Config, Logger
    container.resolve(ConfigPort);
    container.resolve(LoggerPort);

    // Disposal should throw aggregate error but continue disposing
    await expect(container.dispose()).rejects.toThrow();

    // Both finalizers should have been attempted (Logger first due to LIFO)
    expect(finalizerResults).toContain("Logger completed");
    expect(finalizerResults).toContain("Config started");
  });
});

// =============================================================================
// Test Group 13.6: Type Safety End-to-End
// =============================================================================

describe("Integration: Type Safety End-to-End", () => {
  test("realistic application structure with complete type flow", () => {
    // This test verifies that types flow correctly through the entire system
    // without any type assertions

    // Create adapters with full type inference
    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: (key: string): string | undefined => `value-${key}`,
        getOrThrow: (key: string): string => `value-${key}`,
      }),
    });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: (deps) => {
        // deps.Config is correctly typed as Config
        const level = deps.Config.get("logLevel");
        // Log level is used to verify dependency injection works
        void level;
        return {
          log: vi.fn(),
          error: vi.fn(),
        };
      },
    });

    const CacheAdapter = createAdapter({
      provides: CachePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: (deps) => {
        // deps.Logger is correctly typed as Logger
        deps.Logger.log("Cache initializing");
        const store = new Map<string, unknown>();
        return {
          get: <T>(key: string): T | undefined => store.get(key) as T | undefined,
          set: <T>(key: string, value: T, _ttl?: number): void => {
            deps.Logger.log(`Cache set: ${key}`);
            store.set(key, value);
          },
          invalidate: (key: string): void => {
            deps.Logger.log(`Cache invalidate: ${key}`);
            store.delete(key);
          },
        };
      },
    });

    const UserRepositoryAdapter = createAdapter({
      provides: UserRepositoryPort,
      requires: [CachePort, LoggerPort],
      lifetime: "singleton",
      factory: (deps) => {
        // Both deps.Cache and deps.Logger are correctly typed
        return {
          findById: async (id: string): Promise<User | null> => {
            deps.Logger.log(`Finding user: ${id}`);
            const cached = deps.Cache.get<User>(`user:${id}`);
            if (cached) return cached;
            return null;
          },
          save: async (user: User): Promise<void> => {
            deps.Logger.log(`Saving user: ${user.id}`);
            deps.Cache.set(`user:${user.id}`, user);
          },
        };
      },
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: (): RequestContext => ({
        requestId: Math.random().toString(36).slice(2),
        userId: null,
        timestamp: Date.now(),
      }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [UserRepositoryPort, LoggerPort, RequestContextPort],
      lifetime: "scoped",
      factory: (deps) => {
        // All three dependencies are correctly typed
        return {
          getUser: async (id: string): Promise<User | null> => {
            deps.Logger.log(`Request ${deps.RequestContext.requestId}: Getting user ${id}`);
            return deps.UserRepository.findById(id);
          },
          createUser: async (name: string, email: string): Promise<User> => {
            deps.Logger.log(`Request ${deps.RequestContext.requestId}: Creating user`);
            const user: User = {
              id: Math.random().toString(36).slice(2),
              name,
              email,
            };
            await deps.UserRepository.save(user);
            return user;
          },
        };
      },
    });

    // Build graph
    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .provide(CacheAdapter)
      .provide(UserRepositoryAdapter)
      .provide(RequestContextAdapter)
      .provide(UserServiceAdapter)
      .build();

    // Create container - type is Container<...all ports>
    const container = createContainer(graph);

    // Create scope for request handling
    const scope = container.createScope();

    // Resolve services - all types are inferred correctly
    const userService = scope.resolve(UserServicePort);
    const logger = container.resolve(LoggerPort);
    const config = container.resolve(ConfigPort);

    // Type assertions using Vitest expectTypeOf
    expectTypeOf(userService).toMatchTypeOf<UserService>();
    expectTypeOf(logger).toMatchTypeOf<Logger>();
    expectTypeOf(config).toMatchTypeOf<Config>();

    // Verify runtime behavior
    expect(typeof userService.getUser).toBe("function");
    expect(typeof userService.createUser).toBe("function");
    expect(typeof logger.log).toBe("function");
    expect(typeof config.get).toBe("function");
  });

  test("InferService correctly extracts service types from ports", () => {
    // Type-level test for InferService
    type ExtractedLogger = InferService<typeof LoggerPort>;
    type ExtractedConfig = InferService<typeof ConfigPort>;
    type ExtractedUserService = InferService<typeof UserServicePort>;

    // These type assertions verify compile-time correctness
    expectTypeOf<ExtractedLogger>().toMatchTypeOf<Logger>();
    expectTypeOf<ExtractedConfig>().toMatchTypeOf<Config>();
    expectTypeOf<ExtractedUserService>().toMatchTypeOf<UserService>();
  });

  test("resolve return type matches InferService", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => ({ log: vi.fn(), error: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // The resolved value should have the correct type without assertion
    const logger = container.resolve(LoggerPort);

    // Type-level verification
    expectTypeOf(logger).toMatchTypeOf<Logger>();
    expectTypeOf(logger.log).toBeFunction();
    expectTypeOf(logger.error).toBeFunction();
  });

  test("factory deps are correctly typed based on requires", () => {
    // This test is primarily a compile-time check
    // If the types are wrong, TypeScript will error

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: (key: string) => `value-${key}`,
        getOrThrow: (key: string) => `value-${key}`,
      }),
    });

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: (deps) => {
        // TypeScript knows deps has a Config property of type Config
        // This would fail to compile if types were wrong:
        const configValue: string | undefined = deps.Config.get("test");

        return {
          log: (_msg: string) => {
            // Can use configValue here
            void configValue;
          },
          error: vi.fn(),
        };
      },
    });

    const graph = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(LoggerAdapter)
      .build();

    const container = createContainer(graph);
    const logger = container.resolve(LoggerPort);

    // If we got here without type errors, the types are correct
    expect(logger).toBeDefined();
  });

  test("Container and Scope maintain TProvides type parameter", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Logger => ({ log: vi.fn(), error: vi.fn() }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: (): Config => ({
        get: () => "test",
        getOrThrow: () => "test",
      }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .build();

    const container = createContainer(graph);
    const scope = container.createScope();

    // Both container and scope should have the same TProvides
    // This is verified by the ability to resolve the same ports
    const containerLogger = container.resolve(LoggerPort);
    const containerConfig = container.resolve(ConfigPort);
    const scopeLogger = scope.resolve(LoggerPort);
    const scopeConfig = scope.resolve(ConfigPort);

    expectTypeOf(containerLogger).toMatchTypeOf<Logger>();
    expectTypeOf(containerConfig).toMatchTypeOf<Config>();
    expectTypeOf(scopeLogger).toMatchTypeOf<Logger>();
    expectTypeOf(scopeConfig).toMatchTypeOf<Config>();
  });
});

// =============================================================================
// Test Group 15.3: Strategic Gap-Filling Tests
// =============================================================================

describe("Integration: Edge Cases and Gap Coverage", () => {
  test("resolve on disposed container throws DisposedScopeError", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn(), error: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    await container.dispose();

    // Attempting to resolve on disposed container should throw
    expect(() => container.resolve(LoggerPort)).toThrow(DisposedScopeError);
  });

  test("child scope throws DisposedScopeError on resolve after parent disposed", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: Math.random().toString(),
        userId: null,
        timestamp: Date.now(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    const parentScope = container.createScope();
    const childScope = parentScope.createScope();

    // Dispose parent - should cascade to child
    await parentScope.dispose();

    // Child should also be disposed now - resolve should throw
    expect(() => childScope.resolve(RequestContextPort)).toThrow(DisposedScopeError);
  });

  test("request lifetime creates fresh instances on every resolve", () => {
    const factoryCalls = { count: 0 };

    const NotificationAdapter = createAdapter({
      provides: NotificationServicePort,
      requires: [],
      lifetime: "request",
      factory: () => {
        factoryCalls.count++;
        return {
          sendEmail: vi.fn().mockResolvedValue(undefined),
          sendPush: vi.fn().mockResolvedValue(undefined),
        };
      },
    });

    const graph = GraphBuilder.create().provide(NotificationAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    // Resolve multiple request instances
    const notif1 = scope.resolve(NotificationServicePort);
    const notif2 = scope.resolve(NotificationServicePort);
    const notif3 = scope.resolve(NotificationServicePort);

    // Each resolve should create a fresh instance
    expect(factoryCalls.count).toBe(3);
    expect(notif1).not.toBe(notif2);
    expect(notif2).not.toBe(notif3);
  });

  test("longer circular dependency chain is detected (A->B->C->A)", () => {
    interface ServiceA { name: string; }
    interface ServiceB { name: string; }
    interface ServiceC { name: string; }

    const ServiceAPort = createPort<"ServiceA", ServiceA>("ServiceA");
    const ServiceBPort = createPort<"ServiceB", ServiceB>("ServiceB");
    const ServiceCPort = createPort<"ServiceC", ServiceC>("ServiceC");

    const ServiceAAdapter = createAdapter({
      provides: ServiceAPort,
      requires: [ServiceBPort],
      lifetime: "singleton",
      factory: () => ({ name: "A" }),
    });

    const ServiceBAdapter = createAdapter({
      provides: ServiceBPort,
      requires: [ServiceCPort],
      lifetime: "singleton",
      factory: () => ({ name: "B" }),
    });

    const ServiceCAdapter = createAdapter({
      provides: ServiceCPort,
      requires: [ServiceAPort],
      lifetime: "singleton",
      factory: () => ({ name: "C" }),
    });

    const graph = GraphBuilder.create()
      .provide(ServiceAAdapter)
      .provide(ServiceBAdapter)
      .provide(ServiceCAdapter)
      .build();

    const container = createContainer(graph);

    expect(() => container.resolve(ServiceAPort)).toThrow(CircularDependencyError);

    try {
      container.resolve(ServiceAPort);
    } catch (error) {
      const circularError = error as CircularDependencyError;
      // Chain should include all three services plus the closing loop
      expect(circularError.dependencyChain.length).toBeGreaterThanOrEqual(4);
      expect(circularError.dependencyChain).toContain("ServiceA");
      expect(circularError.dependencyChain).toContain("ServiceB");
      expect(circularError.dependencyChain).toContain("ServiceC");
    }
  });

  test("resolution context is cleaned up after factory error", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        throw new Error("Logger initialization failed");
      },
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: () => "test",
        getOrThrow: () => "test",
      }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .build();

    const container = createContainer(graph);

    // First resolve fails
    expect(() => container.resolve(LoggerPort)).toThrow(FactoryError);

    // Resolution context should be cleaned up, allowing other resolutions
    // Config should still be resolvable
    const config = container.resolve(ConfigPort);
    expect(config).toBeDefined();
    expect(config.get("test")).toBe("test");
  });

  test("container with single adapter works correctly", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        error: vi.fn(),
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Single adapter container should work
    const logger = container.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");

    // Should create scope from single-adapter container
    const scope = container.createScope();
    const scopeLogger = scope.resolve(LoggerPort);
    expect(scopeLogger).toBe(logger);
  });

  test("deeply nested scope disposal propagates correctly", async () => {
    const callOrder: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: Math.random().toString(),
        userId: null,
        timestamp: Date.now(),
      }),
      finalizer: (instance) => {
        callOrder.push(instance.requestId);
      },
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    // Create 4 levels of nested scopes
    const scope1 = container.createScope();
    const scope2 = scope1.createScope();
    const scope3 = scope2.createScope();
    const scope4 = scope3.createScope();

    // Resolve in each scope
    const ctx1 = scope1.resolve(RequestContextPort);
    const ctx2 = scope2.resolve(RequestContextPort);
    const ctx3 = scope3.resolve(RequestContextPort);
    const ctx4 = scope4.resolve(RequestContextPort);

    // Dispose from root scope
    await scope1.dispose();

    // Disposal should propagate deepest first
    expect(callOrder).toEqual([ctx4.requestId, ctx3.requestId, ctx2.requestId, ctx1.requestId]);
  });
});
