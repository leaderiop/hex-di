/**
 * Tests for toJSON export function.
 *
 * These tests verify:
 * 1. toJSON returns ExportedGraph with nodes and edges arrays
 * 2. Nodes have correct id, label, and lifetime from adapters
 * 3. Edges represent dependency relationships (from dependent to required)
 * 4. Output is deterministic (sorted by port name)
 * 5. Empty graph returns empty arrays
 * 6. Graph with no dependencies has empty edges array
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { toJSON } from "../src/to-json.js";
import type { ExportedGraph, ExportedNode, ExportedEdge } from "../src/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): unknown;
}

interface Config {
  get(key: string): string;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", Config>("Config");

// =============================================================================
// toJSON Basic Tests
// =============================================================================

describe("toJSON", () => {
  it("returns ExportedGraph with nodes and edges arrays", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toJSON(graph);

    expect(result).toHaveProperty("nodes");
    expect(result).toHaveProperty("edges");
    expect(Array.isArray(result.nodes)).toBe(true);
    expect(Array.isArray(result.edges)).toBe(true);
  });

  it("nodes have correct id, label, and lifetime from adapters", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ query: () => ({}) }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [],
      lifetime: "request",
      factory: () => ({ getUser: () => ({}) }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    const result = toJSON(graph);

    // Find each node and verify its properties
    const loggerNode = result.nodes.find((n) => n.id === "Logger");
    expect(loggerNode).toBeDefined();
    expect(loggerNode?.label).toBe("Logger");
    expect(loggerNode?.lifetime).toBe("singleton");

    const databaseNode = result.nodes.find((n) => n.id === "Database");
    expect(databaseNode).toBeDefined();
    expect(databaseNode?.label).toBe("Database");
    expect(databaseNode?.lifetime).toBe("scoped");

    const userServiceNode = result.nodes.find((n) => n.id === "UserService");
    expect(userServiceNode).toBeDefined();
    expect(userServiceNode?.label).toBe("UserService");
    expect(userServiceNode?.lifetime).toBe("request");
  });

  it("edges represent dependency relationships (from dependent to required)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ query: () => ({}) }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: () => ({ getUser: () => ({}) }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    const result = toJSON(graph);

    // Database depends on Logger
    expect(result.edges).toContainEqual({
      from: "Database",
      to: "Logger",
    });

    // UserService depends on Logger
    expect(result.edges).toContainEqual({
      from: "UserService",
      to: "Logger",
    });

    // UserService depends on Database
    expect(result.edges).toContainEqual({
      from: "UserService",
      to: "Database",
    });

    // Total edges should be 3
    expect(result.edges).toHaveLength(3);
  });

  it("output is deterministic (sorted by port name)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort, ConfigPort],
      lifetime: "singleton",
      factory: () => ({ query: () => ({}) }),
    });

    // Register in non-alphabetical order
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .provide(DatabaseAdapter)
      .build();

    const result1 = toJSON(graph);
    const result2 = toJSON(graph);

    // Both calls should produce identical output
    expect(result1).toEqual(result2);

    // Nodes should be sorted alphabetically by id
    expect(result1.nodes.map((n) => n.id)).toEqual([
      "Config",
      "Database",
      "Logger",
    ]);

    // Edges should be sorted by from, then by to
    const edges = result1.edges;
    for (let i = 1; i < edges.length; i++) {
      const prev = edges[i - 1]!;
      const curr = edges[i]!;
      const comparison = prev.from.localeCompare(curr.from);
      if (comparison === 0) {
        expect(prev.to.localeCompare(curr.to)).toBeLessThanOrEqual(0);
      } else {
        expect(comparison).toBeLessThan(0);
      }
    }
  });
});

// =============================================================================
// toJSON Edge Cases
// =============================================================================

describe("toJSON edge cases", () => {
  it("empty graph returns empty arrays", () => {
    const graph = GraphBuilder.create().build();
    const result = toJSON(graph);

    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("graph with no dependencies has empty edges array", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .build();

    const result = toJSON(graph);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toEqual([]);
  });

  it("result is immutable (frozen objects)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toJSON(graph);

    // The result object should be frozen
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.nodes)).toBe(true);
    expect(Object.isFrozen(result.edges)).toBe(true);
  });
});
