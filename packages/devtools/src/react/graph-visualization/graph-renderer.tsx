/**
 * GraphRenderer component - SVG container with D3 zoom/pan.
 *
 * @packageDocumentation
 */

import React, {
  type ReactElement,
  useRef,
  useEffect,
  useCallback,
  useState,
} from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition";
import type { LayoutResult, TransformState } from "./types.js";
import { graphContainerStyles } from "./graph-styles.js";
import { GraphNode } from "./graph-node.js";
import { GraphEdge, ArrowMarkerDefs } from "./graph-edge.js";
import { GraphControls } from "./graph-controls.js";
import { createEdgeKey } from "./types.js";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Checks if SVG zoom behavior can be safely initialized.
 * D3-zoom requires SVG elements with baseVal support which JSDOM doesn't provide.
 */
function canInitializeZoom(svgElement: SVGSVGElement): boolean {
  // Check if the SVG element has proper viewBox/width baseVal support
  // This will be false in JSDOM/test environments
  try {
    // D3-zoom uses ownerSVGElement.width.baseVal internally
    // In JSDOM, width is not a SVGAnimatedLength so baseVal is undefined
    const width = svgElement.width;
    return width !== undefined && "baseVal" in width && width.baseVal !== undefined;
  } catch {
    return false;
  }
}

// =============================================================================
// Types
// =============================================================================

export interface GraphRendererProps {
  /** Layout result with positioned nodes and edges */
  readonly layout: LayoutResult;
  /** Currently hovered node ID */
  readonly hoveredNodeId: string | null;
  /** Currently selected node ID */
  readonly selectedNodeId: string | null;
  /** Set of highlighted node IDs */
  readonly highlightedNodeIds: ReadonlySet<string>;
  /** Set of highlighted edge keys */
  readonly highlightedEdgeKeys: ReadonlySet<string>;
  /** Callback when a node is clicked */
  readonly onNodeClick?: (nodeId: string) => void;
  /** Callback when mouse enters a node */
  readonly onNodeHover?: (nodeId: string | null) => void;
  /** Whether to show zoom controls */
  readonly showControls?: boolean;
  /** Minimum zoom scale */
  readonly minZoom?: number;
  /** Maximum zoom scale */
  readonly maxZoom?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MIN_ZOOM = 0.25;
const DEFAULT_MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;
const MARKER_ID = "arrow-marker";
const HIGHLIGHTED_MARKER_ID = "arrow-marker-highlighted";

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the dependency graph with zoom/pan support.
 *
 * Uses D3-zoom for smooth zoom and pan interactions while
 * rendering nodes and edges with React components.
 */
export function GraphRenderer({
  layout,
  hoveredNodeId,
  selectedNodeId,
  highlightedNodeIds,
  highlightedEdgeKeys,
  onNodeClick,
  onNodeHover,
  showControls = true,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
}: GraphRendererProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null
  );

  // Initialize D3 zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    // Check if D3 zoom can be safely initialized (not in JSDOM/test environment)
    if (!canInitializeZoom(svgRef.current)) {
      // In test environments, skip zoom initialization
      return;
    }

    const svg = select(svgRef.current);

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([minZoom, maxZoom])
      .on("zoom", (event) => {
        const { x, y, k } = event.transform;
        setTransform({ scale: k, translateX: x, translateY: y });
      });

    svg.call(zoomBehavior);
    zoomBehaviorRef.current = zoomBehavior;

    // Fit graph to view on initial render
    fitToView();

    return () => {
      svg.on(".zoom", null);
    };
  }, [minZoom, maxZoom]);

  // Fit graph to view when layout changes
  useEffect(() => {
    fitToView();
  }, [layout.width, layout.height]);

  // Fit the graph to the container
  const fitToView = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const padding = 40;

    if (layout.width === 0 || layout.height === 0) {
      return;
    }

    // Calculate scale to fit
    const scaleX = (containerRect.width - padding * 2) / layout.width;
    const scaleY = (containerRect.height - padding * 2) / layout.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 100%

    // Calculate translation to center
    const translateX =
      (containerRect.width - layout.width * scale) / 2;
    const translateY =
      (containerRect.height - layout.height * scale) / 2;

    // Apply transform
    const svg = select(svgRef.current);
    svg
      .transition()
      .duration(300)
      .call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(translateX, translateY).scale(scale)
      );
  }, [layout.width, layout.height]);

  // Zoom in handler
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    const svg = select(svgRef.current);
    const newScale = Math.min(transform.scale + ZOOM_STEP, maxZoom);

    svg
      .transition()
      .duration(150)
      .call(zoomBehaviorRef.current.scaleTo, newScale);
  }, [transform.scale, maxZoom]);

  // Zoom out handler
  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;

    const svg = select(svgRef.current);
    const newScale = Math.max(transform.scale - ZOOM_STEP, minZoom);

    svg
      .transition()
      .duration(150)
      .call(zoomBehaviorRef.current.scaleTo, newScale);
  }, [transform.scale, minZoom]);

  // Reset zoom to 100%
  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || !containerRef.current) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();

    // Center at 100% zoom
    const translateX = (containerRect.width - layout.width) / 2;
    const translateY = (containerRect.height - layout.height) / 2;

    const svg = select(svgRef.current);
    svg
      .transition()
      .duration(300)
      .call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(translateX, translateY).scale(1)
      );
  }, [layout.width, layout.height]);

  // Determine if nodes/edges should be dimmed
  const hasHighlight = highlightedNodeIds.size > 0;

  return (
    <div ref={containerRef} style={graphContainerStyles.wrapper}>
      <svg
        ref={svgRef}
        style={{
          ...graphContainerStyles.svg,
          cursor: "grab",
        }}
      >
        <ArrowMarkerDefs id={MARKER_ID} highlightedId={HIGHLIGHTED_MARKER_ID} />

        <g
          ref={gRef}
          transform={`translate(${transform.translateX}, ${transform.translateY}) scale(${transform.scale})`}
        >
          {/* Render edges first (below nodes) */}
          {layout.edges.map((edge) => {
            const edgeKey = createEdgeKey(edge.from, edge.to);
            const isHighlighted = highlightedEdgeKeys.has(edgeKey);
            const isDimmed = hasHighlight && !isHighlighted;

            return (
              <GraphEdge
                key={edgeKey}
                edge={edge}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                markerId={MARKER_ID}
                highlightedMarkerId={HIGHLIGHTED_MARKER_ID}
              />
            );
          })}

          {/* Render nodes */}
          {layout.nodes.map((node) => {
            const isHovered = hoveredNodeId === node.id;
            const isSelected = selectedNodeId === node.id;
            const isDimmed = hasHighlight && !highlightedNodeIds.has(node.id);

            // Build optional props conditionally for exactOptionalPropertyTypes
            const optionalProps: {
              onClick?: (nodeId: string) => void;
              onMouseEnter?: (nodeId: string) => void;
              onMouseLeave?: () => void;
            } = {};
            if (onNodeClick !== undefined) {
              optionalProps.onClick = onNodeClick;
            }
            if (onNodeHover !== undefined) {
              optionalProps.onMouseEnter = onNodeHover;
              optionalProps.onMouseLeave = () => onNodeHover(null);
            }

            return (
              <GraphNode
                key={node.id}
                node={node}
                isHovered={isHovered}
                isSelected={isSelected}
                isDimmed={isDimmed}
                {...optionalProps}
              />
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      {showControls && (
        <GraphControls
          zoom={transform.scale}
          minZoom={minZoom}
          maxZoom={maxZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={fitToView}
          onResetZoom={handleResetZoom}
        />
      )}
    </div>
  );
}
