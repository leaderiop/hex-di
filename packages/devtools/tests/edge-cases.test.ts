/**
 * Edge case tests for @hex-di/devtools package.
 *
 * These tests verify:
 * 1. Empty graph handling
 * 2. Graph with circular dependencies (if possible)
 * 3. Very large graphs (performance)
 * 4. Special characters in port names
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter, type Adapter, type Lifetime } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";
import {
  toJSON,
  toDOT,
  toMermaid,
  filterGraph,
  relabelPorts,
  byLifetime,
} from "../src/index.js";

// =============================================================================
// Empty Graph Tests
// =============================================================================

describe("Edge case: Empty graph handling", () => {
  it("toJSON returns empty arrays for empty graph", () => {
    const emptyGraph = GraphBuilder.create().build();
    const result = toJSON(emptyGraph);

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("toDOT produces valid DOT for empty graph", () => {
    const emptyGraph = GraphBuilder.create().build();
    const dot = toDOT(emptyGraph);

    expect(dot).toContain("digraph DependencyGraph");
    expect(dot).toContain("rankdir=TB");
    expect(dot).toContain("node [shape=box]");
    expect(dot).toMatch(/\}$/);
    // Should not contain any node or edge definitions
    expect(dot).not.toMatch(/\[label=/);
    expect(dot).not.toContain("->");
  });

  it("toMermaid produces valid Mermaid for empty graph", () => {
    const emptyGraph = GraphBuilder.create().build();
    const mermaid = toMermaid(emptyGraph);

    expect(mermaid).toBe("graph TD");
  });

  it("filterGraph returns empty graph when filtering empty graph", () => {
    const emptyGraph = GraphBuilder.create().build();
    const exported = toJSON(emptyGraph);
    const filtered = filterGraph(exported, () => true);

    expect(filtered.nodes).toHaveLength(0);
    expect(filtered.edges).toHaveLength(0);
  });

  it("relabelPorts returns empty graph when relabeling empty graph", () => {
    const emptyGraph = GraphBuilder.create().build();
    const exported = toJSON(emptyGraph);
    const relabeled = relabelPorts(exported, (n) => n.label.toUpperCase());

    expect(relabeled.nodes).toHaveLength(0);
    expect(relabeled.edges).toHaveLength(0);
  });
});

// =============================================================================
// Large Graph Performance Tests
// =============================================================================

describe("Edge case: Large graphs", () => {
  it("handles graph with many nodes (50 nodes)", () => {
    // Create adapters for 50 services
    const adapters: Adapter<Port<unknown, string>, never, Lifetime>[] = [];

    for (let i = 0; i < 50; i++) {
      interface Service {
        run(): void;
      }
      const port = createPort<`Service${number}`, Service>(`Service${i}`);
      const adapter = createAdapter({
        provides: port,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ run: () => {} }),
      });
      adapters.push(adapter);
    }

    // Build graph by chaining provides
    // Dynamic adapter accumulation for stress test - type changes on each provide()
    let builder: GraphBuilder<Port<unknown, string>, never> = GraphBuilder.create();
    for (const adapter of adapters) {
      // @ts-expect-error Stress test with dynamic adapter array - TypeScript can't track type accumulation
      builder = builder.provide(adapter);
    }
    const graph = builder.build();

    // Measure performance
    const start = performance.now();
    const exported = toJSON(graph);
    const dot = toDOT(exported);
    const mermaid = toMermaid(exported);
    const end = performance.now();

    // Should complete in reasonable time (< 100ms)
    expect(end - start).toBeLessThan(100);

    // Verify output
    expect(exported.nodes).toHaveLength(50);
    expect(dot).toContain("Service0");
    expect(dot).toContain("Service49");
    expect(mermaid).toContain("Service0");
    expect(mermaid).toContain("Service49");
  });

  it("handles filtering on large graph efficiently", () => {
    const adapters: Adapter<Port<unknown, string>, never, Lifetime>[] = [];

    for (let i = 0; i < 30; i++) {
      interface Service {
        run(): void;
      }
      const port = createPort<`Service${number}`, Service>(`Service${i}`);
      const lifetime: Lifetime = i % 3 === 0 ? "singleton" : i % 3 === 1 ? "scoped" : "request";
      const adapter = createAdapter({
        provides: port,
        requires: [],
        lifetime,
        factory: () => ({ run: () => {} }),
      });
      adapters.push(adapter);
    }

    // Dynamic adapter accumulation for stress test - type changes on each provide()
    let builder: GraphBuilder<Port<unknown, string>, never> = GraphBuilder.create();
    for (const adapter of adapters) {
      // @ts-expect-error Stress test with dynamic adapter array - TypeScript can't track type accumulation
      builder = builder.provide(adapter);
    }
    const graph = builder.build();

    const exported = toJSON(graph);

    const start = performance.now();
    const singletons = filterGraph(exported, byLifetime("singleton"));
    const end = performance.now();

    // Should complete quickly
    expect(end - start).toBeLessThan(50);

    // Every 3rd service (0, 3, 6, ..., 27) is singleton = 10 services
    expect(singletons.nodes).toHaveLength(10);
  });
});

// =============================================================================
// Special Characters in Port Names Tests
// =============================================================================

describe("Edge case: Special characters in port names", () => {
  it("handles port names with underscores", () => {
    interface Service {
      run(): void;
    }
    const port = createPort<"user_service", Service>("user_service");
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const exported = toJSON(graph);
    const dot = toDOT(graph);
    const mermaid = toMermaid(graph);

    expect(exported.nodes[0]?.id).toBe("user_service");
    expect(dot).toContain("user_service");
    expect(mermaid).toContain("user_service");
  });

  it("handles port names with numbers", () => {
    interface Service {
      run(): void;
    }
    const port = createPort<"Service123", Service>("Service123");
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ run: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const exported = toJSON(graph);
    const dot = toDOT(graph);
    const mermaid = toMermaid(graph);

    expect(exported.nodes[0]?.id).toBe("Service123");
    expect(dot).toContain("Service123");
    expect(mermaid).toContain("Service123");
  });

  it("handles port names with dots (namespaced)", () => {
    interface Service {
      run(): void;
    }
    const port = createPort<"App.Services.UserService", Service>("App.Services.UserService");
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "request",
      factory: () => ({ run: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const exported = toJSON(graph);
    const dot = toDOT(graph);
    const mermaid = toMermaid(graph);

    expect(exported.nodes[0]?.id).toBe("App.Services.UserService");
    // DOT should escape special chars in quotes
    expect(dot).toContain("App.Services.UserService");
    // Mermaid IDs are sanitized
    expect(mermaid).toContain("AppServicesUserService");
  });

  it("DOT escapes double quotes in labels", () => {
    interface Service {
      run(): void;
    }
    const port = createPort<"My\"Service", Service>('My"Service');
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const dot = toDOT(graph);

    // DOT should escape the double quote
    expect(dot).toContain('\\"');
  });

  it("Mermaid escapes brackets in labels", () => {
    interface Service {
      run(): void;
    }
    const port = createPort<"Service[Beta]", Service>("Service[Beta]");
    const adapter = createAdapter({
      provides: port,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ run: () => {} }),
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const mermaid = toMermaid(graph);

    // Mermaid should escape brackets with HTML entities
    expect(mermaid).toContain("#91;");
    expect(mermaid).toContain("#93;");
  });
});

// =============================================================================
// Graph with No Dependencies Tests
// =============================================================================

describe("Edge case: Graph with nodes but no dependencies", () => {
  it("handles multiple independent services", () => {
    interface Logger {
      log(): void;
    }
    interface Config {
      get(): string;
    }
    interface Cache {
      get(): unknown;
    }

    const LoggerPort = createPort<"Logger", Logger>("Logger");
    const ConfigPort = createPort<"Config", Config>("Config");
    const CachePort = createPort<"Cache", Cache>("Cache");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: ConfigPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ get: () => "" }),
        })
      )
      .provide(
        createAdapter({
          provides: CachePort,
          requires: [],
          lifetime: "scoped",
          factory: () => ({ get: () => null }),
        })
      )
      .build();

    const exported = toJSON(graph);

    expect(exported.nodes).toHaveLength(3);
    expect(exported.edges).toHaveLength(0);

    const dot = toDOT(graph);
    expect(dot).not.toContain("->");

    const mermaid = toMermaid(graph);
    expect(mermaid).not.toContain("-->");
  });
});

// =============================================================================
// Filter Resulting in No Nodes Tests
// =============================================================================

describe("Edge case: Filtering results in no nodes", () => {
  it("filterGraph returns empty when no nodes match predicate", () => {
    interface Logger {
      log(): void;
    }

    const LoggerPort = createPort<"Logger", Logger>("Logger");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .build();

    const exported = toJSON(graph);
    // Filter for scoped, but we only have singleton
    const filtered = filterGraph(exported, byLifetime("scoped"));

    expect(filtered.nodes).toHaveLength(0);
    expect(filtered.edges).toHaveLength(0);
  });

  it("exporting filtered empty result produces valid output", () => {
    interface Logger {
      log(): void;
    }

    const LoggerPort = createPort<"Logger", Logger>("Logger");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .build();

    const exported = toJSON(graph);
    const filtered = filterGraph(exported, () => false);

    const dot = toDOT(filtered);
    const mermaid = toMermaid(filtered);

    expect(dot).toContain("digraph DependencyGraph");
    expect(mermaid).toBe("graph TD");
  });
});

// =============================================================================
// Edge Cleanup Tests
// =============================================================================

describe("Edge case: Edge cleanup when filtering", () => {
  it("removes edges when source node is filtered out", () => {
    interface Logger {
      log(): void;
    }
    interface UserService {
      getUser(): unknown;
    }

    const LoggerPort = createPort<"Logger", Logger>("Logger");
    const UserServicePort = createPort<"UserService", UserService>("UserService");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: UserServicePort,
          requires: [LoggerPort],
          lifetime: "request",
          factory: () => ({ getUser: () => ({}) }),
        })
      )
      .build();

    const exported = toJSON(graph);
    expect(exported.edges).toHaveLength(1);

    // Filter out UserService (the source of the edge)
    const filtered = filterGraph(exported, (n) => n.id === "Logger");

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.edges).toHaveLength(0);
  });

  it("removes edges when target node is filtered out", () => {
    interface Logger {
      log(): void;
    }
    interface UserService {
      getUser(): unknown;
    }

    const LoggerPort = createPort<"Logger", Logger>("Logger");
    const UserServicePort = createPort<"UserService", UserService>("UserService");

    const graph = GraphBuilder.create()
      .provide(
        createAdapter({
          provides: LoggerPort,
          requires: [],
          lifetime: "singleton",
          factory: () => ({ log: () => {} }),
        })
      )
      .provide(
        createAdapter({
          provides: UserServicePort,
          requires: [LoggerPort],
          lifetime: "request",
          factory: () => ({ getUser: () => ({}) }),
        })
      )
      .build();

    const exported = toJSON(graph);

    // Filter out Logger (the target of the edge)
    const filtered = filterGraph(exported, (n) => n.id === "UserService");

    expect(filtered.nodes).toHaveLength(1);
    expect(filtered.edges).toHaveLength(0);
  });
});
