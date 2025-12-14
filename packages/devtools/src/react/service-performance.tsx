/**
 * ServicePerformance React component for displaying per-service performance metrics.
 *
 * Displays resolution timing, cache hit rates, and slow resolution counts
 * for individual services based on tracing data.
 *
 * @packageDocumentation
 */

import React, { useMemo, type ReactElement, type CSSProperties } from "react";
import type { TracingAPI, TraceEntry } from "../tracing/types.js";
import { formatDuration } from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Aggregated performance metrics for a single service.
 */
export interface ServicePerformance {
  /** Total number of times this service was resolved */
  readonly totalResolutions: number;
  /** Average resolution duration in milliseconds */
  readonly averageDuration: number;
  /** Cache hit rate (0 to 1) */
  readonly cacheHitRate: number;
  /** Timestamp of last resolution (null if never resolved) */
  readonly lastResolved: number | null;
  /** Number of slow resolutions (exceeding threshold) */
  readonly slowCount: number;
  /** Minimum resolution duration */
  readonly minDuration: number;
  /** Maximum resolution duration */
  readonly maxDuration: number;
}

/**
 * Props for the ServicePerformanceInfo component.
 */
export interface ServicePerformanceInfoProps {
  /** The port name to show performance for */
  readonly portName: string;
  /** The tracing API to query */
  readonly tracingAPI: TracingAPI;
  /** Slow threshold in milliseconds (default: 100) */
  readonly slowThreshold?: number;
}

/**
 * Props for the ServicePerformanceDisplay component.
 */
export interface ServicePerformanceDisplayProps {
  /** The performance metrics to display */
  readonly performance: ServicePerformance;
  /** Whether to show compact layout */
  readonly compact?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate performance metrics for a service from trace entries.
 *
 * @param traces - Trace entries for the service
 * @param slowThreshold - Duration threshold for slow resolutions
 * @returns Aggregated performance metrics
 */
export function calculateServicePerformance(
  traces: readonly TraceEntry[],
  slowThreshold: number = 100
): ServicePerformance {
  if (traces.length === 0) {
    return {
      totalResolutions: 0,
      averageDuration: 0,
      cacheHitRate: 0,
      lastResolved: null,
      slowCount: 0,
      minDuration: 0,
      maxDuration: 0,
    };
  }

  let totalDuration = 0;
  let cacheHits = 0;
  let slowCount = 0;
  let minDuration = Infinity;
  let maxDuration = 0;
  let lastResolved = 0;

  for (const trace of traces) {
    totalDuration += trace.duration;

    if (trace.isCacheHit) {
      cacheHits++;
    }

    if (trace.duration >= slowThreshold) {
      slowCount++;
    }

    if (trace.duration < minDuration) {
      minDuration = trace.duration;
    }

    if (trace.duration > maxDuration) {
      maxDuration = trace.duration;
    }

    if (trace.startTime > lastResolved) {
      lastResolved = trace.startTime;
    }
  }

  return {
    totalResolutions: traces.length,
    averageDuration: totalDuration / traces.length,
    cacheHitRate: cacheHits / traces.length,
    lastResolved: lastResolved > 0 ? lastResolved : null,
    slowCount,
    minDuration: minDuration === Infinity ? 0 : minDuration,
    maxDuration,
  };
}

// =============================================================================
// Styles
// =============================================================================

const performanceStyles: {
  readonly container: CSSProperties;
  readonly row: CSSProperties;
  readonly label: CSSProperties;
  readonly value: CSSProperties;
  readonly valueGood: CSSProperties;
  readonly valueWarning: CSSProperties;
  readonly valueBad: CSSProperties;
  readonly compactContainer: CSSProperties;
  readonly compactItem: CSSProperties;
  readonly emptyState: CSSProperties;
} = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px 0",
    borderTop: "1px solid var(--hex-devtools-border, #45475a)",
    marginTop: "8px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
  },
  label: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  value: {
    color: "var(--hex-devtools-text, #cdd6f4)",
    fontWeight: 500,
    fontFamily: "monospace",
  },
  valueGood: {
    color: "var(--hex-devtools-resolved, #a6e3a1)",
  },
  valueWarning: {
    color: "var(--hex-devtools-request, #fab387)",
  },
  valueBad: {
    color: "var(--hex-devtools-slow, #f38ba8)",
  },
  compactContainer: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    fontSize: "10px",
  },
  compactItem: {
    display: "flex",
    gap: "4px",
    alignItems: "center",
  },
  emptyState: {
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    fontStyle: "italic",
    padding: "8px 0",
  },
};

// =============================================================================
// Components
// =============================================================================

/**
 * Display performance metrics with visual indicators.
 */
export function ServicePerformanceDisplay({
  performance,
  compact = false,
}: ServicePerformanceDisplayProps): ReactElement {
  if (performance.totalResolutions === 0) {
    return (
      <div style={performanceStyles.emptyState}>
        No resolution data available
      </div>
    );
  }

  const cacheHitPercent = Math.round(performance.cacheHitRate * 100);
  const cacheHitStyle =
    cacheHitPercent >= 80
      ? performanceStyles.valueGood
      : cacheHitPercent >= 50
        ? performanceStyles.valueWarning
        : performanceStyles.valueBad;

  const avgDurationStyle =
    performance.averageDuration < 10
      ? performanceStyles.valueGood
      : performance.averageDuration < 50
        ? performanceStyles.valueWarning
        : performanceStyles.valueBad;

  const slowStyle =
    performance.slowCount === 0
      ? performanceStyles.valueGood
      : performanceStyles.valueBad;

  if (compact) {
    return (
      <div style={performanceStyles.compactContainer}>
        <span style={performanceStyles.compactItem}>
          <span style={performanceStyles.label}>Avg:</span>
          <span style={{ ...performanceStyles.value, ...avgDurationStyle }}>
            {formatDuration(performance.averageDuration)}
          </span>
        </span>
        <span style={performanceStyles.compactItem}>
          <span style={performanceStyles.label}>Cache:</span>
          <span style={{ ...performanceStyles.value, ...cacheHitStyle }}>
            {cacheHitPercent}%
          </span>
        </span>
        <span style={performanceStyles.compactItem}>
          <span style={performanceStyles.label}>Total:</span>
          <span style={performanceStyles.value}>
            {performance.totalResolutions}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div style={performanceStyles.container}>
      <div style={performanceStyles.row}>
        <span style={performanceStyles.label}>Avg Duration</span>
        <span style={{ ...performanceStyles.value, ...avgDurationStyle }}>
          {formatDuration(performance.averageDuration)}
        </span>
      </div>
      <div style={performanceStyles.row}>
        <span style={performanceStyles.label}>Cache Hit Rate</span>
        <span style={{ ...performanceStyles.value, ...cacheHitStyle }}>
          {cacheHitPercent}%
        </span>
      </div>
      <div style={performanceStyles.row}>
        <span style={performanceStyles.label}>Total Resolutions</span>
        <span style={performanceStyles.value}>
          {performance.totalResolutions}
        </span>
      </div>
      <div style={performanceStyles.row}>
        <span style={performanceStyles.label}>Slow Resolutions</span>
        <span style={{ ...performanceStyles.value, ...slowStyle }}>
          {performance.slowCount}
        </span>
      </div>
      {performance.totalResolutions > 1 && (
        <div style={performanceStyles.row}>
          <span style={performanceStyles.label}>Duration Range</span>
          <span style={performanceStyles.value}>
            {formatDuration(performance.minDuration)} -{" "}
            {formatDuration(performance.maxDuration)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * ServicePerformanceInfo component that queries tracing API and displays metrics.
 *
 * Automatically fetches trace data for the specified port and calculates
 * performance statistics.
 *
 * @param props - The component props
 * @returns A React element containing the performance metrics
 *
 * @example
 * ```tsx
 * <ServicePerformanceInfo
 *   portName="UserService"
 *   tracingAPI={tracingAPI}
 *   slowThreshold={50}
 * />
 * ```
 */
export function ServicePerformanceInfo({
  portName,
  tracingAPI,
  slowThreshold = 100,
}: ServicePerformanceInfoProps): ReactElement {
  const performance = useMemo(() => {
    const traces = tracingAPI.getTraces({ portName });
    return calculateServicePerformance(traces, slowThreshold);
  }, [portName, tracingAPI, slowThreshold]);

  return <ServicePerformanceDisplay performance={performance} />;
}

/**
 * Hook to get performance metrics for a service.
 *
 * @param portName - The port name to get metrics for
 * @param tracingAPI - The tracing API (optional)
 * @param slowThreshold - Duration threshold for slow resolutions
 * @returns Performance metrics or null if no tracing API
 */
export function useServicePerformance(
  portName: string,
  tracingAPI: TracingAPI | undefined,
  slowThreshold: number = 100
): ServicePerformance | null {
  return useMemo(() => {
    if (tracingAPI === undefined) {
      return null;
    }
    const traces = tracingAPI.getTraces({ portName });
    return calculateServicePerformance(traces, slowThreshold);
  }, [portName, tracingAPI, slowThreshold]);
}
