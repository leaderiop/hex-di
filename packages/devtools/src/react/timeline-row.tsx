/**
 * TimelineRow React component for Resolution Tracing Timeline.
 *
 * Displays a single trace entry as a horizontal bar with:
 * - Order badge
 * - Port name
 * - Duration bar (color-coded)
 * - Duration label
 * - Lifetime badge
 * - Status indicators (slow, cached, pinned)
 * - Expandable details panel
 *
 * @packageDocumentation
 */

import React, { useCallback, type ReactElement, type CSSProperties } from "react";
import type { TraceEntry } from "../tracing/types.js";
import {
  timelineStyles,
  getLifetimeBadgeStyle,
  getLifetimeClassName,
  formatDuration,
  getPerformanceBarStyle,
  getTraceRowStyle,
} from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TimelineRow component.
 */
export interface TimelineRowProps {
  /** The trace entry to display */
  readonly trace: TraceEntry;
  /** Slow threshold value in milliseconds */
  readonly threshold: number;
  /** Total duration for calculating bar position/width */
  readonly totalDuration: number;
  /** Whether this row is expanded to show details */
  readonly isExpanded: boolean;
  /** Callback when row is clicked to toggle expand state */
  readonly onToggleExpand: (traceId: string) => void;
  /** Callback when pin icon is clicked */
  readonly onTogglePin: (traceId: string) => void;
  /** Callback when "View in Tree" is clicked */
  readonly onViewInTree: (traceId: string) => void;
}

/**
 * Bar color category.
 */
type BarColor = "fast" | "medium" | "slow" | "cached";

// =============================================================================
// Constants
// =============================================================================

/**
 * Fast threshold (green) - traces under this are fast.
 */
const FAST_THRESHOLD_MS = 10;

// =============================================================================
// Local Styles
// =============================================================================

const localStyles: {
  readonly rowContainer: CSSProperties;
  readonly rowContent: CSSProperties;
  readonly orderBadge: CSSProperties;
  readonly portName: CSSProperties;
  readonly barContainer: CSSProperties;
  readonly durationLabel: CSSProperties;
  readonly statusContainer: CSSProperties;
  readonly slowIndicator: CSSProperties;
  readonly cacheIndicator: CSSProperties;
  readonly pinIndicator: CSSProperties;
  readonly pinIndicatorButton: CSSProperties;
  readonly detailsPanel: CSSProperties;
  readonly detailRow: CSSProperties;
  readonly detailLabel: CSSProperties;
  readonly detailValue: CSSProperties;
  readonly detailButtons: CSSProperties;
  readonly detailButton: CSSProperties;
} = {
  rowContainer: {
    display: "flex",
    flexDirection: "column",
  },
  rowContent: {
    ...timelineStyles.row,
  },
  orderBadge: {
    ...timelineStyles.orderBadge,
  },
  portName: {
    ...timelineStyles.portName,
  },
  barContainer: {
    ...timelineStyles.barContainer,
  },
  durationLabel: {
    ...timelineStyles.durationLabel,
  },
  statusContainer: {
    ...timelineStyles.statusIndicator,
  },
  slowIndicator: {
    ...timelineStyles.slowIndicator,
  },
  cacheIndicator: {
    ...timelineStyles.cacheIndicator,
  },
  pinIndicator: {
    color: "var(--hex-devtools-accent, #89b4fa)",
    fontWeight: 600,
    fontSize: "12px",
  },
  pinIndicatorButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px 4px",
    color: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
  },
  detailsPanel: {
    ...timelineStyles.detailsPanel,
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
  detailButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  detailButton: {
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: 500,
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text, #cdd6f4)",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Determine bar color category based on duration and cache status.
 *
 * @param duration - Duration in milliseconds
 * @param threshold - Slow threshold in milliseconds
 * @param isCacheHit - Whether this is a cache hit
 * @returns Bar color category
 */
function getBarColor(
  duration: number,
  threshold: number,
  isCacheHit: boolean
): BarColor {
  if (isCacheHit) {
    return "cached";
  }
  if (duration >= threshold) {
    return "slow";
  }
  if (duration >= FAST_THRESHOLD_MS) {
    return "medium";
  }
  return "fast";
}

/**
 * Get bar style based on color category.
 *
 * @param color - Bar color category
 * @returns CSS properties for the bar
 */
function getBarColorStyle(color: BarColor): CSSProperties {
  switch (color) {
    case "fast":
      return timelineStyles.barFast;
    case "medium":
      return timelineStyles.barMedium;
    case "slow":
      return timelineStyles.barSlow;
    case "cached":
      return timelineStyles.barCached;
  }
}

/**
 * Format timestamp for display.
 *
 * @param time - Time in milliseconds
 * @returns Formatted time string
 */
function formatTimestamp(time: number): string {
  return `${time.toFixed(2)}ms`;
}

// =============================================================================
// TimelineRow Component
// =============================================================================

/**
 * TimelineRow component for displaying a single trace entry.
 *
 * Features:
 * - Order badge (#1, #2, etc.)
 * - Port name label
 * - Duration bar with proportional width and position
 * - Color coding based on performance
 * - Lifetime badge
 * - Status indicators (slow, cached, pinned)
 * - Expandable details panel
 *
 * @param props - The component props
 * @returns A React element containing the timeline row
 *
 * @example
 * ```tsx
 * <TimelineRow
 *   trace={traceEntry}
 *   threshold={50}
 *   totalDuration={200}
 *   isExpanded={false}
 *   onToggleExpand={(id) => setExpandedId(id)}
 *   onTogglePin={(id) => handlePin(id)}
 *   onViewInTree={(id) => navigateToTree(id)}
 * />
 * ```
 */
export function TimelineRow({
  trace,
  threshold,
  totalDuration,
  isExpanded,
  onToggleExpand,
  onTogglePin,
  onViewInTree,
}: TimelineRowProps): ReactElement {
  // Calculate bar position and width as percentages
  const barLeft =
    totalDuration > 0 ? (trace.startTime / totalDuration) * 100 : 0;
  const barWidth =
    totalDuration > 0 ? (trace.duration / totalDuration) * 100 : 0;

  // Determine colors and styles
  const barColor = getBarColor(trace.duration, threshold, trace.isCacheHit);
  const isSlow = trace.duration >= threshold && !trace.isCacheHit;

  // Get row style based on state
  const rowStyle = getTraceRowStyle(isExpanded, isSlow, trace.isCacheHit);

  // Handlers
  const handleRowClick = useCallback(() => {
    onToggleExpand(trace.id);
  }, [trace.id, onToggleExpand]);

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggleExpand(trace.id);
      }
    },
    [trace.id, onToggleExpand]
  );

  const handlePinClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onTogglePin(trace.id);
    },
    [trace.id, onTogglePin]
  );

  const handleViewInTreeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onViewInTree(trace.id);
    },
    [trace.id, onViewInTree]
  );

  const handleCopyJson = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const json = JSON.stringify(trace, null, 2);
      navigator.clipboard.writeText(json).catch(() => {
        // Silently fail if clipboard access denied
      });
    },
    [trace]
  );

  return (
    <div
      data-testid={`timeline-row-${trace.id}`}
      data-slow={isSlow ? "true" : undefined}
      data-cached={trace.isCacheHit ? "true" : undefined}
      style={localStyles.rowContainer}
    >
      {/* Row content */}
      <div
        style={rowStyle}
        onClick={handleRowClick}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        {/* Order badge */}
        <span style={localStyles.orderBadge}>#{trace.order}</span>

        {/* Port name */}
        <span style={localStyles.portName}>{trace.portName}</span>

        {/* Bar container */}
        <div style={localStyles.barContainer}>
          <div
            data-testid={`timeline-bar-${trace.id}`}
            data-color={barColor}
            style={{
              ...timelineStyles.bar,
              ...getBarColorStyle(barColor),
              left: `${barLeft}%`,
              width: `${Math.max(barWidth, 0.5)}%`, // Minimum width for visibility
            }}
          />
        </div>

        {/* Duration label */}
        <span style={localStyles.durationLabel}>
          {formatDuration(trace.duration)}
        </span>

        {/* Lifetime badge */}
        <span
          className={getLifetimeClassName(trace.lifetime)}
          style={getLifetimeBadgeStyle(trace.lifetime)}
        >
          {trace.lifetime}
        </span>

        {/* Status indicators */}
        <div style={localStyles.statusContainer}>
          {isSlow && (
            <span
              data-testid={`slow-indicator-${trace.id}`}
              style={localStyles.slowIndicator}
              title="Slow resolution"
            >
              [!]
            </span>
          )}
          {trace.isCacheHit && (
            <span
              data-testid={`cache-indicator-${trace.id}`}
              style={localStyles.cacheIndicator}
              title="Cache hit"
            >
              [*]
            </span>
          )}
          {trace.isPinned && (
            <button
              data-testid={`pin-indicator-${trace.id}`}
              style={{
                ...localStyles.pinIndicator,
                ...localStyles.pinIndicatorButton,
              }}
              onClick={handlePinClick}
              title="Pinned trace (click to unpin)"
              type="button"
              aria-label="Unpin trace"
            >
              [P]
            </button>
          )}
        </div>
      </div>

      {/* Expanded details panel */}
      {isExpanded && (
        <div
          data-testid={`timeline-details-${trace.id}`}
          style={localStyles.detailsPanel}
        >
          <div style={localStyles.detailRow}>
            <span style={localStyles.detailLabel}>Start Time:</span>
            <span style={localStyles.detailValue}>
              {formatTimestamp(trace.startTime)}
            </span>
          </div>
          <div style={localStyles.detailRow}>
            <span style={localStyles.detailLabel}>End Time:</span>
            <span style={localStyles.detailValue}>
              {formatTimestamp(trace.startTime + trace.duration)}
            </span>
          </div>
          <div style={localStyles.detailRow}>
            <span style={localStyles.detailLabel}>Duration:</span>
            <span style={localStyles.detailValue}>
              {formatDuration(trace.duration)}
            </span>
          </div>
          <div style={localStyles.detailRow}>
            <span style={localStyles.detailLabel}>Lifetime:</span>
            <span style={localStyles.detailValue}>{trace.lifetime}</span>
          </div>
          <div style={localStyles.detailRow}>
            <span style={localStyles.detailLabel}>Cache Hit:</span>
            <span style={localStyles.detailValue}>
              {trace.isCacheHit ? "Yes (cached)" : "No (fresh resolution)"}
            </span>
          </div>
          <div style={localStyles.detailRow}>
            <span style={localStyles.detailLabel}>Scope:</span>
            <span style={localStyles.detailValue}>
              {trace.scopeId ?? "root"}
            </span>
          </div>
          <div style={localStyles.detailRow}>
            <span style={localStyles.detailLabel}>Dependencies:</span>
            <span style={localStyles.detailValue}>
              {trace.childTraceIds.length === 0
                ? "None"
                : `${trace.childTraceIds.length} service(s)`}
            </span>
          </div>

          {/* Action buttons */}
          <div style={localStyles.detailButtons}>
            <button
              data-testid={`view-in-tree-${trace.id}`}
              style={localStyles.detailButton}
              onClick={handleViewInTreeClick}
              type="button"
            >
              View in Tree
            </button>
            <button
              data-testid={`copy-json-${trace.id}`}
              style={localStyles.detailButton}
              onClick={handleCopyJson}
              type="button"
            >
              Copy Trace JSON
            </button>
            {!trace.isPinned && (
              <button
                data-testid={`pin-trace-${trace.id}`}
                style={localStyles.detailButton}
                onClick={handlePinClick}
                type="button"
              >
                Pin Trace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
