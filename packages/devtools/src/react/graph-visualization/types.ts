/**
 * Types for the visual dependency graph component.
 *
 * Extends the ExportedGraph types with position and dimension information
 * for SVG rendering.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/graph";

// =============================================================================
// Layout Types
// =============================================================================

/**
 * A point in 2D space.
 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A node with computed position and dimensions from layout algorithm.
 */
export interface PositionedNode {
  /** Unique identifier (port name) */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Service lifetime */
  readonly lifetime: Lifetime;
  /** Center X position */
  readonly x: number;
  /** Center Y position */
  readonly y: number;
  /** Node width */
  readonly width: number;
  /** Node height */
  readonly height: number;
}

/**
 * An edge with computed path points from layout algorithm.
 */
export interface PositionedEdge {
  /** Source node id */
  readonly from: string;
  /** Target node id */
  readonly to: string;
  /** Path points for the edge curve */
  readonly points: readonly Point[];
}

/**
 * Result of layout computation.
 */
export interface LayoutResult {
  /** Positioned nodes */
  readonly nodes: readonly PositionedNode[];
  /** Positioned edges */
  readonly edges: readonly PositionedEdge[];
  /** Total graph width */
  readonly width: number;
  /** Total graph height */
  readonly height: number;
}

// =============================================================================
// Graph Direction
// =============================================================================

/**
 * Direction of the graph layout.
 * - TB: Top to bottom (default)
 * - LR: Left to right
 */
export type GraphDirection = "TB" | "LR";

// =============================================================================
// Interaction State
// =============================================================================

/**
 * State for tracking user interactions with the graph.
 */
export interface GraphInteractionState {
  /** Currently hovered node id, or null if none */
  readonly hoveredNodeId: string | null;
  /** Currently selected node id, or null if none */
  readonly selectedNodeId: string | null;
  /** Set of node ids that should be highlighted (connected to hovered/selected) */
  readonly highlightedNodeIds: ReadonlySet<string>;
  /** Set of edge keys (from-to) that should be highlighted */
  readonly highlightedEdgeKeys: ReadonlySet<string>;
}

/**
 * Creates an edge key for lookup in Sets/Maps.
 */
export function createEdgeKey(from: string, to: string): string {
  return `${from}->${to}`;
}

// =============================================================================
// Zoom/Pan State
// =============================================================================

/**
 * Transform state for zoom and pan.
 */
export interface TransformState {
  /** Current zoom scale (1 = 100%) */
  readonly scale: number;
  /** X translation offset */
  readonly translateX: number;
  /** Y translation offset */
  readonly translateY: number;
}

/**
 * Default transform state (no zoom, no pan).
 */
export const DEFAULT_TRANSFORM: TransformState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the DependencyGraph component.
 */
export interface DependencyGraphProps {
  /** The graph nodes */
  readonly nodes: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly lifetime: Lifetime;
  }>;
  /** The graph edges */
  readonly edges: ReadonlyArray<{
    readonly from: string;
    readonly to: string;
  }>;
  /** Graph layout direction */
  readonly direction?: GraphDirection;
  /** Callback when a node is clicked */
  readonly onNodeClick?: (nodeId: string) => void;
  /** Callback when a node is hovered */
  readonly onNodeHover?: (nodeId: string | null) => void;
  /** Whether to show zoom controls */
  readonly showControls?: boolean;
  /** Minimum zoom scale */
  readonly minZoom?: number;
  /** Maximum zoom scale */
  readonly maxZoom?: number;
}
