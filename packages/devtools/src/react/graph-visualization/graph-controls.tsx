/**
 * GraphControls component for zoom and pan controls.
 *
 * @packageDocumentation
 */

import React, { type ReactElement, useCallback, useState } from "react";
import { graphControlsStyles } from "./graph-styles.js";

// =============================================================================
// Types
// =============================================================================

export interface GraphControlsProps {
  /** Current zoom scale (1 = 100%) */
  readonly zoom: number;
  /** Minimum zoom scale */
  readonly minZoom: number;
  /** Maximum zoom scale */
  readonly maxZoom: number;
  /** Callback to zoom in */
  readonly onZoomIn: () => void;
  /** Callback to zoom out */
  readonly onZoomOut: () => void;
  /** Callback to fit graph in view */
  readonly onFitView: () => void;
  /** Callback to reset to 100% zoom */
  readonly onResetZoom: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders zoom and pan controls for the dependency graph.
 *
 * Provides buttons for:
 * - Zoom in (+)
 * - Zoom out (-)
 * - Fit to view
 * - Reset to 100%
 * - Current zoom level display
 */
export function GraphControls({
  zoom,
  minZoom,
  maxZoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetZoom,
}: GraphControlsProps): ReactElement {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const getButtonStyle = useCallback(
    (buttonId: string) => ({
      ...graphControlsStyles.button,
      ...(hoveredButton === buttonId ? graphControlsStyles.buttonHover : {}),
    }),
    [hoveredButton]
  );

  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div style={graphControlsStyles.container}>
      {/* Zoom out button */}
      <button
        type="button"
        style={{
          ...getButtonStyle("zoom-out"),
          opacity: canZoomOut ? 1 : 0.5,
          cursor: canZoomOut ? "pointer" : "not-allowed",
        }}
        onClick={onZoomOut}
        onMouseEnter={() => setHoveredButton("zoom-out")}
        onMouseLeave={() => setHoveredButton(null)}
        disabled={!canZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>

      {/* Zoom level display */}
      <span style={graphControlsStyles.zoomLabel}>{zoomPercent}%</span>

      {/* Zoom in button */}
      <button
        type="button"
        style={{
          ...getButtonStyle("zoom-in"),
          opacity: canZoomIn ? 1 : 0.5,
          cursor: canZoomIn ? "pointer" : "not-allowed",
        }}
        onClick={onZoomIn}
        onMouseEnter={() => setHoveredButton("zoom-in")}
        onMouseLeave={() => setHoveredButton(null)}
        disabled={!canZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>

      {/* Separator */}
      <div style={graphControlsStyles.separator} />

      {/* Fit view button */}
      <button
        type="button"
        style={getButtonStyle("fit")}
        onClick={onFitView}
        onMouseEnter={() => setHoveredButton("fit")}
        onMouseLeave={() => setHoveredButton(null)}
        title="Fit to view"
        aria-label="Fit graph to view"
      >
        ⊞
      </button>

      {/* Reset zoom button */}
      <button
        type="button"
        style={getButtonStyle("reset")}
        onClick={onResetZoom}
        onMouseEnter={() => setHoveredButton("reset")}
        onMouseLeave={() => setHoveredButton(null)}
        title="Reset to 100%"
        aria-label="Reset zoom to 100%"
      >
        1:1
      </button>
    </div>
  );
}
