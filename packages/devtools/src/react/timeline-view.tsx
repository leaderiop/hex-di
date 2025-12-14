/**
 * TimelineView React component for Resolution Tracing.
 *
 * Displays a horizontal timeline visualization of trace entries with:
 * - Time ruler at top with major/minor ticks
 * - Timeline rows for each trace with duration bars
 * - Color coding based on performance
 * - Expandable rows with trace details
 * - Zoom controls
 * - Footer summary
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useMemo,
  useCallback,
  type ReactElement,
  type CSSProperties,
} from "react";
import type { TraceEntry } from "../tracing/types.js";
import { TimeRuler } from "./time-ruler.js";
import { TimelineRow } from "./timeline-row.js";
import {
  timelineStyles,
  formatDuration,
  emptyStyles,
  containerInspectorStyles,
} from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TimelineView component.
 */
export interface TimelineViewProps {
  /** Array of trace entries to display */
  readonly traces: readonly TraceEntry[];
  /** Slow threshold value in milliseconds */
  readonly threshold: number;
  /** Total duration of the timeline (optional, calculated if not provided) */
  readonly totalDuration?: number;
  /** Callback when pin toggle is clicked */
  readonly onTogglePin: (traceId: string) => void;
  /** Callback when "View in Tree" is clicked */
  readonly onViewInTree: (traceId: string) => void;
  /** Initial zoom level (default 1) */
  readonly initialZoom?: number;
}

/**
 * Zoom control button configuration.
 */
interface ZoomButton {
  readonly id: string;
  readonly label: string;
  readonly ariaLabel: string;
  readonly action: "zoomIn" | "zoomOut" | "fitAll" | "focusSlow";
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Zoom configuration.
 */
const ZOOM_CONFIG = {
  min: 0.25,
  max: 4,
  step: 0.25,
  default: 1,
} as const;

/**
 * Zoom control buttons configuration.
 */
const ZOOM_BUTTONS: readonly ZoomButton[] = [
  { id: "zoom-in", label: "+", ariaLabel: "Zoom in", action: "zoomIn" },
  { id: "zoom-out", label: "-", ariaLabel: "Zoom out", action: "zoomOut" },
  { id: "fit-all", label: "Fit All", ariaLabel: "Fit all traces", action: "fitAll" },
  { id: "focus-slow", label: "Focus Slow", ariaLabel: "Focus on slow traces", action: "focusSlow" },
] as const;

// =============================================================================
// Local Styles
// =============================================================================

const localStyles: {
  readonly container: CSSProperties;
  readonly header: CSSProperties;
  readonly zoomControls: CSSProperties;
  readonly zoomButton: CSSProperties;
  readonly zoomLevel: CSSProperties;
  readonly timelineContainer: CSSProperties;
  readonly rowsContainer: CSSProperties;
  readonly footer: CSSProperties;
  readonly footerStat: CSSProperties;
  readonly footerLabel: CSSProperties;
  readonly footerValue: CSSProperties;
  readonly legend: CSSProperties;
  readonly legendItem: CSSProperties;
  readonly legendSwatch: CSSProperties;
  readonly legendSwatchFast: CSSProperties;
  readonly legendSwatchMedium: CSSProperties;
  readonly legendSwatchSlow: CSSProperties;
  readonly legendSwatchCached: CSSProperties;
  readonly emptyState: CSSProperties;
} = {
  container: {
    ...timelineStyles.container,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  zoomControls: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  zoomButton: {
    ...containerInspectorStyles.refreshButton,
    minWidth: "32px",
  },
  zoomLevel: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    minWidth: "40px",
    textAlign: "center",
  },
  timelineContainer: {
    overflowX: "auto",
    overflowY: "hidden",
    position: "relative",
  },
  rowsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  footer: {
    ...timelineStyles.footer,
  },
  footerStat: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  footerLabel: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  footerValue: {
    fontWeight: 600,
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "8px 12px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "4px",
    marginTop: "8px",
    fontSize: "11px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  legendSwatch: {
    width: "16px",
    height: "8px",
    borderRadius: "2px",
  },
  legendSwatchFast: {
    backgroundColor: "var(--hex-devtools-fast, #a6e3a1)",
  },
  legendSwatchMedium: {
    backgroundColor: "var(--hex-devtools-medium, #f9e2af)",
  },
  legendSwatchSlow: {
    backgroundColor: "var(--hex-devtools-slow, #f38ba8)",
  },
  legendSwatchCached: {
    backgroundColor: "var(--hex-devtools-cached, #89dceb)",
  },
  emptyState: {
    ...emptyStyles.container,
    padding: "32px 16px",
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate total duration from trace entries.
 *
 * @param traces - Array of trace entries
 * @returns Total duration (end of last trace minus start of first)
 */
function calculateTotalDuration(traces: readonly TraceEntry[]): number {
  if (traces.length === 0) return 0;

  let maxEndTime = 0;
  for (const trace of traces) {
    const endTime = trace.startTime + trace.duration;
    if (endTime > maxEndTime) {
      maxEndTime = endTime;
    }
  }
  return maxEndTime;
}

/**
 * Calculate summary statistics from traces.
 */
function calculateStats(
  traces: readonly TraceEntry[],
  threshold: number
): {
  totalTime: number;
  cacheHitRate: number;
  slowestTrace: TraceEntry | null;
} {
  if (traces.length === 0) {
    return { totalTime: 0, cacheHitRate: 0, slowestTrace: null };
  }

  let totalTime = 0;
  let cacheHits = 0;
  let slowestTrace: TraceEntry | null = null;
  let maxDuration = 0;

  for (const trace of traces) {
    totalTime += trace.duration;
    if (trace.isCacheHit) {
      cacheHits++;
    }
    if (trace.duration > maxDuration) {
      maxDuration = trace.duration;
      slowestTrace = trace;
    }
  }

  return {
    totalTime,
    cacheHitRate: (cacheHits / traces.length) * 100,
    slowestTrace,
  };
}

// =============================================================================
// ZoomControls Component
// =============================================================================

interface ZoomControlsProps {
  readonly zoom: number;
  readonly onZoomChange: (zoom: number) => void;
  readonly onFitAll: () => void;
  readonly onFocusSlow: () => void;
}

/**
 * Zoom controls for the timeline.
 */
function ZoomControls({
  zoom,
  onZoomChange,
  onFitAll,
  onFocusSlow,
}: ZoomControlsProps): ReactElement {
  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(zoom + ZOOM_CONFIG.step, ZOOM_CONFIG.max));
  }, [zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(zoom - ZOOM_CONFIG.step, ZOOM_CONFIG.min));
  }, [zoom, onZoomChange]);

  return (
    <div data-testid="zoom-controls" style={localStyles.zoomControls}>
      <button
        data-testid="zoom-in"
        style={localStyles.zoomButton}
        onClick={handleZoomIn}
        disabled={zoom >= ZOOM_CONFIG.max}
        type="button"
        aria-label="Zoom in"
      >
        +
      </button>
      <span data-testid="zoom-level" style={localStyles.zoomLevel}>
        {Math.round(zoom * 100)}%
      </span>
      <button
        data-testid="zoom-out"
        style={localStyles.zoomButton}
        onClick={handleZoomOut}
        disabled={zoom <= ZOOM_CONFIG.min}
        type="button"
        aria-label="Zoom out"
      >
        -
      </button>
      <button
        data-testid="fit-all"
        style={localStyles.zoomButton}
        onClick={onFitAll}
        type="button"
        aria-label="Fit all traces"
      >
        Fit All
      </button>
      <button
        data-testid="focus-slow"
        style={localStyles.zoomButton}
        onClick={onFocusSlow}
        type="button"
        aria-label="Focus on slow traces"
      >
        Focus Slow
      </button>
    </div>
  );
}

// =============================================================================
// Legend Component
// =============================================================================

/**
 * Legend showing color coding explanation.
 */
function Legend({ threshold }: { threshold: number }): ReactElement {
  return (
    <div data-testid="timeline-legend" style={localStyles.legend}>
      <div style={localStyles.legendItem}>
        <span style={{ ...localStyles.legendSwatch, ...localStyles.legendSwatchFast }} />
        <span>Fast (&lt;10ms)</span>
      </div>
      <div style={localStyles.legendItem}>
        <span style={{ ...localStyles.legendSwatch, ...localStyles.legendSwatchMedium }} />
        <span>Medium</span>
      </div>
      <div style={localStyles.legendItem}>
        <span style={{ ...localStyles.legendSwatch, ...localStyles.legendSwatchSlow }} />
        <span>Slow (&gt;={threshold}ms)</span>
      </div>
      <div style={localStyles.legendItem}>
        <span style={{ ...localStyles.legendSwatch, ...localStyles.legendSwatchCached }} />
        <span>Cache Hit</span>
      </div>
    </div>
  );
}

// =============================================================================
// Footer Component
// =============================================================================

interface FooterProps {
  readonly traceCount: number;
  readonly stats: {
    readonly totalTime: number;
    readonly cacheHitRate: number;
    readonly slowestTrace: TraceEntry | null;
  };
}

/**
 * Footer showing summary statistics.
 */
function Footer({ traceCount, stats }: FooterProps): ReactElement {
  return (
    <div data-testid="timeline-footer" style={localStyles.footer}>
      <div style={localStyles.footerStat}>
        <span style={localStyles.footerLabel}>Total:</span>
        <span style={localStyles.footerValue}>{formatDuration(stats.totalTime)}</span>
      </div>
      <div style={localStyles.footerStat}>
        <span style={localStyles.footerLabel}>Resolutions:</span>
        <span style={localStyles.footerValue}>{traceCount}</span>
      </div>
      <div style={localStyles.footerStat}>
        <span style={localStyles.footerLabel}>Cache Hit Rate:</span>
        <span style={localStyles.footerValue}>{stats.cacheHitRate.toFixed(0)}%</span>
      </div>
      {stats.slowestTrace && (
        <div style={localStyles.footerStat}>
          <span style={localStyles.footerLabel}>Slowest:</span>
          <span style={localStyles.footerValue}>
            {stats.slowestTrace.portName} ({formatDuration(stats.slowestTrace.duration)})
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TimelineView Component
// =============================================================================

/**
 * TimelineView component for Resolution Tracing.
 *
 * Features:
 * - Horizontal time-axis with duration bars proportional to resolution time
 * - Time ruler with auto-scaling, major/minor ticks, threshold marker
 * - Color-coded bars: green (<10ms), yellow (10ms-threshold), red (>=threshold), cyan (cache hit)
 * - Expandable rows showing trace details
 * - Zoom controls: [+] [-] [Fit All] [Focus Slow]
 * - Pin icon for pinned traces
 * - Footer with summary statistics
 * - Legend showing color coding
 *
 * @param props - The component props
 * @returns A React element containing the timeline view
 *
 * @example
 * ```tsx
 * function TracingView() {
 *   const [traces, setTraces] = useState<TraceEntry[]>([]);
 *
 *   return (
 *     <TimelineView
 *       traces={traces}
 *       threshold={50}
 *       onTogglePin={(id) => handlePinToggle(id)}
 *       onViewInTree={(id) => navigateToTree(id)}
 *     />
 *   );
 * }
 * ```
 */
export function TimelineView({
  traces,
  threshold,
  totalDuration: providedTotalDuration,
  onTogglePin,
  onViewInTree,
  initialZoom = ZOOM_CONFIG.default,
}: TimelineViewProps): ReactElement {
  // State
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(initialZoom);

  // Calculate total duration if not provided
  const totalDuration = useMemo(() => {
    if (providedTotalDuration !== undefined && providedTotalDuration > 0) {
      return providedTotalDuration;
    }
    return calculateTotalDuration(traces);
  }, [traces, providedTotalDuration]);

  // Calculate statistics
  const stats = useMemo(() => calculateStats(traces, threshold), [traces, threshold]);

  // Handlers
  const handleToggleExpand = useCallback((traceId: string) => {
    setExpandedTraceId((current) => (current === traceId ? null : traceId));
  }, []);

  const handleFitAll = useCallback(() => {
    setZoom(ZOOM_CONFIG.default);
  }, []);

  const handleFocusSlow = useCallback(() => {
    // Find the first slow trace and adjust zoom to focus on it
    const slowTrace = traces.find((t) => t.duration >= threshold && !t.isCacheHit);
    if (slowTrace) {
      // Set zoom to show the slow trace prominently
      setZoom(2);
      setExpandedTraceId(slowTrace.id);
    }
  }, [traces, threshold]);

  // Empty state
  if (traces.length === 0) {
    return (
      <div data-testid="timeline-view" style={localStyles.container}>
        <div style={localStyles.emptyState}>
          No resolution traces recorded.
          <br />
          <span style={{ fontSize: "11px", marginTop: "8px", display: "block" }}>
            Start resolving services to see timing data here.
          </span>
        </div>
      </div>
    );
  }

  // Calculate scaled width based on zoom
  const scaledWidth = `${100 * zoom}%`;

  return (
    <div data-testid="timeline-view" style={localStyles.container}>
      {/* Header with zoom controls */}
      <div style={localStyles.header}>
        <span style={{ fontSize: "12px", fontWeight: 600 }}>
          Timeline ({traces.length} traces)
        </span>
        <ZoomControls
          zoom={zoom}
          onZoomChange={setZoom}
          onFitAll={handleFitAll}
          onFocusSlow={handleFocusSlow}
        />
      </div>

      {/* Timeline container with horizontal scroll */}
      <div style={localStyles.timelineContainer}>
        <div style={{ width: scaledWidth, minWidth: "100%" }}>
          {/* Time ruler */}
          <TimeRuler
            totalDuration={totalDuration}
            threshold={threshold}
            zoom={zoom}
          />

          {/* Timeline rows */}
          <div data-testid="timeline-rows" style={localStyles.rowsContainer}>
            {traces.map((trace) => (
              <TimelineRow
                key={trace.id}
                trace={trace}
                threshold={threshold}
                totalDuration={totalDuration}
                isExpanded={expandedTraceId === trace.id}
                onToggleExpand={handleToggleExpand}
                onTogglePin={onTogglePin}
                onViewInTree={onViewInTree}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer with statistics */}
      <Footer traceCount={traces.length} stats={stats} />

      {/* Legend */}
      <Legend threshold={threshold} />
    </div>
  );
}
