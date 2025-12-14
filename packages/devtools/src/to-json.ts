/**
 * JSON export function for dependency graphs.
 *
 * Converts a Graph to a JSON-serializable ExportedGraph format
 * containing nodes (ports) and edges (dependencies).
 *
 * @packageDocumentation
 */

import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";
import type { ExportedGraph, ExportedNode, ExportedEdge } from "./types.js";

// =============================================================================
// toJSON Implementation
// =============================================================================

/**
 * Converts a dependency graph to a JSON-serializable ExportedGraph format.
 *
 * This function extracts nodes (port/adapter registrations) and edges
 * (dependency relationships) from a Graph object, producing a deterministic
 * output suitable for serialization, visualization, or further transformation.
 *
 * **Node Extraction:**
 * - Each adapter in the graph becomes a node
 * - Node `id` and `label` are set to the port name (from `adapter.provides.__portName`)
 * - Node `lifetime` is extracted from `adapter.lifetime`
 *
 * **Edge Extraction:**
 * - For each adapter, its dependencies (`adapter.requires`) become edges
 * - Edge `from` is the dependent port name (the adapter's provides port)
 * - Edge `to` is the required port name (from the requires array)
 * - Edge direction represents: "from depends on to"
 *
 * **Deterministic Output:**
 * - Nodes are sorted alphabetically by id (port name)
 * - Edges are sorted by `from`, then by `to`
 * - This ensures consistent output across runs for snapshot testing
 *
 * **Immutability:**
 * - The returned ExportedGraph and its arrays are frozen
 * - This enforces immutability for safe sharing and caching
 *
 * @param graph - The dependency graph to convert
 * @returns A frozen ExportedGraph with sorted nodes and edges
 *
 * @example Basic usage
 * ```typescript
 * import { toJSON } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const exported = toJSON(appGraph);
 * console.log(exported);
 * // {
 * //   nodes: [
 * //     { id: 'Database', label: 'Database', lifetime: 'singleton' },
 * //     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 * //     { id: 'UserService', label: 'UserService', lifetime: 'scoped' }
 * //   ],
 * //   edges: [
 * //     { from: 'UserService', to: 'Database' },
 * //     { from: 'UserService', to: 'Logger' }
 * //   ]
 * // }
 * ```
 *
 * @example JSON serialization
 * ```typescript
 * const exported = toJSON(appGraph);
 * const json = JSON.stringify(exported, null, 2);
 * // Write to file or send over network
 * ```
 *
 * @example Chaining with transform utilities
 * ```typescript
 * import { toJSON, filterGraph, byLifetime } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * ```
 */
export function toJSON(graph: Graph<Port<unknown, string> | never>): ExportedGraph {
  const adapters = graph.adapters;

  // Extract nodes from adapters
  const nodes: ExportedNode[] = adapters.map((adapter) => ({
    id: adapter.provides.__portName,
    label: adapter.provides.__portName,
    lifetime: adapter.lifetime,
  }));

  // Extract edges from adapter dependencies
  const edges: ExportedEdge[] = [];
  for (const adapter of adapters) {
    const fromPortName = adapter.provides.__portName;
    for (const required of adapter.requires) {
      edges.push({
        from: fromPortName,
        to: required.__portName,
      });
    }
  }

  // Sort nodes alphabetically by id for determinism
  nodes.sort((a, b) => a.id.localeCompare(b.id));

  // Sort edges by from, then by to for determinism
  edges.sort((a, b) => {
    const fromComparison = a.from.localeCompare(b.from);
    if (fromComparison !== 0) {
      return fromComparison;
    }
    return a.to.localeCompare(b.to);
  });

  // Return frozen immutable structure
  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  });
}
