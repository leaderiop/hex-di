/**
 * Mermaid export function for dependency graphs.
 *
 * Converts a Graph to Mermaid flowchart syntax for easy embedding
 * in Markdown documentation and GitHub README files.
 *
 * @packageDocumentation
 */

import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";
import type { ExportedGraph, MermaidOptions } from "./types.js";
import { toJSON } from "./to-json.js";

// =============================================================================
// Mermaid Character Escaping
// =============================================================================

/**
 * Escapes special characters in a string for safe use in Mermaid node IDs.
 *
 * Mermaid node IDs have restrictions on certain characters. This function
 * removes or replaces characters that would break the Mermaid syntax.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use as a Mermaid node ID
 */
function escapeNodeId(str: string): string {
  // Remove or replace characters that are problematic in Mermaid node IDs
  // Mermaid IDs should be alphanumeric with underscores
  return str.replace(/[^a-zA-Z0-9_]/g, "");
}

/**
 * Escapes special characters in a string for safe use in Mermaid labels.
 *
 * Mermaid labels enclosed in quotes need certain characters escaped
 * to prevent syntax errors.
 *
 * @param str - The string to escape
 * @returns The escaped string safe for use in Mermaid labels
 */
function escapeLabel(str: string): string {
  // Escape double quotes with HTML entity
  let escaped = str.replace(/"/g, "#quot;");
  // Escape brackets which have special meaning in Mermaid
  escaped = escaped.replace(/\[/g, "#91;");
  escaped = escaped.replace(/\]/g, "#93;");
  return escaped;
}

// =============================================================================
// Type Guard
// =============================================================================

/**
 * Type guard to check if the input is an ExportedGraph.
 *
 * @param input - The input to check
 * @returns True if input is an ExportedGraph, false otherwise
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

// =============================================================================
// toMermaid Implementation
// =============================================================================

/**
 * Converts a dependency graph to Mermaid flowchart syntax.
 *
 * This function produces valid Mermaid syntax that can be embedded directly
 * in Markdown files, GitHub README files, or rendered by Mermaid-compatible
 * visualization tools.
 *
 * **Output Format:**
 * - Starts with `graph TD` (top-down) or `graph LR` (left-right)
 * - Nodes are formatted as `NodeId["Label (lifetime)"]`
 * - Edges are formatted as `FromNode --> ToNode`
 *
 * **Direction Options:**
 * - `TD`: Top to Down (default)
 * - `LR`: Left to Right
 *
 * **Special Character Handling:**
 * - Double quotes in labels are escaped as `#quot;`
 * - Brackets in labels are escaped as `#91;` and `#93;`
 * - Node IDs are sanitized to alphanumeric characters only
 *
 * @param graph - The dependency graph or ExportedGraph to convert
 * @param options - Optional configuration for the output
 * @returns A string containing valid Mermaid flowchart syntax
 *
 * @example Basic usage
 * ```typescript
 * import { toMermaid } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const mermaid = toMermaid(appGraph);
 * console.log(mermaid);
 * // graph TD
 * //   Logger["Logger (singleton)"]
 * //   UserService["UserService (scoped)"]
 * //   UserService --> Logger
 * ```
 *
 * @example With left-to-right direction
 * ```typescript
 * const mermaid = toMermaid(appGraph, { direction: 'LR' });
 * // graph LR
 * //   Logger["Logger (singleton)"]
 * //   ...
 * ```
 *
 * @example From ExportedGraph (after filtering)
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, toMermaid } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const mermaid = toMermaid(singletons);
 * ```
 */
export function toMermaid(
  graph: Graph<Port<unknown, string> | never> | ExportedGraph,
  options?: MermaidOptions
): string {
  // Convert to ExportedGraph if needed
  const exportedGraph = isExportedGraph(graph) ? graph : toJSON(graph);

  // Determine direction (default: TD)
  const direction = options?.direction ?? "TD";

  // Build the Mermaid output
  const lines: string[] = [];

  // Add graph declaration
  lines.push(`graph ${direction}`);

  // Add node definitions
  for (const node of exportedGraph.nodes) {
    const nodeId = escapeNodeId(node.id);
    const label = escapeLabel(node.label);
    lines.push(`  ${nodeId}["${label} (${node.lifetime})"]`);
  }

  // Add empty line between nodes and edges if both exist
  if (exportedGraph.nodes.length > 0 && exportedGraph.edges.length > 0) {
    lines.push("");
  }

  // Add edge definitions
  for (const edge of exportedGraph.edges) {
    const fromId = escapeNodeId(edge.from);
    const toId = escapeNodeId(edge.to);
    lines.push(`  ${fromId} --> ${toId}`);
  }

  return lines.join("\n");
}
