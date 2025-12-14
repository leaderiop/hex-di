/**
 * Node label transformation utilities for dependency graph visualization.
 *
 * Provides functions to transform node labels in exported graphs while
 * preserving node IDs for edge reference integrity. All functions are
 * pure and return new immutable objects.
 *
 * @packageDocumentation
 */

import type { ExportedGraph, ExportedNode, LabelTransform } from "./types.js";

// =============================================================================
// relabelPorts Implementation
// =============================================================================

/**
 * Transforms node labels in an exported graph using a custom function.
 *
 * This function creates a new ExportedGraph with transformed node labels
 * while preserving node IDs. This is important because edges reference
 * nodes by ID, not by label, so changing labels doesn't break edge references.
 *
 * **Immutability:**
 * - Returns a new frozen ExportedGraph instance
 * - The original graph is never modified
 * - Safe for caching and memoization
 *
 * **ID Preservation:**
 * - Node IDs are preserved exactly as-is
 * - Only the `label` property is transformed
 * - Edges continue to work correctly since they use IDs
 *
 * **Use Cases:**
 * - Add lifetime indicators to labels for visualization
 * - Strip common prefixes for cleaner display
 * - Add emoji or icons based on node properties
 * - Localize labels for different audiences
 *
 * @param exportedGraph - The graph to transform (from toJSON)
 * @param labelFn - Function that takes a node and returns the new label
 * @returns A new frozen ExportedGraph with transformed labels
 *
 * @example Add lifetime suffix to labels
 * ```typescript
 * import { toJSON, relabelPorts, toDOT } from '@hex-di/devtools';
 *
 * const relabeled = relabelPorts(toJSON(appGraph), (node) =>
 *   `${node.label} [${node.lifetime}]`
 * );
 * const dot = toDOT(relabeled);
 * ```
 *
 * @example Strip common prefix from labels
 * ```typescript
 * const cleaned = relabelPorts(exported, (node) =>
 *   node.label.replace('App.Services.', '')
 * );
 * ```
 *
 * @example Add visual indicators based on lifetime
 * ```typescript
 * const withIndicators = relabelPorts(exported, (node) => {
 *   const indicator = {
 *     singleton: '[S]',
 *     scoped: '[C]',
 *     request: '[R]'
 *   }[node.lifetime];
 *   return `${indicator} ${node.label}`;
 * });
 * ```
 *
 * @example Chain with filterGraph
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, relabelPorts, toMermaid } from '@hex-di/devtools';
 *
 * // Filter to singletons, add lifetime to label, then export to Mermaid
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const relabeled = relabelPorts(singletons, (n) => `${n.label} (${n.lifetime})`);
 * const mermaid = toMermaid(relabeled);
 * ```
 */
export function relabelPorts(
  exportedGraph: ExportedGraph,
  labelFn: LabelTransform
): ExportedGraph {
  // Transform nodes, preserving id and lifetime, only changing label
  const nodes = exportedGraph.nodes.map(
    (node): ExportedNode => ({
      id: node.id,
      label: labelFn(node),
      lifetime: node.lifetime,
    })
  );

  // Return frozen immutable structure
  // Edges remain unchanged as they reference IDs, not labels
  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze([...exportedGraph.edges]),
  });
}
