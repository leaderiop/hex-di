/**
 * Scope hierarchy unit tests.
 *
 * Tests for Scope behavior including:
 * - Scope creation and freezing
 * - Singleton inheritance from container
 * - Scoped instance isolation per scope
 * - Nested scope hierarchy
 * - Disposal with finalizer invocation
 *
 * @packageDocumentation
 */

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

interface RequestContext {
  requestId: string;
}

interface SessionStore {
  sessionId: string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");
const SessionStorePort = createPort<"SessionStore", SessionStore>("SessionStore");

// =============================================================================
// Scope Creation Tests
// =============================================================================

describe("Scope", () => {
  test("createScope returns frozen Scope object", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    expect(Object.isFrozen(scope)).toBe(true);
  });

  test("Scope has resolve, createScope, dispose methods", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    expect(typeof scope.resolve).toBe("function");
    expect(typeof scope.createScope).toBe("function");
    expect(typeof scope.dispose).toBe("function");
  });
});

// =============================================================================
// Singleton Inheritance Tests
// =============================================================================

describe("Scope singleton inheritance", () => {
  test("Scope inherits singleton instances from container", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // First resolve from container
    const containerLogger = container.resolve(LoggerPort);

    // Create scope and resolve same port
    const scope = container.createScope();
    const scopeLogger = scope.resolve(LoggerPort);

    // Should return the same instance (singleton inherited from container)
    expect(scopeLogger).toBe(containerLogger);
    // Factory should only be called once
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("Scope creates singleton in container if not yet resolved", () => {
    const factory = vi.fn(() => ({ log: vi.fn() }));
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);

    // Create scope and resolve singleton (not yet resolved from container)
    const scope = container.createScope();
    const scopeLogger = scope.resolve(LoggerPort);

    // Now resolve from container - should be the same instance
    const containerLogger = container.resolve(LoggerPort);

    expect(scopeLogger).toBe(containerLogger);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Scoped Instance Tests
// =============================================================================

describe("Scope scoped instances", () => {
  test("Scope creates own scoped instances", () => {
    const factory = vi.fn(() => ({ requestId: Math.random().toString() }));
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    // First resolve
    const first = scope.resolve(RequestContextPort);
    // Second resolve from same scope
    const second = scope.resolve(RequestContextPort);

    // Should be the same instance within the scope
    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("scoped instances are not shared with parent", () => {
    const factory = vi.fn(() => ({ requestId: Math.random().toString() }));
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    // Create parent scope
    const parentScope = container.createScope();
    const parentContext = parentScope.resolve(RequestContextPort);

    // Create child scope
    const childScope = parentScope.createScope();
    const childContext = childScope.resolve(RequestContextPort);

    // Scoped instances should be different between parent and child
    expect(childContext).not.toBe(parentContext);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  test("scoped instances are not shared with sibling scopes", () => {
    const factory = vi.fn(() => ({ requestId: Math.random().toString() }));
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);

    // Create two sibling scopes
    const scope1 = container.createScope();
    const scope2 = container.createScope();

    const context1 = scope1.resolve(RequestContextPort);
    const context2 = scope2.resolve(RequestContextPort);

    // Scoped instances should be different between siblings
    expect(context1).not.toBe(context2);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// Nested Scope Tests
// =============================================================================

describe("Scope nesting", () => {
  test("nested scopes work correctly", () => {
    const singletonFactory = vi.fn(() => ({ log: vi.fn() }));
    const scopedFactory = vi.fn(() => ({ requestId: Math.random().toString() }));

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

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph);
    const parentScope = container.createScope();
    const childScope = parentScope.createScope();
    const grandchildScope = childScope.createScope();

    // Singleton should be shared across all
    const containerLogger = container.resolve(LoggerPort);
    const parentLogger = parentScope.resolve(LoggerPort);
    const childLogger = childScope.resolve(LoggerPort);
    const grandchildLogger = grandchildScope.resolve(LoggerPort);

    expect(parentLogger).toBe(containerLogger);
    expect(childLogger).toBe(containerLogger);
    expect(grandchildLogger).toBe(containerLogger);
    expect(singletonFactory).toHaveBeenCalledTimes(1);

    // Scoped should be unique per scope
    const parentContext = parentScope.resolve(RequestContextPort);
    const childContext = childScope.resolve(RequestContextPort);
    const grandchildContext = grandchildScope.resolve(RequestContextPort);

    expect(parentContext).not.toBe(childContext);
    expect(childContext).not.toBe(grandchildContext);
    expect(grandchildContext).not.toBe(parentContext);
    expect(scopedFactory).toHaveBeenCalledTimes(3);
  });
});

// =============================================================================
// Scope Disposal Tests
// =============================================================================

describe("Scope disposal", () => {
  test("scope disposal calls scoped finalizers", async () => {
    const finalizerFn = vi.fn();
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "123" }),
      finalizer: finalizerFn,
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    // Resolve to trigger instance creation
    scope.resolve(RequestContextPort);

    await scope.dispose();

    expect(finalizerFn).toHaveBeenCalledTimes(1);
  });

  test("scope disposal does not affect parent singletons", async () => {
    const singletonFinalizer = vi.fn();
    const scopedFinalizer = vi.fn();

    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: singletonFinalizer,
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "123" }),
      finalizer: scopedFinalizer,
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();

    const container = createContainer(graph);

    // Resolve singleton from container
    const logger = container.resolve(LoggerPort);

    // Create scope and resolve both
    const scope = container.createScope();
    scope.resolve(LoggerPort); // Inherits singleton
    scope.resolve(RequestContextPort); // Creates scoped instance

    // Dispose scope
    await scope.dispose();

    // Scoped finalizer should be called
    expect(scopedFinalizer).toHaveBeenCalledTimes(1);
    // Singleton finalizer should NOT be called (owned by container)
    expect(singletonFinalizer).not.toHaveBeenCalled();

    // Singleton should still be resolvable from container
    const loggerAfterScopeDispose = container.resolve(LoggerPort);
    expect(loggerAfterScopeDispose).toBe(logger);
  });

  test("scope disposal throws DisposedScopeError on subsequent resolve", async () => {
    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "123" }),
    });

    const graph = GraphBuilder.create().provide(RequestContextAdapter).build();
    const container = createContainer(graph);
    const scope = container.createScope();

    await scope.dispose();

    expect(() => scope.resolve(RequestContextPort)).toThrow(DisposedScopeError);
  });

  test("disposing parent scope disposes child scopes first", async () => {
    const callOrder: string[] = [];

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "parent" }),
      finalizer: () => { callOrder.push("parent"); },
    });

    const SessionAdapter = createAdapter({
      provides: SessionStorePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ sessionId: "child" }),
      finalizer: () => { callOrder.push("child"); },
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

    // Child should be disposed before parent
    expect(callOrder).toEqual(["child", "parent"]);
  });
});
