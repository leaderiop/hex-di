/**
 * Graph snapshot serialization for testing.
 *
 * Provides utilities to convert dependency graphs to JSON-serializable
 * format for snapshot testing with Vitest or other test frameworks.
 *
 * @packageDocumentation
 */

import type { Graph, Lifetime } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";

// =============================================================================
// Types
// =============================================================================

/**
 * A JSON-serializable representation of an adapter in a graph snapshot.
 *
 * Contains only the metadata needed for snapshot comparison:
 * - Port name (string)
 * - Lifetime scope
 * - Array of required port names
 *
 * Excludes non-serializable properties like factory functions and finalizers.
 *
 * @example
 * ```typescript
 * const adapterSnapshot: AdapterSnapshot = {
 *   port: "UserService",
 *   lifetime: "scoped",
 *   requires: ["Logger", "Database"]
 * };
 * ```
 */
export interface AdapterSnapshot {
  /**
   * The name of the port this adapter provides.
   */
  readonly port: string;

  /**
   * The lifetime scope for this adapter's service instances.
   */
  readonly lifetime: Lifetime;

  /**
   * Array of port names that this adapter depends on.
   * Empty array if the adapter has no dependencies.
   * Sorted alphabetically for stable snapshot comparison.
   */
  readonly requires: readonly string[];
}

/**
 * A JSON-serializable representation of a complete dependency graph.
 *
 * Contains an array of adapter snapshots, sorted alphabetically by port name
 * for stable/deterministic snapshot comparison.
 *
 * @example Snapshot testing with Vitest
 * ```typescript
 * import { serializeGraph } from '@hex-di/testing';
 *
 * test('graph structure', () => {
 *   const snapshot = serializeGraph(productionGraph);
 *   expect(snapshot).toMatchSnapshot();
 * });
 * ```
 *
 * @example Manual inspection
 * ```typescript
 * const snapshot = serializeGraph(graph);
 * // {
 * //   adapters: [
 * //     { port: "Config", lifetime: "singleton", requires: [] },
 * //     { port: "Database", lifetime: "singleton", requires: ["Config", "Logger"] },
 * //     { port: "Logger", lifetime: "singleton", requires: [] }
 * //   ]
 * // }
 * ```
 */
export interface GraphSnapshot {
  /**
   * Array of adapter snapshots, sorted alphabetically by port name.
   * Use `{ preserveOrder: true }` option to maintain registration order instead.
   */
  readonly adapters: readonly AdapterSnapshot[];
}

/**
 * Options for serializeGraph function.
 */
export interface SerializeGraphOptions {
  /**
   * If true, preserves the original registration order of adapters.
   * If false (default), adapters are sorted alphabetically by port name
   * for stable/deterministic snapshot comparison.
   *
   * @default false
   */
  readonly preserveOrder?: boolean;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Serializes a dependency graph to a JSON-serializable snapshot format.
 *
 * This function extracts the essential metadata from a graph (port names,
 * lifetimes, and dependencies) and produces a deterministic output suitable
 * for snapshot testing with Vitest's `toMatchSnapshot()`.
 *
 * **What's included:**
 * - Adapter port names (from `adapter.provides.__portName`)
 * - Adapter lifetimes (`singleton`, `scoped`, `request`)
 * - Dependency relationships (array of required port names)
 *
 * **What's excluded:**
 * - Factory functions (non-serializable)
 * - Finalizer functions (non-serializable)
 * - Service instances (non-serializable, not part of graph structure)
 *
 * **Ordering:**
 * By default, adapters are sorted alphabetically by port name for stable
 * snapshot comparison across test runs. Use `{ preserveOrder: true }` to
 * maintain the original registration order.
 *
 * @param graph - The dependency graph to serialize
 * @param options - Optional configuration for serialization
 * @param options.preserveOrder - If true, maintains registration order instead of sorting
 *
 * @returns A JSON-serializable snapshot of the graph structure
 *
 * @example Basic usage with snapshot testing
 * ```typescript
 * import { serializeGraph } from '@hex-di/testing';
 * import { productionGraph } from '../src/graph';
 *
 * test('dependency graph structure', () => {
 *   const snapshot = serializeGraph(productionGraph);
 *   expect(snapshot).toMatchSnapshot();
 * });
 * ```
 *
 * @example Manual assertion
 * ```typescript
 * const snapshot = serializeGraph(graph);
 *
 * expect(snapshot.adapters).toContainEqual({
 *   port: "UserService",
 *   lifetime: "scoped",
 *   requires: ["Database", "Logger"]
 * });
 * ```
 *
 * @example Preserving registration order
 * ```typescript
 * // When registration order matters for debugging
 * const snapshot = serializeGraph(graph, { preserveOrder: true });
 *
 * // Adapters appear in the order they were registered
 * expect(snapshot.adapters[0].port).toBe("Logger");
 * ```
 */
export function serializeGraph(
  graph: Graph<Port<unknown, string> | never>,
  options?: SerializeGraphOptions
): GraphSnapshot {
  const preserveOrder = options?.preserveOrder ?? false;

  // Map adapters to serializable format
  const adapterSnapshots: AdapterSnapshot[] = graph.adapters.map((adapter) => {
    // Extract port name from the provides property
    const portName = adapter.provides.__portName;

    // Extract required port names and sort them alphabetically
    const requires = adapter.requires.map((port) => port.__portName).sort();

    return {
      port: portName,
      lifetime: adapter.lifetime,
      requires,
    };
  });

  // Sort by port name unless preserveOrder is true
  if (!preserveOrder) {
    adapterSnapshots.sort((a, b) => a.port.localeCompare(b.port));
  }

  return {
    adapters: adapterSnapshots,
  };
}
