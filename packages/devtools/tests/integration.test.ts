/**
 * Integration tests for @hex-di/devtools composability and pipelines.
 *
 * These tests verify:
 * 1. Full pipeline: graph -> toJSON -> filterGraph -> toDOT
 * 2. Full pipeline: graph -> toJSON -> relabelPorts -> toMermaid
 * 3. toDOT accepts ExportedGraph directly
 * 4. toMermaid accepts ExportedGraph directly
 * 5. Chained transforms work correctly
 * 6. All exports are pure functions (no side effects)
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import {
  toJSON,
  toDOT,
  toMermaid,
  filterGraph,
  relabelPorts,
  byLifetime,
  byPortName,
} from "../src/index.js";
import type { ExportedGraph, ExportedNode } from "../src/types.js";

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

interface Cache {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", Config>("Config");
const CachePort = createPort<"Cache", Cache>("Cache");

/**
 * Helper to get a short lifetime indicator.
 */
function getLifetimeIndicator(node: ExportedNode): string {
  const indicators: Record<string, string> = {
    singleton: "S",
    scoped: "C",
    request: "R",
  };
  return indicators[node.lifetime] ?? "?";
}

/**
 * Creates a complete test graph with multiple lifetimes and dependencies.
 */
function createTestGraph() {
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

  const CacheAdapter = createAdapter({
    provides: CachePort,
    requires: [ConfigPort],
    lifetime: "scoped",
    factory: () => ({ get: () => null, set: () => {} }),
  });

  const UserServiceAdapter = createAdapter({
    provides: UserServicePort,
    requires: [LoggerPort, DatabasePort, CachePort],
    lifetime: "request",
    factory: () => ({ getUser: () => ({}) }),
  });

  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(ConfigAdapter)
    .provide(DatabaseAdapter)
    .provide(CacheAdapter)
    .provide(UserServiceAdapter)
    .build();
}

// =============================================================================
// Full Pipeline Tests
// =============================================================================

describe("Integration: Full Pipelines", () => {
  it("supports pipeline: graph -> toJSON -> filterGraph -> toDOT", () => {
    const graph = createTestGraph();

    // Full pipeline: filter to singletons only, then export to DOT
    const exported = toJSON(graph);
    const singletons = filterGraph(exported, byLifetime("singleton"));
    const dot = toDOT(singletons);

    // Should only include singleton nodes
    expect(dot).toContain('"Logger"');
    expect(dot).toContain('"Config"');
    expect(dot).toContain('"Database"');
    expect(dot).not.toContain('"Cache"');
    expect(dot).not.toContain('"UserService"');

    // Should include edges between singletons only
    expect(dot).toContain('"Database" -> "Logger"');
    expect(dot).toContain('"Database" -> "Config"');

    // Verify DOT structure
    expect(dot).toMatch(/^digraph DependencyGraph \{/);
    expect(dot).toMatch(/\}$/);
  });

  it("supports pipeline: graph -> toJSON -> relabelPorts -> toMermaid", () => {
    const graph = createTestGraph();

    // Full pipeline: add prefix to labels, then export to Mermaid
    // Using parentheses instead of brackets to avoid Mermaid escaping
    const exported = toJSON(graph);
    const relabeled = relabelPorts(exported, (node) => `(${getLifetimeIndicator(node)}) ${node.label}`);
    const mermaid = toMermaid(relabeled);

    // Should have relabeled nodes with lifetime prefix
    // S = singleton, C = scoped (container), R = request
    expect(mermaid).toContain("(S) Logger");
    expect(mermaid).toContain("(S) Config");
    expect(mermaid).toContain("(S) Database");
    expect(mermaid).toContain("(C) Cache");
    expect(mermaid).toContain("(R) UserService");

    // Should still use original IDs for edges
    expect(mermaid).toContain("-->");

    // Verify Mermaid structure
    expect(mermaid).toMatch(/^graph TD/);
  });

  it("supports chained transforms: filter then relabel then export", () => {
    const graph = createTestGraph();

    // Chain: filter to scoped/request -> relabel -> export to Mermaid
    const exported = toJSON(graph);
    const nonSingletons = filterGraph(
      exported,
      (node) => node.lifetime !== "singleton"
    );
    const relabeled = relabelPorts(nonSingletons, (node) =>
      node.label.toUpperCase()
    );
    const mermaid = toMermaid(relabeled);

    // Should only have non-singleton nodes with uppercase labels
    expect(mermaid).toContain("CACHE");
    expect(mermaid).toContain("USERSERVICE");
    expect(mermaid).not.toContain("LOGGER");
    expect(mermaid).not.toContain("DATABASE");

    // Should have edge from UserService to Cache
    expect(mermaid).toContain("UserService --> Cache");
  });
});

// =============================================================================
// Direct ExportedGraph Input Tests
// =============================================================================

describe("Integration: Export functions accept ExportedGraph directly", () => {
  it("toDOT accepts ExportedGraph directly", () => {
    const exportedGraph: ExportedGraph = {
      nodes: [
        { id: "A", label: "Service A", lifetime: "singleton" },
        { id: "B", label: "Service B", lifetime: "scoped" },
      ],
      edges: [{ from: "B", to: "A" }],
    };

    const dot = toDOT(exportedGraph);

    expect(dot).toContain('"A"');
    expect(dot).toContain('"B"');
    expect(dot).toContain('"B" -> "A"');
    expect(dot).toContain("Service A");
    expect(dot).toContain("Service B");
  });

  it("toMermaid accepts ExportedGraph directly", () => {
    const exportedGraph: ExportedGraph = {
      nodes: [
        { id: "X", label: "Service X", lifetime: "singleton" },
        { id: "Y", label: "Service Y", lifetime: "request" },
      ],
      edges: [{ from: "Y", to: "X" }],
    };

    const mermaid = toMermaid(exportedGraph);

    expect(mermaid).toContain("X[");
    expect(mermaid).toContain("Y[");
    expect(mermaid).toContain("Y --> X");
    expect(mermaid).toContain("Service X");
    expect(mermaid).toContain("Service Y");
  });

  it("toDOT with ExportedGraph supports all options", () => {
    const exportedGraph: ExportedGraph = {
      nodes: [
        { id: "A", label: "A", lifetime: "singleton" },
        { id: "B", label: "B", lifetime: "scoped" },
      ],
      edges: [{ from: "B", to: "A" }],
    };

    // Test LR direction
    const dotLR = toDOT(exportedGraph, { direction: "LR" });
    expect(dotLR).toContain("rankdir=LR");

    // Test styled preset
    const dotStyled = toDOT(exportedGraph, { preset: "styled" });
    expect(dotStyled).toContain("style=filled");
    expect(dotStyled).toContain("fillcolor=");
  });

  it("toMermaid with ExportedGraph supports all options", () => {
    const exportedGraph: ExportedGraph = {
      nodes: [
        { id: "A", label: "A", lifetime: "singleton" },
      ],
      edges: [],
    };

    // Test LR direction
    const mermaidLR = toMermaid(exportedGraph, { direction: "LR" });
    expect(mermaidLR).toMatch(/^graph LR/);

    // Test TD direction (default)
    const mermaidTD = toMermaid(exportedGraph, { direction: "TD" });
    expect(mermaidTD).toMatch(/^graph TD/);
  });
});

// =============================================================================
// Pure Function Tests
// =============================================================================

describe("Integration: Pure functions (no side effects)", () => {
  it("toJSON is pure - same input produces same output", () => {
    const graph = createTestGraph();

    const result1 = toJSON(graph);
    const result2 = toJSON(graph);

    // Should produce identical results
    expect(result1).toEqual(result2);
  });

  it("toDOT is pure - same input produces same output", () => {
    const graph = createTestGraph();

    const result1 = toDOT(graph);
    const result2 = toDOT(graph);

    expect(result1).toBe(result2);
  });

  it("toMermaid is pure - same input produces same output", () => {
    const graph = createTestGraph();

    const result1 = toMermaid(graph);
    const result2 = toMermaid(graph);

    expect(result1).toBe(result2);
  });

  it("filterGraph is pure - does not modify input", () => {
    const graph = createTestGraph();
    const exported = toJSON(graph);
    const originalNodes = [...exported.nodes];
    const originalEdges = [...exported.edges];

    // Apply filter
    filterGraph(exported, byLifetime("singleton"));

    // Original should be unchanged
    expect(exported.nodes).toEqual(originalNodes);
    expect(exported.edges).toEqual(originalEdges);
  });

  it("relabelPorts is pure - does not modify input", () => {
    const graph = createTestGraph();
    const exported = toJSON(graph);
    const originalLabels = exported.nodes.map((n) => n.label);

    // Apply relabel
    relabelPorts(exported, (node) => `PREFIX_${node.label}`);

    // Original labels should be unchanged
    expect(exported.nodes.map((n) => n.label)).toEqual(originalLabels);
  });

  it("chained transforms are pure - intermediate results unchanged", () => {
    const graph = createTestGraph();

    // Create intermediate results
    const step1 = toJSON(graph);
    const step1Copy = { ...step1, nodes: [...step1.nodes], edges: [...step1.edges] };

    const step2 = filterGraph(step1, byLifetime("singleton"));
    const step2Copy = { ...step2, nodes: [...step2.nodes], edges: [...step2.edges] };

    const step3 = relabelPorts(step2, (n) => n.label.toUpperCase());

    // Verify intermediate results unchanged
    expect(step1.nodes).toEqual(step1Copy.nodes);
    expect(step1.edges).toEqual(step1Copy.edges);
    expect(step2.nodes).toEqual(step2Copy.nodes);
    expect(step2.edges).toEqual(step2Copy.edges);

    // Final result should be different from intermediates
    expect(step3.nodes.map((n) => n.label)).not.toEqual(step2.nodes.map((n) => n.label));
  });
});

// =============================================================================
// Composability Tests
// =============================================================================

describe("Integration: Transform composability", () => {
  it("multiple byLifetime filters can be combined with OR logic", () => {
    const graph = createTestGraph();
    const exported = toJSON(graph);

    // Filter to singleton OR scoped (not request)
    const filtered = filterGraph(
      exported,
      (node) => node.lifetime === "singleton" || node.lifetime === "scoped"
    );

    const nodeIds = filtered.nodes.map((n) => n.id);
    expect(nodeIds).toContain("Logger");
    expect(nodeIds).toContain("Config");
    expect(nodeIds).toContain("Database");
    expect(nodeIds).toContain("Cache");
    expect(nodeIds).not.toContain("UserService");
  });

  it("byPortName can filter by regex pattern", () => {
    const graph = createTestGraph();
    const exported = toJSON(graph);

    // Filter to services ending with "Service"
    const filtered = filterGraph(exported, byPortName(/Service$/));

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.nodes[0]?.id).toBe("UserService");
    // Edges to filtered-out nodes should be removed
    expect(filtered.edges).toHaveLength(0);
  });

  it("filters and transforms compose in any order", () => {
    const graph = createTestGraph();
    const exported = toJSON(graph);

    // Order 1: filter then relabel (using parentheses to avoid escaping issues)
    const order1 = relabelPorts(
      filterGraph(exported, byLifetime("singleton")),
      (n) => `(S) ${n.label}`
    );

    // Order 2: relabel then filter (should give same nodes but relabeled first)
    const order2 = filterGraph(
      relabelPorts(exported, (n) => `(${getLifetimeIndicator(n)}) ${n.label}`),
      byLifetime("singleton")
    );

    // Both should have same node IDs
    expect(order1.nodes.map((n) => n.id).sort()).toEqual(
      order2.nodes.map((n) => n.id).sort()
    );

    // Both should have singleton labels with (S) prefix
    order1.nodes.forEach((n) => expect(n.label).toMatch(/^\(S\)/));
    order2.nodes.forEach((n) => expect(n.label).toMatch(/^\(S\)/));
  });

  it("empty graph exports produce valid but empty output", () => {
    const emptyGraph = GraphBuilder.create().build();

    const exported = toJSON(emptyGraph);
    expect(exported.nodes).toHaveLength(0);
    expect(exported.edges).toHaveLength(0);

    const dot = toDOT(emptyGraph);
    expect(dot).toContain("digraph DependencyGraph");
    expect(dot).not.toContain("->");

    const mermaid = toMermaid(emptyGraph);
    expect(mermaid).toContain("graph TD");
  });
});
