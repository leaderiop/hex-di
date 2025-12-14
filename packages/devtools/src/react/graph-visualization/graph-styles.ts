/**
 * CSS-in-JS styles for the visual dependency graph.
 *
 * Uses CSS variables for theming consistency with the DevTools panel.
 *
 * @packageDocumentation
 */

import type { CSSProperties } from "react";

// =============================================================================
// Style Type Definitions
// =============================================================================

/** Graph container styles */
interface GraphContainerStyleDef {
  wrapper: CSSProperties;
  svg: CSSProperties;
}

/** Graph node styles */
interface GraphNodeStyleDef {
  rect: CSSProperties;
  rectSingleton: CSSProperties;
  rectScoped: CSSProperties;
  rectRequest: CSSProperties;
  rectHovered: CSSProperties;
  rectSelected: CSSProperties;
  rectDimmed: CSSProperties;
  label: CSSProperties;
  labelDimmed: CSSProperties;
  lifetimeBadge: CSSProperties;
}

/** Graph edge styles */
interface GraphEdgeStyleDef {
  path: CSSProperties;
  pathHighlighted: CSSProperties;
  pathDimmed: CSSProperties;
  arrowMarker: CSSProperties;
}

/** Graph controls styles */
interface GraphControlsStyleDef {
  container: CSSProperties;
  button: CSSProperties;
  buttonHover: CSSProperties;
  separator: CSSProperties;
  zoomLabel: CSSProperties;
}

/** Tooltip styles */
interface TooltipStyleDef {
  container: CSSProperties;
  title: CSSProperties;
  row: CSSProperties;
  label: CSSProperties;
  value: CSSProperties;
}

// =============================================================================
// Graph Container Styles
// =============================================================================

export const graphContainerStyles: GraphContainerStyleDef = {
  wrapper: {
    width: "100%",
    height: "300px",
    minHeight: "200px",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    borderRadius: "6px",
    border: "1px solid var(--hex-devtools-border, #45475a)",
  },
  svg: {
    width: "100%",
    height: "100%",
    cursor: "grab",
  },
};

// =============================================================================
// Graph Node Styles
// =============================================================================

export const graphNodeStyles: GraphNodeStyleDef = {
  rect: {
    fill: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    strokeWidth: 2,
    rx: 6,
    ry: 6,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  rectSingleton: {
    stroke: "var(--hex-devtools-singleton, #a6e3a1)",
  },
  rectScoped: {
    stroke: "var(--hex-devtools-scoped, #89b4fa)",
  },
  rectRequest: {
    stroke: "var(--hex-devtools-request, #fab387)",
  },
  rectHovered: {
    filter: "brightness(1.15)",
    strokeWidth: 3,
  },
  rectSelected: {
    strokeWidth: 3,
    filter: "drop-shadow(0 0 6px var(--hex-devtools-accent, #89b4fa))",
  },
  rectDimmed: {
    opacity: 0.3,
  },
  label: {
    fill: "var(--hex-devtools-text, #cdd6f4)",
    fontSize: "12px",
    fontFamily: "var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)",
    textAnchor: "middle",
    dominantBaseline: "middle",
    pointerEvents: "none",
    userSelect: "none",
  },
  labelDimmed: {
    opacity: 0.3,
  },
  lifetimeBadge: {
    fontSize: "9px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
};

// =============================================================================
// Graph Edge Styles
// =============================================================================

export const graphEdgeStyles: GraphEdgeStyleDef = {
  path: {
    fill: "none",
    stroke: "var(--hex-devtools-border, #45475a)",
    strokeWidth: 1.5,
    transition: "all 0.15s ease",
  },
  pathHighlighted: {
    stroke: "var(--hex-devtools-accent, #89b4fa)",
    strokeWidth: 2,
  },
  pathDimmed: {
    opacity: 0.2,
  },
  arrowMarker: {
    fill: "var(--hex-devtools-border, #45475a)",
  },
};

// =============================================================================
// Graph Controls Styles
// =============================================================================

export const graphControlsStyles: GraphControlsStyleDef = {
  container: {
    position: "absolute",
    bottom: "12px",
    right: "12px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "6px",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    zIndex: 10,
  },
  button: {
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "4px",
    color: "var(--hex-devtools-text, #cdd6f4)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    transition: "all 0.15s ease",
  },
  buttonHover: {
    backgroundColor: "var(--hex-devtools-bg-hover, #3a3a4e)",
  },
  separator: {
    width: "1px",
    height: "20px",
    backgroundColor: "var(--hex-devtools-border, #45475a)",
    margin: "0 4px",
  },
  zoomLabel: {
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    minWidth: "40px",
    textAlign: "center",
    fontFamily: "var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)",
  },
};

// =============================================================================
// Tooltip Styles
// =============================================================================

export const tooltipStyles: TooltipStyleDef = {
  container: {
    position: "absolute",
    padding: "8px 12px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    zIndex: 100,
    pointerEvents: "none",
    minWidth: "120px",
  },
  title: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--hex-devtools-text, #cdd6f4)",
    marginBottom: "6px",
    fontFamily: "var(--hex-devtools-font-mono, 'JetBrains Mono', monospace)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    marginTop: "4px",
  },
  label: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  value: {
    color: "var(--hex-devtools-text, #cdd6f4)",
    fontWeight: 500,
  },
};

// =============================================================================
// Lifetime Color Mapping
// =============================================================================

/**
 * Get the CSS variable for a lifetime's stroke color.
 */
export function getLifetimeStrokeVar(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "var(--hex-devtools-singleton, #a6e3a1)";
    case "scoped":
      return "var(--hex-devtools-scoped, #89b4fa)";
    case "request":
      return "var(--hex-devtools-request, #fab387)";
    default:
      return "var(--hex-devtools-border, #45475a)";
  }
}

/**
 * Get static color values for SVG markers (which don't support CSS variables).
 */
export const LIFETIME_COLORS = {
  singleton: "#a6e3a1",
  scoped: "#89b4fa",
  request: "#fab387",
  default: "#45475a",
} as const;
