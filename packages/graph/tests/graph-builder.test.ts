/**
 * Unit tests for GraphBuilder class.
 *
 * These tests verify runtime behavior:
 * 1. GraphBuilder.create() returns a frozen instance
 * 2. GraphBuilder instances are immutable
 * 3. provide() returns new builder with adapter added
 * 4. build() returns frozen graph with adapters
 * 5. Adapter accumulation works correctly
 */

import { describe, expect, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "../src/index.js";

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
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ query: async () => ({}) }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: async (id) => ({ id, name: "test" }) }),
});

// =============================================================================
// GraphBuilder.create() Tests
// =============================================================================

describe("GraphBuilder.create()", () => {
  it("returns a frozen GraphBuilder instance", () => {
    const builder = GraphBuilder.create();

    expect(Object.isFrozen(builder)).toBe(true);
  });

  it("returns builder with empty adapters array", () => {
    const builder = GraphBuilder.create();

    expect(builder.adapters).toEqual([]);
    expect(builder.adapters.length).toBe(0);
  });

  it("creates distinct instances on each call", () => {
    const builder1 = GraphBuilder.create();
    const builder2 = GraphBuilder.create();

    expect(builder1).not.toBe(builder2);
  });
});

// =============================================================================
// GraphBuilder Immutability Tests
// =============================================================================

describe("GraphBuilder immutability", () => {
  it("builder instance is frozen", () => {
    const builder = GraphBuilder.create();

    expect(Object.isFrozen(builder)).toBe(true);
  });

  it("cannot modify adapters array", () => {
    const builder = GraphBuilder.create();

    // Attempting to modify should throw in strict mode or silently fail
    expect(() => {
      // @ts-expect-error Testing runtime immutability - TypeScript correctly marks as readonly
      builder.adapters.push(LoggerAdapter);
    }).toThrow();
  });

  it("provide() does not mutate original builder", () => {
    const original = GraphBuilder.create();
    const withLogger = original.provide(LoggerAdapter);

    expect(original.adapters).toEqual([]);
    expect(original.adapters.length).toBe(0);
    expect(withLogger.adapters.length).toBe(1);
  });
});

// =============================================================================
// GraphBuilder.provide() Tests
// =============================================================================

describe("GraphBuilder.provide()", () => {
  it("returns new builder instance", () => {
    const original = GraphBuilder.create();
    const withLogger = original.provide(LoggerAdapter);

    expect(withLogger).not.toBe(original);
    expect(withLogger).toBeInstanceOf(GraphBuilder);
  });

  it("returned builder is frozen", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    expect(Object.isFrozen(builder)).toBe(true);
  });

  it("adds adapter to adapters array", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    expect(builder.adapters).toContain(LoggerAdapter);
    expect(builder.adapters.length).toBe(1);
  });

  it("accumulates multiple adapters", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);

    expect(builder.adapters).toContain(LoggerAdapter);
    expect(builder.adapters).toContain(DatabaseAdapter);
    expect(builder.adapters.length).toBe(2);
  });

  it("preserves adapter order", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    expect(builder.adapters[0]).toBe(LoggerAdapter);
    expect(builder.adapters[1]).toBe(DatabaseAdapter);
    expect(builder.adapters[2]).toBe(UserServiceAdapter);
  });

  it("supports fluent chaining", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    expect(builder.adapters.length).toBe(3);
  });
});

// =============================================================================
// GraphBuilder.build() Tests
// =============================================================================

describe("GraphBuilder.build()", () => {
  it("returns frozen graph object", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("graph contains all registered adapters", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    expect(graph.adapters).toContain(LoggerAdapter);
    expect(graph.adapters).toContain(DatabaseAdapter);
    expect(graph.adapters.length).toBe(2);
  });

  it("empty builder builds empty graph", () => {
    const graph = GraphBuilder.create().build();

    expect(graph.adapters).toEqual([]);
    expect(graph.adapters.length).toBe(0);
  });

  it("graph adapters match builder adapters", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    const graph = builder.build();

    expect(graph.adapters).toEqual(builder.adapters);
  });

  it("can call build() multiple times", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);

    const graph1 = builder.build();
    const graph2 = builder.build();

    expect(graph1).not.toBe(graph2);
    expect(graph1.adapters).toEqual(graph2.adapters);
  });
});

// =============================================================================
// GraphBuilder Complete Workflow Tests
// =============================================================================

describe("GraphBuilder complete workflow", () => {
  it("supports full graph construction workflow", () => {
    // Create builder
    const emptyBuilder = GraphBuilder.create();
    expect(emptyBuilder.adapters.length).toBe(0);

    // Add adapters
    const builderWithLogger = emptyBuilder.provide(LoggerAdapter);
    const builderWithDb = builderWithLogger.provide(DatabaseAdapter);
    const completeBuilder = builderWithDb.provide(UserServiceAdapter);

    // Verify original builders unchanged
    expect(emptyBuilder.adapters.length).toBe(0);
    expect(builderWithLogger.adapters.length).toBe(1);
    expect(builderWithDb.adapters.length).toBe(2);
    expect(completeBuilder.adapters.length).toBe(3);

    // Build graph
    const graph = completeBuilder.build();
    expect(graph.adapters.length).toBe(3);
    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("runtime allows duplicate adapters (type error at compile time)", () => {
    const adapter1 = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const adapter2 = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Runtime allows adding duplicates - duplicate detection is at compile time only.
    // In real code, TypeScript would prevent this at compile time.
    // We need to bypass the type system for this runtime test
    const step1 = GraphBuilder.create().provide(adapter1);
    // @ts-expect-error Testing runtime behavior - TypeScript correctly detects duplicate provider
    const builder: GraphBuilder<typeof LoggerPort, never> = step1.provide(adapter2);

    // At runtime, the adapters are still added
    expect(builder.adapters.length).toBe(2);
  });
});
