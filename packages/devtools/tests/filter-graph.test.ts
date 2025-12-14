/**
 * Tests for filterGraph transform utility.
 *
 * These tests verify:
 * 1. filterGraph returns new ExportedGraph with filtered nodes
 * 2. filterGraph removes edges connected to filtered nodes
 * 3. byLifetime helper filters by lifetime
 * 4. byPortName helper filters by regex pattern
 * 5. Original graph is not modified (immutability)
 */

import { describe, it, expect } from "vitest";
import { filterGraph, byLifetime, byPortName } from "../src/filter-graph.js";
import type { ExportedGraph, ExportedNode } from "../src/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a test ExportedGraph with predefined nodes and edges.
 */
function createTestGraph(): ExportedGraph {
  return {
    nodes: [
      { id: "Config", label: "Config", lifetime: "singleton" },
      { id: "Database", label: "Database", lifetime: "singleton" },
      { id: "Logger", label: "Logger", lifetime: "singleton" },
      { id: "UserRepository", label: "UserRepository", lifetime: "scoped" },
      { id: "UserService", label: "UserService", lifetime: "scoped" },
      { id: "RequestHandler", label: "RequestHandler", lifetime: "request" },
    ],
    edges: [
      { from: "Database", to: "Config" },
      { from: "Database", to: "Logger" },
      { from: "UserRepository", to: "Database" },
      { from: "UserRepository", to: "Logger" },
      { from: "UserService", to: "UserRepository" },
      { from: "UserService", to: "Logger" },
      { from: "RequestHandler", to: "UserService" },
    ],
  };
}

// =============================================================================
// filterGraph Basic Tests
// =============================================================================

describe("filterGraph", () => {
  it("returns new ExportedGraph with filtered nodes", () => {
    const original = createTestGraph();

    // Filter to only singleton nodes
    const predicate = (node: ExportedNode) => node.lifetime === "singleton";
    const result = filterGraph(original, predicate);

    // Should have only singleton nodes
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map((n) => n.id)).toEqual([
      "Config",
      "Database",
      "Logger",
    ]);

    // Should be a new object
    expect(result).not.toBe(original);
    expect(result.nodes).not.toBe(original.nodes);
  });

  it("removes edges connected to filtered nodes", () => {
    const original = createTestGraph();

    // Filter to only singleton nodes
    const predicate = (node: ExportedNode) => node.lifetime === "singleton";
    const result = filterGraph(original, predicate);

    // Should only have edges between singleton nodes
    expect(result.edges).toHaveLength(2);
    expect(result.edges).toContainEqual({ from: "Database", to: "Config" });
    expect(result.edges).toContainEqual({ from: "Database", to: "Logger" });

    // Should NOT have edges to/from non-singleton nodes
    expect(result.edges).not.toContainEqual({
      from: "UserRepository",
      to: "Database",
    });
    expect(result.edges).not.toContainEqual({
      from: "RequestHandler",
      to: "UserService",
    });
  });

  it("does not modify the original graph (immutability)", () => {
    const original = createTestGraph();
    const originalNodesLength = original.nodes.length;
    const originalEdgesLength = original.edges.length;

    // Filter to only singleton nodes
    const predicate = (node: ExportedNode) => node.lifetime === "singleton";
    filterGraph(original, predicate);

    // Original should be unchanged
    expect(original.nodes).toHaveLength(originalNodesLength);
    expect(original.edges).toHaveLength(originalEdgesLength);
  });

  it("returns frozen objects", () => {
    const original = createTestGraph();
    const predicate = (node: ExportedNode) => node.lifetime === "singleton";
    const result = filterGraph(original, predicate);

    // Result should be frozen
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.nodes)).toBe(true);
    expect(Object.isFrozen(result.edges)).toBe(true);
  });

  it("handles empty result when no nodes match predicate", () => {
    const original = createTestGraph();
    const predicate = () => false; // No nodes match
    const result = filterGraph(original, predicate);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});

// =============================================================================
// byLifetime Helper Tests
// =============================================================================

describe("byLifetime", () => {
  it("filters nodes by singleton lifetime", () => {
    const original = createTestGraph();
    const result = filterGraph(original, byLifetime("singleton"));

    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.every((n) => n.lifetime === "singleton")).toBe(true);
  });

  it("filters nodes by scoped lifetime", () => {
    const original = createTestGraph();
    const result = filterGraph(original, byLifetime("scoped"));

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map((n) => n.id)).toEqual([
      "UserRepository",
      "UserService",
    ]);
    expect(result.nodes.every((n) => n.lifetime === "scoped")).toBe(true);
  });

  it("filters nodes by request lifetime", () => {
    const original = createTestGraph();
    const result = filterGraph(original, byLifetime("request"));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.id).toBe("RequestHandler");
    expect(result.nodes[0]!.lifetime).toBe("request");
  });

  it("returns empty result when no nodes match lifetime", () => {
    const graph: ExportedGraph = {
      nodes: [{ id: "Test", label: "Test", lifetime: "singleton" }],
      edges: [],
    };
    const result = filterGraph(graph, byLifetime("request"));

    expect(result.nodes).toHaveLength(0);
  });
});

// =============================================================================
// byPortName Helper Tests
// =============================================================================

describe("byPortName", () => {
  it("filters nodes by regex pattern matching id", () => {
    const original = createTestGraph();
    const result = filterGraph(original, byPortName(/Service$/));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.id).toBe("UserService");
  });

  it("filters nodes with case-insensitive pattern", () => {
    const original = createTestGraph();
    const result = filterGraph(original, byPortName(/user/i));

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.map((n) => n.id)).toEqual([
      "UserRepository",
      "UserService",
    ]);
  });

  it("filters nodes matching prefix pattern", () => {
    const original = createTestGraph();
    const result = filterGraph(original, byPortName(/^User/));

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes.every((n) => n.id.startsWith("User"))).toBe(true);
  });

  it("returns empty result when no nodes match pattern", () => {
    const original = createTestGraph();
    const result = filterGraph(original, byPortName(/NonExistent/));

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("removes edges when filtering leaves isolated nodes", () => {
    const original = createTestGraph();
    // Only keep Logger - should have no edges since all edges
    // either go from or to nodes that are filtered out
    const result = filterGraph(original, byPortName(/^Logger$/));

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.id).toBe("Logger");
    // Logger has no outgoing edges, and all incoming edges are from filtered nodes
    expect(result.edges).toHaveLength(0);
  });
});
