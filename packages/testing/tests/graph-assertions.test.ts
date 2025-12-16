/**
 * Tests for graph assertion utilities.
 *
 * These tests verify the graph assertion functions that provide runtime
 * validation of dependency graphs, ports, and adapter lifetimes.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter, type Graph, type Port } from "@hex-di/graph";
import {
  assertGraphComplete,
  assertPortProvided,
  assertLifetime,
  GraphAssertionError,
} from "../src/graph-assertions.js";

// Helper to cast incomplete graphs for runtime testing
// At runtime, .build() always returns a graph-like object, but TypeScript
// returns MissingDependencyError type for incomplete graphs at compile time.
// This cast is safe for testing the runtime assertion behavior.
function asGraph<T>(value: unknown): Graph<Port<T, string>> {
  return value as Graph<Port<T, string>>;
}

// =============================================================================
// Test Fixtures
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

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: () => {},
  }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({
    query: async () => ({}),
  }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "request",
  factory: (deps) => ({
    getUser: async (id: string) => {
      deps.Logger.log(`Fetching user ${id}`);
      return { id, name: "Test User" };
    },
  }),
});

// =============================================================================
// assertGraphComplete Tests
// =============================================================================

describe("assertGraphComplete", () => {
  it("throws on missing dependencies", () => {
    // UserService requires Logger and Database, but only Logger is provided
    // At runtime, .build() returns a graph-like object even for incomplete graphs.
    // We use asGraph() to tell TypeScript this is intentional for testing.
    const incompleteGraph = asGraph(
      GraphBuilder.create()
        .provide(LoggerAdapter)
        .provide(UserServiceAdapter)
        // @ts-expect-error Testing runtime behavior with incomplete graph - TypeScript correctly requires error arg
        .build()
    );

    expect(() => assertGraphComplete(incompleteGraph)).toThrow(GraphAssertionError);
    expect(() => assertGraphComplete(incompleteGraph)).toThrow(
      /Graph incomplete.*Missing ports:.*Database/
    );
  });

  it("succeeds on complete graph", () => {
    const completeGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    // Should not throw
    expect(() => assertGraphComplete(completeGraph)).not.toThrow();
  });

  it("succeeds on empty graph", () => {
    const emptyGraph = GraphBuilder.create().build();

    // Empty graph has no missing dependencies
    expect(() => assertGraphComplete(emptyGraph)).not.toThrow();
  });

  it("lists all missing dependencies in error message", () => {
    // UserService requires Logger and Database, neither is provided
    // At runtime, .build() returns a graph-like object even for incomplete graphs.
    const incompleteGraph = asGraph(
      GraphBuilder.create()
        .provide(UserServiceAdapter)
        // @ts-expect-error Testing runtime behavior with incomplete graph - TypeScript correctly requires error arg
        .build()
    );

    try {
      assertGraphComplete(incompleteGraph);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(GraphAssertionError);
      const assertionError = error as GraphAssertionError;
      expect(assertionError.message).toContain("Logger");
      expect(assertionError.message).toContain("Database");
    }
  });
});

// =============================================================================
// assertPortProvided Tests
// =============================================================================

describe("assertPortProvided", () => {
  it("throws if port not in graph", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(() => assertPortProvided(graph, DatabasePort)).toThrow(GraphAssertionError);
    expect(() => assertPortProvided(graph, DatabasePort)).toThrow(
      /Port 'Database' is not provided in graph/
    );
  });

  it("succeeds if port provided", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    // Should not throw
    expect(() => assertPortProvided(graph, LoggerPort)).not.toThrow();
    expect(() => assertPortProvided(graph, DatabasePort)).not.toThrow();
  });
});

// =============================================================================
// assertLifetime Tests
// =============================================================================

describe("assertLifetime", () => {
  it("validates adapter lifetime matches expected value", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter) // singleton
      .provide(DatabaseAdapter) // scoped
      .provide(UserServiceAdapter) // request
      .build();

    // All should succeed
    expect(() => assertLifetime(graph, LoggerPort, "singleton")).not.toThrow();
    expect(() => assertLifetime(graph, DatabasePort, "scoped")).not.toThrow();
    expect(() => assertLifetime(graph, UserServicePort, "request")).not.toThrow();
  });

  it("throws if lifetime mismatch", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter) // singleton
      .build();

    expect(() => assertLifetime(graph, LoggerPort, "request")).toThrow(GraphAssertionError);
    expect(() => assertLifetime(graph, LoggerPort, "request")).toThrow(
      /Port 'Logger' has lifetime 'singleton', expected 'request'/
    );
  });

  it("throws if port not in graph", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    expect(() => assertLifetime(graph, DatabasePort, "scoped")).toThrow(GraphAssertionError);
    expect(() => assertLifetime(graph, DatabasePort, "scoped")).toThrow(
      /Port 'Database' is not provided in graph/
    );
  });
});

// =============================================================================
// GraphAssertionError Tests
// =============================================================================

describe("GraphAssertionError", () => {
  it("is an instance of Error", () => {
    const error = new GraphAssertionError("test message", ["TestPort"]);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GraphAssertionError);
  });

  it("includes port names in error", () => {
    const error = new GraphAssertionError("Missing ports", ["Logger", "Database"]);
    expect(error.portNames).toContain("Logger");
    expect(error.portNames).toContain("Database");
  });

  it("has correct error name", () => {
    const error = new GraphAssertionError("test", []);
    expect(error.name).toBe("GraphAssertionError");
  });

  it("has stable error code", () => {
    const error = new GraphAssertionError("test", []);
    expect(error.code).toBe("GRAPH_ASSERTION_FAILED");
  });
});
