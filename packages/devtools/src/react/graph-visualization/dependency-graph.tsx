/**
 * DependencyGraph component - Main entry point for the visual graph.
 *
 * Composes layout computation, rendering, and interaction handling
 * into a single component.
 *
 * @packageDocumentation
 */

import React, {
  type ReactElement,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { DependencyGraphProps } from "./types.js";
import { computeLayout, findConnectedNodes, findConnectedEdges } from "./graph-layout.js";
import { GraphRenderer } from "./graph-renderer.js";
import { GraphTooltip } from "./graph-tooltip.js";

// =============================================================================
// Component
// =============================================================================

/**
 * Visual dependency graph component.
 *
 * Renders a dependency graph with:
 * - Hierarchical layout using Dagre
 * - Zoom and pan with D3
 * - Interactive hover/click highlighting
 * - Tooltip on hover
 *
 * @example
 * ```tsx
 * <DependencyGraph
 *   nodes={[
 *     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 *     { id: 'UserService', label: 'UserService', lifetime: 'scoped' },
 *   ]}
 *   edges={[
 *     { from: 'UserService', to: 'Logger' },
 *   ]}
 *   onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
 * />
 * ```
 */
export function DependencyGraph({
  nodes,
  edges,
  direction = "TB",
  onNodeClick,
  onNodeHover,
  showControls = true,
  minZoom = 0.25,
  maxZoom = 2,
}: DependencyGraphProps): ReactElement {
  // Interaction state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  // Compute layout using Dagre
  const layout = useMemo(
    () => computeLayout(nodes, edges, { direction }),
    [nodes, edges, direction]
  );

  // Compute highlighted nodes and edges based on interaction
  const { highlightedNodeIds, highlightedEdgeKeys } = useMemo(() => {
    const activeNodeId = hoveredNodeId ?? selectedNodeId;

    if (activeNodeId === null) {
      return {
        highlightedNodeIds: new Set<string>(),
        highlightedEdgeKeys: new Set<string>(),
      };
    }

    const connectedNodes = findConnectedNodes(activeNodeId, edges);
    const connectedEdges = findConnectedEdges(connectedNodes, edges);

    return {
      highlightedNodeIds: connectedNodes,
      highlightedEdgeKeys: connectedEdges,
    };
  }, [hoveredNodeId, selectedNodeId, edges]);

  // Handle node hover
  const handleNodeHover = useCallback(
    (nodeId: string | null) => {
      setHoveredNodeId(nodeId);
      onNodeHover?.(nodeId);
    },
    [onNodeHover]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
      onNodeClick?.(nodeId);
    },
    [onNodeClick]
  );

  // Track mouse position for tooltip
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  // Get hovered node data for tooltip
  const hoveredNode = useMemo(() => {
    if (hoveredNodeId === null) return null;
    return layout.nodes.find((n) => n.id === hoveredNodeId) ?? null;
  }, [hoveredNodeId, layout.nodes]);

  // Count dependencies and dependents for tooltip
  const tooltipCounts = useMemo(() => {
    if (hoveredNodeId === null) {
      return { dependencyCount: 0, dependentCount: 0 };
    }

    let dependencyCount = 0;
    let dependentCount = 0;

    for (const edge of edges) {
      if (edge.from === hoveredNodeId) {
        dependencyCount++;
      }
      if (edge.to === hoveredNodeId) {
        dependentCount++;
      }
    }

    return { dependencyCount, dependentCount };
  }, [hoveredNodeId, edges]);

  return (
    <div
      style={{ position: "relative" }}
      onMouseMove={handleMouseMove}
    >
      <GraphRenderer
        layout={layout}
        hoveredNodeId={hoveredNodeId}
        selectedNodeId={selectedNodeId}
        highlightedNodeIds={highlightedNodeIds}
        highlightedEdgeKeys={highlightedEdgeKeys}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        showControls={showControls}
        minZoom={minZoom}
        maxZoom={maxZoom}
      />

      {/* Tooltip */}
      {hoveredNode && mousePosition && (
        <GraphTooltip
          node={hoveredNode}
          x={mousePosition.x}
          y={mousePosition.y}
          dependencyCount={tooltipCounts.dependencyCount}
          dependentCount={tooltipCounts.dependentCount}
        />
      )}
    </div>
  );
}
