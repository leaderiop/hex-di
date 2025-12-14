/**
 * TreeView React component for Resolution Tracing.
 *
 * Displays dependency resolution chains in a hierarchical tree structure,
 * grouped by root resolution. Features include expand/collapse controls,
 * tree connectors, self/total time display modes, visual states for
 * cached and slow traces, and full keyboard navigation support.
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactElement,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { TraceEntry } from "../tracing/types.js";
import {
  treeViewStyles,
  emptyStyles,
  formatDuration,
  getLifetimeBadgeStyle,
} from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Time display mode for tree nodes.
 */
export type TimeDisplayMode = "self" | "total";

/**
 * Props for the TreeView component.
 */
export interface TreeViewProps {
  /** Trace entries to display */
  readonly traces: readonly TraceEntry[];
  /** Slow threshold in milliseconds */
  readonly threshold: number;
  /** Time display mode (self or total) */
  readonly timeDisplayMode: TimeDisplayMode;
  /** Callback when a trace is selected */
  readonly onTraceSelect: (traceId: string) => void;
  /** Callback to navigate to timeline view */
  readonly onViewInTimeline: (traceId: string) => void;
  /** Callback when time display mode changes */
  readonly onTimeDisplayModeChange?: (mode: TimeDisplayMode) => void;
}

/**
 * Internal tree node structure built from traces.
 */
interface TreeNodeData {
  readonly trace: TraceEntry;
  readonly children: readonly TreeNodeData[];
  readonly depth: number;
  readonly totalDuration: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build tree structure from flat trace array.
 * Returns only root nodes (traces without parents).
 */
function buildTreeFromTraces(traces: readonly TraceEntry[]): readonly TreeNodeData[] {
  const traceMap = new Map<string, TraceEntry>();
  for (const trace of traces) {
    traceMap.set(trace.id, trace);
  }

  /**
   * Calculate total duration for a trace including all children.
   */
  function calculateTotalDuration(trace: TraceEntry): number {
    let total = trace.duration;
    for (const childId of trace.childTraceIds) {
      const child = traceMap.get(childId);
      if (child) {
        total += calculateTotalDuration(child);
      }
    }
    return total;
  }

  /**
   * Build tree node recursively.
   */
  function buildNode(trace: TraceEntry, depth: number): TreeNodeData {
    const children: TreeNodeData[] = [];
    for (const childId of trace.childTraceIds) {
      const childTrace = traceMap.get(childId);
      if (childTrace) {
        children.push(buildNode(childTrace, depth + 1));
      }
    }

    return {
      trace,
      children,
      depth,
      totalDuration: calculateTotalDuration(trace),
    };
  }

  // Find root traces (no parent)
  const rootTraces = traces.filter((trace) => trace.parentTraceId === null);

  return rootTraces.map((trace) => buildNode(trace, 0));
}

/**
 * Get all visible node IDs in tree order for keyboard navigation.
 */
function getVisibleNodeIds(
  nodes: readonly TreeNodeData[],
  expandedIds: Set<string>
): string[] {
  const result: string[] = [];

  function traverse(nodeList: readonly TreeNodeData[]): void {
    for (const node of nodeList) {
      result.push(node.trace.id);
      if (expandedIds.has(node.trace.id) && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return result;
}

/**
 * Find parent trace ID for a given trace.
 */
function findParentId(
  traceId: string,
  nodes: readonly TreeNodeData[]
): string | null {
  function search(
    nodeList: readonly TreeNodeData[],
    parentId: string | null
  ): string | null {
    for (const node of nodeList) {
      if (node.trace.id === traceId) {
        return parentId;
      }
      const found = search(node.children, node.trace.id);
      if (found !== null || node.children.some((c) => c.trace.id === traceId)) {
        return found ?? node.trace.id;
      }
    }
    return null;
  }

  return search(nodes, null);
}

// =============================================================================
// Local Styles
// =============================================================================

const localStyles: {
  readonly header: CSSProperties;
  readonly headerButton: CSSProperties;
  readonly headerSpacer: CSSProperties;
  readonly timeModeToggle: CSSProperties;
  readonly timeModeToggleActive: CSSProperties;
  readonly nodeRow: CSSProperties;
  readonly nodeRowHover: CSSProperties;
  readonly expandToggle: CSSProperties;
  readonly portName: CSSProperties;
  readonly duration: CSSProperties;
  readonly durationSlow: CSSProperties;
  readonly indicator: CSSProperties;
  readonly indicatorCached: CSSProperties;
  readonly indicatorSlow: CSSProperties;
  readonly lifetimeBadge: CSSProperties;
  readonly childrenContainer: CSSProperties;
  readonly emptyState: CSSProperties;
} = {
  header: {
    ...treeViewStyles.header,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
  },
  headerButton: {
    ...treeViewStyles.expandAllButton,
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: 500,
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
  },
  headerSpacer: {
    flex: 1,
  },
  timeModeToggle: {
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: 500,
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
  },
  timeModeToggleActive: {
    backgroundColor: "var(--hex-devtools-accent, #89b4fa)",
    borderColor: "var(--hex-devtools-accent, #89b4fa)",
    color: "#1e1e2e",
  },
  nodeRow: {
    ...treeViewStyles.nodeContent,
    display: "flex",
    alignItems: "center",
    padding: "6px 8px",
    gap: "8px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "background-color 0.15s ease",
    outline: "none",
  },
  nodeRowHover: {
    backgroundColor: "var(--hex-devtools-bg-hover, #3a3a4e)",
  },
  expandToggle: {
    ...treeViewStyles.expandToggle,
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "2px",
    cursor: "pointer",
    padding: 0,
    marginRight: "4px",
    flexShrink: 0,
  },
  portName: {
    fontWeight: 600,
    color: "var(--hex-devtools-accent, #89b4fa)",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  duration: {
    ...treeViewStyles.durationSelf,
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--hex-devtools-text, #cdd6f4)",
    minWidth: "50px",
    textAlign: "right",
  },
  durationSlow: {
    color: "var(--hex-devtools-slow, #f38ba8)",
    fontWeight: 700,
  },
  indicator: {
    fontSize: "10px",
    fontWeight: 600,
    marginLeft: "4px",
  },
  indicatorCached: {
    color: "var(--hex-devtools-cached, #89dceb)",
  },
  indicatorSlow: {
    color: "var(--hex-devtools-slow, #f38ba8)",
  },
  lifetimeBadge: {
    fontSize: "9px",
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  childrenContainer: {
    ...treeViewStyles.childrenContainer,
    marginLeft: "24px",
    borderLeft: "1px solid var(--hex-devtools-border, #45475a)",
    paddingLeft: "8px",
  },
  emptyState: {
    ...emptyStyles.container,
    padding: "24px 16px",
    textAlign: "center",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
};

// =============================================================================
// TreeNode Component
// =============================================================================

/**
 * Props for the TreeNode component.
 */
interface TreeNodeProps {
  readonly node: TreeNodeData;
  readonly threshold: number;
  readonly timeDisplayMode: TimeDisplayMode;
  readonly expandedIds: Set<string>;
  readonly focusedId: string | null;
  readonly onToggle: (id: string) => void;
  readonly onSelect: (id: string) => void;
  readonly onFocus: (id: string) => void;
}

/**
 * TreeNode component renders a single node and its children recursively.
 */
function TreeNode({
  node,
  threshold,
  timeDisplayMode,
  expandedIds,
  focusedId,
  onToggle,
  onSelect,
  onFocus,
}: TreeNodeProps): ReactElement {
  const { trace, children, totalDuration } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(trace.id);
  const isSlow = trace.duration >= threshold;
  const isCached = trace.isCacheHit;
  const isFocused = focusedId === trace.id;

  const displayDuration =
    timeDisplayMode === "self" ? trace.duration : totalDuration;

  // Node container style based on state
  const nodeContainerStyle: CSSProperties = {
    ...treeViewStyles.node,
    ...(isSlow ? treeViewStyles.nodeSlow : {}),
    ...(isCached ? treeViewStyles.nodeCached : {}),
  };

  // Node row style
  const nodeRowStyle: CSSProperties = {
    ...localStyles.nodeRow,
    ...(isFocused
      ? { backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)" }
      : {}),
  };

  // Duration style
  const durationStyle: CSSProperties = {
    ...localStyles.duration,
    ...(isSlow ? localStyles.durationSlow : {}),
  };

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(trace.id);
    },
    [trace.id, onToggle]
  );

  const handleRowClick = useCallback(() => {
    onSelect(trace.id);
  }, [trace.id, onSelect]);

  const handleFocus = useCallback(() => {
    onFocus(trace.id);
  }, [trace.id, onFocus]);

  return (
    <div
      data-testid={`tree-node-${trace.id}`}
      data-slow={isSlow ? "true" : undefined}
      data-cached={isCached ? "true" : undefined}
      style={nodeContainerStyle}
    >
      {/* Node Content Row */}
      <div
        data-testid={`tree-node-content-${trace.id}`}
        style={nodeRowStyle}
        onClick={handleRowClick}
        onFocus={handleFocus}
        tabIndex={0}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isFocused}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren ? (
          <button
            data-testid={`tree-expand-${trace.id}`}
            style={localStyles.expandToggle}
            onClick={handleToggleClick}
            type="button"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "-" : "+"}
          </button>
        ) : (
          <span style={{ width: "20px" }} /> // Spacer for alignment
        )}

        {/* Port Name */}
        <span style={localStyles.portName}>{trace.portName}</span>

        {/* Duration */}
        <span
          data-testid={`tree-node-duration-${trace.id}`}
          style={durationStyle}
        >
          {formatDuration(displayDuration)}
        </span>

        {/* Status Indicators */}
        {isCached && (
          <span
            data-testid={`tree-node-cached-${trace.id}`}
            style={{ ...localStyles.indicator, ...localStyles.indicatorCached }}
            title="Cache hit"
          >
            [*]
          </span>
        )}
        {isSlow && (
          <span
            data-testid={`tree-node-slow-${trace.id}`}
            style={{ ...localStyles.indicator, ...localStyles.indicatorSlow }}
            title="Slow resolution"
          >
            [!]
          </span>
        )}

        {/* Lifetime Badge */}
        <span
          data-testid={`tree-node-lifetime-${trace.id}`}
          style={getLifetimeBadgeStyle(trace.lifetime)}
        >
          {trace.lifetime}
        </span>
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div
          data-testid={`tree-children-${trace.id}`}
          style={localStyles.childrenContainer}
          role="group"
        >
          {children.map((child) => (
            <TreeNode
              key={child.trace.id}
              node={child}
              threshold={threshold}
              timeDisplayMode={timeDisplayMode}
              expandedIds={expandedIds}
              focusedId={focusedId}
              onToggle={onToggle}
              onSelect={onSelect}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TreeViewHeader Component
// =============================================================================

interface TreeViewHeaderProps {
  readonly timeDisplayMode: TimeDisplayMode;
  readonly onExpandAll: () => void;
  readonly onCollapseAll: () => void;
  readonly onTimeDisplayModeChange: (mode: TimeDisplayMode) => void;
}

function TreeViewHeader({
  timeDisplayMode,
  onExpandAll,
  onCollapseAll,
  onTimeDisplayModeChange,
}: TreeViewHeaderProps): ReactElement {
  const selfButtonStyle: CSSProperties = {
    ...localStyles.timeModeToggle,
    ...(timeDisplayMode === "self" ? localStyles.timeModeToggleActive : {}),
  };

  const totalButtonStyle: CSSProperties = {
    ...localStyles.timeModeToggle,
    ...(timeDisplayMode === "total" ? localStyles.timeModeToggleActive : {}),
  };

  return (
    <div style={localStyles.header}>
      <button
        data-testid="tree-expand-all"
        style={localStyles.headerButton}
        onClick={onExpandAll}
        type="button"
        aria-label="Expand all nodes"
      >
        Expand All
      </button>
      <button
        data-testid="tree-collapse-all"
        style={localStyles.headerButton}
        onClick={onCollapseAll}
        type="button"
        aria-label="Collapse all nodes"
      >
        Collapse All
      </button>

      <span style={localStyles.headerSpacer} />

      <span style={{ fontSize: "10px", color: "var(--hex-devtools-text-muted)" }}>
        Show:
      </span>
      <button
        data-testid="tree-time-mode-toggle"
        style={selfButtonStyle}
        onClick={() =>
          onTimeDisplayModeChange(timeDisplayMode === "self" ? "total" : "self")
        }
        type="button"
        aria-pressed={timeDisplayMode === "self"}
      >
        Self
      </button>
      <button
        data-testid="tree-time-mode-total"
        style={totalButtonStyle}
        onClick={() => onTimeDisplayModeChange("total")}
        type="button"
        aria-pressed={timeDisplayMode === "total"}
      >
        Total
      </button>
    </div>
  );
}

// =============================================================================
// TreeView Component
// =============================================================================

/**
 * TreeView component for hierarchical dependency chain visualization.
 *
 * Features:
 * - Hierarchical tree structure grouped by root resolution
 * - Expand/collapse controls with [Expand All] [Collapse All] buttons
 * - 24px indentation per nesting level
 * - Self-time vs total-time display toggle
 * - Visual states: cached (cyan tint), slow (red border)
 * - Full keyboard navigation (Arrow keys, Enter/Space, Home/End)
 *
 * @param props - The component props
 * @returns A React element containing the tree view
 *
 * @example
 * ```tsx
 * function TracingTreeTab() {
 *   const [timeMode, setTimeMode] = useState<TimeDisplayMode>("self");
 *
 *   return (
 *     <TreeView
 *       traces={traces}
 *       threshold={50}
 *       timeDisplayMode={timeMode}
 *       onTraceSelect={(id) => console.log("Selected:", id)}
 *       onViewInTimeline={(id) => navigateToTimeline(id)}
 *       onTimeDisplayModeChange={setTimeMode}
 *     />
 *   );
 * }
 * ```
 */
export function TreeView({
  traces,
  threshold,
  timeDisplayMode,
  onTraceSelect,
  onViewInTimeline,
  onTimeDisplayModeChange,
}: TreeViewProps): ReactElement {
  // Build tree structure from flat traces
  const treeNodes = useMemo(() => buildTreeFromTraces(traces), [traces]);

  // Expanded node IDs state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Focused node ID for keyboard navigation
  // Initialize to first root node if available
  const firstNodeId = treeNodes.length > 0 ? treeNodes[0]?.trace.id : null;
  const [focusedId, setFocusedId] = useState<string | null>(firstNodeId ?? null);

  // Ref to the tree container for keyboard event handling
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Get all node IDs for expand/collapse all
  const allNodeIds = useMemo(() => {
    const ids: string[] = [];
    function collectIds(nodes: readonly TreeNodeData[]): void {
      for (const node of nodes) {
        if (node.children.length > 0) {
          ids.push(node.trace.id);
        }
        collectIds(node.children);
      }
    }
    collectIds(treeNodes);
    return ids;
  }, [treeNodes]);

  // Get visible node IDs for keyboard navigation
  const visibleNodeIds = useMemo(
    () => getVisibleNodeIds(treeNodes, expandedIds),
    [treeNodes, expandedIds]
  );

  // Toggle node expand/collapse
  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select node
  const handleSelect = useCallback(
    (id: string) => {
      setFocusedId(id);
      onTraceSelect(id);
    },
    [onTraceSelect]
  );

  // Focus node
  const handleFocus = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(allNodeIds));
  }, [allNodeIds]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Handle time display mode change
  const handleTimeDisplayModeChange = useCallback(
    (mode: TimeDisplayMode) => {
      if (onTimeDisplayModeChange) {
        onTimeDisplayModeChange(mode);
      }
    },
    [onTimeDisplayModeChange]
  );

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (focusedId === null && visibleNodeIds.length > 0) {
        const firstVisibleId = visibleNodeIds[0];
        if (firstVisibleId !== undefined) {
          setFocusedId(firstVisibleId);
        }
        return;
      }

      if (focusedId === null) {
        return;
      }

      const currentIndex = visibleNodeIds.indexOf(focusedId);
      if (currentIndex === -1) {
        return;
      }

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (currentIndex < visibleNodeIds.length - 1) {
            const nextId = visibleNodeIds[currentIndex + 1];
            if (nextId !== undefined) {
              setFocusedId(nextId);
              // Focus the element
              const element = document.querySelector(
                `[data-testid="tree-node-content-${nextId}"]`
              );
              if (element instanceof HTMLElement) {
                element.focus();
              }
            }
          }
          break;
        }

        case "ArrowUp": {
          e.preventDefault();
          if (currentIndex > 0) {
            const prevId = visibleNodeIds[currentIndex - 1];
            if (prevId !== undefined) {
              setFocusedId(prevId);
              const element = document.querySelector(
                `[data-testid="tree-node-content-${prevId}"]`
              );
              if (element instanceof HTMLElement) {
                element.focus();
              }
            }
          }
          break;
        }

        case "ArrowRight": {
          e.preventDefault();
          const isExpanded = expandedIds.has(focusedId);
          const hasChildren = allNodeIds.includes(focusedId);

          if (hasChildren && !isExpanded) {
            // Expand the node
            handleToggle(focusedId);
          } else if (isExpanded) {
            // Move to first child
            const updatedVisible = getVisibleNodeIds(
              treeNodes,
              new Set([...expandedIds, focusedId])
            );
            const focusedIndex = updatedVisible.indexOf(focusedId);
            if (focusedIndex < updatedVisible.length - 1) {
              const nextId = updatedVisible[focusedIndex + 1];
              if (nextId !== undefined) {
                setFocusedId(nextId);
                const element = document.querySelector(
                  `[data-testid="tree-node-content-${nextId}"]`
                );
                if (element instanceof HTMLElement) {
                  element.focus();
                }
              }
            }
          }
          break;
        }

        case "ArrowLeft": {
          e.preventDefault();
          const isExpanded = expandedIds.has(focusedId);
          const hasChildren = allNodeIds.includes(focusedId);

          if (hasChildren && isExpanded) {
            // Collapse the node
            handleToggle(focusedId);
          } else {
            // Move to parent
            const parentId = findParentId(focusedId, treeNodes);
            if (parentId !== null) {
              setFocusedId(parentId);
              const element = document.querySelector(
                `[data-testid="tree-node-content-${parentId}"]`
              );
              if (element instanceof HTMLElement) {
                element.focus();
              }
            }
          }
          break;
        }

        case "Enter":
        case " ": {
          e.preventDefault();
          if (allNodeIds.includes(focusedId)) {
            handleToggle(focusedId);
          }
          break;
        }

        case "Home": {
          e.preventDefault();
          if (visibleNodeIds.length > 0) {
            const homeId = visibleNodeIds[0];
            if (homeId !== undefined) {
              setFocusedId(homeId);
              const element = document.querySelector(
                `[data-testid="tree-node-content-${homeId}"]`
              );
              if (element instanceof HTMLElement) {
                element.focus();
              }
            }
          }
          break;
        }

        case "End": {
          e.preventDefault();
          if (visibleNodeIds.length > 0) {
            const lastId = visibleNodeIds[visibleNodeIds.length - 1];
            if (lastId !== undefined) {
              setFocusedId(lastId);
              const element = document.querySelector(
                `[data-testid="tree-node-content-${lastId}"]`
              );
              if (element instanceof HTMLElement) {
                element.focus();
              }
            }
          }
          break;
        }

        default:
          break;
      }
    },
    [
      focusedId,
      visibleNodeIds,
      expandedIds,
      allNodeIds,
      handleToggle,
      treeNodes,
    ]
  );

  // Empty state
  if (traces.length === 0 || treeNodes.length === 0) {
    return (
      <div data-testid="tree-view" style={treeViewStyles.container}>
        <div data-testid="tree-view-empty" style={localStyles.emptyState}>
          <div style={{ fontWeight: 500, marginBottom: "8px" }}>
            No dependency chains recorded.
          </div>
          <div style={{ fontSize: "12px", maxWidth: "280px", margin: "0 auto" }}>
            Resolution chains show when services with dependencies are resolved.
            The tree displays the order of resolution.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="tree-view"
      ref={treeContainerRef}
      style={treeViewStyles.container}
      onKeyDown={handleKeyDown}
      role="tree"
      aria-label="Dependency resolution tree"
    >
      {/* Header Controls */}
      <TreeViewHeader
        timeDisplayMode={timeDisplayMode}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onTimeDisplayModeChange={handleTimeDisplayModeChange}
      />

      {/* Tree Nodes */}
      {treeNodes.map((node) => (
        <TreeNode
          key={node.trace.id}
          node={node}
          threshold={threshold}
          timeDisplayMode={timeDisplayMode}
          expandedIds={expandedIds}
          focusedId={focusedId}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onFocus={handleFocus}
        />
      ))}

      {/* Footer Summary */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "8px",
          borderTop: "1px solid var(--hex-devtools-border, #45475a)",
          fontSize: "11px",
          color: "var(--hex-devtools-text-muted, #a6adc8)",
        }}
      >
        {treeNodes.length} root resolution{treeNodes.length !== 1 ? "s" : ""} |{" "}
        {traces.length} total trace{traces.length !== 1 ? "s" : ""} |{" "}
        {traces.filter((t) => t.isCacheHit).length} cache hit
        {traces.filter((t) => t.isCacheHit).length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
