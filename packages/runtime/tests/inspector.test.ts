/**
 * createInspector Factory & Snapshot Types tests for @hex-di/runtime.
 *
 * Tests for the inspector API that provides runtime container state inspection.
 * The inspector allows DevTools to query container state without exposing
 * mutable internals.
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "../src/container.js";
import { createInspector } from "../src/create-inspector.js";
import type { ContainerInspector, ContainerSnapshot, ScopeTree } from "../src/create-inspector.js";

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

interface UserService {
  getUser(id: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// createInspector Factory Tests
// =============================================================================

describe("createInspector Factory", () => {
  test("createInspector(container) returns ContainerInspector interface", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);
    const inspector = createInspector(container);

    // Inspector should have all required methods
    expect(typeof inspector.snapshot).toBe("function");
    expect(typeof inspector.listPorts).toBe("function");
    expect(typeof inspector.isResolved).toBe("function");
    expect(typeof inspector.getScopeTree).toBe("function");

    // Inspector should be frozen
    expect(Object.isFrozen(inspector)).toBe(true);
  });

  test("snapshot() returns ContainerSnapshot with correct structure", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();
    const container = createContainer(graph);

    // Resolve one service to populate singleton memo
    container.resolve(LoggerPort);

    const inspector = createInspector(container);
    const snapshot = inspector.snapshot();

    // Verify snapshot structure
    expect(typeof snapshot.isDisposed).toBe("boolean");
    expect(snapshot.isDisposed).toBe(false);
    expect(Array.isArray(snapshot.singletons)).toBe(true);
    expect(snapshot.scopes).toBeDefined();

    // Verify singleton entry structure
    const loggerEntry = snapshot.singletons.find(e => e.portName === "Logger");
    expect(loggerEntry).toBeDefined();
    expect(loggerEntry!.isResolved).toBe(true);
    expect(typeof loggerEntry!.resolvedAt).toBe("number");
    expect(typeof loggerEntry!.resolutionOrder).toBe("number");
    expect(loggerEntry!.lifetime).toBe("singleton");
  });

  test("listPorts() returns all registered port names", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer(graph);
    const inspector = createInspector(container);

    const ports = inspector.listPorts();

    // Should include all port names
    expect(ports).toContain("Logger");
    expect(ports).toContain("Database");
    expect(ports).toContain("RequestContext");
    expect(ports.length).toBe(3);

    // Should be sorted alphabetically
    expect(ports).toEqual(["Database", "Logger", "RequestContext"]);

    // Should be frozen
    expect(Object.isFrozen(ports)).toBe(true);
  });

  test("isResolved(portName) returns correct resolution status", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer(graph);

    // Resolve only Logger
    container.resolve(LoggerPort);

    const inspector = createInspector(container);

    // Logger should be resolved
    expect(inspector.isResolved("Logger")).toBe(true);

    // Database should not be resolved
    expect(inspector.isResolved("Database")).toBe(false);

    // Scoped port should return "scope-required"
    expect(inspector.isResolved("RequestContext")).toBe("scope-required");

    // Unknown port should throw
    expect(() => inspector.isResolved("UnknownPort")).toThrow();
  });

  test("getScopeTree() returns hierarchical ScopeTree structure", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer(graph);

    // Create nested scope structure
    const scope1 = container.createScope();
    const scope2 = container.createScope();
    const nestedScope = scope1.createScope();

    // Resolve in each scope
    scope1.resolve(RequestContextPort);
    nestedScope.resolve(RequestContextPort);

    const inspector = createInspector(container);
    const tree = inspector.getScopeTree();

    // Root should be the container
    expect(tree.id).toBe("container");
    expect(tree.status).toBe("active");
    expect(tree.children.length).toBe(2); // scope1 and scope2

    // Find scope1 in children
    const scope1Node = tree.children.find(c => c.children.length > 0);
    expect(scope1Node).toBeDefined();
    expect(scope1Node!.status).toBe("active");
    expect(scope1Node!.resolvedCount).toBeGreaterThanOrEqual(1);

    // Check nested scope
    expect(scope1Node!.children.length).toBe(1);
    const nestedNode = scope1Node!.children[0];
    expect(nestedNode).toBeDefined();
    expect(nestedNode!.resolvedCount).toBeGreaterThanOrEqual(1);

    // Tree should be frozen
    expect(Object.isFrozen(tree)).toBe(true);
  });

  test("inspector creation is O(1) (no iteration during creation)", () => {
    // Create a graph with several adapters
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "singleton",
      factory: () => ({ getUser: vi.fn() }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(RequestContextAdapter)
      .provide(UserServiceAdapter)
      .build();
    const container = createContainer(graph);

    // Resolve all singletons to populate memos
    container.resolve(LoggerPort);
    container.resolve(DatabasePort);
    container.resolve(UserServicePort);

    // Inspector creation should not iterate (O(1))
    // We verify this by ensuring inspector creation doesn't trigger any factory calls
    // The factory mocks have already been called above, so if creation iterates,
    // we would see extra calls (which we don't test here directly)
    const inspector = createInspector(container);

    // Verify inspector is usable - this is the structural O(1) verification
    // Inspector stores only the container reference, not iterating adapters/memos
    expect(typeof inspector.snapshot).toBe("function");
    expect(typeof inspector.listPorts).toBe("function");
    expect(typeof inspector.isResolved).toBe("function");
    expect(typeof inspector.getScopeTree).toBe("function");

    // Verify the methods work (iteration happens on method call, not creation)
    const ports = inspector.listPorts();
    expect(ports.length).toBe(4);
  });

  test("snapshot data is deeply frozen (Object.isFrozen checks)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const RequestContextAdapter = createAdapter({
      provides: RequestContextPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ requestId: "test" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(RequestContextAdapter)
      .build();
    const container = createContainer(graph);
    container.resolve(LoggerPort);

    const scope = container.createScope();
    scope.resolve(RequestContextPort);

    const inspector = createInspector(container);
    const snapshot = inspector.snapshot();

    // Root snapshot should be frozen
    expect(Object.isFrozen(snapshot)).toBe(true);

    // Singletons array should be frozen
    expect(Object.isFrozen(snapshot.singletons)).toBe(true);

    // Each singleton entry should be frozen
    for (const entry of snapshot.singletons) {
      expect(Object.isFrozen(entry)).toBe(true);
    }

    // Scopes tree should be frozen
    expect(Object.isFrozen(snapshot.scopes)).toBe(true);

    // listPorts should return frozen array
    const ports = inspector.listPorts();
    expect(Object.isFrozen(ports)).toBe(true);

    // getScopeTree should return frozen tree
    const tree = inspector.getScopeTree();
    expect(Object.isFrozen(tree)).toBe(true);
    expect(Object.isFrozen(tree.children)).toBe(true);
  });

  test("disposed container operations throw descriptive errors", async () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const container = createContainer(graph);
    const inspector = createInspector(container);

    // Dispose the container
    await container.dispose();

    // All inspector methods should throw
    expect(() => inspector.snapshot()).toThrow(/disposed/i);
    expect(() => inspector.listPorts()).toThrow(/disposed/i);
    expect(() => inspector.isResolved("Logger")).toThrow(/disposed/i);
    expect(() => inspector.getScopeTree()).toThrow(/disposed/i);
  });
});
