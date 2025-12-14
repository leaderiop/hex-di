/**
 * Tests for relabelPorts transform utility.
 *
 * These tests verify:
 * 1. relabelPorts transforms node labels
 * 2. relabelPorts preserves node IDs
 * 3. Original graph is not modified (immutability)
 * 4. Edges remain unchanged (use IDs, not labels)
 */

import { describe, it, expect } from "vitest";
import { relabelPorts } from "../src/relabel-ports.js";
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
      { id: "UserService", label: "UserService", lifetime: "scoped" },
      { id: "RequestHandler", label: "RequestHandler", lifetime: "request" },
    ],
    edges: [
      { from: "Database", to: "Config" },
      { from: "Database", to: "Logger" },
      { from: "UserService", to: "Database" },
      { from: "UserService", to: "Logger" },
      { from: "RequestHandler", to: "UserService" },
    ],
  };
}

// =============================================================================
// relabelPorts Basic Tests
// =============================================================================

describe("relabelPorts", () => {
  it("transforms node labels using labelFn", () => {
    const original = createTestGraph();

    // Add lifetime suffix to labels
    const labelFn = (node: ExportedNode) => `${node.label} [${node.lifetime}]`;
    const result = relabelPorts(original, labelFn);

    expect(result.nodes.find((n) => n.id === "Config")?.label).toBe(
      "Config [singleton]"
    );
    expect(result.nodes.find((n) => n.id === "Database")?.label).toBe(
      "Database [singleton]"
    );
    expect(result.nodes.find((n) => n.id === "UserService")?.label).toBe(
      "UserService [scoped]"
    );
    expect(result.nodes.find((n) => n.id === "RequestHandler")?.label).toBe(
      "RequestHandler [request]"
    );
  });

  it("preserves node IDs (used for edge references)", () => {
    const original = createTestGraph();
    const originalIds = original.nodes.map((n) => n.id);

    // Apply a transform that changes the label
    const labelFn = (node: ExportedNode) => `Transformed-${node.label}`;
    const result = relabelPorts(original, labelFn);

    // IDs should be identical
    expect(result.nodes.map((n) => n.id)).toEqual(originalIds);

    // Labels should be transformed
    expect(result.nodes.map((n) => n.label)).not.toEqual(originalIds);
    expect(result.nodes.every((n) => n.label.startsWith("Transformed-"))).toBe(
      true
    );
  });

  it("does not modify the original graph (immutability)", () => {
    const original = createTestGraph();
    const originalLabels = original.nodes.map((n) => n.label);

    // Apply transform
    const labelFn = (node: ExportedNode) => `Modified-${node.label}`;
    relabelPorts(original, labelFn);

    // Original should be unchanged
    expect(original.nodes.map((n) => n.label)).toEqual(originalLabels);
  });

  it("returns new object instances", () => {
    const original = createTestGraph();
    const labelFn = (node: ExportedNode) => node.label.toUpperCase();
    const result = relabelPorts(original, labelFn);

    // Should be new object instances
    expect(result).not.toBe(original);
    expect(result.nodes).not.toBe(original.nodes);
  });

  it("returns frozen objects", () => {
    const original = createTestGraph();
    const labelFn = (node: ExportedNode) => node.label;
    const result = relabelPorts(original, labelFn);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.nodes)).toBe(true);
    expect(Object.isFrozen(result.edges)).toBe(true);
  });

  it("edges remain unchanged (reference IDs not labels)", () => {
    const original = createTestGraph();
    const originalEdges = [...original.edges];

    // Apply transform that modifies labels
    const labelFn = (node: ExportedNode) => `New-${node.label}`;
    const result = relabelPorts(original, labelFn);

    // Edges should be identical (they use IDs, not labels)
    expect(result.edges).toEqual(originalEdges);
  });
});

// =============================================================================
// relabelPorts Transform Scenarios
// =============================================================================

describe("relabelPorts transform scenarios", () => {
  it("can strip common prefixes from labels", () => {
    const graph: ExportedGraph = {
      nodes: [
        {
          id: "App.Services.Logger",
          label: "App.Services.Logger",
          lifetime: "singleton",
        },
        {
          id: "App.Services.Database",
          label: "App.Services.Database",
          lifetime: "singleton",
        },
        {
          id: "App.Services.UserService",
          label: "App.Services.UserService",
          lifetime: "scoped",
        },
      ],
      edges: [
        { from: "App.Services.Database", to: "App.Services.Logger" },
        { from: "App.Services.UserService", to: "App.Services.Database" },
      ],
    };

    const labelFn = (node: ExportedNode) =>
      node.label.replace("App.Services.", "");
    const result = relabelPorts(graph, labelFn);

    expect(result.nodes.map((n) => n.label)).toEqual([
      "Logger",
      "Database",
      "UserService",
    ]);

    // IDs should still have the prefix
    expect(result.nodes.map((n) => n.id)).toEqual([
      "App.Services.Logger",
      "App.Services.Database",
      "App.Services.UserService",
    ]);
  });

  it("can add emoji indicators based on lifetime", () => {
    const original = createTestGraph();

    const labelFn = (node: ExportedNode) => {
      const emoji =
        node.lifetime === "singleton"
          ? "S"
          : node.lifetime === "scoped"
            ? "C"
            : "R";
      return `[${emoji}] ${node.label}`;
    };
    const result = relabelPorts(original, labelFn);

    expect(result.nodes.find((n) => n.id === "Config")?.label).toBe(
      "[S] Config"
    );
    expect(result.nodes.find((n) => n.id === "UserService")?.label).toBe(
      "[C] UserService"
    );
    expect(result.nodes.find((n) => n.id === "RequestHandler")?.label).toBe(
      "[R] RequestHandler"
    );
  });

  it("preserves node lifetimes", () => {
    const original = createTestGraph();

    const labelFn = (node: ExportedNode) => `Modified-${node.label}`;
    const result = relabelPorts(original, labelFn);

    // Lifetimes should be preserved
    original.nodes.forEach((originalNode) => {
      const resultNode = result.nodes.find((n) => n.id === originalNode.id);
      expect(resultNode?.lifetime).toBe(originalNode.lifetime);
    });
  });

  it("handles empty graph", () => {
    const graph: ExportedGraph = {
      nodes: [],
      edges: [],
    };

    const labelFn = (node: ExportedNode) => `Modified-${node.label}`;
    const result = relabelPorts(graph, labelFn);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
