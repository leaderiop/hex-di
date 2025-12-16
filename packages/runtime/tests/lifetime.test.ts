/**
 * Lifetime behavior tests for @hex-di/runtime.
 *
 * Tests for the three lifetime types:
 * - singleton: Single instance per container lifetime, shared across all scopes
 * - scoped: Single instance per scope lifetime, not shared with parent/sibling scopes
 * - request: New instance per resolve call, never cached
 *
 * Also tests mixed lifetimes in dependency chains.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "../src/container.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
  instanceId: string;
}

interface Database {
  query(sql: string): unknown;
  instanceId: string;
}

interface RequestContext {
  requestId: string;
  instanceId: string;
}

interface UserService {
  getUser(id: string): unknown;
  instanceId: string;
}

// Extended test interfaces that include internal properties for testing dependency chains
interface UserServiceWithLoggerId extends UserService {
  loggerId: string;
}

interface UserServiceWithContextId extends UserService {
  contextId: string;
}

interface AuditService {
  audit(action: string): void;
  instanceId: string;
}

interface AuditServiceWithLoggerId extends AuditService {
  loggerId: string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const AuditServicePort = createPort<"AuditService", AuditService>("AuditService");

// Helper to generate unique instance IDs
let instanceCounter = 0;
function generateInstanceId(): string {
  return `instance-${++instanceCounter}`;
}

// Reset counter before each test file run
beforeEach(() => {
  instanceCounter = 0;
});

// =============================================================================
// Singleton Lifetime Tests
// =============================================================================

describe("singleton lifetime", () => {
  test("same instance is returned across container and all scopes", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: vi.fn(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Resolve from container
    const containerLogger = container.resolve(LoggerPort);

    // Create multiple scopes and resolve from each
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const nestedScope = scope1.createScope();

    const scope1Logger = scope1.resolve(LoggerPort);
    const scope2Logger = scope2.resolve(LoggerPort);
    const nestedLogger = nestedScope.resolve(LoggerPort);

    // All should be the exact same instance
    expect(scope1Logger).toBe(containerLogger);
    expect(scope2Logger).toBe(containerLogger);
    expect(nestedLogger).toBe(containerLogger);
    expect(scope1Logger.instanceId).toBe(containerLogger.instanceId);
  });

  test("factory is called only once ever for singleton", () => {
    const factory = vi.fn(() => ({
      log: vi.fn(),
      instanceId: generateInstanceId(),
    }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Resolve multiple times from container
    container.resolve(LoggerPort);
    container.resolve(LoggerPort);
    container.resolve(LoggerPort);

    // Create scopes and resolve
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const nestedScope = scope1.createScope();

    scope1.resolve(LoggerPort);
    scope2.resolve(LoggerPort);
    nestedScope.resolve(LoggerPort);

    // Factory should only have been called once
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Scoped Lifetime Tests
// =============================================================================

describe("scoped lifetime", () => {
  test("same instance within scope, different across scopes", () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({
        requestId: generateInstanceId(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    // Create two scopes
    const scope1 = container.createScope();
    const scope2 = container.createScope();

    // Multiple resolves within the same scope return the same instance
    const scope1Context1 = scope1.resolve(RequestContextPort);
    const scope1Context2 = scope1.resolve(RequestContextPort);
    expect(scope1Context1).toBe(scope1Context2);

    // Different scopes get different instances
    const scope2Context = scope2.resolve(RequestContextPort);
    expect(scope1Context1).not.toBe(scope2Context);
    expect(scope1Context1.instanceId).not.toBe(scope2Context.instanceId);
  });

  test("factory is called once per scope", () => {
    const factory = vi.fn(() => ({
      requestId: generateInstanceId(),
      instanceId: generateInstanceId(),
    }));

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    // Create three scopes
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const scope3 = container.createScope();

    // Resolve multiple times from each scope
    scope1.resolve(RequestContextPort);
    scope1.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);
    scope2.resolve(RequestContextPort);
    scope3.resolve(RequestContextPort);

    // Factory should be called once per scope (3 times total)
    expect(factory).toHaveBeenCalledTimes(3);
  });
});

// =============================================================================
// Request Lifetime Tests
// =============================================================================

describe("request lifetime", () => {
  test("new instance is returned on every resolve call", () => {
    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "request",
      factory: () => ({
        query: vi.fn(),
        instanceId: generateInstanceId(),
      }),
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    // Every resolve from container returns a new instance
    const db1 = container.resolve(DatabasePort);
    const db2 = container.resolve(DatabasePort);
    const db3 = container.resolve(DatabasePort);

    expect(db1).not.toBe(db2);
    expect(db2).not.toBe(db3);
    expect(db1.instanceId).not.toBe(db2.instanceId);
    expect(db2.instanceId).not.toBe(db3.instanceId);

    // Same behavior within scopes
    const scope = container.createScope();
    const scopeDb1 = scope.resolve(DatabasePort);
    const scopeDb2 = scope.resolve(DatabasePort);

    expect(scopeDb1).not.toBe(scopeDb2);
    expect(scopeDb1.instanceId).not.toBe(scopeDb2.instanceId);
  });

  test("factory is called every time for request lifetime", () => {
    const factory = vi.fn(() => ({
      query: vi.fn(),
      instanceId: generateInstanceId(),
    }));

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "request",
      factory,
    });

    const graph = GraphBuilder.create().provide(DatabaseAdapter).build();
    const container = createContainer(graph);

    // Resolve 3 times from container
    container.resolve(DatabasePort);
    container.resolve(DatabasePort);
    container.resolve(DatabasePort);

    // Resolve 2 times from scope
    const scope = container.createScope();
    scope.resolve(DatabasePort);
    scope.resolve(DatabasePort);

    // Factory should be called every single time (5 times total)
    expect(factory).toHaveBeenCalledTimes(5);
  });
});

// =============================================================================
// Mixed Lifetimes in Dependency Chain Tests
// =============================================================================

describe("mixed lifetimes in dependency chain", () => {
  test("singleton depending on singleton works correctly", () => {
    const loggerFactory = vi.fn(() => ({
      log: vi.fn(),
      instanceId: generateInstanceId(),
    }));

    // Create port for extended type that includes loggerId for testing
    const UserServiceWithLoggerIdPort = createPort<"UserService", UserServiceWithLoggerId>("UserService");

    const userServiceFactory = vi.fn((deps: { Logger: Logger }): UserServiceWithLoggerId => ({
      getUser: vi.fn(),
      instanceId: generateInstanceId(),
      loggerId: deps.Logger.instanceId,
    }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: loggerFactory,
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServiceWithLoggerIdPort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: userServiceFactory,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(UserServiceAdapter)
      .build();

    const container = createContainer(graph);
    const scope = container.createScope();

    // Resolve user service from both container and scope
    const containerUserService = container.resolve(UserServiceWithLoggerIdPort);
    const scopeUserService = scope.resolve(UserServiceWithLoggerIdPort);

    // Both should be the same singleton instance
    expect(containerUserService).toBe(scopeUserService);

    // Logger dependency should also be the same singleton
    const containerLogger = container.resolve(LoggerPort);
    expect(containerUserService.loggerId).toBe(containerLogger.instanceId);

    // Factories called only once
    expect(loggerFactory).toHaveBeenCalledTimes(1);
    expect(userServiceFactory).toHaveBeenCalledTimes(1);
  });

  test("scoped service depending on singleton gets shared singleton", () => {
    const loggerFactory = vi.fn(() => ({
      log: vi.fn(),
      instanceId: generateInstanceId(),
    }));

    // Create port for extended type that includes loggerId for testing
    const AuditServiceWithLoggerIdPort = createPort<"AuditService", AuditServiceWithLoggerId>("AuditService");

    const auditFactory = vi.fn((deps: { Logger: Logger }): AuditServiceWithLoggerId => ({
      audit: vi.fn(),
      instanceId: generateInstanceId(),
      loggerId: deps.Logger.instanceId,
    }));

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: loggerFactory,
    });

    const AuditServiceAdapter = createAdapter({
      provides: AuditServiceWithLoggerIdPort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: auditFactory,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(AuditServiceAdapter)
      .build();

    const container = createContainer(graph);
    const scope1 = container.createScope();
    const scope2 = container.createScope();

    // Resolve audit service from both scopes
    const audit1 = scope1.resolve(AuditServiceWithLoggerIdPort);
    const audit2 = scope2.resolve(AuditServiceWithLoggerIdPort);

    // Audit services should be different (scoped)
    expect(audit1).not.toBe(audit2);

    // But both should reference the same singleton logger
    const containerLogger = container.resolve(LoggerPort);
    expect(audit1.loggerId).toBe(containerLogger.instanceId);
    expect(audit2.loggerId).toBe(containerLogger.instanceId);

    // Logger factory called once, audit factory called twice (once per scope)
    expect(loggerFactory).toHaveBeenCalledTimes(1);
    expect(auditFactory).toHaveBeenCalledTimes(2);
  });

  test("request service depending on scoped gets the scope's instance", () => {
    const requestContextFactory = vi.fn(() => ({
      requestId: generateInstanceId(),
      instanceId: generateInstanceId(),
    }));

    // Create port for extended type that includes contextId for testing
    const UserServiceWithContextIdPort = createPort<"UserService", UserServiceWithContextId>("UserService");

    const userServiceFactory = vi.fn((deps: { RequestContext: RequestContext }): UserServiceWithContextId => ({
      getUser: vi.fn(),
      instanceId: generateInstanceId(),
      contextId: deps.RequestContext.instanceId,
    }));

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: requestContextFactory,
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServiceWithContextIdPort,
      requires: [RequestContextPort],
      lifetime: "request",
      factory: userServiceFactory,
    });

    const graph = GraphBuilder.create()
      .provide(RequestContextAdapter)
      .provide(UserServiceAdapter)
      .build();

    const container = createContainer(graph);
    const scope = container.createScope();

    // Resolve user service multiple times from the same scope
    const userService1 = scope.resolve(UserServiceWithContextIdPort);
    const userService2 = scope.resolve(UserServiceWithContextIdPort);

    // Each user service is a new instance (request lifetime)
    expect(userService1).not.toBe(userService2);

    // But both should reference the same scoped request context
    const scopedContext = scope.resolve(RequestContextPort);
    expect(userService1.contextId).toBe(scopedContext.instanceId);
    expect(userService2.contextId).toBe(scopedContext.instanceId);

    // Request context factory called once (scoped), user service factory called twice (request)
    expect(requestContextFactory).toHaveBeenCalledTimes(1);
    expect(userServiceFactory).toHaveBeenCalledTimes(2);
  });
});
