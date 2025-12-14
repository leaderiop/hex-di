/**
 * Graph layout computation using Dagre.
 *
 * Wraps the Dagre library to compute node positions and edge paths
 * for the dependency graph visualization.
 *
 * @packageDocumentation
 */

import dagre from "dagre";
import type { Lifetime } from "@hex-di/graph";
import type {
  PositionedNode,
  PositionedEdge,
  LayoutResult,
  GraphDirection,
  Point,
} from "./types.js";

// =============================================================================
// Layout Configuration
// =============================================================================

/**
 * Configuration options for the layout algorithm.
 */
export interface LayoutConfig {
  /** Graph direction: TB (top-to-bottom) or LR (left-to-right) */
  direction: GraphDirection;
  /** Horizontal spacing between nodes */
  nodeSep: number;
  /** Vertical spacing between ranks/levels */
  rankSep: number;
  /** Outer margin on X axis */
  marginX: number;
  /** Outer margin on Y axis */
  marginY: number;
  /** Fixed node width */
  nodeWidth: number;
  /** Fixed node height */
  nodeHeight: number;
}

/**
 * Default layout configuration.
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: "TB",
  nodeSep: 50,
  rankSep: 70,
  marginX: 30,
  marginY: 30,
  nodeWidth: 140,
  nodeHeight: 50,
};

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input node for layout computation.
 */
export interface InputNode {
  readonly id: string;
  readonly label: string;
  readonly lifetime: Lifetime;
}

/**
 * Input edge for layout computation.
 */
export interface InputEdge {
  readonly from: string;
  readonly to: string;
}

// =============================================================================
// Layout Computation
// =============================================================================

/**
 * Computes the layout for a dependency graph using Dagre.
 *
 * @param nodes - Array of input nodes
 * @param edges - Array of input edges
 * @param config - Optional layout configuration
 * @returns Layout result with positioned nodes and edges
 *
 * @example
 * ```typescript
 * const result = computeLayout(
 *   [{ id: 'A', label: 'A', lifetime: 'singleton' }],
 *   [{ from: 'A', to: 'B' }]
 * );
 * ```
 */
export function computeLayout(
  nodes: readonly InputNode[],
  edges: readonly InputEdge[],
  config: Partial<LayoutConfig> = {}
): LayoutResult {
  const cfg: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };

  // Create the dagre graph
  const g = new dagre.graphlib.Graph();

  // Set graph options
  g.setGraph({
    rankdir: cfg.direction,
    nodesep: cfg.nodeSep,
    ranksep: cfg.rankSep,
    marginx: cfg.marginX,
    marginy: cfg.marginY,
  });

  // Dagre requires this for edge labels
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes
  for (const node of nodes) {
    g.setNode(node.id, {
      label: node.label,
      width: cfg.nodeWidth,
      height: cfg.nodeHeight,
      lifetime: node.lifetime,
    });
  }

  // Add edges
  for (const edge of edges) {
    // Only add edge if both nodes exist
    if (g.hasNode(edge.from) && g.hasNode(edge.to)) {
      g.setEdge(edge.from, edge.to);
    }
  }

  // Run the layout algorithm
  dagre.layout(g);

  // Extract positioned nodes
  const positionedNodes: PositionedNode[] = [];
  for (const nodeId of g.nodes()) {
    const nodeData = g.node(nodeId);
    if (nodeData) {
      const inputNode = nodes.find((n) => n.id === nodeId);
      positionedNodes.push({
        id: nodeId,
        label: inputNode?.label ?? nodeId,
        lifetime: inputNode?.lifetime ?? "singleton",
        x: nodeData.x,
        y: nodeData.y,
        width: nodeData.width,
        height: nodeData.height,
      });
    }
  }

  // Extract positioned edges with path points
  const positionedEdges: PositionedEdge[] = [];
  for (const edgeObj of g.edges()) {
    const edgeData = g.edge(edgeObj);
    if (edgeData && edgeData.points) {
      positionedEdges.push({
        from: edgeObj.v,
        to: edgeObj.w,
        points: edgeData.points.map((p: { x: number; y: number }) => ({
          x: p.x,
          y: p.y,
        })),
      });
    }
  }

  // Get graph dimensions
  const graphData = g.graph();
  const width = graphData?.width ?? 0;
  const height = graphData?.height ?? 0;

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    width,
    height,
  };
}

// =============================================================================
// Path Generation
// =============================================================================

/**
 * Generates an SVG path string from edge points.
 * Uses a smooth curve through all points.
 *
 * @param points - Array of points along the edge
 * @returns SVG path d attribute string
 */
export function generateEdgePath(points: readonly Point[]): string {
  if (points.length === 0) {
    return "";
  }

  const first = points[0];
  if (first === undefined) {
    return "";
  }

  if (points.length === 1) {
    return `M ${first.x} ${first.y}`;
  }

  const second = points[1];
  if (second === undefined) {
    return `M ${first.x} ${first.y}`;
  }

  if (points.length === 2) {
    return `M ${first.x} ${first.y} L ${second.x} ${second.y}`;
  }

  // Use cubic bezier curves for smooth edges
  let path = `M ${first.x} ${first.y}`;
  const rest = points.slice(1);

  // For multiple points, use quadratic bezier for smooth curves
  for (let i = 0; i < rest.length - 1; i++) {
    const current = rest[i];
    const next = rest[i + 1];
    if (current === undefined || next === undefined) {
      continue;
    }
    // Use the current point as control point, midpoint to next as end
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }

  // Final segment to last point
  const last = rest[rest.length - 1];
  if (last !== undefined) {
    path += ` L ${last.x} ${last.y}`;
  }

  return path;
}

// =============================================================================
// Graph Analysis
// =============================================================================

/**
 * Finds all nodes connected to a given node (both upstream and downstream).
 *
 * @param nodeId - The node to find connections for
 * @param edges - All edges in the graph
 * @returns Set of connected node IDs (includes the input node)
 */
export function findConnectedNodes(
  nodeId: string,
  edges: readonly InputEdge[]
): Set<string> {
  const connected = new Set<string>([nodeId]);
  const visited = new Set<string>();

  // Find downstream (dependencies)
  const findDownstream = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id);

    for (const edge of edges) {
      if (edge.from === id) {
        connected.add(edge.to);
        findDownstream(edge.to);
      }
    }
  };

  // Find upstream (dependents)
  const findUpstream = (id: string): void => {
    for (const edge of edges) {
      if (edge.to === id && !connected.has(edge.from)) {
        connected.add(edge.from);
        findUpstream(edge.from);
      }
    }
  };

  findDownstream(nodeId);
  visited.clear();
  findUpstream(nodeId);

  return connected;
}

/**
 * Finds all edges connected to a set of nodes.
 *
 * @param nodeIds - Set of node IDs
 * @param edges - All edges in the graph
 * @returns Set of edge keys (from->to format)
 */
export function findConnectedEdges(
  nodeIds: Set<string>,
  edges: readonly InputEdge[]
): Set<string> {
  const connectedEdges = new Set<string>();

  for (const edge of edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      connectedEdges.add(`${edge.from}->${edge.to}`);
    }
  }

  return connectedEdges;
}
