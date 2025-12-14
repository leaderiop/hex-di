/**
 * ResolutionTracingSection React component for DevTools panel.
 *
 * Container component for the Resolution Tracing feature, providing
 * sub-view tabs for Timeline, Tree, and Summary views. Integrates with
 * TracingContainer for real-time trace data.
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactElement,
  type CSSProperties,
} from "react";
import { tracingStyles, emptyStyles } from "./styles.js";
import type { TraceEntry, TraceStats, TracingAPI } from "../tracing/types.js";
import { DEFAULT_RETENTION_POLICY } from "../tracing/types.js";
import {
  TracingControlsBar,
  type TracingFilters,
  type TracingSortOption,
  type TracingExportFormat,
} from "./tracing-controls-bar.js";
import { SummaryStatsView } from "./summary-stats-view.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Sub-view identifiers for the tracing section.
 */
export type TracingViewId = "timeline" | "tree" | "summary";

/**
 * Props for the ResolutionTracingSection component.
 */
export interface ResolutionTracingSectionProps {
  /** Optional initial view to display */
  readonly initialView?: TracingViewId;
  /** Optional tracing API from a TracingContainer */
  readonly tracingAPI?: TracingAPI;
}

/**
 * Configuration for a tracing sub-view tab.
 */
interface ViewTabConfig {
  readonly id: TracingViewId;
  readonly label: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * View tab configuration.
 */
const VIEW_TAB_CONFIGS: readonly ViewTabConfig[] = [
  { id: "timeline", label: "Timeline" },
  { id: "tree", label: "Tree" },
  { id: "summary", label: "Summary" },
] as const;

/**
 * Default filter state.
 */
const DEFAULT_FILTERS: TracingFilters = {
  searchQuery: "",
  lifetime: null,
  status: null,
  slowOnly: false,
};

/**
 * Default sort option.
 */
const DEFAULT_SORT: TracingSortOption = "chronological";

/**
 * Default threshold in milliseconds.
 */
const DEFAULT_THRESHOLD = 50;

/**
 * Local styles for the view toggle tabs.
 */
const viewToggleStyles: {
  readonly container: CSSProperties;
  readonly tab: CSSProperties;
  readonly tabActive: CSSProperties;
} = {
  container: {
    ...tracingStyles.viewToggleContainer,
    display: "flex",
    gap: "0",
    marginBottom: "12px",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
  },
  tab: {
    ...tracingStyles.viewToggleTab,
    padding: "8px 16px",
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    transition: "color 0.15s ease, border-color 0.15s ease",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  tabActive: {
    ...tracingStyles.viewToggleTabActive,
    color: "var(--hex-devtools-accent, #89b4fa)",
    borderBottom: "2px solid var(--hex-devtools-accent, #89b4fa)",
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Filters traces based on the current filter state.
 */
function filterTraces(
  traces: readonly TraceEntry[],
  filters: TracingFilters,
  threshold: number
): readonly TraceEntry[] {
  return traces.filter((trace) => {
    // Search query filter (case-insensitive partial match)
    if (
      filters.searchQuery.length > 0 &&
      !trace.portName.toLowerCase().includes(filters.searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Lifetime filter
    if (filters.lifetime !== null && trace.lifetime !== filters.lifetime) {
      return false;
    }

    // Status filter (fresh/cached)
    if (filters.status === "fresh" && trace.isCacheHit) {
      return false;
    }
    if (filters.status === "cached" && !trace.isCacheHit) {
      return false;
    }

    // Slow only filter
    if (filters.slowOnly && trace.duration < threshold) {
      return false;
    }

    return true;
  });
}

/**
 * Sorts traces based on the current sort option.
 */
function sortTraces(
  traces: readonly TraceEntry[],
  sort: TracingSortOption
): readonly TraceEntry[] {
  const sorted = [...traces];

  switch (sort) {
    case "chronological":
      sorted.sort((a, b) => a.startTime - b.startTime);
      break;
    case "slowest":
      sorted.sort((a, b) => b.duration - a.duration);
      break;
    case "fastest":
      sorted.sort((a, b) => a.duration - b.duration);
      break;
    case "alphabetical":
      sorted.sort((a, b) => a.portName.localeCompare(b.portName));
      break;
    case "alphabetical-desc":
      sorted.sort((a, b) => b.portName.localeCompare(a.portName));
      break;
    case "resolution-order":
      sorted.sort((a, b) => a.order - b.order);
      break;
  }

  return sorted;
}

/**
 * Creates empty stats object.
 */
function createEmptyStats(): TraceStats {
  return {
    totalResolutions: 0,
    averageDuration: 0,
    cacheHitRate: 0,
    slowCount: 0,
    sessionStart: Date.now(),
    totalDuration: 0,
  };
}

/**
 * Exports trace data in the specified format.
 */
function exportTraces(
  traces: readonly TraceEntry[],
  stats: TraceStats,
  format: TracingExportFormat
): void {
  switch (format) {
    case "json": {
      const data = JSON.stringify({ traces, stats }, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `traces-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      break;
    }
    case "csv": {
      const headers = [
        "id",
        "portName",
        "lifetime",
        "startTime",
        "duration",
        "isCacheHit",
        "parentTraceId",
        "scopeId",
        "order",
        "isPinned",
      ];
      const rows = traces.map((t) => [
        t.id,
        t.portName,
        t.lifetime,
        t.startTime.toString(),
        t.duration.toString(),
        t.isCacheHit.toString(),
        t.parentTraceId ?? "",
        t.scopeId ?? "",
        t.order.toString(),
        t.isPinned.toString(),
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n"
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `traces-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      break;
    }
    case "clipboard": {
      const summary = `Resolution Tracing Summary
========================
Total Resolutions: ${stats.totalResolutions}
Average Duration: ${stats.averageDuration.toFixed(2)}ms
Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%
Slow Count: ${stats.slowCount}
Total Duration: ${stats.totalDuration.toFixed(2)}ms

Top 5 Slowest:
${traces
  .slice()
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 5)
  .map((t, i) => `${i + 1}. ${t.portName}: ${t.duration.toFixed(2)}ms`)
  .join("\n")}
`;
      navigator.clipboard.writeText(summary).catch(() => {
        // Fallback if clipboard API fails
        console.warn("Failed to copy to clipboard");
      });
      break;
    }
  }
}

// =============================================================================
// ViewToggleTabs Component
// =============================================================================

/**
 * Props for the ViewToggleTabs component.
 */
interface ViewToggleTabsProps {
  readonly activeView: TracingViewId;
  readonly onViewChange: (viewId: TracingViewId) => void;
}

/**
 * View toggle tabs for switching between Timeline, Tree, and Summary views.
 */
function ViewToggleTabs({
  activeView,
  onViewChange,
}: ViewToggleTabsProps): ReactElement {
  return (
    <div
      data-testid="tracing-view-tabs"
      role="tablist"
      aria-label="Tracing views"
      style={viewToggleStyles.container}
    >
      {VIEW_TAB_CONFIGS.map((tab) => {
        const isActive = activeView === tab.id;
        const tabStyle: CSSProperties = {
          ...viewToggleStyles.tab,
          ...(isActive ? viewToggleStyles.tabActive : {}),
        };

        return (
          <button
            key={tab.id}
            role="tab"
            id={`tracing-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tracing-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            style={tabStyle}
            onClick={() => onViewChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Placeholder View Components
// =============================================================================

/**
 * Placeholder for Timeline view (to be implemented in Task Group 8).
 */
function TimelineViewPlaceholder(): ReactElement {
  return (
    <div data-testid="timeline-view" style={emptyStyles.container}>
      <div style={{ fontWeight: 500, marginBottom: "8px" }}>Timeline View</div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--hex-devtools-text-muted, #a6adc8)",
        }}
      >
        Horizontal time-axis visualization with duration bars.
      </div>
      <div
        style={{
          fontSize: "11px",
          marginTop: "12px",
          color: "var(--hex-devtools-text-muted, #a6adc8)",
        }}
      >
        (Implementation in Task Group 8)
      </div>
    </div>
  );
}

/**
 * Placeholder for Tree view (to be implemented in Task Group 9).
 */
function TreeViewPlaceholder(): ReactElement {
  return (
    <div data-testid="tree-view" style={emptyStyles.container}>
      <div style={{ fontWeight: 500, marginBottom: "8px" }}>Tree View</div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--hex-devtools-text-muted, #a6adc8)",
        }}
      >
        Hierarchical dependency chain visualization.
      </div>
      <div
        style={{
          fontSize: "11px",
          marginTop: "12px",
          color: "var(--hex-devtools-text-muted, #a6adc8)",
        }}
      >
        (Implementation in Task Group 9)
      </div>
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

/**
 * Empty state when no traces are recorded.
 */
function EmptyState(): ReactElement {
  return (
    <div data-testid="tracing-empty-state" style={emptyStyles.container}>
      <div style={{ fontWeight: 500, marginBottom: "8px" }}>
        No resolution traces recorded.
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--hex-devtools-text-muted, #a6adc8)",
          maxWidth: "280px",
          margin: "0 auto",
        }}
      >
        Traces are captured when services are resolved from a tracing-enabled
        container. Use createTracingContainer() to enable tracing.
      </div>
    </div>
  );
}

// =============================================================================
// ResolutionTracingSection Component
// =============================================================================

/**
 * ResolutionTracingSection component for the Tracing tab.
 *
 * Features:
 * - ViewToggleTabs for Timeline/Tree/Summary switching
 * - TracingControlsBar for filtering, sorting, and threshold controls
 * - Real-time trace data subscription via TracingAPI
 * - Empty state when no traces
 * - View container for active sub-view
 *
 * @param props - The component props
 * @returns A React element containing the tracing section
 *
 * @example Without TracingAPI (placeholder mode)
 * ```tsx
 * function TracingTab() {
 *   return <ResolutionTracingSection initialView="timeline" />;
 * }
 * ```
 *
 * @example With TracingAPI (connected mode)
 * ```tsx
 * import { TRACING_ACCESS } from '@hex-di/runtime';
 *
 * function TracingTab({ container }) {
 *   const tracingAPI = container[TRACING_ACCESS];
 *   return (
 *     <ResolutionTracingSection
 *       initialView="summary"
 *       tracingAPI={tracingAPI}
 *     />
 *   );
 * }
 * ```
 */
export function ResolutionTracingSection({
  initialView = "timeline",
  tracingAPI,
}: ResolutionTracingSectionProps): ReactElement {
  // View state
  const [activeView, setActiveView] = useState<TracingViewId>(initialView);

  // Controls state
  const [filters, setFilters] = useState<TracingFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<TracingSortOption>(DEFAULT_SORT);
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);

  // Trace data state
  const [traces, setTraces] = useState<readonly TraceEntry[]>([]);
  const [stats, setStats] = useState<TraceStats>(createEmptyStats);
  const [isRecording, setIsRecording] = useState<boolean>(true);

  // Subscribe to trace updates when tracingAPI is provided
  useEffect(() => {
    if (tracingAPI === undefined) {
      return;
    }

    // Initial load of existing traces
    setTraces(tracingAPI.getTraces());
    setStats(tracingAPI.getStats());
    setIsRecording(!tracingAPI.isPaused());

    // Subscribe to new traces
    const unsubscribe = tracingAPI.subscribe(() => {
      // Refresh traces and stats when new trace is recorded
      setTraces(tracingAPI.getTraces());
      setStats(tracingAPI.getStats());
    });

    return unsubscribe;
  }, [tracingAPI]);

  // Compute filtered and sorted traces
  const processedTraces = useMemo(() => {
    const filtered = filterTraces(traces, filters, threshold);
    return sortTraces(filtered, sort);
  }, [traces, filters, sort, threshold]);

  // Compute total duration for controls bar
  const totalDuration = useMemo(() => {
    return traces.reduce((sum, t) => sum + t.duration, 0);
  }, [traces]);

  // Handlers
  const handleViewChange = useCallback((viewId: TracingViewId) => {
    setActiveView(viewId);
  }, []);

  const handleFiltersChange = useCallback((newFilters: TracingFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSort: TracingSortOption) => {
    setSort(newSort);
  }, []);

  const handleThresholdChange = useCallback((newThreshold: number) => {
    setThreshold(newThreshold);
  }, []);

  const handleClear = useCallback(() => {
    if (tracingAPI !== undefined) {
      tracingAPI.clear();
      setTraces([]);
      setStats(createEmptyStats());
    }
  }, [tracingAPI]);

  const handlePauseToggle = useCallback(() => {
    if (tracingAPI !== undefined) {
      if (tracingAPI.isPaused()) {
        tracingAPI.resume();
        setIsRecording(true);
      } else {
        tracingAPI.pause();
        setIsRecording(false);
      }
    }
  }, [tracingAPI]);

  const handleExport = useCallback(
    (format: TracingExportFormat) => {
      exportTraces(processedTraces, stats, format);
    },
    [processedTraces, stats]
  );

  const handleNavigateToTrace = useCallback(
    (traceId: string) => {
      // Switch to timeline view and potentially highlight the trace
      // For now, just switch to timeline view
      setActiveView("timeline");
      // In the future, this could set a selectedTraceId state
      // to highlight the trace in the timeline
      void traceId;
    },
    []
  );

  // Determine if we have traces to display
  const hasTraces = traces.length > 0;

  /**
   * Render the active view content.
   */
  const renderActiveView = (): ReactElement => {
    if (!hasTraces && tracingAPI === undefined) {
      return <EmptyState />;
    }

    switch (activeView) {
      case "timeline":
        if (!hasTraces) {
          return <EmptyState />;
        }
        return <TimelineViewPlaceholder />;

      case "tree":
        if (!hasTraces) {
          return <EmptyState />;
        }
        return <TreeViewPlaceholder />;

      case "summary":
        return (
          <SummaryStatsView
            traces={processedTraces}
            stats={stats}
            threshold={threshold}
            onNavigateToTrace={handleNavigateToTrace}
            onExport={handleExport}
          />
        );

      default: {
        // Exhaustive check
        const _exhaustive: never = activeView;
        return _exhaustive;
      }
    }
  };

  return (
    <div
      data-testid="resolution-tracing-section"
      style={tracingStyles.container}
    >
      {/* Controls Bar - only show when tracingAPI is connected or we have traces */}
      {(tracingAPI !== undefined || hasTraces) && (
        <TracingControlsBar
          filters={filters}
          sort={sort}
          threshold={threshold}
          isRecording={isRecording}
          traceCount={traces.length}
          totalDuration={totalDuration}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          onThresholdChange={handleThresholdChange}
          onClear={handleClear}
          onPauseToggle={handlePauseToggle}
          onExport={handleExport}
        />
      )}

      {/* View Toggle Tabs */}
      <ViewToggleTabs activeView={activeView} onViewChange={handleViewChange} />

      {/* Active View Content */}
      <div
        id={`tracing-panel-${activeView}`}
        role="tabpanel"
        aria-labelledby={`tracing-tab-${activeView}`}
        style={tracingStyles.viewContent}
      >
        {renderActiveView()}
      </div>
    </div>
  );
}
