/**
 * DOT (Graphviz) export function for dependency graphs.
 *
 * Converts a Graph to Graphviz DOT format string for visualization
 * with external tools like Graphviz, or embedding in documentation.
 *
 * @packageDocumentation
 */

import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";
import type { DOTOptions, ExportedGraph, ExportedNode } from "./types.js";
import { toJSON } from "./to-json.js";

// =============================================================================
// Constants
// =============================================================================

/**
 * Color mapping for styled preset by lifetime.
 */
const LIFETIME_COLORS: Record<string, string> = {
  singleton: "#E8F5E9", // Green tint
  scoped: "#E3F2FD", // Blue tint
  request: "#FFF3E0", // Orange tint
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escapes special characters in a string for DOT format safety.
 *
 * DOT format requires escaping:
 * - Double quotes (") -> \"
 * - Backslashes (\) -> \\
 *
 * @param str - The string to escape
 * @returns The escaped string safe for DOT format
 */
function escapeDOTString(str: string): string {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/"/g, '\\"'); // Escape double quotes
}

/**
 * Renders a single node in DOT format.
 *
 * @param node - The node to render
 * @param styled - Whether to apply styled preset colors
 * @returns The DOT format node declaration
 */
function renderNode(node: ExportedNode, styled: boolean): string {
  const escapedId = escapeDOTString(node.id);
  const escapedLabel = escapeDOTString(node.label);
  const lifetime = node.lifetime;

  if (styled) {
    const fillcolor = LIFETIME_COLORS[lifetime] ?? "#FFFFFF";
    return `  "${escapedId}" [label="${escapedLabel}\\n(${lifetime})", style=filled, fillcolor="${fillcolor}"];`;
  }

  return `  "${escapedId}" [label="${escapedLabel}\\n(${lifetime})"];`;
}

/**
 * Renders a single edge in DOT format.
 *
 * @param from - Source node id
 * @param to - Target node id
 * @returns The DOT format edge declaration
 */
function renderEdge(from: string, to: string): string {
  const escapedFrom = escapeDOTString(from);
  const escapedTo = escapeDOTString(to);
  return `  "${escapedFrom}" -> "${escapedTo}";`;
}

// =============================================================================
// toDOT Implementation
// =============================================================================

/**
 * Converts a dependency graph to Graphviz DOT format.
 *
 * This function accepts either a Graph object or an ExportedGraph and produces
 * a valid Graphviz DOT string that can be rendered with Graphviz tools or
 * embedded in documentation.
 *
 * **Output Structure:**
 * - Starts with `digraph DependencyGraph {`
 * - Contains `rankdir` directive for layout direction
 * - Contains node shape declaration
 * - Lists all nodes with labels including port name and lifetime
 * - Lists all edges showing dependency relationships
 * - Ends with `}`
 *
 * **Options:**
 * - `direction`: Layout direction ('TB' for top-bottom, 'LR' for left-right)
 * - `preset`: Visual styling ('minimal' for basic, 'styled' for color-coded)
 *
 * @param graph - The dependency graph to convert (Graph or ExportedGraph)
 * @param options - Optional configuration for DOT output
 * @returns A valid Graphviz DOT format string
 *
 * @example Basic usage
 * ```typescript
 * import { toDOT } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const dot = toDOT(appGraph);
 * console.log(dot);
 * // digraph DependencyGraph {
 * //   rankdir=TB;
 * //   node [shape=box];
 * //
 * //   "Logger" [label="Logger\n(singleton)"];
 * //   "UserService" [label="UserService\n(scoped)"];
 * //
 * //   "UserService" -> "Logger";
 * // }
 * ```
 *
 * @example With options
 * ```typescript
 * const dot = toDOT(appGraph, {
 *   direction: 'LR',    // Left-to-right layout
 *   preset: 'styled'    // Color-coded by lifetime
 * });
 * ```
 *
 * @example Using ExportedGraph
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, toDOT } from '@hex-di/devtools';
 *
 * // Filter to singletons, then export to DOT
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const dot = toDOT(singletons);
 * ```
 */
export function toDOT(
  graph: Graph<Port<unknown, string> | never> | ExportedGraph,
  options?: DOTOptions
): string {
  // Convert to ExportedGraph if a Graph was provided
  const exportedGraph = isExportedGraph(graph) ? graph : toJSON(graph);

  // Extract options with defaults
  const direction = options?.direction ?? "TB";
  const preset = options?.preset ?? "minimal";
  const styled = preset === "styled";

  // Build DOT output
  const lines: string[] = [];

  // Header
  lines.push("digraph DependencyGraph {");
  lines.push(`  rankdir=${direction};`);
  lines.push("  node [shape=box];");

  // Add empty line before nodes if there are any
  if (exportedGraph.nodes.length > 0) {
    lines.push("");
  }

  // Nodes
  for (const node of exportedGraph.nodes) {
    lines.push(renderNode(node, styled));
  }

  // Add empty line before edges if there are any
  if (exportedGraph.edges.length > 0) {
    lines.push("");
  }

  // Edges
  for (const edge of exportedGraph.edges) {
    lines.push(renderEdge(edge.from, edge.to));
  }

  // Footer
  lines.push("}");

  return lines.join("\n");
}

/**
 * Type guard to check if the input is an ExportedGraph.
 *
 * @param input - The input to check
 * @returns true if the input is an ExportedGraph, false otherwise
 */
function isExportedGraph(
  input: Graph<Port<unknown, string> | never> | ExportedGraph
): input is ExportedGraph {
  return (
    typeof input === "object" &&
    input !== null &&
    "nodes" in input &&
    "edges" in input &&
    Array.isArray(input.nodes) &&
    Array.isArray(input.edges)
  );
}
