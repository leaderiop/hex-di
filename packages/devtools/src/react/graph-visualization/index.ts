/**
 * Graph visualization components for DevTools.
 *
 * Provides a visual dependency graph with interactive features:
 * - Hierarchical layout using Dagre
 * - Zoom and pan with D3
 * - Hover/click highlighting
 * - Tooltips
 *
 * @packageDocumentation
 */

// Main component
export { DependencyGraph } from "./dependency-graph.js";

// Sub-components (for advanced usage)
export { GraphRenderer } from "./graph-renderer.js";
export { GraphNode } from "./graph-node.js";
export { GraphEdge, ArrowMarkerDefs } from "./graph-edge.js";
export { GraphControls } from "./graph-controls.js";
export { GraphTooltip } from "./graph-tooltip.js";

// Layout utilities
export { computeLayout, generateEdgePath, findConnectedNodes, findConnectedEdges } from "./graph-layout.js";
export type { LayoutConfig, InputNode, InputEdge } from "./graph-layout.js";

// Types
export type {
  Point,
  PositionedNode,
  PositionedEdge,
  LayoutResult,
  GraphDirection,
  GraphInteractionState,
  TransformState,
  DependencyGraphProps,
} from "./types.js";
export { createEdgeKey, DEFAULT_TRANSFORM } from "./types.js";

// Styles
export {
  graphContainerStyles,
  graphNodeStyles,
  graphEdgeStyles,
  graphControlsStyles,
  tooltipStyles,
  getLifetimeStrokeVar,
  LIFETIME_COLORS,
} from "./graph-styles.js";
