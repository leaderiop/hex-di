/**
 * Core types for @hex-di/devtools graph export utilities.
 *
 * This module defines the fundamental data structures used to represent
 * dependency graphs in a serializable, framework-agnostic format.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/graph";

// =============================================================================
// Exported Graph Types
// =============================================================================

/**
 * Represents a node in the exported dependency graph.
 *
 * Each node corresponds to a port/adapter registration in the original Graph.
 * The structure is designed for serialization and visualization purposes.
 *
 * @remarks
 * - `id` is the port name, used as a unique identifier for edge references
 * - `label` is the display name (defaults to port name, can be transformed)
 * - `lifetime` indicates the service instance scope
 * - All properties are readonly to enforce immutability
 *
 * @example
 * ```typescript
 * const node: ExportedNode = {
 *   id: 'Logger',
 *   label: 'Logger',
 *   lifetime: 'singleton'
 * };
 * ```
 */
export interface ExportedNode {
  /** Unique identifier for the node (port name) */
  readonly id: string;
  /** Display label for the node (defaults to port name) */
  readonly label: string;
  /** Service instance lifetime scope */
  readonly lifetime: Lifetime;
}

/**
 * Represents a directed edge (dependency relationship) in the exported graph.
 *
 * An edge indicates that the service at `from` depends on the service at `to`.
 * Edge direction follows the dependency direction: dependent -> dependency.
 *
 * @remarks
 * - `from` is the id of the dependent node (the one that requires)
 * - `to` is the id of the required node (the dependency)
 * - All properties are readonly to enforce immutability
 *
 * @example
 * ```typescript
 * // UserService depends on Logger
 * const edge: ExportedEdge = {
 *   from: 'UserService',
 *   to: 'Logger'
 * };
 * ```
 */
export interface ExportedEdge {
  /** The id of the dependent node (source of the dependency arrow) */
  readonly from: string;
  /** The id of the required node (target of the dependency arrow) */
  readonly to: string;
}

/**
 * Represents the complete exported dependency graph.
 *
 * Contains all nodes (services/ports) and edges (dependencies) from
 * the original Graph in a serializable format suitable for JSON export,
 * visualization, or further transformation.
 *
 * @remarks
 * - The graph structure is immutable (readonly arrays and properties)
 * - Nodes are typically sorted by id for deterministic output
 * - Edges are typically sorted by (from, to) for deterministic output
 * - This is the primary data structure passed between export functions
 *
 * @example
 * ```typescript
 * const graph: ExportedGraph = {
 *   nodes: [
 *     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 *     { id: 'UserService', label: 'UserService', lifetime: 'scoped' }
 *   ],
 *   edges: [
 *     { from: 'UserService', to: 'Logger' }
 *   ]
 * };
 * ```
 */
export interface ExportedGraph {
  /** Array of all nodes in the graph */
  readonly nodes: readonly ExportedNode[];
  /** Array of all edges (dependencies) in the graph */
  readonly edges: readonly ExportedEdge[];
}

// =============================================================================
// Export Options Types
// =============================================================================

/**
 * Configuration options for DOT (Graphviz) format export.
 *
 * @remarks
 * - `direction` controls the graph layout orientation
 * - `preset` selects predefined styling options
 * - All properties are optional with sensible defaults
 *
 * @example
 * ```typescript
 * const options: DOTOptions = {
 *   direction: 'LR',    // Left-to-right layout
 *   preset: 'styled'    // Color-coded by lifetime
 * };
 * ```
 */
export interface DOTOptions {
  /**
   * Graph layout direction.
   * - `'TB'`: Top to bottom (default)
   * - `'LR'`: Left to right
   */
  readonly direction?: "TB" | "LR";

  /**
   * Visual styling preset.
   * - `'minimal'`: Basic box nodes (default)
   * - `'styled'`: Color-coded nodes by lifetime
   */
  readonly preset?: "minimal" | "styled";
}

/**
 * Configuration options for Mermaid format export.
 *
 * @remarks
 * - `direction` controls the graph layout orientation
 * - All properties are optional with sensible defaults
 *
 * @example
 * ```typescript
 * const options: MermaidOptions = {
 *   direction: 'LR'  // Left-to-right layout
 * };
 * ```
 */
export interface MermaidOptions {
  /**
   * Graph layout direction.
   * - `'TD'`: Top to down (default)
   * - `'LR'`: Left to right
   */
  readonly direction?: "TD" | "LR";
}

// =============================================================================
// Filter and Transform Types
// =============================================================================

/**
 * Predicate function for filtering nodes in an exported graph.
 *
 * Used with `filterGraph` to select which nodes to include in the output.
 * Returns `true` to include the node, `false` to exclude it.
 *
 * @param node - The node to evaluate
 * @returns `true` if the node should be included, `false` otherwise
 *
 * @example
 * ```typescript
 * // Filter to only singleton nodes
 * const isSingleton: NodePredicate = (node) => node.lifetime === 'singleton';
 *
 * // Filter by name pattern
 * const isService: NodePredicate = (node) => node.id.endsWith('Service');
 * ```
 */
export type NodePredicate = (node: ExportedNode) => boolean;

/**
 * Transform function for relabeling nodes in an exported graph.
 *
 * Used with `relabelPorts` to customize node display labels while
 * preserving the original node IDs for edge references.
 *
 * @param node - The node to transform
 * @returns The new label string for the node
 *
 * @example
 * ```typescript
 * // Add lifetime to label
 * const addLifetime: LabelTransform = (node) =>
 *   `${node.label} [${node.lifetime}]`;
 *
 * // Strip common prefix
 * const stripPrefix: LabelTransform = (node) =>
 *   node.label.replace('App.Services.', '');
 * ```
 */
export type LabelTransform = (node: ExportedNode) => string;
