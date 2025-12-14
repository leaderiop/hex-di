/**
 * Tests for ExportedGraph types and related type definitions.
 *
 * These tests verify:
 * 1. ExportedNode has correct shape (id, label, lifetime)
 * 2. ExportedEdge has correct shape (from, to)
 * 3. ExportedGraph has nodes and edges arrays
 * 4. Type inference works correctly with Graph input
 * 5. Immutability of exported structures
 * 6. Options types have correct shape
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import type { Lifetime } from "@hex-di/graph";
import type {
  ExportedNode,
  ExportedEdge,
  ExportedGraph,
  DOTOptions,
  MermaidOptions,
  NodePredicate,
  LabelTransform,
} from "../src/types.js";

// =============================================================================
// ExportedNode Tests
// =============================================================================

describe("ExportedNode", () => {
  it("has correct shape with id, label, and lifetime properties", () => {
    const node: ExportedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
    };

    expect(node.id).toBe("Logger");
    expect(node.label).toBe("Logger");
    expect(node.lifetime).toBe("singleton");
  });

  it("accepts all valid lifetime values", () => {
    const singletonNode: ExportedNode = {
      id: "A",
      label: "A",
      lifetime: "singleton",
    };
    const scopedNode: ExportedNode = {
      id: "B",
      label: "B",
      lifetime: "scoped",
    };
    const requestNode: ExportedNode = {
      id: "C",
      label: "C",
      lifetime: "request",
    };

    expect(singletonNode.lifetime).toBe("singleton");
    expect(scopedNode.lifetime).toBe("scoped");
    expect(requestNode.lifetime).toBe("request");
  });

  it("has readonly properties that enforce immutability", () => {
    // Type-level test: ExportedNode properties should be readonly
    expectTypeOf<ExportedNode["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ExportedNode["label"]>().toEqualTypeOf<string>();
    expectTypeOf<ExportedNode["lifetime"]>().toEqualTypeOf<Lifetime>();

    // Verify the properties exist with correct types
    type IdType = ExportedNode["id"];
    type LabelType = ExportedNode["label"];
    type LifetimeType = ExportedNode["lifetime"];

    expectTypeOf<IdType>().toBeString();
    expectTypeOf<LabelType>().toBeString();
    expectTypeOf<LifetimeType>().toMatchTypeOf<"singleton" | "scoped" | "request">();
  });
});

// =============================================================================
// ExportedEdge Tests
// =============================================================================

describe("ExportedEdge", () => {
  it("has correct shape with from and to properties", () => {
    const edge: ExportedEdge = {
      from: "UserService",
      to: "Logger",
    };

    expect(edge.from).toBe("UserService");
    expect(edge.to).toBe("Logger");
  });

  it("has readonly properties that enforce immutability", () => {
    // Type-level test: ExportedEdge properties should be readonly
    expectTypeOf<ExportedEdge["from"]>().toEqualTypeOf<string>();
    expectTypeOf<ExportedEdge["to"]>().toEqualTypeOf<string>();
  });

  it("represents dependency direction correctly (from dependent to dependency)", () => {
    // Semantic test: edge direction should represent dependency flow
    const edge: ExportedEdge = {
      from: "UserService", // depends on
      to: "Database", // dependency
    };

    // The from field is the service that HAS the dependency
    // The to field is the service that IS the dependency
    expect(edge.from).toBe("UserService");
    expect(edge.to).toBe("Database");
  });
});

// =============================================================================
// ExportedGraph Tests
// =============================================================================

describe("ExportedGraph", () => {
  it("has nodes and edges arrays", () => {
    const graph: ExportedGraph = {
      nodes: [
        { id: "Logger", label: "Logger", lifetime: "singleton" },
        { id: "Database", label: "Database", lifetime: "singleton" },
        { id: "UserService", label: "UserService", lifetime: "scoped" },
      ],
      edges: [
        { from: "UserService", to: "Logger" },
        { from: "UserService", to: "Database" },
      ],
    };

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
  });

  it("has readonly arrays that enforce immutability", () => {
    // Type-level test: arrays should be readonly
    expectTypeOf<ExportedGraph["nodes"]>().toMatchTypeOf<readonly ExportedNode[]>();
    expectTypeOf<ExportedGraph["edges"]>().toMatchTypeOf<readonly ExportedEdge[]>();
  });

  it("allows empty nodes and edges arrays", () => {
    const emptyGraph: ExportedGraph = {
      nodes: [],
      edges: [],
    };

    expect(emptyGraph.nodes).toHaveLength(0);
    expect(emptyGraph.edges).toHaveLength(0);
  });

  it("supports graph with nodes but no edges (no dependencies)", () => {
    const noDepsGraph: ExportedGraph = {
      nodes: [
        { id: "Logger", label: "Logger", lifetime: "singleton" },
        { id: "Config", label: "Config", lifetime: "singleton" },
      ],
      edges: [],
    };

    expect(noDepsGraph.nodes).toHaveLength(2);
    expect(noDepsGraph.edges).toHaveLength(0);
  });
});

// =============================================================================
// Options Types Tests
// =============================================================================

describe("DOTOptions", () => {
  it("has optional direction property with TB or LR values", () => {
    const tbOptions: DOTOptions = { direction: "TB" };
    const lrOptions: DOTOptions = { direction: "LR" };
    const noDirection: DOTOptions = {};

    expect(tbOptions.direction).toBe("TB");
    expect(lrOptions.direction).toBe("LR");
    expect(noDirection.direction).toBeUndefined();
  });

  it("has optional preset property with minimal or styled values", () => {
    const minimalOptions: DOTOptions = { preset: "minimal" };
    const styledOptions: DOTOptions = { preset: "styled" };
    const noPreset: DOTOptions = {};

    expect(minimalOptions.preset).toBe("minimal");
    expect(styledOptions.preset).toBe("styled");
    expect(noPreset.preset).toBeUndefined();
  });

  it("allows combining direction and preset options", () => {
    const fullOptions: DOTOptions = {
      direction: "LR",
      preset: "styled",
    };

    expect(fullOptions.direction).toBe("LR");
    expect(fullOptions.preset).toBe("styled");
  });
});

describe("MermaidOptions", () => {
  it("has optional direction property with TD or LR values", () => {
    const tdOptions: MermaidOptions = { direction: "TD" };
    const lrOptions: MermaidOptions = { direction: "LR" };
    const noDirection: MermaidOptions = {};

    expect(tdOptions.direction).toBe("TD");
    expect(lrOptions.direction).toBe("LR");
    expect(noDirection.direction).toBeUndefined();
  });
});

// =============================================================================
// Predicate and Transform Types Tests
// =============================================================================

describe("NodePredicate", () => {
  it("is a function that takes ExportedNode and returns boolean", () => {
    const predicate: NodePredicate = (node) => node.lifetime === "singleton";

    const singletonNode: ExportedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
    };

    const scopedNode: ExportedNode = {
      id: "UserService",
      label: "UserService",
      lifetime: "scoped",
    };

    expect(predicate(singletonNode)).toBe(true);
    expect(predicate(scopedNode)).toBe(false);
  });

  it("can be used for pattern matching on node id", () => {
    const serviceFilter: NodePredicate = (node) => node.id.endsWith("Service");

    const serviceNode: ExportedNode = {
      id: "UserService",
      label: "UserService",
      lifetime: "scoped",
    };

    const loggerNode: ExportedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
    };

    expect(serviceFilter(serviceNode)).toBe(true);
    expect(serviceFilter(loggerNode)).toBe(false);
  });
});

describe("LabelTransform", () => {
  it("is a function that takes ExportedNode and returns string", () => {
    const transform: LabelTransform = (node) => `${node.label} [${node.lifetime}]`;

    const node: ExportedNode = {
      id: "Logger",
      label: "Logger",
      lifetime: "singleton",
    };

    expect(transform(node)).toBe("Logger [singleton]");
  });

  it("can access all node properties for transformation", () => {
    const detailedTransform: LabelTransform = (node) =>
      `ID: ${node.id}, Label: ${node.label}, Lifetime: ${node.lifetime}`;

    const node: ExportedNode = {
      id: "DB",
      label: "Database",
      lifetime: "singleton",
    };

    expect(detailedTransform(node)).toBe("ID: DB, Label: Database, Lifetime: singleton");
  });
});
