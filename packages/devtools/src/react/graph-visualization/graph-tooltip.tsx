/**
 * GraphTooltip component for showing node details on hover.
 *
 * @packageDocumentation
 */

import React, { type ReactElement } from "react";
import type { PositionedNode } from "./types.js";
import { tooltipStyles, getLifetimeStrokeVar } from "./graph-styles.js";

// =============================================================================
// Types
// =============================================================================

export interface GraphTooltipProps {
  /** The node to show tooltip for */
  readonly node: PositionedNode;
  /** X position of the tooltip */
  readonly x: number;
  /** Y position of the tooltip */
  readonly y: number;
  /** Number of dependencies this node has */
  readonly dependencyCount: number;
  /** Number of dependents (nodes that depend on this) */
  readonly dependentCount: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a tooltip with node details.
 *
 * Shows:
 * - Node name
 * - Lifetime with color indicator
 * - Number of dependencies
 * - Number of dependents
 */
export function GraphTooltip({
  node,
  x,
  y,
  dependencyCount,
  dependentCount,
}: GraphTooltipProps): ReactElement {
  const lifetimeColor = getLifetimeStrokeVar(node.lifetime);

  return (
    <div
      style={{
        ...tooltipStyles.container,
        left: x + 10,
        top: y + 10,
      }}
    >
      {/* Node name */}
      <div style={tooltipStyles.title}>{node.label}</div>

      {/* Lifetime */}
      <div style={{ ...tooltipStyles.row, marginTop: "4px" }}>
        <span style={tooltipStyles.label}>Lifetime</span>
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: lifetimeColor,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              ...tooltipStyles.value,
              color: lifetimeColor,
              textTransform: "capitalize",
            }}
          >
            {node.lifetime}
          </span>
        </span>
      </div>

      {/* Dependencies */}
      <div style={tooltipStyles.row}>
        <span style={tooltipStyles.label}>Dependencies</span>
        <span style={tooltipStyles.value}>{dependencyCount}</span>
      </div>

      {/* Dependents */}
      <div style={tooltipStyles.row}>
        <span style={tooltipStyles.label}>Dependents</span>
        <span style={tooltipStyles.value}>{dependentCount}</span>
      </div>
    </div>
  );
}
