/**
 * CSS-in-JS styles for DevTools components.
 *
 * Provides a developer-focused aesthetic similar to TanStack DevTools
 * with monospace font for code-like appearance and dark/light theme
 * support via CSS variables.
 *
 * @packageDocumentation
 */

import type { CSSProperties } from "react";

// =============================================================================
// Style Type Definitions
// =============================================================================

/** Panel style properties */
interface PanelStyleDef {
  container: CSSProperties;
  header: CSSProperties;
  content: CSSProperties;
}

/** Section style properties */
interface SectionStyleDef {
  header: CSSProperties;
  headerHover: CSSProperties;
  title: CSSProperties;
  chevron: CSSProperties;
  chevronExpanded: CSSProperties;
  content: CSSProperties;
}

/** Node style properties */
interface NodeStyleDef {
  item: CSSProperties;
  name: CSSProperties;
  badge: CSSProperties;
  badgeSingleton: CSSProperties;
  badgeScoped: CSSProperties;
  badgeRequest: CSSProperties;
}

/** Adapter style properties */
interface AdapterStyleDef {
  container: CSSProperties;
  header: CSSProperties;
  headerExpanded: CSSProperties;
  portName: CSSProperties;
  details: CSSProperties;
  detailRow: CSSProperties;
  detailLabel: CSSProperties;
  detailValue: CSSProperties;
  dependencyList: CSSProperties;
  dependencyItem: CSSProperties;
}

/** Edge style properties */
interface EdgeStyleDef {
  container: CSSProperties;
  item: CSSProperties;
  arrow: CSSProperties;
  fromNode: CSSProperties;
  toNode: CSSProperties;
}

/** Empty state style properties */
interface EmptyStyleDef {
  container: CSSProperties;
}

/** Resolution tracing main container styles */
interface TracingStyleDef {
  container: CSSProperties;
  viewToggleContainer: CSSProperties;
  viewToggleTab: CSSProperties;
  viewToggleTabActive: CSSProperties;
  viewContent: CSSProperties;
}

/** Timeline view specific styles */
interface TimelineStyleDef {
  container: CSSProperties;
  ruler: CSSProperties;
  rulerTick: CSSProperties;
  rulerLabel: CSSProperties;
  thresholdLine: CSSProperties;
  row: CSSProperties;
  rowHover: CSSProperties;
  rowExpanded: CSSProperties;
  rowSlow: CSSProperties;
  rowCached: CSSProperties;
  orderBadge: CSSProperties;
  portName: CSSProperties;
  barContainer: CSSProperties;
  bar: CSSProperties;
  barFast: CSSProperties;
  barMedium: CSSProperties;
  barSlow: CSSProperties;
  barCached: CSSProperties;
  durationLabel: CSSProperties;
  statusIndicator: CSSProperties;
  slowIndicator: CSSProperties;
  cacheIndicator: CSSProperties;
  detailsPanel: CSSProperties;
  footer: CSSProperties;
}

/** Tree view specific styles */
interface TreeViewStyleDef {
  container: CSSProperties;
  header: CSSProperties;
  expandAllButton: CSSProperties;
  node: CSSProperties;
  nodeHover: CSSProperties;
  nodeSelected: CSSProperties;
  nodeSlow: CSSProperties;
  nodeCached: CSSProperties;
  expandToggle: CSSProperties;
  connectorVertical: CSSProperties;
  connectorHorizontal: CSSProperties;
  nodeContent: CSSProperties;
  durationSelf: CSSProperties;
  durationTotal: CSSProperties;
  childrenContainer: CSSProperties;
}

/** Summary stats styles */
interface SummaryStyleDef {
  container: CSSProperties;
  cardsGrid: CSSProperties;
  card: CSSProperties;
  cardLabel: CSSProperties;
  cardValue: CSSProperties;
  cardSubtext: CSSProperties;
  cardWarning: CSSProperties;
  sectionHeader: CSSProperties;
  barChart: CSSProperties;
  barRow: CSSProperties;
  barLabel: CSSProperties;
  bar: CSSProperties;
  barFast: CSSProperties;
  barMedium: CSSProperties;
  barSlow: CSSProperties;
  barValue: CSSProperties;
}

/** Controls bar styles */
interface ControlsStyleDef {
  container: CSSProperties;
  row: CSSProperties;
  filterGroup: CSSProperties;
  sortDropdown: CSSProperties;
  thresholdContainer: CSSProperties;
  thresholdSlider: CSSProperties;
  thresholdTrack: CSSProperties;
  thresholdThumb: CSSProperties;
  thresholdLabel: CSSProperties;
  statusBar: CSSProperties;
  recordingIndicator: CSSProperties;
  recordingDot: CSSProperties;
  activeFiltersBar: CSSProperties;
  filterTag: CSSProperties;
  filterTagRemove: CSSProperties;
}

/** Floating style properties */
interface FloatingStyleDef {
  container: CSSProperties;
  toggleButton: CSSProperties;
  toggleIcon: CSSProperties;
  panelWrapper: CSSProperties;
  panelHeader: CSSProperties;
  headerControls: CSSProperties;
  controlButton: CSSProperties;
  closeButton: CSSProperties;
  panelContent: CSSProperties;
  resizeHandle: CSSProperties;
  resizeEdgeTop: CSSProperties;
  resizeEdgeBottom: CSSProperties;
  resizeEdgeLeft: CSSProperties;
  resizeEdgeRight: CSSProperties;
}

// =============================================================================
// CSS Variables for Theming
// =============================================================================

/**
 * CSS custom properties (variables) for theming support.
 * These can be overridden by consumers for custom themes.
 */
export const cssVariables = `
  --hex-devtools-bg: #1e1e2e;
  --hex-devtools-bg-secondary: #2a2a3e;
  --hex-devtools-bg-hover: #3a3a4e;
  --hex-devtools-text: #cdd6f4;
  --hex-devtools-text-muted: #a6adc8;
  --hex-devtools-border: #45475a;
  --hex-devtools-accent: #89b4fa;
  --hex-devtools-singleton: #a6e3a1;
  --hex-devtools-scoped: #89b4fa;
  --hex-devtools-request: #fab387;
  --hex-devtools-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  /* Performance colors */
  --hex-devtools-fast: #a6e3a1;
  --hex-devtools-medium: #f9e2af;
  --hex-devtools-slow: #f38ba8;
  --hex-devtools-cached: #89dceb;

  /* Performance backgrounds (with transparency) */
  --hex-devtools-slow-bg: rgba(243, 139, 168, 0.1);
  --hex-devtools-cached-bg: rgba(137, 220, 235, 0.1);
  --hex-devtools-medium-bg: rgba(249, 226, 175, 0.1);

  /* Timeline specific */
  --hex-devtools-ruler: #585b70;
  --hex-devtools-threshold: #f38ba8;
`;

/**
 * Light theme CSS variables.
 */
export const cssVariablesLight = `
  --hex-devtools-bg: #eff1f5;
  --hex-devtools-bg-secondary: #e6e9ef;
  --hex-devtools-bg-hover: #dce0e8;
  --hex-devtools-text: #4c4f69;
  --hex-devtools-text-muted: #6c6f85;
  --hex-devtools-border: #ccd0da;
  --hex-devtools-accent: #1e66f5;
  --hex-devtools-singleton: #40a02b;
  --hex-devtools-scoped: #1e66f5;
  --hex-devtools-request: #fe640b;
  --hex-devtools-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

  /* Performance colors - light theme */
  --hex-devtools-fast: #40a02b;
  --hex-devtools-medium: #df8e1d;
  --hex-devtools-slow: #d20f39;
  --hex-devtools-cached: #04a5e5;

  /* Performance backgrounds (with transparency) */
  --hex-devtools-slow-bg: rgba(210, 15, 57, 0.1);
  --hex-devtools-cached-bg: rgba(4, 165, 229, 0.1);
  --hex-devtools-medium-bg: rgba(223, 142, 29, 0.1);

  /* Timeline specific */
  --hex-devtools-ruler: #9ca0b0;
  --hex-devtools-threshold: #d20f39;
`;

// =============================================================================
// Style Objects
// =============================================================================

/**
 * Base panel styles.
 */
export const panelStyles: PanelStyleDef = {
  container: {
    fontFamily: "var(--hex-devtools-font-mono, monospace)",
    fontSize: "13px",
    lineHeight: "1.5",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    color: "var(--hex-devtools-text, #cdd6f4)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    padding: "12px 16px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
    fontWeight: 600,
    fontSize: "14px",
  },
  content: {
    padding: "12px 16px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
  },
};

/**
 * Section header styles (collapsible).
 */
export const sectionStyles: SectionStyleDef = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
    cursor: "pointer",
    userSelect: "none",
    transition: "background-color 0.15s ease",
  },
  headerHover: {
    backgroundColor: "var(--hex-devtools-bg-hover, #3a3a4e)",
  },
  title: {
    fontWeight: 600,
    fontSize: "13px",
  },
  chevron: {
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    transition: "transform 0.15s ease",
  },
  chevronExpanded: {
    transform: "rotate(90deg)",
  },
  content: {
    padding: "12px 16px",
  },
};

/**
 * Node/adapter item styles.
 */
export const nodeStyles: NodeStyleDef = {
  item: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    marginBottom: "4px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "4px",
    gap: "8px",
  },
  name: {
    fontWeight: 500,
    flex: 1,
  },
  badge: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  badgeSingleton: {
    backgroundColor: "var(--hex-devtools-singleton, #a6e3a1)",
    color: "#1e1e2e",
  },
  badgeScoped: {
    backgroundColor: "var(--hex-devtools-scoped, #89b4fa)",
    color: "#1e1e2e",
  },
  badgeRequest: {
    backgroundColor: "var(--hex-devtools-request, #fab387)",
    color: "#1e1e2e",
  },
};

/**
 * Adapter detail styles for container browser.
 */
export const adapterStyles: AdapterStyleDef = {
  container: {
    marginBottom: "8px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  headerExpanded: {
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
  },
  portName: {
    fontWeight: 600,
    color: "var(--hex-devtools-accent, #89b4fa)",
  },
  details: {
    padding: "10px 12px",
    fontSize: "12px",
  },
  detailRow: {
    display: "flex",
    marginBottom: "6px",
  },
  detailLabel: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    marginRight: "8px",
    minWidth: "100px",
  },
  detailValue: {
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  dependencyList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  dependencyItem: {
    display: "inline-block",
    padding: "2px 8px",
    marginRight: "4px",
    marginBottom: "4px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    borderRadius: "4px",
    fontSize: "11px",
  },
};

/**
 * Edge/dependency visualization styles.
 */
export const edgeStyles: EdgeStyleDef = {
  container: {
    marginTop: "8px",
    paddingTop: "8px",
    borderTop: "1px solid var(--hex-devtools-border, #45475a)",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "4px 0",
    fontSize: "12px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  arrow: {
    margin: "0 8px",
    color: "var(--hex-devtools-accent, #89b4fa)",
  },
  fromNode: {
    fontWeight: 500,
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  toNode: {
    fontWeight: 500,
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
};

/**
 * Empty state styles.
 */
export const emptyStyles: EmptyStyleDef = {
  container: {
    textAlign: "center" as const,
    padding: "24px 16px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    fontSize: "12px",
  },
};

// =============================================================================
// Floating DevTools Styles (Task Group 8)
// =============================================================================

/**
 * Floating DevTools component styles.
 *
 * Provides styles for the toggle button, overlay panel, and positioning.
 */
export const floatingStyles: FloatingStyleDef = {
  /**
   * Main container - fixed positioning for floating behavior.
   */
  container: {
    position: "fixed",
    zIndex: 99999,
    fontFamily: "var(--hex-devtools-font-mono, monospace)",
  },

  /**
   * Toggle button - small fixed-position button (40x40px).
   */
  toggleButton: {
    width: "40px",
    height: "40px",
    borderRadius: "8px",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    color: "var(--hex-devtools-accent, #89b4fa)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    transition: "transform 0.15s ease, background-color 0.15s ease",
  },

  /**
   * Icon inside toggle button.
   */
  toggleIcon: {
    fontSize: "14px",
    fontWeight: 700,
  },

  /**
   * Panel wrapper - contains the header and content when expanded.
   */
  panelWrapper: {
    position: "relative",
    width: "400px",
    height: "500px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  /**
   * Panel header with close button.
   */
  panelHeader: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "4px 8px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
    gap: "4px",
  },

  /**
   * Header controls container (reset, fullscreen buttons).
   */
  headerControls: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },

  /**
   * Control button (reset, fullscreen).
   */
  controlButton: {
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 600,
    transition: "background-color 0.15s ease, color 0.15s ease",
  },

  /**
   * Close button in panel header.
   */
  closeButton: {
    width: "24px",
    height: "24px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: 600,
    transition: "background-color 0.15s ease, color 0.15s ease",
  },

  /**
   * Scrollable panel content area.
   */
  panelContent: {
    overflow: "auto",
    flex: 1,
  },

  /**
   * Resize handle at corner.
   */
  resizeHandle: {
    position: "absolute",
    width: "16px",
    height: "16px",
    cursor: "nwse-resize",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  /**
   * Top edge resize zone.
   */
  resizeEdgeTop: {
    position: "absolute",
    top: 0,
    left: "16px",
    right: "16px",
    height: "6px",
    cursor: "ns-resize",
    zIndex: 9,
  },

  /**
   * Bottom edge resize zone.
   */
  resizeEdgeBottom: {
    position: "absolute",
    bottom: 0,
    left: "16px",
    right: "16px",
    height: "6px",
    cursor: "ns-resize",
    zIndex: 9,
  },

  /**
   * Left edge resize zone.
   */
  resizeEdgeLeft: {
    position: "absolute",
    left: 0,
    top: "16px",
    bottom: "16px",
    width: "6px",
    cursor: "ew-resize",
    zIndex: 9,
  },

  /**
   * Right edge resize zone.
   */
  resizeEdgeRight: {
    position: "absolute",
    right: 0,
    top: "16px",
    bottom: "16px",
    width: "6px",
    cursor: "ew-resize",
    zIndex: 9,
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get badge style based on lifetime.
 */
export function getLifetimeBadgeStyle(lifetime: string): CSSProperties {
  const baseStyle = nodeStyles.badge;
  switch (lifetime) {
    case "singleton":
      return { ...baseStyle, ...nodeStyles.badgeSingleton };
    case "scoped":
      return { ...baseStyle, ...nodeStyles.badgeScoped };
    case "request":
      return { ...baseStyle, ...nodeStyles.badgeRequest };
    default:
      return baseStyle;
  }
}

/**
 * Get CSS class name for lifetime (for test assertions).
 */
export function getLifetimeClassName(lifetime: string): string {
  switch (lifetime) {
    case "singleton":
      return "hex-devtools-badge-singleton singleton";
    case "scoped":
      return "hex-devtools-badge-scoped scoped";
    case "request":
      return "hex-devtools-badge-request request";
    default:
      return "hex-devtools-badge";
  }
}

/**
 * Position type for floating DevTools.
 */
export type FloatingPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

// =============================================================================
// Container Inspector Styles (Task Group 4)
// =============================================================================

/** Container inspector style properties */
interface ContainerInspectorStyleDef {
  container: CSSProperties;
  header: CSSProperties;
  headerControls: CSSProperties;
  refreshButton: CSSProperties;
  autoRefreshToggle: CSSProperties;
  autoRefreshToggleActive: CSSProperties;
}

/** Scope tree style properties */
interface ScopeTreeStyleDef {
  container: CSSProperties;
  node: CSSProperties;
  nodeSelected: CSSProperties;
  nodeContent: CSSProperties;
  nodeIcon: CSSProperties;
  nodeIconContainer: CSSProperties;
  nodeIconScope: CSSProperties;
  nodeName: CSSProperties;
  nodeInfo: CSSProperties;
  nodeStatus: CSSProperties;
  nodeStatusActive: CSSProperties;
  nodeStatusDisposed: CSSProperties;
  expandButton: CSSProperties;
  childrenContainer: CSSProperties;
  treeLine: CSSProperties;
}

/** Service list style properties */
interface ServiceListStyleDef {
  container: CSSProperties;
  searchContainer: CSSProperties;
  searchInput: CSSProperties;
  searchClearButton: CSSProperties;
  filterContainer: CSSProperties;
  filterGroup: CSSProperties;
  filterButton: CSSProperties;
  filterButtonActive: CSSProperties;
  listContainer: CSSProperties;
  emptyState: CSSProperties;
}

/** Service item style properties */
interface ServiceItemStyleDef {
  container: CSSProperties;
  header: CSSProperties;
  headerExpanded: CSSProperties;
  statusIndicator: CSSProperties;
  statusResolved: CSSProperties;
  statusPending: CSSProperties;
  statusScopeRequired: CSSProperties;
  serviceName: CSSProperties;
  details: CSSProperties;
  detailRow: CSSProperties;
  detailLabel: CSSProperties;
  detailValue: CSSProperties;
}

/**
 * Container inspector main component styles.
 */
export const containerInspectorStyles: ContainerInspectorStyleDef = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  headerControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  refreshButton: {
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 500,
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  autoRefreshToggle: {
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 500,
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  autoRefreshToggleActive: {
    backgroundColor: "var(--hex-devtools-accent, #89b4fa)",
    border: "1px solid var(--hex-devtools-accent, #89b4fa)",
    color: "#1e1e2e",
  },
};

/**
 * Scope hierarchy tree styles.
 */
export const scopeTreeStyles: ScopeTreeStyleDef = {
  container: {
    marginBottom: "16px",
  },
  node: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  nodeSelected: {
    borderLeft: "3px solid var(--hex-devtools-accent, #89b4fa)",
    backgroundColor: "var(--hex-devtools-bg-hover, #3a3a4e)",
  },
  nodeContent: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    gap: "8px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    borderRadius: "4px",
  },
  nodeIcon: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
    borderRadius: "4px",
    backgroundColor: "var(--hex-devtools-singleton, #a6e3a1)",
    color: "#1e1e2e",
  },
  nodeIconContainer: {
    backgroundColor: "var(--hex-devtools-singleton, #a6e3a1)",
  },
  nodeIconScope: {
    backgroundColor: "var(--hex-devtools-scoped, #89b4fa)",
  },
  nodeName: {
    fontWeight: 600,
    flex: 1,
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  nodeInfo: {
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  nodeStatus: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  nodeStatusActive: {
    backgroundColor: "rgba(166, 227, 161, 0.2)",
    border: "1px solid var(--hex-devtools-singleton, #a6e3a1)",
    color: "var(--hex-devtools-singleton, #a6e3a1)",
  },
  nodeStatusDisposed: {
    backgroundColor: "rgba(243, 139, 168, 0.2)",
    border: "1px solid #f38ba8",
    color: "#f38ba8",
  },
  expandButton: {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    marginRight: "4px",
  },
  childrenContainer: {
    marginLeft: "24px",
    borderLeft: "1px solid var(--hex-devtools-border, #45475a)",
    paddingLeft: "8px",
  },
  treeLine: {
    position: "absolute",
    left: "32px",
    top: "36px",
    bottom: 0,
    width: "1px",
    backgroundColor: "var(--hex-devtools-border, #45475a)",
  },
};

/**
 * Resolved services list styles.
 */
export const serviceListStyles: ServiceListStyleDef = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  searchContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchInput: {
    width: "100%",
    padding: "8px 32px 8px 12px",
    fontSize: "12px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text, #cdd6f4)",
    fontFamily: "var(--hex-devtools-font-mono, monospace)",
    outline: "none",
    transition: "border-color 0.15s ease",
  },
  searchClearButton: {
    position: "absolute",
    right: "8px",
    padding: "4px",
    fontSize: "12px",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  filterContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  filterGroup: {
    display: "flex",
    gap: "4px",
  },
  filterButton: {
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  filterButtonActive: {
    backgroundColor: "var(--hex-devtools-accent, #89b4fa)",
    border: "1px solid var(--hex-devtools-accent, #89b4fa)",
    color: "#1e1e2e",
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  emptyState: {
    textAlign: "center",
    padding: "24px 16px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    fontSize: "12px",
  },
};

/**
 * Service item (row) styles.
 */
export const serviceItemStyles: ServiceItemStyleDef = {
  container: {
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    gap: "8px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  headerExpanded: {
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
  },
  statusIndicator: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusResolved: {
    backgroundColor: "var(--hex-devtools-resolved, #a6e3a1)",
  },
  statusPending: {
    backgroundColor: "transparent",
    border: "2px solid var(--hex-devtools-pending, #6c7086)",
  },
  statusScopeRequired: {
    backgroundColor: "transparent",
    border: "2px solid var(--hex-devtools-request, #fab387)",
  },
  serviceName: {
    flex: 1,
    fontWeight: 600,
    color: "var(--hex-devtools-accent, #89b4fa)",
  },
  details: {
    padding: "10px 12px",
    fontSize: "12px",
  },
  detailRow: {
    display: "flex",
    marginBottom: "6px",
  },
  detailLabel: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    marginRight: "8px",
    minWidth: "100px",
  },
  detailValue: {
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
};

/**
 * Get status indicator style based on resolution status.
 *
 * @param isResolved - Whether the service is resolved
 * @param isScopeRequired - Whether the service requires a scope
 * @returns CSS properties for the status indicator
 */
export function getStatusIndicatorStyle(
  isResolved: boolean,
  isScopeRequired: boolean
): CSSProperties {
  const baseStyle = serviceItemStyles.statusIndicator;
  if (isScopeRequired) {
    return { ...baseStyle, ...serviceItemStyles.statusScopeRequired };
  }
  if (isResolved) {
    return { ...baseStyle, ...serviceItemStyles.statusResolved };
  }
  return { ...baseStyle, ...serviceItemStyles.statusPending };
}

/**
 * Get position-specific styles based on the position prop.
 *
 * @param position - The desired position of the floating DevTools
 * @returns CSS properties for positioning
 */
export function getPositionStyles(position: FloatingPosition): CSSProperties {
  const offset = "16px";

  switch (position) {
    case "bottom-right":
      return {
        bottom: offset,
        right: offset,
      };
    case "bottom-left":
      return {
        bottom: offset,
        left: offset,
      };
    case "top-right":
      return {
        top: offset,
        right: offset,
      };
    case "top-left":
      return {
        top: offset,
        left: offset,
      };
    default:
      // Default to bottom-right
      return {
        bottom: offset,
        right: offset,
      };
  }
}

// =============================================================================
// Resolution Tracing Styles
// =============================================================================

/**
 * Resolution tracing main container styles.
 */
export const tracingStyles: TracingStyleDef = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  viewToggleContainer: {
    display: "flex",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
    marginBottom: "12px",
  },
  viewToggleTab: {
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    transition: "color 0.15s ease, border-color 0.15s ease",
  },
  viewToggleTabActive: {
    color: "var(--hex-devtools-accent, #89b4fa)",
    borderBottom: "2px solid var(--hex-devtools-accent, #89b4fa)",
  },
  viewContent: {
    minHeight: "200px",
  },
};

/**
 * Timeline view styles.
 */
export const timelineStyles: TimelineStyleDef = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  ruler: {
    position: "relative",
    height: "24px",
    borderBottom: "1px solid var(--hex-devtools-ruler, #585b70)",
    marginBottom: "8px",
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  rulerTick: {
    position: "absolute",
    top: "16px",
    width: "1px",
    height: "8px",
    backgroundColor: "var(--hex-devtools-ruler, #585b70)",
  },
  rulerLabel: {
    position: "absolute",
    top: "2px",
    fontSize: "9px",
    transform: "translateX(-50%)",
  },
  thresholdLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "1px",
    backgroundColor: "var(--hex-devtools-threshold, #f38ba8)",
    borderStyle: "dashed",
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "6px 12px",
    gap: "8px",
    backgroundColor: "transparent",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  rowHover: {
    backgroundColor: "var(--hex-devtools-bg-hover, #3a3a4e)",
  },
  rowExpanded: {
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderLeft: "3px solid var(--hex-devtools-accent, #89b4fa)",
  },
  rowSlow: {
    backgroundColor: "var(--hex-devtools-slow-bg)",
    borderLeft: "3px solid var(--hex-devtools-slow, #f38ba8)",
  },
  rowCached: {
    backgroundColor: "var(--hex-devtools-cached-bg)",
  },
  orderBadge: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    minWidth: "24px",
  },
  portName: {
    fontWeight: 600,
    color: "var(--hex-devtools-accent, #89b4fa)",
    flex: "0 0 140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  barContainer: {
    flex: 1,
    position: "relative",
    height: "16px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    borderRadius: "2px",
  },
  bar: {
    position: "absolute",
    top: "2px",
    height: "12px",
    borderRadius: "2px",
    minWidth: "4px",
    transition: "width 0.3s ease, left 0.3s ease",
  },
  barFast: {
    backgroundColor: "var(--hex-devtools-fast, #a6e3a1)",
  },
  barMedium: {
    backgroundColor: "var(--hex-devtools-medium, #f9e2af)",
  },
  barSlow: {
    backgroundColor: "var(--hex-devtools-slow, #f38ba8)",
  },
  barCached: {
    backgroundColor: "var(--hex-devtools-cached, #89dceb)",
  },
  durationLabel: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--hex-devtools-text, #cdd6f4)",
    minWidth: "50px",
    textAlign: "right",
  },
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "10px",
  },
  slowIndicator: {
    color: "var(--hex-devtools-slow, #f38ba8)",
    fontWeight: 600,
  },
  cacheIndicator: {
    color: "var(--hex-devtools-cached, #89dceb)",
    fontWeight: 600,
  },
  detailsPanel: {
    marginTop: "8px",
    marginLeft: "32px",
    padding: "12px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    borderRadius: "4px",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    fontSize: "12px",
  },
  footer: {
    display: "flex",
    gap: "16px",
    padding: "12px",
    marginTop: "8px",
    borderTop: "1px solid var(--hex-devtools-border, #45475a)",
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
};

/**
 * Tree view styles.
 */
export const treeViewStyles: TreeViewStyleDef = {
  container: {
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  expandAllButton: {
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: 500,
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
  },
  node: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  nodeHover: {
    backgroundColor: "var(--hex-devtools-bg-hover, #3a3a4e)",
  },
  nodeSelected: {
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderLeft: "3px solid var(--hex-devtools-accent, #89b4fa)",
  },
  nodeSlow: {
    backgroundColor: "var(--hex-devtools-slow-bg)",
    borderLeft: "3px solid var(--hex-devtools-slow, #f38ba8)",
  },
  nodeCached: {
    backgroundColor: "var(--hex-devtools-cached-bg)",
  },
  expandToggle: {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    marginRight: "4px",
  },
  connectorVertical: {
    position: "absolute",
    left: "7px",
    top: "24px",
    bottom: 0,
    width: "1px",
    backgroundColor: "var(--hex-devtools-border, #45475a)",
  },
  connectorHorizontal: {
    position: "absolute",
    left: "7px",
    top: "12px",
    width: "12px",
    height: "1px",
    backgroundColor: "var(--hex-devtools-border, #45475a)",
  },
  nodeContent: {
    display: "flex",
    alignItems: "center",
    padding: "6px 8px",
    gap: "8px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "background-color 0.15s ease",
  },
  durationSelf: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  durationTotal: {
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  childrenContainer: {
    marginLeft: "24px",
    borderLeft: "1px solid var(--hex-devtools-border, #45475a)",
    paddingLeft: "8px",
  },
};

/**
 * Summary stats view styles.
 */
export const summaryStyles: SummaryStyleDef = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
  },
  card: {
    padding: "12px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "6px",
    border: "1px solid var(--hex-devtools-border, #45475a)",
  },
  cardLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  cardValue: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  cardSubtext: {
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    marginTop: "2px",
  },
  cardWarning: {
    backgroundColor: "var(--hex-devtools-slow-bg)",
    borderColor: "var(--hex-devtools-slow, #f38ba8)",
  },
  sectionHeader: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--hex-devtools-text, #cdd6f4)",
    marginBottom: "8px",
  },
  barChart: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  barLabel: {
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    minWidth: "60px",
  },
  bar: {
    height: "16px",
    borderRadius: "2px",
    minWidth: "4px",
    transition: "width 0.3s ease",
  },
  barFast: {
    backgroundColor: "var(--hex-devtools-fast, #a6e3a1)",
  },
  barMedium: {
    backgroundColor: "var(--hex-devtools-medium, #f9e2af)",
  },
  barSlow: {
    backgroundColor: "var(--hex-devtools-slow, #f38ba8)",
  },
  barValue: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--hex-devtools-text, #cdd6f4)",
    minWidth: "30px",
  },
};

/**
 * Controls bar styles.
 */
export const controlsStyles: ControlsStyleDef = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px 0",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
    marginBottom: "12px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  sortDropdown: {
    padding: "4px 24px 4px 8px",
    fontSize: "12px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text, #cdd6f4)",
    cursor: "pointer",
    appearance: "none",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  },
  thresholdContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  thresholdSlider: {
    width: "120px",
    height: "4px",
    borderRadius: "2px",
    appearance: "none",
    background: "linear-gradient(to right, var(--hex-devtools-fast), var(--hex-devtools-medium), var(--hex-devtools-slow))",
    cursor: "pointer",
  },
  thresholdTrack: {
    height: "4px",
    borderRadius: "2px",
  },
  thresholdThumb: {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: "var(--hex-devtools-text, #cdd6f4)",
    border: "2px solid var(--hex-devtools-bg, #1e1e2e)",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
    cursor: "pointer",
  },
  thresholdLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--hex-devtools-text, #cdd6f4)",
    minWidth: "45px",
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "8px 12px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "4px",
    fontSize: "11px",
  },
  recordingIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 600,
    color: "var(--hex-devtools-slow, #f38ba8)",
  },
  recordingDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "var(--hex-devtools-slow, #f38ba8)",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  activeFiltersBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 0",
    flexWrap: "wrap",
  },
  filterTag: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "2px 8px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "12px",
    fontSize: "10px",
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  filterTagRemove: {
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    padding: "0 2px",
  },
};

// =============================================================================
// Resolution Tracing Utility Functions
// =============================================================================

/**
 * Get bar color style based on duration and threshold.
 *
 * @param durationMs - Duration in milliseconds
 * @param thresholdMs - Slow threshold in milliseconds
 * @param isCacheHit - Whether the resolution was served from cache
 * @returns CSS properties for the performance bar
 */
export function getPerformanceBarStyle(
  durationMs: number,
  thresholdMs: number,
  isCacheHit: boolean
): CSSProperties {
  if (isCacheHit) {
    return timelineStyles.barCached;
  }
  if (durationMs >= thresholdMs) {
    return timelineStyles.barSlow;
  }
  if (durationMs >= thresholdMs * 0.5) {
    return timelineStyles.barMedium;
  }
  return timelineStyles.barFast;
}

/**
 * Get row style based on trace state.
 *
 * @param isExpanded - Whether the row is expanded
 * @param isSlow - Whether the trace is slow
 * @param isCacheHit - Whether the resolution was served from cache
 * @returns CSS properties for the trace row
 */
export function getTraceRowStyle(
  isExpanded: boolean,
  isSlow: boolean,
  isCacheHit: boolean
): CSSProperties {
  let style: CSSProperties = { ...timelineStyles.row };

  if (isSlow) {
    style = { ...style, ...timelineStyles.rowSlow };
  } else if (isCacheHit) {
    style = { ...style, ...timelineStyles.rowCached };
  }

  if (isExpanded) {
    style = { ...style, ...timelineStyles.rowExpanded };
  }

  return style;
}

/**
 * Format duration for display.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 0.1) {
    return "<0.1ms";
  }
  if (ms < 10) {
    return `${ms.toFixed(1)}ms`;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}
