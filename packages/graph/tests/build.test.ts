/**
 * Unit tests for GraphBuilder.build() method runtime behavior.
 *
 * These tests verify:
 * 1. build() returns frozen graph object
 * 2. Built graph contains all registered adapters
 * 3. Empty builder builds empty graph
 * 4. Graph adapters match builder adapters
 * 5. Multiple build() calls on same builder work
 * 6. Graph is immutable at runtime
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

interface ConfigService {
  get(key: string): string;
}

interface CacheService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", ConfigService>("Config");
const CachePort = createPort<"Cache", CacheService>("Cache");

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

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => "" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: () => ({ get: () => null, set: () => {} }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: async (id) => ({ id, name: "test" }) }),
});

// =============================================================================
// build() Returns Frozen Graph Object Tests
// =============================================================================

describe("build() returns frozen graph object", () => {
  it("returns a frozen object", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(Object.isFrozen(graph)).toBe(true);
  });

  it("graph adapters property is frozen", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    // The adapters array should be frozen
    expect(Object.isFrozen(graph.adapters)).toBe(true);
  });

  it("cannot modify graph adapters array", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(() => {
      (graph.adapters as unknown[]).push(DatabaseAdapter);
    }).toThrow();
  });
});

// =============================================================================
// Built Graph Contains All Registered Adapters Tests
// =============================================================================

describe("built graph contains all registered adapters", () => {
  it("graph contains single adapter", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(graph.adapters).toContain(LoggerAdapter);
    expect(graph.adapters.length).toBe(1);
  });

  it("graph contains multiple adapters", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    expect(graph.adapters).toContain(LoggerAdapter);
    expect(graph.adapters).toContain(DatabaseAdapter);
    expect(graph.adapters).toContain(UserServiceAdapter);
    expect(graph.adapters.length).toBe(3);
  });

  it("graph contains adapters with dependencies", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .build();

    expect(graph.adapters.length).toBe(5);
    expect(graph.adapters).toContain(CacheAdapter);
    expect(graph.adapters).toContain(UserServiceAdapter);
  });

  it("adapters are in registration order", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .build();

    expect(graph.adapters[0]).toBe(LoggerAdapter);
    expect(graph.adapters[1]).toBe(DatabaseAdapter);
    expect(graph.adapters[2]).toBe(ConfigAdapter);
  });
});

// =============================================================================
// Empty Builder Builds Empty Graph Tests
// =============================================================================

describe("empty builder builds empty graph", () => {
  it("empty graph has zero adapters", () => {
    const graph = GraphBuilder.create().build();

    expect(graph.adapters.length).toBe(0);
    expect(graph.adapters).toEqual([]);
  });

  it("empty graph is still frozen", () => {
    const graph = GraphBuilder.create().build();

    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.adapters)).toBe(true);
  });
});

// =============================================================================
// Graph Adapters Match Builder Adapters Tests
// =============================================================================

describe("graph adapters match builder adapters", () => {
  it("graph adapters are identical to builder adapters", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    const graph = builder.build();

    expect(graph.adapters).toEqual(builder.adapters);
    expect(graph.adapters.length).toBe(builder.adapters.length);
  });

  it("graph adapters have same order as builder adapters", () => {
    const builder = GraphBuilder.create()
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(LoggerAdapter);

    const graph = builder.build();

    for (let i = 0; i < builder.adapters.length; i++) {
      expect(graph.adapters[i]).toBe(builder.adapters[i]);
    }
  });
});

// =============================================================================
// Multiple build() Calls Work Tests
// =============================================================================

describe("multiple build() calls on same builder work", () => {
  it("can call build() multiple times", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);

    const graph1 = builder.build();
    const graph2 = builder.build();

    // Both should have same adapters
    expect(graph1.adapters).toEqual(graph2.adapters);
  });

  it("build() returns distinct graph objects", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter);

    const graph1 = builder.build();
    const graph2 = builder.build();

    // Graph objects should be different instances
    expect(graph1).not.toBe(graph2);

    // Adapters arrays share the same frozen reference (efficient reuse)
    // This is correct - no need to copy a frozen array
    expect(graph1.adapters).toBe(graph2.adapters);
    expect(graph1.adapters).toBe(builder.adapters);
  });

  it("builder remains unchanged after multiple build() calls", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);

    const originalAdapterCount = builder.adapters.length;

    builder.build();
    builder.build();
    builder.build();

    expect(builder.adapters.length).toBe(originalAdapterCount);
  });
});

// =============================================================================
// Graph Immutability Tests
// =============================================================================

describe("graph is immutable at runtime", () => {
  it("cannot add properties to graph", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (graph as any).newProperty = "value";
    }).toThrow();
  });

  it("cannot modify existing graph properties", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (graph as any).adapters = [];
    }).toThrow();
  });

  it("graph adapters array is truly frozen", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    // Cannot push
    expect(() => {
      (graph.adapters as unknown[]).push(ConfigAdapter);
    }).toThrow();

    // Cannot pop
    expect(() => {
      (graph.adapters as unknown[]).pop();
    }).toThrow();

    // Cannot modify by index
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (graph.adapters as any)[0] = ConfigAdapter;
    }).toThrow();
  });
});
