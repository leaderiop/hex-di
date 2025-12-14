/**
 * GraphEdge component for rendering edges (arrows) between nodes.
 *
 * @packageDocumentation
 */

import React, { type ReactElement } from "react";
import type { PositionedEdge } from "./types.js";
import { generateEdgePath } from "./graph-layout.js";

// =============================================================================
// Types
// =============================================================================

export interface GraphEdgeProps {
  /** The positioned edge to render */
  readonly edge: PositionedEdge;
  /** Whether this edge should be highlighted */
  readonly isHighlighted: boolean;
  /** Whether this edge should be dimmed */
  readonly isDimmed: boolean;
  /** ID for the arrow marker to use */
  readonly markerId: string;
  /** ID for the highlighted arrow marker */
  readonly highlightedMarkerId: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a single edge in the dependency graph.
 *
 * The edge is displayed as a curved path with an arrow marker at the end.
 * Supports highlighted and dimmed visual states.
 */
export function GraphEdge({
  edge,
  isHighlighted,
  isDimmed,
  markerId,
  highlightedMarkerId,
}: GraphEdgeProps): ReactElement {
  const pathD = generateEdgePath(edge.points);

  // Determine styling based on state
  const stroke = isHighlighted
    ? "var(--hex-devtools-accent, #89b4fa)"
    : "var(--hex-devtools-border, #45475a)";
  const strokeWidth = isHighlighted ? 2 : 1.5;
  const opacity = isDimmed ? 0.2 : 1;
  const marker = isHighlighted
    ? `url(#${highlightedMarkerId})`
    : `url(#${markerId})`;

  return (
    <path
      className="graph-edge"
      data-edge-from={edge.from}
      data-edge-to={edge.to}
      d={pathD}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      markerEnd={marker}
      style={{
        opacity,
        transition: "all 0.15s ease",
      }}
    />
  );
}

// =============================================================================
// Arrow Marker Definitions
// =============================================================================

export interface ArrowMarkerDefsProps {
  /** Base ID for the marker */
  readonly id: string;
  /** ID for the highlighted variant */
  readonly highlightedId: string;
}

/**
 * SVG defs element containing arrow markers for edges.
 *
 * Must be included in the SVG to enable arrow markers on edges.
 */
export function ArrowMarkerDefs({
  id,
  highlightedId,
}: ArrowMarkerDefsProps): ReactElement {
  return (
    <defs>
      {/* Default arrow marker */}
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          fill="var(--hex-devtools-border, #45475a)"
        />
      </marker>

      {/* Highlighted arrow marker */}
      <marker
        id={highlightedId}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          fill="var(--hex-devtools-accent, #89b4fa)"
        />
      </marker>
    </defs>
  );
}
