/**
 * Type-level tests for @hex-di/devtools package.
 *
 * These tests verify:
 * 1. toJSON return type is ExportedGraph
 * 2. toDOT return type is string
 * 3. toMermaid return type is string
 * 4. filterGraph type inference
 * 5. relabelPorts type inference
 * 6. DevToolsPanel prop types
 * 7. DevToolsFloating prop types
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, type Port } from "@hex-di/ports";
import { GraphBuilder, createAdapter, type Graph, type Lifetime } from "@hex-di/graph";
import type { Container } from "@hex-di/runtime";
import type { ReactElement } from "react";

// Import devtools exports
import {
  toJSON,
  toDOT,
  toMermaid,
  filterGraph,
  relabelPorts,
  byLifetime,
  byPortName,
} from "../src/index.js";

import type {
  ExportedGraph,
  ExportedNode,
  ExportedEdge,
  DOTOptions,
  MermaidOptions,
  NodePredicate,
  LabelTransform,
} from "../src/types.js";

// Import React components
import {
  DevToolsPanel,
  DevToolsFloating,
} from "../src/react/index.js";

import type {
  DevToolsPanelProps,
  DevToolsFloatingProps,
  DevToolsPosition,
} from "../src/react/index.js";

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

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// Test Adapters
// =============================================================================

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
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: () => ({
    query: async () => ({}),
  }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "request",
  factory: () => ({
    getUser: async () => ({ id: "1", name: "Test" }),
  }),
});

// =============================================================================
// Test Graph
// =============================================================================

const testGraph = GraphBuilder.create()
  .provide(LoggerAdapter)
  .provide(DatabaseAdapter)
  .provide(UserServiceAdapter)
  .build();

// =============================================================================
// toJSON Type Tests
// =============================================================================

describe("toJSON type inference", () => {
  it("returns ExportedGraph type", () => {
    const result = toJSON(testGraph);

    expectTypeOf(result).toMatchTypeOf<ExportedGraph>();
    expectTypeOf(result.nodes).toMatchTypeOf<readonly ExportedNode[]>();
    expectTypeOf(result.edges).toMatchTypeOf<readonly ExportedEdge[]>();
  });

  it("accepts Graph with Port type parameter", () => {
    // Should accept any Graph<Port>
    type ToJSONParam = Parameters<typeof toJSON>[0];
    expectTypeOf<Graph<Port<unknown, string>>>().toMatchTypeOf<ToJSONParam>();
  });

  it("ExportedGraph has correct node structure", () => {
    const result = toJSON(testGraph);
    const node = result.nodes[0];

    if (node) {
      expectTypeOf(node.id).toBeString();
      expectTypeOf(node.label).toBeString();
      expectTypeOf(node.lifetime).toMatchTypeOf<Lifetime>();
    }
  });

  it("ExportedGraph has correct edge structure", () => {
    const result = toJSON(testGraph);
    const edge = result.edges[0];

    if (edge) {
      expectTypeOf(edge.from).toBeString();
      expectTypeOf(edge.to).toBeString();
    }
  });
});

// =============================================================================
// toDOT Type Tests
// =============================================================================

describe("toDOT type inference", () => {
  it("returns string type", () => {
    const result = toDOT(testGraph);

    expectTypeOf(result).toBeString();
  });

  it("accepts Graph as first parameter", () => {
    // Should accept Graph
    const result = toDOT(testGraph);
    expectTypeOf(result).toBeString();
  });

  it("accepts ExportedGraph as first parameter", () => {
    const exported = toJSON(testGraph);
    const result = toDOT(exported);

    expectTypeOf(result).toBeString();
  });

  it("accepts optional DOTOptions", () => {
    const options: DOTOptions = { direction: "LR", preset: "styled" };
    const result = toDOT(testGraph, options);

    expectTypeOf(result).toBeString();
  });

  it("DOTOptions has correct property types", () => {
    expectTypeOf<DOTOptions["direction"]>().toEqualTypeOf<"TB" | "LR" | undefined>();
    expectTypeOf<DOTOptions["preset"]>().toEqualTypeOf<"minimal" | "styled" | undefined>();
  });
});

// =============================================================================
// toMermaid Type Tests
// =============================================================================

describe("toMermaid type inference", () => {
  it("returns string type", () => {
    const result = toMermaid(testGraph);

    expectTypeOf(result).toBeString();
  });

  it("accepts Graph as first parameter", () => {
    const result = toMermaid(testGraph);
    expectTypeOf(result).toBeString();
  });

  it("accepts ExportedGraph as first parameter", () => {
    const exported = toJSON(testGraph);
    const result = toMermaid(exported);

    expectTypeOf(result).toBeString();
  });

  it("accepts optional MermaidOptions", () => {
    const options: MermaidOptions = { direction: "LR" };
    const result = toMermaid(testGraph, options);

    expectTypeOf(result).toBeString();
  });

  it("MermaidOptions has correct property types", () => {
    expectTypeOf<MermaidOptions["direction"]>().toEqualTypeOf<"TD" | "LR" | undefined>();
  });
});

// =============================================================================
// filterGraph Type Tests
// =============================================================================

describe("filterGraph type inference", () => {
  it("returns ExportedGraph type", () => {
    const exported = toJSON(testGraph);
    const result = filterGraph(exported, () => true);

    expectTypeOf(result).toMatchTypeOf<ExportedGraph>();
  });

  it("accepts NodePredicate as second parameter", () => {
    const exported = toJSON(testGraph);
    const predicate: NodePredicate = (node) => node.lifetime === "singleton";

    const result = filterGraph(exported, predicate);
    expectTypeOf(result).toMatchTypeOf<ExportedGraph>();
  });

  it("predicate receives ExportedNode and returns boolean", () => {
    expectTypeOf<NodePredicate>().toEqualTypeOf<(node: ExportedNode) => boolean>();
  });

  it("byLifetime returns NodePredicate", () => {
    const predicate = byLifetime("singleton");

    expectTypeOf(predicate).toMatchTypeOf<NodePredicate>();
    expectTypeOf(predicate).toBeFunction();
    expectTypeOf(predicate).returns.toBeBoolean();
  });

  it("byLifetime accepts Lifetime parameter", () => {
    type ByLifetimeParam = Parameters<typeof byLifetime>[0];
    expectTypeOf<ByLifetimeParam>().toEqualTypeOf<Lifetime>();
  });

  it("byPortName returns NodePredicate", () => {
    const predicate = byPortName(/Service$/);

    expectTypeOf(predicate).toMatchTypeOf<NodePredicate>();
  });

  it("byPortName accepts RegExp parameter", () => {
    type ByPortNameParam = Parameters<typeof byPortName>[0];
    expectTypeOf<ByPortNameParam>().toEqualTypeOf<RegExp>();
  });
});

// =============================================================================
// relabelPorts Type Tests
// =============================================================================

describe("relabelPorts type inference", () => {
  it("returns ExportedGraph type", () => {
    const exported = toJSON(testGraph);
    const result = relabelPorts(exported, (node) => node.label);

    expectTypeOf(result).toMatchTypeOf<ExportedGraph>();
  });

  it("accepts LabelTransform as second parameter", () => {
    const exported = toJSON(testGraph);
    const transform: LabelTransform = (node) => `${node.label} (${node.lifetime})`;

    const result = relabelPorts(exported, transform);
    expectTypeOf(result).toMatchTypeOf<ExportedGraph>();
  });

  it("transform receives ExportedNode and returns string", () => {
    expectTypeOf<LabelTransform>().toEqualTypeOf<(node: ExportedNode) => string>();
  });

  it("transform can access all ExportedNode properties", () => {
    const exported = toJSON(testGraph);

    // Should compile - transform can access id, label, and lifetime
    relabelPorts(exported, (node) => {
      const id: string = node.id;
      const label: string = node.label;
      const lifetime: Lifetime = node.lifetime;
      return `${id}: ${label} [${lifetime}]`;
    });
  });
});

// =============================================================================
// DevToolsPanel Type Tests
// =============================================================================

describe("DevToolsPanel prop types", () => {
  it("DevToolsPanelProps has graph property", () => {
    expectTypeOf<DevToolsPanelProps>().toHaveProperty("graph");
    expectTypeOf<DevToolsPanelProps["graph"]>().toMatchTypeOf<Graph<Port<unknown, string>>>();
  });

  it("DevToolsPanelProps has optional container property", () => {
    expectTypeOf<DevToolsPanelProps>().toHaveProperty("container");
    expectTypeOf<DevToolsPanelProps["container"]>().toMatchTypeOf<Container<Port<unknown, string>> | undefined>();
  });

  it("DevToolsPanel is a function component", () => {
    expectTypeOf(DevToolsPanel).toBeFunction();
    expectTypeOf(DevToolsPanel).parameter(0).toMatchTypeOf<DevToolsPanelProps>();
  });

  it("DevToolsPanel props are readonly", () => {
    // Verify readonly modifier on props
    type GraphProp = DevToolsPanelProps["graph"];
    type ContainerProp = DevToolsPanelProps["container"];

    expectTypeOf<GraphProp>().not.toBeNever();
    expectTypeOf<ContainerProp>().not.toBeNever();
  });
});

// =============================================================================
// DevToolsFloating Type Tests
// =============================================================================

describe("DevToolsFloating prop types", () => {
  it("DevToolsFloatingProps has graph property", () => {
    expectTypeOf<DevToolsFloatingProps>().toHaveProperty("graph");
    expectTypeOf<DevToolsFloatingProps["graph"]>().toMatchTypeOf<Graph<Port<unknown, string>>>();
  });

  it("DevToolsFloatingProps has optional container property", () => {
    expectTypeOf<DevToolsFloatingProps>().toHaveProperty("container");
    expectTypeOf<DevToolsFloatingProps["container"]>().toMatchTypeOf<Container<Port<unknown, string>> | undefined>();
  });

  it("DevToolsFloatingProps has optional position property", () => {
    expectTypeOf<DevToolsFloatingProps>().toHaveProperty("position");
    expectTypeOf<DevToolsFloatingProps["position"]>().toEqualTypeOf<DevToolsPosition | undefined>();
  });

  it("DevToolsPosition has all corner values", () => {
    expectTypeOf<DevToolsPosition>().toEqualTypeOf<"bottom-right" | "bottom-left" | "top-right" | "top-left">();
  });

  it("DevToolsFloating is a function component", () => {
    expectTypeOf(DevToolsFloating).toBeFunction();
    expectTypeOf(DevToolsFloating).parameter(0).toMatchTypeOf<DevToolsFloatingProps>();
  });

  it("DevToolsFloating returns ReactElement or null", () => {
    // The component can return null in production mode
    type FloatingReturnType = globalThis.ReturnType<typeof DevToolsFloating>;
    expectTypeOf<FloatingReturnType>().toMatchTypeOf<ReactElement | null>();
  });
});

// =============================================================================
// Type Integration Tests
// =============================================================================

describe("type integration flow", () => {
  it("toJSON output can be passed to filterGraph", () => {
    const exported = toJSON(testGraph);
    const filtered = filterGraph(exported, byLifetime("singleton"));

    expectTypeOf(filtered).toMatchTypeOf<ExportedGraph>();
  });

  it("filterGraph output can be passed to relabelPorts", () => {
    const exported = toJSON(testGraph);
    const filtered = filterGraph(exported, byLifetime("singleton"));
    const relabeled = relabelPorts(filtered, (n) => n.label.toUpperCase());

    expectTypeOf(relabeled).toMatchTypeOf<ExportedGraph>();
  });

  it("relabelPorts output can be passed to toDOT", () => {
    const exported = toJSON(testGraph);
    const relabeled = relabelPorts(exported, (n) => n.label.toUpperCase());
    const dot = toDOT(relabeled);

    expectTypeOf(dot).toBeString();
  });

  it("relabelPorts output can be passed to toMermaid", () => {
    const exported = toJSON(testGraph);
    const relabeled = relabelPorts(exported, (n) => n.label.toUpperCase());
    const mermaid = toMermaid(relabeled);

    expectTypeOf(mermaid).toBeString();
  });

  it("full pipeline maintains correct types", () => {
    // graph -> toJSON -> filterGraph -> relabelPorts -> toDOT
    const step1 = toJSON(testGraph);
    expectTypeOf(step1).toMatchTypeOf<ExportedGraph>();

    const step2 = filterGraph(step1, byLifetime("singleton"));
    expectTypeOf(step2).toMatchTypeOf<ExportedGraph>();

    const step3 = relabelPorts(step2, (n) => `[${n.lifetime}] ${n.label}`);
    expectTypeOf(step3).toMatchTypeOf<ExportedGraph>();

    const step4 = toDOT(step3, { direction: "LR", preset: "styled" });
    expectTypeOf(step4).toBeString();
  });
});
