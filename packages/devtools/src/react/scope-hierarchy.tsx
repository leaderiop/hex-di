/**
 * ScopeHierarchy React component for visualizing container/scope tree.
 *
 * Displays the hierarchical structure of the container and its child scopes
 * with expand/collapse controls, status badges, and selection support.
 *
 * @packageDocumentation
 */

import React, { useState, type ReactElement } from "react";
import type { ScopeTree } from "../index.js";
import { scopeTreeStyles } from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ScopeHierarchy component.
 */
export interface ScopeHierarchyProps {
  /** The scope tree data from inspector.getScopeTree() */
  readonly scopeTree: ScopeTree;
  /** Currently selected scope ID (null = root container) */
  readonly selectedScopeId: string | null;
  /** Callback when a scope is selected */
  readonly onScopeSelect: (scopeId: string | null) => void;
}

/**
 * Props for the ScopeTreeNode component.
 */
interface ScopeTreeNodeProps {
  /** The scope tree node */
  readonly node: ScopeTree;
  /** Depth level for indentation */
  readonly depth: number;
  /** Whether this node is selected */
  readonly isSelected: boolean;
  /** Selection handler */
  readonly onSelect: () => void;
  /** Currently selected scope ID for child selection */
  readonly selectedScopeId: string | null;
  /** Callback for selecting any scope */
  readonly onScopeSelect: (scopeId: string | null) => void;
}

// =============================================================================
// ScopeTreeNode Component
// =============================================================================

/**
 * Recursive tree node component for scope hierarchy.
 *
 * Displays a single scope/container node with:
 * - Expand/collapse control for nodes with children
 * - Type icon ([C] for container, [S] for scope)
 * - Node name and resolved count info
 * - Status badge (Active/Disposed)
 */
function ScopeTreeNode({
  node,
  depth,
  isSelected,
  onSelect,
  selectedScopeId,
  onScopeSelect,
}: ScopeTreeNodeProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);

  const isContainer = node.id === "container";
  const hasChildren = node.children.length > 0;

  const handleToggleExpand = (e: React.MouseEvent | React.KeyboardEvent): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    } else if (e.key === "ArrowRight" && hasChildren && !isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
    } else if (e.key === "ArrowLeft" && isExpanded) {
      e.preventDefault();
      setIsExpanded(false);
    }
  };

  const nodeContentStyle = {
    ...scopeTreeStyles.nodeContent,
    ...(isSelected ? scopeTreeStyles.nodeSelected : {}),
    paddingLeft: `${12 + depth * 24}px`,
  };

  const iconStyle = {
    ...scopeTreeStyles.nodeIcon,
    ...(isContainer
      ? scopeTreeStyles.nodeIconContainer
      : scopeTreeStyles.nodeIconScope),
  };

  const statusStyle = {
    ...scopeTreeStyles.nodeStatus,
    ...(node.status === "active"
      ? scopeTreeStyles.nodeStatusActive
      : scopeTreeStyles.nodeStatusDisposed),
  };

  return (
    <div style={scopeTreeStyles.node} data-testid={`scope-node-${node.id}`}>
      <div
        style={nodeContentStyle}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {hasChildren && (
          <button
            style={scopeTreeStyles.expandButton}
            onClick={handleToggleExpand}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleToggleExpand(e);
              }
            }}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            {isExpanded ? "[-]" : "[+]"}
          </button>
        )}
        {!hasChildren && <span style={{ width: "16px", marginRight: "4px" }} />}

        <span style={iconStyle}>{isContainer ? "C" : "S"}</span>

        <span style={scopeTreeStyles.nodeName}>
          {isContainer ? "Root Container" : `Scope ${node.id}`}
        </span>

        <span style={scopeTreeStyles.nodeInfo}>
          {node.resolvedCount}/{node.totalCount} resolved
        </span>

        <span
          style={statusStyle}
          data-testid={`scope-node-${node.id}-status`}
        >
          {node.status === "active" ? "Active" : "Disposed"}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div style={scopeTreeStyles.childrenContainer}>
          {node.children.map((child) => (
            <ScopeTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isSelected={selectedScopeId === child.id}
              onSelect={() => onScopeSelect(child.id)}
              selectedScopeId={selectedScopeId}
              onScopeSelect={onScopeSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ScopeHierarchy Component
// =============================================================================

/**
 * ScopeHierarchy component for visualizing container/scope tree structure.
 *
 * Features:
 * - Tree visualization with expand/collapse
 * - [C] icon for container, [S] for scopes
 * - Status badges (Active/Disposed)
 * - Instance counts (resolved/total)
 * - Click to select scope and update ResolvedServices context
 * - Keyboard navigation support
 *
 * @param props - The component props
 * @returns A React element containing the scope hierarchy tree
 *
 * @example
 * ```tsx
 * const tree = inspector.getScopeTree();
 * const [selectedScope, setSelectedScope] = useState<string | null>(null);
 *
 * <ScopeHierarchy
 *   scopeTree={tree}
 *   selectedScopeId={selectedScope}
 *   onScopeSelect={setSelectedScope}
 * />
 * ```
 */
export function ScopeHierarchy({
  scopeTree,
  selectedScopeId,
  onScopeSelect,
}: ScopeHierarchyProps): ReactElement {
  // Determine if root container is selected (null or "container")
  const isRootSelected =
    selectedScopeId === null || selectedScopeId === "container";

  return (
    <div data-testid="scope-hierarchy" style={scopeTreeStyles.container}>
      <ScopeTreeNode
        node={scopeTree}
        depth={0}
        isSelected={isRootSelected}
        onSelect={() => onScopeSelect(null)}
        selectedScopeId={selectedScopeId}
        onScopeSelect={onScopeSelect}
      />
    </div>
  );
}
