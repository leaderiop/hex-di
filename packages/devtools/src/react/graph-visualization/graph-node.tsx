/**
 * GraphNode component for rendering individual nodes in the dependency graph.
 *
 * @packageDocumentation
 */

import React, { type ReactElement, useCallback } from "react";
import type { PositionedNode } from "./types.js";
import { getLifetimeStrokeVar } from "./graph-styles.js";

// =============================================================================
// Types
// =============================================================================

export interface GraphNodeProps {
  /** The positioned node to render */
  readonly node: PositionedNode;
  /** Whether this node is currently hovered */
  readonly isHovered: boolean;
  /** Whether this node is currently selected */
  readonly isSelected: boolean;
  /** Whether this node should be dimmed (not connected to hovered/selected) */
  readonly isDimmed: boolean;
  /** Callback when node is clicked */
  readonly onClick?: (nodeId: string) => void;
  /** Callback when mouse enters node */
  readonly onMouseEnter?: (nodeId: string) => void;
  /** Callback when mouse leaves node */
  readonly onMouseLeave?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a single node in the dependency graph.
 *
 * The node is displayed as a rounded rectangle with:
 * - Border color based on lifetime (singleton=green, scoped=blue, request=orange)
 * - Label centered in the node
 * - Hover/selected/dimmed visual states
 */
export function GraphNode({
  node,
  isHovered,
  isSelected,
  isDimmed,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: GraphNodeProps): ReactElement {
  const handleClick = useCallback(() => {
    onClick?.(node.id);
  }, [onClick, node.id]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter?.(node.id);
  }, [onMouseEnter, node.id]);

  // Compute position (top-left corner from center)
  const x = node.x - node.width / 2;
  const y = node.y - node.height / 2;

  // Get stroke color based on lifetime
  const strokeColor = getLifetimeStrokeVar(node.lifetime);

  // Compute opacity and filter based on state
  const opacity = isDimmed ? 0.3 : 1;
  const strokeWidth = isHovered || isSelected ? 3 : 2;
  const filter =
    isSelected
      ? "drop-shadow(0 0 6px var(--hex-devtools-accent, #89b4fa))"
      : isHovered
        ? "brightness(1.15)"
        : undefined;

  return (
    <g
      className="graph-node"
      data-node-id={node.id}
      style={{ cursor: "pointer", opacity }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Node rectangle */}
      <rect
        x={x}
        y={y}
        width={node.width}
        height={node.height}
        rx={6}
        ry={6}
        fill="var(--hex-devtools-bg-secondary, #2a2a3e)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{
          transition: "all 0.15s ease",
          filter,
        }}
      />

      {/* Node label */}
      <text
        x={node.x}
        y={node.y - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--hex-devtools-text, #cdd6f4)"
        fontSize="12px"
        fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {node.label}
      </text>

      {/* Lifetime badge */}
      <text
        x={node.x}
        y={node.y + 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={strokeColor}
        fontSize="9px"
        fontWeight={600}
        fontFamily="var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)"
        style={{
          pointerEvents: "none",
          userSelect: "none",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {node.lifetime}
      </text>
    </g>
  );
}
