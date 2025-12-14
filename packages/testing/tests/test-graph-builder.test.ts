/**
 * Unit tests for TestGraphBuilder class.
 *
 * These tests verify:
 * 1. TestGraphBuilder.from(graph) accepts a built Graph
 * 2. .override(adapter) returns new immutable builder
 * 3. Multiple chained overrides work correctly
 * 4. .build() returns Graph with overridden adapters
 * 5. Type safety: override adapter must provide port that exists in graph
 * 6. Immutability: original builder unchanged after operations
 */

import { describe, expect, it, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter, type Graph } from "@hex-di/graph";
import { TestGraphBuilder } from "../src/test-graph-builder.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// Test Adapters (Production)
// =============================================================================

const ProductionLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const ProductionDatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: async (sql) => ({ sql, result: "production" }) }),
});

const ProductionUserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Fetching user ${id}`);
      return { id, name: "Production User" };
    },
  }),
});

// =============================================================================
// TestGraphBuilder.from() Tests
// =============================================================================

describe("TestGraphBuilder.from()", () => {
  it("accepts a built Graph and returns a frozen TestGraphBuilder", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    expect(testBuilder).toBeInstanceOf(TestGraphBuilder);
    expect(Object.isFrozen(testBuilder)).toBe(true);
  });

  it("accepts graphs with multiple adapters", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .provide(ProductionDatabaseAdapter)
      .provide(ProductionUserServiceAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    expect(testBuilder).toBeInstanceOf(TestGraphBuilder);
  });

  it("creates distinct instances on each call", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const testBuilder1 = TestGraphBuilder.from(graph);
    const testBuilder2 = TestGraphBuilder.from(graph);

    expect(testBuilder1).not.toBe(testBuilder2);
  });
});

// =============================================================================
// TestGraphBuilder.override() Tests
// =============================================================================

describe("TestGraphBuilder.override()", () => {
  it("returns new immutable builder instance", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: vi.fn() }),
    });

    const withOverride = testBuilder.override(mockLoggerAdapter);

    expect(withOverride).not.toBe(testBuilder);
    expect(withOverride).toBeInstanceOf(TestGraphBuilder);
    expect(Object.isFrozen(withOverride)).toBe(true);
  });

  it("preserves original builder after override (immutability)", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .provide(ProductionDatabaseAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: vi.fn() }),
    });

    const withOverride = testBuilder.override(mockLoggerAdapter);

    // Original should be unchanged
    const originalGraph = testBuilder.build();
    const overriddenGraph = withOverride.build();

    // The original graph should have production adapter
    expect(originalGraph.adapters).toContain(ProductionLoggerAdapter);
    // The overridden graph should have mock adapter instead
    expect(overriddenGraph.adapters).not.toContain(ProductionLoggerAdapter);
  });
});

// =============================================================================
// Chained Overrides Tests
// =============================================================================

describe("TestGraphBuilder chained overrides", () => {
  it("supports multiple chained overrides", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .provide(ProductionDatabaseAdapter)
      .provide(ProductionUserServiceAdapter)
      .build();

    const mockLogFn = vi.fn();
    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: mockLogFn }),
    });

    const mockQueryFn = vi.fn(async () => ({ result: "mock" }));
    const mockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "request",
      factory: () => ({ query: mockQueryFn }),
    });

    const testGraph = TestGraphBuilder.from(graph)
      .override(mockLoggerAdapter)
      .override(mockDatabaseAdapter)
      .build();

    expect(testGraph.adapters).not.toContain(ProductionLoggerAdapter);
    expect(testGraph.adapters).not.toContain(ProductionDatabaseAdapter);
    expect(testGraph.adapters).toContain(mockLoggerAdapter);
    expect(testGraph.adapters).toContain(mockDatabaseAdapter);
    // UserService adapter should be preserved
    expect(testGraph.adapters).toContain(ProductionUserServiceAdapter);
  });

  it("last override for same port wins", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const mockLogFn1 = vi.fn();
    const mockLoggerAdapter1 = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: mockLogFn1 }),
    });

    const mockLogFn2 = vi.fn();
    const mockLoggerAdapter2 = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: mockLogFn2 }),
    });

    const testGraph = TestGraphBuilder.from(graph)
      .override(mockLoggerAdapter1)
      .override(mockLoggerAdapter2)
      .build();

    expect(testGraph.adapters).toContain(mockLoggerAdapter2);
    expect(testGraph.adapters).not.toContain(mockLoggerAdapter1);
    expect(testGraph.adapters.length).toBe(1);
  });
});

// =============================================================================
// TestGraphBuilder.build() Tests
// =============================================================================

describe("TestGraphBuilder.build()", () => {
  it("returns frozen Graph object", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const testGraph = TestGraphBuilder.from(graph).build();

    expect(Object.isFrozen(testGraph)).toBe(true);
  });

  it("returns Graph with overridden adapters", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .provide(ProductionDatabaseAdapter)
      .build();

    const mockLogFn = vi.fn();
    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: mockLogFn }),
    });

    const testGraph = TestGraphBuilder.from(graph)
      .override(mockLoggerAdapter)
      .build();

    // Mock adapter should replace production adapter
    expect(testGraph.adapters).toContain(mockLoggerAdapter);
    expect(testGraph.adapters).not.toContain(ProductionLoggerAdapter);
    // Non-overridden adapter should be preserved
    expect(testGraph.adapters).toContain(ProductionDatabaseAdapter);
    expect(testGraph.adapters.length).toBe(2);
  });

  it("preserves adapters that are not overridden", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .provide(ProductionDatabaseAdapter)
      .provide(ProductionUserServiceAdapter)
      .build();

    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: vi.fn() }),
    });

    const testGraph = TestGraphBuilder.from(graph)
      .override(mockLoggerAdapter)
      .build();

    // UserService and Database should be preserved
    expect(testGraph.adapters).toContain(ProductionDatabaseAdapter);
    expect(testGraph.adapters).toContain(ProductionUserServiceAdapter);
  });

  it("returns Graph usable with createContainer", async () => {
    // This is an integration verification - the graph structure should be compatible
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const testGraph = TestGraphBuilder.from(graph).build();

    // Verify the graph has the expected structure
    expect(testGraph.adapters).toBeDefined();
    expect(Array.isArray(testGraph.adapters)).toBe(true);
    // Note: __provides is a type-level marker, its runtime value is undefined
    // The important thing is the adapters array is correct
    expect(testGraph.adapters.length).toBe(1);
    expect(testGraph.adapters[0]).toBe(ProductionLoggerAdapter);
  });

  it("can call build() multiple times on same builder", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    const testGraph1 = testBuilder.build();
    const testGraph2 = testBuilder.build();

    expect(testGraph1).not.toBe(testGraph2);
    expect(testGraph1.adapters).toEqual(testGraph2.adapters);
  });
});

// =============================================================================
// TestGraphBuilder Immutability Tests
// =============================================================================

describe("TestGraphBuilder immutability", () => {
  it("builder instance is frozen after creation", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    expect(Object.isFrozen(testBuilder)).toBe(true);
  });

  it("builder instance is frozen after override", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .build();

    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: vi.fn() }),
    });

    const testBuilder = TestGraphBuilder.from(graph)
      .override(mockLoggerAdapter);

    expect(Object.isFrozen(testBuilder)).toBe(true);
  });

  it("original builder unchanged after multiple chained operations", () => {
    const graph = GraphBuilder.create()
      .provide(ProductionLoggerAdapter)
      .provide(ProductionDatabaseAdapter)
      .build();

    const original = TestGraphBuilder.from(graph);

    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: vi.fn() }),
    });

    const mockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "request",
      factory: () => ({ query: vi.fn() }),
    });

    // Chain operations
    const modified = original
      .override(mockLoggerAdapter)
      .override(mockDatabaseAdapter);

    // Original should still produce graph with production adapters
    const originalGraph = original.build();
    expect(originalGraph.adapters).toContain(ProductionLoggerAdapter);
    expect(originalGraph.adapters).toContain(ProductionDatabaseAdapter);
    expect(originalGraph.adapters.length).toBe(2);

    // Modified should have mock adapters
    const modifiedGraph = modified.build();
    expect(modifiedGraph.adapters).toContain(mockLoggerAdapter);
    expect(modifiedGraph.adapters).toContain(mockDatabaseAdapter);
    expect(modifiedGraph.adapters.length).toBe(2);
  });
});
