/**
 * Tests for toMermaid export function.
 *
 * These tests verify:
 * 1. toMermaid returns valid Mermaid flowchart syntax
 * 2. Default direction is TD (top-down)
 * 3. Node labels formatted as `PortName["PortName (lifetime)"]`
 * 4. Edges use `-->` arrow syntax
 * 5. LR direction option works
 * 6. Special characters in port names are escaped
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { toMermaid } from "../src/to-mermaid.js";

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
// toMermaid Basic Tests
// =============================================================================

describe("toMermaid", () => {
  it("returns valid Mermaid flowchart syntax", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toMermaid(graph);

    // Should start with graph declaration
    expect(result).toMatch(/^graph (TD|LR)/);
    // Should contain the node
    expect(result).toContain("Logger");
  });

  it("default direction is TD (top-down)", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toMermaid(graph);

    expect(result).toMatch(/^graph TD/);
  });

  it("node labels formatted as PortName[\"PortName (lifetime)\"]", () => {
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

    const result = toMermaid(graph);

    // Should have properly formatted node labels
    expect(result).toContain('Logger["Logger (singleton)"]');
    expect(result).toContain('Database["Database (scoped)"]');
  });

  it("edges use --> arrow syntax", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "scoped",
      factory: () => ({ getUser: () => ({}) }),
    });

    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(UserServiceAdapter)
      .build();

    const result = toMermaid(graph);

    // Should have edge with arrow syntax
    expect(result).toContain("UserService --> Logger");
  });

  it("LR direction option works", () => {
    const LoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const graph = GraphBuilder.create().provide(LoggerAdapter).build();
    const result = toMermaid(graph, { direction: "LR" });

    expect(result).toMatch(/^graph LR/);
  });

  it("special characters in port names are escaped", () => {
    // Create a port with special characters
    const SpecialPort = createPort<'My"Special[Port]', Config>('My"Special[Port]');

    const SpecialAdapter = createAdapter({
      provides: SpecialPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });

    const graph = GraphBuilder.create().provide(SpecialAdapter).build();
    const result = toMermaid(graph);

    // The output should be valid Mermaid - quotes and brackets should be escaped
    // Mermaid uses #quot; for quotes and different bracket handling
    expect(result).not.toContain('["My"Special[Port]');
    // Should contain an escaped version
    expect(result).toContain("MySpecialPort");
  });
});

// =============================================================================
// toMermaid Edge Cases
// =============================================================================

describe("toMermaid edge cases", () => {
  it("empty graph returns minimal Mermaid syntax", () => {
    const graph = GraphBuilder.create().build();
    const result = toMermaid(graph);

    // Should still have the graph declaration
    expect(result).toMatch(/^graph TD/);
    // Should not have any nodes or edges
    expect(result.trim()).toBe("graph TD");
  });

  it("graph with multiple dependencies renders all edges", () => {
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

    const result = toMermaid(graph);

    // Should have all edges
    expect(result).toContain("Database --> Logger");
    expect(result).toContain("UserService --> Database");
    expect(result).toContain("UserService --> Logger");
  });
});
