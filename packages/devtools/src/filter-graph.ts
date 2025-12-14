/**
 * Graph filtering utilities for dependency graph transformation.
 *
 * Provides composable functions to filter exported graphs by various criteria,
 * including lifetime and port name patterns. All functions are pure and return
 * new immutable objects.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/graph";
import type { ExportedGraph, ExportedNode, NodePredicate } from "./types.js";

// =============================================================================
// filterGraph Implementation
// =============================================================================

/**
 * Filters an exported graph to include only nodes matching the predicate.
 *
 * This function creates a new ExportedGraph containing only the nodes that
 * pass the predicate test. Edges are automatically cleaned up to remove
 * any edges that reference filtered-out nodes.
 *
 * **Immutability:**
 * - Returns a new frozen ExportedGraph instance
 * - The original graph is never modified
 * - Safe for caching and memoization
 *
 * **Edge Cleanup:**
 * - Edges are included only if both `from` and `to` nodes exist in the result
 * - This prevents dangling edge references
 *
 * @param exportedGraph - The graph to filter (from toJSON)
 * @param predicate - Function that returns true for nodes to include
 * @returns A new frozen ExportedGraph with filtered nodes and cleaned edges
 *
 * @example Filter by lifetime
 * ```typescript
 * import { toJSON, filterGraph, byLifetime } from '@hex-di/devtools';
 *
 * const exported = toJSON(appGraph);
 * const singletons = filterGraph(exported, byLifetime('singleton'));
 * ```
 *
 * @example Filter by custom predicate
 * ```typescript
 * const services = filterGraph(exported, (node) =>
 *   node.id.endsWith('Service')
 * );
 * ```
 *
 * @example Chain multiple filters
 * ```typescript
 * const scopedServices = filterGraph(
 *   filterGraph(exported, byLifetime('scoped')),
 *   byPortName(/Service$/)
 * );
 * ```
 */
export function filterGraph(
  exportedGraph: ExportedGraph,
  predicate: NodePredicate
): ExportedGraph {
  // Filter nodes by predicate
  const nodes = exportedGraph.nodes.filter(predicate);

  // Create set of remaining node IDs for efficient edge filtering
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Filter edges to only include those where both endpoints exist
  const edges = exportedGraph.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)
  );

  // Return frozen immutable structure
  return Object.freeze({
    nodes: Object.freeze([...nodes]),
    edges: Object.freeze([...edges]),
  });
}

// =============================================================================
// Built-in Filter Helpers
// =============================================================================

/**
 * Creates a predicate that filters nodes by lifetime.
 *
 * Returns a NodePredicate function that returns true for nodes matching
 * the specified lifetime value.
 *
 * @param lifetime - The lifetime to filter by ('singleton', 'scoped', or 'request')
 * @returns A NodePredicate function for use with filterGraph
 *
 * @example Filter to singleton services only
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, toMermaid } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const mermaid = toMermaid(singletons);
 * ```
 *
 * @example Filter to request-scoped services
 * ```typescript
 * const requestScoped = filterGraph(exported, byLifetime('request'));
 * ```
 */
export function byLifetime(lifetime: Lifetime): NodePredicate {
  return (node: ExportedNode) => node.lifetime === lifetime;
}

/**
 * Creates a predicate that filters nodes by port name pattern.
 *
 * Returns a NodePredicate function that returns true for nodes whose
 * id (port name) matches the specified regular expression pattern.
 *
 * @param pattern - Regular expression to match against node IDs
 * @returns A NodePredicate function for use with filterGraph
 *
 * @example Filter by suffix pattern
 * ```typescript
 * import { toJSON, filterGraph, byPortName } from '@hex-di/devtools';
 *
 * // Only services ending with "Service"
 * const services = filterGraph(toJSON(appGraph), byPortName(/Service$/));
 * ```
 *
 * @example Filter by prefix pattern (case-insensitive)
 * ```typescript
 * // All user-related services
 * const userServices = filterGraph(exported, byPortName(/^user/i));
 * ```
 *
 * @example Filter by containing pattern
 * ```typescript
 * // All services with "Repository" in the name
 * const repositories = filterGraph(exported, byPortName(/Repository/));
 * ```
 */
export function byPortName(pattern: RegExp): NodePredicate {
  return (node: ExportedNode) => pattern.test(node.id);
}
