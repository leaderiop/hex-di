/**
 * Graph snapshot serialization tests.
 *
 * Tests for the serializeGraph function that converts graph structures
 * to deterministic JSON-serializable format for snapshot testing.
 */

import { describe, test, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { serializeGraph } from "../src/graph-snapshot.js";
import type { GraphSnapshot, AdapterSnapshot } from "../src/graph-snapshot.js";

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
// serializeGraph Tests
// =============================================================================

describe("serializeGraph", () => {
  test("output is JSON-serializable", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const snapshot = serializeGraph(graph);

    // Should not throw when stringifying
    const json = JSON.stringify(snapshot);
    expect(json).toBeDefined();

    // Should round-trip correctly
    const parsed = JSON.parse(json) as GraphSnapshot;
    expect(parsed).toEqual(snapshot);
  });

  test("includes adapter port names and lifetimes", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "request",
      factory: () => ({ query: () => ({}) }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const snapshot = serializeGraph(graph);

    expect(snapshot.adapters).toHaveLength(2);

    // Check for Database adapter (comes first alphabetically)
    const databaseSnapshot = snapshot.adapters.find((a) => a.port === "Database");
    expect(databaseSnapshot).toBeDefined();
    expect(databaseSnapshot?.lifetime).toBe("request");

    // Check for Logger adapter
    const loggerSnapshot = snapshot.adapters.find((a) => a.port === "Logger");
    expect(loggerSnapshot).toBeDefined();
    expect(loggerSnapshot?.lifetime).toBe("singleton");
  });

  test("includes dependency relationships", () => {
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

    const snapshot = serializeGraph(graph);

    // Check Logger has no dependencies
    const loggerSnapshot = snapshot.adapters.find((a) => a.port === "Logger");
    expect(loggerSnapshot?.requires).toEqual([]);

    // Check Database depends on Logger
    const databaseSnapshot = snapshot.adapters.find((a) => a.port === "Database");
    expect(databaseSnapshot?.requires).toEqual(["Logger"]);

    // Check UserService depends on both (sorted alphabetically)
    const userServiceSnapshot = snapshot.adapters.find((a) => a.port === "UserService");
    expect(userServiceSnapshot?.requires).toEqual(["Database", "Logger"]);
  });

  test("excludes factory functions and finalizers", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
      finalizer: () => {
        // cleanup
      },
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const snapshot = serializeGraph(graph);

    // Verify snapshot only contains serializable properties
    expect(snapshot.adapters).toHaveLength(1);
    const adapter = snapshot.adapters[0]!;
    expect(adapter).toHaveProperty("port");
    expect(adapter).toHaveProperty("lifetime");
    expect(adapter).toHaveProperty("requires");

    // Should NOT have factory or finalizer
    expect(adapter).not.toHaveProperty("factory");
    expect(adapter).not.toHaveProperty("finalizer");

    // Type-level check - AdapterSnapshot should only have these keys
    const keys = Object.keys(adapter);
    expect(keys.sort()).toEqual(["lifetime", "port", "requires"]);
  });

  test("stable/deterministic ordering (sorted by port name)", () => {
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
      factory: () => ({ query: () => ({}) }),
    });

    const ConfigAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });

    // Register in non-alphabetical order
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .provide(DatabaseAdapter)
      .build();

    const snapshot1 = serializeGraph(graph);
    const snapshot2 = serializeGraph(graph);

    // Both should have same ordering
    expect(snapshot1).toEqual(snapshot2);

    // Order should be alphabetical by port name
    expect(snapshot1.adapters.map((a) => a.port)).toEqual([
      "Config",
      "Database",
      "Logger",
    ]);
  });

  test("works with toMatchSnapshot()", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const DatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ query: () => ({}) }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "request",
      factory: () => ({ getUser: () => ({}) }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    const snapshot = serializeGraph(graph);

    // This demonstrates compatibility with Vitest snapshot testing
    expect(snapshot).toMatchSnapshot();
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("serializeGraph edge cases", () => {
  test("handles empty graph (no adapters)", () => {
    const graph = GraphBuilder.create().build();
    const snapshot = serializeGraph(graph);

    expect(snapshot).toEqual({ adapters: [] });
  });

  test("handles adapters with no dependencies (empty requires array)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const snapshot = serializeGraph(graph);

    expect(snapshot.adapters).toHaveLength(1);
    expect(snapshot.adapters[0]!.requires).toEqual([]);
    expect(snapshot.adapters[0]!.requires).toBeInstanceOf(Array);
  });

  test("preserveOrder option keeps original registration order", () => {
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
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: () => ({}) }),
    });

    // Register in specific order: Logger, Config, Database
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .provide(DatabaseAdapter)
      .build();

    // Without preserveOrder, should be alphabetical
    const sortedSnapshot = serializeGraph(graph);
    expect(sortedSnapshot.adapters.map((a) => a.port)).toEqual([
      "Config",
      "Database",
      "Logger",
    ]);

    // With preserveOrder, should maintain registration order
    const preservedSnapshot = serializeGraph(graph, { preserveOrder: true });
    expect(preservedSnapshot.adapters.map((a) => a.port)).toEqual([
      "Logger",
      "Config",
      "Database",
    ]);
  });
});
