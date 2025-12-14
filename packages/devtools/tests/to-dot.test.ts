/**
 * Tests for toDOT export function.
 *
 * These tests verify:
 * 1. toDOT returns valid DOT format string with digraph wrapper
 * 2. Default direction is TB (top-bottom)
 * 3. Node labels include port name and lifetime
 * 4. Edges use arrow syntax (->)
 * 5. LR direction option works
 * 6. Styled preset adds visual differentiation
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { toDOT } from "../src/to-dot.js";

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
// toDOT Basic Tests
// =============================================================================

describe("toDOT", () => {
  it("returns valid DOT format string with digraph wrapper", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toDOT(graph);

    // Should start with digraph declaration
    expect(result).toMatch(/^digraph DependencyGraph \{/);
    // Should end with closing brace
    expect(result).toMatch(/\}$/);
    // Should contain node shape declaration
    expect(result).toContain("node [shape=box];");
  });

  it("default direction is TB (top-bottom)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toDOT(graph);

    expect(result).toContain("rankdir=TB;");
  });

  it("node labels include port name and lifetime", () => {
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

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const result = toDOT(graph);

    // Node labels should include name and lifetime
    expect(result).toContain('"Logger" [label="Logger\\n(singleton)"];');
    expect(result).toContain('"Database" [label="Database\\n(scoped)"];');
  });

  it("edges use arrow syntax (->)", () => {
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

    const result = toDOT(graph);

    // Edges should use arrow syntax
    expect(result).toContain('"Database" -> "Logger";');
    expect(result).toContain('"UserService" -> "Database";');
    expect(result).toContain('"UserService" -> "Logger";');
  });

  it("LR direction option works", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toDOT(graph, { direction: "LR" });

    expect(result).toContain("rankdir=LR;");
    expect(result).not.toContain("rankdir=TB;");
  });

  it("styled preset adds visual differentiation by lifetime", () => {
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

    const result = toDOT(graph, { preset: "styled" });

    // Should have style=filled for styled preset
    expect(result).toContain("style=filled");

    // Singleton should have green fillcolor
    expect(result).toMatch(/"Logger".*fillcolor="#E8F5E9"/);

    // Scoped should have blue fillcolor
    expect(result).toMatch(/"Database".*fillcolor="#E3F2FD"/);

    // Request should have orange fillcolor
    expect(result).toMatch(/"UserService".*fillcolor="#FFF3E0"/);
  });
});

// =============================================================================
// toDOT Edge Cases
// =============================================================================

describe("toDOT edge cases", () => {
  it("empty graph returns valid empty DOT structure", () => {
    const graph = GraphBuilder.create().build();
    const result = toDOT(graph);

    expect(result).toMatch(/^digraph DependencyGraph \{/);
    expect(result).toContain("rankdir=TB;");
    expect(result).toContain("node [shape=box];");
    expect(result).toMatch(/\}$/);
  });

  it("escapes special characters in port names", () => {
    // Create a port with special characters that need escaping in DOT
    const SpecialPort = createPort<"Special\"Port", Config>("Special\"Port");

    const SpecialAdapter = createAdapter({
      provides: SpecialPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });

    const graph = GraphBuilder.create().provide(SpecialAdapter).build();
    const result = toDOT(graph);

    // Double quotes should be escaped in DOT format
    expect(result).toContain('Special\\"Port');
  });
});
