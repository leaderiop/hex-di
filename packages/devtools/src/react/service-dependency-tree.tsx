/**
 * ServiceDependencyTree React component for hierarchical service visualization.
 *
 * Displays services in a tree structure based on their dependency relationships.
 * Root nodes are foundational services (no dependencies), with dependent services
 * as children, recursively.
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
import type { TracingAPI } from "../tracing/types.js";
import type { ServiceTreeNode } from "./services-tree.js";
import {
  getVisibleServiceIds,
  getAllExpandableIds,
  findParentServiceId,
} from "./services-tree.js";
import { getLifetimeBadgeStyle } from "./styles.js";
import { useServicePerformance } from "./service-performance.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ServiceDependencyTree component.
 */
export interface ServiceDependencyTreeProps {
  /** Tree nodes to display */
  readonly treeNodes: readonly ServiceTreeNode[];
  /** Optional tracing API for performance data */
  readonly tracingAPI?: TracingAPI | undefined;
  /** Callback when a service is selected */
  readonly onServiceSelect?: ((portName: string) => void) | undefined;
}

/**
 * Props for the TreeNodeComponent.
 */
interface TreeNodeComponentProps {
  readonly node: ServiceTreeNode;
  readonly tracingAPI?: TracingAPI | undefined;
  readonly expandedIds: Set<string>;
  readonly focusedId: string | null;
  readonly onToggle: (id: string) => void;
  readonly onSelect: (id: string) => void;
  readonly onFocus: (id: string) => void;
}

// =============================================================================
// Styles
// =============================================================================

const treeStyles: {
  readonly container: CSSProperties;
  readonly header: CSSProperties;
  readonly headerButton: CSSProperties;
  readonly headerSpacer: CSSProperties;
  readonly nodeContainer: CSSProperties;
  readonly nodeRow: CSSProperties;
  readonly nodeRowFocused: CSSProperties;
  readonly expandToggle: CSSProperties;
  readonly expandTogglePlaceholder: CSSProperties;
  readonly portName: CSSProperties;
  readonly depBadge: CSSProperties;
  readonly childrenContainer: CSSProperties;
  readonly emptyState: CSSProperties;
  readonly footer: CSSProperties;
  readonly perfBadge: CSSProperties;
} = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "12px",
    fontFamily: "var(--hex-devtools-font-mono, monospace)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
  },
  headerButton: {
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
  nodeContainer: {
    position: "relative",
  },
  nodeRow: {
    display: "flex",
    alignItems: "center",
    padding: "6px 8px",
    gap: "8px",
    cursor: "pointer",
    borderRadius: "4px",
    transition: "background-color 0.15s ease",
    outline: "none",
  },
  nodeRowFocused: {
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
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
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "2px",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  },
  expandTogglePlaceholder: {
    width: "16px",
    height: "16px",
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
  depBadge: {
    fontSize: "9px",
    padding: "2px 6px",
    borderRadius: "10px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    fontWeight: 500,
  },
  childrenContainer: {
    marginLeft: "24px",
    borderLeft: "1px solid var(--hex-devtools-border, #45475a)",
    paddingLeft: "8px",
  },
  emptyState: {
    padding: "24px 16px",
    textAlign: "center",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  footer: {
    marginTop: "12px",
    paddingTop: "8px",
    borderTop: "1px solid var(--hex-devtools-border, #45475a)",
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  perfBadge: {
    fontSize: "9px",
    padding: "2px 6px",
    borderRadius: "4px",
    fontWeight: 500,
    fontFamily: "monospace",
  },
};

// =============================================================================
// TreeNode Component
// =============================================================================

/**
 * Individual tree node component (recursive).
 */
function TreeNodeComponent({
  node,
  tracingAPI,
  expandedIds,
  focusedId,
  onToggle,
  onSelect,
  onFocus,
}: TreeNodeComponentProps): ReactElement {
  const { service, children, depth } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(service.portName);
  const isFocused = focusedId === service.portName;

  const performance = useServicePerformance(service.portName, tracingAPI, 100);

  const nodeRowStyle: CSSProperties = {
    ...treeStyles.nodeRow,
    ...(isFocused ? treeStyles.nodeRowFocused : {}),
  };

  const handleToggleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(service.portName);
    },
    [service.portName, onToggle]
  );

  const handleRowClick = useCallback(() => {
    onSelect(service.portName);
  }, [service.portName, onSelect]);

  const handleFocus = useCallback(() => {
    onFocus(service.portName);
  }, [service.portName, onFocus]);

  // Calculate average duration color
  const getPerfBadgeStyle = (): CSSProperties => {
    if (performance === null || performance.totalResolutions === 0) {
      return { display: "none" };
    }

    const avg = performance.averageDuration;
    let bgColor = "var(--hex-devtools-resolved, #a6e3a1)";
    let textColor = "#1e1e2e";

    if (avg >= 50) {
      bgColor = "var(--hex-devtools-slow, #f38ba8)";
    } else if (avg >= 10) {
      bgColor = "var(--hex-devtools-request, #fab387)";
    }

    return {
      ...treeStyles.perfBadge,
      backgroundColor: bgColor,
      color: textColor,
    };
  };

  const formatDuration = (ms: number): string => {
    if (ms < 0.01) return "<0.01ms";
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 10) return `${ms.toFixed(1)}ms`;
    return `${Math.round(ms)}ms`;
  };

  return (
    <div
      data-testid={`tree-node-${service.portName}`}
      style={treeStyles.nodeContainer}
    >
      {/* Node Content Row */}
      <div
        data-testid={`tree-node-content-${service.portName}`}
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
            data-testid={`tree-expand-${service.portName}`}
            style={treeStyles.expandToggle}
            onClick={handleToggleClick}
            type="button"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "-" : "+"}
          </button>
        ) : (
          <span style={treeStyles.expandTogglePlaceholder} />
        )}

        {/* Port Name */}
        <span style={treeStyles.portName}>{service.portName}</span>

        {/* Dependency Count */}
        {service.dependsOn.length > 0 && (
          <span
            style={treeStyles.depBadge}
            title={`Depends on ${service.dependsOn.length} service(s)`}
          >
            {service.dependsOn.length} dep
            {service.dependsOn.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Performance Badge */}
        {performance !== null && performance.totalResolutions > 0 && (
          <span
            style={getPerfBadgeStyle()}
            title={`Avg: ${formatDuration(performance.averageDuration)}, ${performance.totalResolutions} resolutions`}
          >
            {formatDuration(performance.averageDuration)}
          </span>
        )}

        {/* Lifetime Badge */}
        <span style={getLifetimeBadgeStyle(service.lifetime)}>
          {service.lifetime}
        </span>
      </div>

      {/* Children Container */}
      {hasChildren && isExpanded && (
        <div
          data-testid={`tree-children-${service.portName}`}
          style={treeStyles.childrenContainer}
          role="group"
        >
          {children.map((child) => (
            <TreeNodeComponent
              key={child.service.portName}
              node={child}
              tracingAPI={tracingAPI}
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
  readonly onExpandAll: () => void;
  readonly onCollapseAll: () => void;
  readonly rootCount: number;
  readonly totalCount: number;
}

function TreeViewHeader({
  onExpandAll,
  onCollapseAll,
  rootCount,
  totalCount,
}: TreeViewHeaderProps): ReactElement {
  return (
    <div style={treeStyles.header}>
      <button
        data-testid="tree-expand-all"
        style={treeStyles.headerButton}
        onClick={onExpandAll}
        type="button"
        aria-label="Expand all nodes"
      >
        Expand All
      </button>
      <button
        data-testid="tree-collapse-all"
        style={treeStyles.headerButton}
        onClick={onCollapseAll}
        type="button"
        aria-label="Collapse all nodes"
      >
        Collapse All
      </button>

      <span style={treeStyles.headerSpacer} />

      <span style={{ fontSize: "10px", color: "var(--hex-devtools-text-muted)" }}>
        {rootCount} root{rootCount !== 1 ? "s" : ""} | {totalCount} total
      </span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ServiceDependencyTree component for hierarchical dependency visualization.
 *
 * Features:
 * - Hierarchical tree with expand/collapse controls
 * - 24px indentation per nesting level
 * - Full keyboard navigation (Arrow keys, Enter/Space, Home/End)
 * - Expand All / Collapse All buttons
 * - Status indicators and lifetime badges
 * - Performance badges when tracing is available
 *
 * @param props - The component props
 * @returns A React element containing the dependency tree
 *
 * @example
 * ```tsx
 * const treeNodes = buildDependencyTree(services, edges);
 *
 * <ServiceDependencyTree
 *   treeNodes={treeNodes}
 *   tracingAPI={tracingAPI}
 *   onServiceSelect={(name) => console.log("Selected:", name)}
 * />
 * ```
 */
export function ServiceDependencyTree({
  treeNodes,
  tracingAPI,
  onServiceSelect,
}: ServiceDependencyTreeProps): ReactElement {
  // Expanded node IDs state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Focused node ID for keyboard navigation
  const firstNodeId =
    treeNodes.length > 0 ? treeNodes[0]?.service.portName : null;
  const [focusedId, setFocusedId] = useState<string | null>(firstNodeId ?? null);

  // Ref to the tree container for keyboard event handling
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Get all expandable node IDs
  const allExpandableIds = useMemo(
    () => getAllExpandableIds(treeNodes),
    [treeNodes]
  );

  // Get visible node IDs for keyboard navigation
  const visibleNodeIds = useMemo(
    () => getVisibleServiceIds(treeNodes, expandedIds),
    [treeNodes, expandedIds]
  );

  // Count total nodes
  const totalCount = useMemo(() => {
    let count = 0;
    function traverse(nodes: readonly ServiceTreeNode[]): void {
      for (const node of nodes) {
        count++;
        traverse(node.children);
      }
    }
    traverse(treeNodes);
    return count;
  }, [treeNodes]);

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
      onServiceSelect?.(id);
    },
    [onServiceSelect]
  );

  // Focus node
  const handleFocus = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(allExpandableIds));
  }, [allExpandableIds]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (focusedId === null && visibleNodeIds.length > 0) {
        const firstId = visibleNodeIds[0];
        if (firstId !== undefined) {
          setFocusedId(firstId);
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

      const focusElement = (id: string): void => {
        const element = document.querySelector(
          `[data-testid="tree-node-content-${id}"]`
        );
        if (element instanceof HTMLElement) {
          element.focus();
        }
      };

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (currentIndex < visibleNodeIds.length - 1) {
            const nextId = visibleNodeIds[currentIndex + 1];
            if (nextId !== undefined) {
              setFocusedId(nextId);
              focusElement(nextId);
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
              focusElement(prevId);
            }
          }
          break;
        }

        case "ArrowRight": {
          e.preventDefault();
          const isExpanded = expandedIds.has(focusedId);
          const hasChildren = allExpandableIds.includes(focusedId);

          if (hasChildren && !isExpanded) {
            handleToggle(focusedId);
          } else if (isExpanded) {
            // Move to first child
            const newExpanded = new Set([...expandedIds, focusedId]);
            const updatedVisible = getVisibleServiceIds(treeNodes, newExpanded);
            const focusedIndex = updatedVisible.indexOf(focusedId);
            if (focusedIndex < updatedVisible.length - 1) {
              const nextId = updatedVisible[focusedIndex + 1];
              if (nextId !== undefined) {
                setFocusedId(nextId);
                focusElement(nextId);
              }
            }
          }
          break;
        }

        case "ArrowLeft": {
          e.preventDefault();
          const isExpanded = expandedIds.has(focusedId);
          const hasChildren = allExpandableIds.includes(focusedId);

          if (hasChildren && isExpanded) {
            handleToggle(focusedId);
          } else {
            // Move to parent
            const parentId = findParentServiceId(focusedId, treeNodes);
            if (parentId !== null) {
              setFocusedId(parentId);
              focusElement(parentId);
            }
          }
          break;
        }

        case "Enter":
        case " ": {
          e.preventDefault();
          if (allExpandableIds.includes(focusedId)) {
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
              focusElement(homeId);
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
              focusElement(lastId);
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
      allExpandableIds,
      handleToggle,
      treeNodes,
    ]
  );

  // Empty state
  if (treeNodes.length === 0) {
    return (
      <div data-testid="service-dependency-tree" style={treeStyles.container}>
        <div data-testid="tree-empty" style={treeStyles.emptyState}>
          <div style={{ fontWeight: 500, marginBottom: "8px" }}>
            No services to display.
          </div>
          <div style={{ fontSize: "12px", maxWidth: "280px", margin: "0 auto" }}>
            Services will appear here once registered in the graph.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="service-dependency-tree"
      ref={treeContainerRef}
      style={treeStyles.container}
      onKeyDown={handleKeyDown}
      role="tree"
      aria-label="Service dependency tree"
    >
      {/* Header Controls */}
      <TreeViewHeader
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        rootCount={treeNodes.length}
        totalCount={totalCount}
      />

      {/* Tree Nodes */}
      {treeNodes.map((node) => (
        <TreeNodeComponent
          key={node.service.portName}
          node={node}
          tracingAPI={tracingAPI}
          expandedIds={expandedIds}
          focusedId={focusedId}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onFocus={handleFocus}
        />
      ))}

      {/* Footer Summary */}
      <div style={treeStyles.footer}>
        {treeNodes.length} root service{treeNodes.length !== 1 ? "s" : ""} |{" "}
        {totalCount} total service{totalCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
