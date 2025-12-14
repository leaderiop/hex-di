/**
 * SummaryStatsView React component for Resolution Tracing.
 *
 * Displays aggregate performance metrics and insights including:
 * - Overview cards (Total Resolutions, Avg Time, Cache Hit Rate, Slow Count)
 * - Duration distribution bar chart
 * - Slowest services list (top 5)
 * - Lifetime breakdown (Singleton/Scoped/Request)
 * - Cache efficiency visualization
 * - Export functionality
 *
 * @packageDocumentation
 */

import React, { useMemo, useCallback, type ReactElement, type CSSProperties } from "react";
import type { Lifetime } from "@hex-di/graph";
import type { TraceEntry, TraceStats } from "../tracing/types.js";
import type { TracingExportFormat } from "./tracing-controls-bar.js";
import {
  summaryStyles,
  emptyStyles,
  nodeStyles,
  formatDuration,
} from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the SummaryStatsView component.
 */
export interface SummaryStatsViewProps {
  /** Array of trace entries to analyze */
  readonly traces: readonly TraceEntry[];
  /** Pre-computed trace statistics */
  readonly stats: TraceStats;
  /** Current slow threshold in milliseconds */
  readonly threshold: number;
  /** Callback when user clicks a slowest service to navigate */
  readonly onNavigateToTrace: (traceId: string) => void;
  /** Callback when user exports data */
  readonly onExport: (format: TracingExportFormat) => void;
}

/**
 * Duration distribution bucket configuration.
 */
interface DurationBucket {
  readonly id: string;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly category: "fast" | "medium" | "slow";
}

/**
 * Computed lifetime statistics.
 */
interface LifetimeStats {
  readonly count: number;
  readonly averageDuration: number;
  readonly totalDuration: number;
}

/**
 * Slowest service entry for display.
 */
interface SlowestService {
  readonly traceId: string;
  readonly portName: string;
  readonly duration: number;
  readonly lifetime: Lifetime;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Duration bucket configuration.
 */
const DURATION_BUCKETS: readonly DurationBucket[] = [
  { id: "0-10", label: "0-10ms", min: 0, max: 10, category: "fast" },
  { id: "10-25", label: "10-25ms", min: 10, max: 25, category: "medium" },
  { id: "25-50", label: "25-50ms", min: 25, max: 50, category: "medium" },
  { id: "50-100", label: "50-100ms", min: 50, max: 100, category: "slow" },
  { id: "100-plus", label: ">100ms", min: 100, max: Infinity, category: "slow" },
] as const;

/**
 * Maximum number of slowest services to display.
 */
const MAX_SLOWEST_SERVICES = 5;

// =============================================================================
// Local Styles
// =============================================================================

const localStyles: {
  readonly exportContainer: CSSProperties;
  readonly exportButton: CSSProperties;
  readonly section: CSSProperties;
  readonly slowestServiceRow: CSSProperties;
  readonly slowestServiceRank: CSSProperties;
  readonly slowestServiceName: CSSProperties;
  readonly slowestServiceDuration: CSSProperties;
  readonly slowestServiceBar: CSSProperties;
  readonly lifetimeCard: CSSProperties;
  readonly lifetimeHeader: CSSProperties;
  readonly lifetimeStats: CSSProperties;
  readonly lifetimeBar: CSSProperties;
  readonly cacheBarContainer: CSSProperties;
  readonly cacheBarFresh: CSSProperties;
  readonly cacheBarCached: CSSProperties;
  readonly cacheLegend: CSSProperties;
  readonly cacheLegendItem: CSSProperties;
  readonly cacheLegendDot: CSSProperties;
  readonly emptyStateContainer: CSSProperties;
} = {
  exportContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  exportButton: {
    padding: "4px 12px",
    fontSize: "11px",
    fontWeight: 500,
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    transition: "background-color 0.15s ease, color 0.15s ease",
  },
  section: {
    marginBottom: "16px",
  },
  slowestServiceRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "4px",
    marginBottom: "4px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  slowestServiceRank: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    minWidth: "20px",
  },
  slowestServiceName: {
    flex: 1,
    fontWeight: 600,
    color: "var(--hex-devtools-accent, #89b4fa)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  slowestServiceDuration: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--hex-devtools-text, #cdd6f4)",
    minWidth: "60px",
    textAlign: "right",
  },
  slowestServiceBar: {
    height: "8px",
    borderRadius: "2px",
    background: "linear-gradient(to right, var(--hex-devtools-medium, #f9e2af), var(--hex-devtools-slow, #f38ba8))",
    minWidth: "4px",
  },
  lifetimeCard: {
    padding: "12px",
    backgroundColor: "var(--hex-devtools-bg-secondary, #2a2a3e)",
    borderRadius: "6px",
    marginBottom: "8px",
  },
  lifetimeHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  lifetimeStats: {
    display: "flex",
    gap: "16px",
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    marginBottom: "8px",
  },
  lifetimeBar: {
    height: "8px",
    borderRadius: "2px",
    minWidth: "4px",
  },
  cacheBarContainer: {
    display: "flex",
    height: "24px",
    borderRadius: "4px",
    overflow: "hidden",
    marginTop: "8px",
    marginBottom: "8px",
  },
  cacheBarFresh: {
    backgroundColor: "var(--hex-devtools-text-muted, #a6adc8)",
    transition: "width 0.3s ease",
  },
  cacheBarCached: {
    backgroundColor: "var(--hex-devtools-cached, #89dceb)",
    transition: "width 0.3s ease",
  },
  cacheLegend: {
    display: "flex",
    gap: "16px",
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    marginTop: "8px",
  },
  cacheLegendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  cacheLegendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "2px",
  },
  emptyStateContainer: {
    ...emptyStyles.container,
    padding: "48px 16px",
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Computes duration distribution across buckets.
 */
function computeDurationDistribution(
  traces: readonly TraceEntry[]
): Map<string, number> {
  const distribution = new Map<string, number>();

  // Initialize all buckets to 0
  for (const bucket of DURATION_BUCKETS) {
    distribution.set(bucket.id, 0);
  }

  // Count traces in each bucket
  for (const trace of traces) {
    for (const bucket of DURATION_BUCKETS) {
      if (trace.duration >= bucket.min && trace.duration < bucket.max) {
        distribution.set(bucket.id, (distribution.get(bucket.id) ?? 0) + 1);
        break;
      }
    }
  }

  return distribution;
}

/**
 * Gets the top N slowest services from traces.
 */
function getSlowestServices(
  traces: readonly TraceEntry[],
  limit: number
): readonly SlowestService[] {
  // Filter to non-cached traces for accurate "slowest" measurement
  const freshTraces = traces.filter((t) => !t.isCacheHit);

  // Sort by duration descending
  const sorted = [...freshTraces].sort((a, b) => b.duration - a.duration);

  // Take top N and map to display format
  return sorted.slice(0, limit).map((trace) => ({
    traceId: trace.id,
    portName: trace.portName,
    duration: trace.duration,
    lifetime: trace.lifetime,
  }));
}

/**
 * Computes statistics grouped by lifetime.
 */
function computeLifetimeStats(
  traces: readonly TraceEntry[]
): Record<Lifetime, LifetimeStats> {
  const stats: Record<Lifetime, { count: number; totalDuration: number }> = {
    singleton: { count: 0, totalDuration: 0 },
    scoped: { count: 0, totalDuration: 0 },
    request: { count: 0, totalDuration: 0 },
  };

  for (const trace of traces) {
    stats[trace.lifetime].count++;
    stats[trace.lifetime].totalDuration += trace.duration;
  }

  return {
    singleton: {
      count: stats.singleton.count,
      totalDuration: stats.singleton.totalDuration,
      averageDuration:
        stats.singleton.count > 0
          ? stats.singleton.totalDuration / stats.singleton.count
          : 0,
    },
    scoped: {
      count: stats.scoped.count,
      totalDuration: stats.scoped.totalDuration,
      averageDuration:
        stats.scoped.count > 0
          ? stats.scoped.totalDuration / stats.scoped.count
          : 0,
    },
    request: {
      count: stats.request.count,
      totalDuration: stats.request.totalDuration,
      averageDuration:
        stats.request.count > 0
          ? stats.request.totalDuration / stats.request.count
          : 0,
    },
  };
}

/**
 * Computes cache efficiency metrics.
 */
function computeCacheEfficiency(traces: readonly TraceEntry[]): {
  freshCount: number;
  cachedCount: number;
  freshDuration: number;
  estimatedSavings: number;
} {
  let freshCount = 0;
  let cachedCount = 0;
  let freshDuration = 0;
  let cachedDuration = 0;

  for (const trace of traces) {
    if (trace.isCacheHit) {
      cachedCount++;
      cachedDuration += trace.duration;
    } else {
      freshCount++;
      freshDuration += trace.duration;
    }
  }

  // Estimate savings: average fresh duration * cached count
  const avgFreshDuration = freshCount > 0 ? freshDuration / freshCount : 0;
  const estimatedSavings = avgFreshDuration * cachedCount - cachedDuration;

  return {
    freshCount,
    cachedCount,
    freshDuration,
    estimatedSavings: Math.max(0, estimatedSavings),
  };
}

/**
 * Gets bar style based on bucket category.
 */
function getBucketBarStyle(category: "fast" | "medium" | "slow"): CSSProperties {
  switch (category) {
    case "fast":
      return summaryStyles.barFast;
    case "medium":
      return summaryStyles.barMedium;
    case "slow":
      return summaryStyles.barSlow;
  }
}

/**
 * Gets lifetime badge style.
 */
function getLifetimeBadgeStyle(lifetime: Lifetime): CSSProperties {
  const base = nodeStyles.badge;
  switch (lifetime) {
    case "singleton":
      return { ...base, ...nodeStyles.badgeSingleton };
    case "scoped":
      return { ...base, ...nodeStyles.badgeScoped };
    case "request":
      return { ...base, ...nodeStyles.badgeRequest };
  }
}

/**
 * Gets lifetime bar color.
 */
function getLifetimeBarColor(lifetime: Lifetime): string {
  switch (lifetime) {
    case "singleton":
      return "var(--hex-devtools-singleton, #a6e3a1)";
    case "scoped":
      return "var(--hex-devtools-scoped, #89b4fa)";
    case "request":
      return "var(--hex-devtools-request, #fab387)";
  }
}

// =============================================================================
// Sub-components
// =============================================================================

/**
 * Overview card component.
 */
interface OverviewCardProps {
  readonly testId: string;
  readonly label: string;
  readonly value: string;
  readonly subtext?: string;
  readonly isWarning?: boolean;
}

function OverviewCard({
  testId,
  label,
  value,
  subtext,
  isWarning = false,
}: OverviewCardProps): ReactElement {
  const cardStyle: CSSProperties = {
    ...summaryStyles.card,
    ...(isWarning ? summaryStyles.cardWarning : {}),
  };

  return (
    <div
      data-testid={testId}
      data-warning={isWarning.toString()}
      style={cardStyle}
    >
      <div style={summaryStyles.cardLabel}>{label}</div>
      <div style={summaryStyles.cardValue}>{value}</div>
      {subtext !== undefined && (
        <div style={summaryStyles.cardSubtext}>{subtext}</div>
      )}
    </div>
  );
}

/**
 * Duration distribution bar chart row.
 */
interface DurationBucketRowProps {
  readonly bucket: DurationBucket;
  readonly count: number;
  readonly total: number;
  readonly maxCount: number;
}

function DurationBucketRow({
  bucket,
  count,
  total,
  maxCount,
}: DurationBucketRowProps): ReactElement {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

  const barStyle: CSSProperties = {
    ...summaryStyles.bar,
    ...getBucketBarStyle(bucket.category),
    width: `${Math.max(barWidth, count > 0 ? 4 : 0)}%`,
    maxWidth: "200px",
  };

  return (
    <div
      data-testid={`duration-bucket-${bucket.id}`}
      style={summaryStyles.barRow}
    >
      <span style={summaryStyles.barLabel}>{bucket.label}</span>
      <div style={barStyle} />
      <span style={summaryStyles.barValue}>
        {count} ({percentage.toFixed(0)}%)
      </span>
    </div>
  );
}

/**
 * Slowest service row component.
 */
interface SlowestServiceRowProps {
  readonly index: number;
  readonly service: SlowestService;
  readonly maxDuration: number;
  readonly onClick: () => void;
}

function SlowestServiceRow({
  index,
  service,
  maxDuration,
  onClick,
}: SlowestServiceRowProps): ReactElement {
  const barWidth = maxDuration > 0 ? (service.duration / maxDuration) * 100 : 0;

  const barStyle: CSSProperties = {
    ...localStyles.slowestServiceBar,
    width: `${Math.max(barWidth, 4)}%`,
    maxWidth: "100px",
  };

  return (
    <div
      data-testid={`slowest-service-${index}`}
      style={localStyles.slowestServiceRow}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span style={localStyles.slowestServiceRank}>{index + 1}.</span>
      <span style={localStyles.slowestServiceName}>{service.portName}</span>
      <span style={localStyles.slowestServiceDuration}>
        {formatDuration(service.duration)}
      </span>
      <div style={barStyle} />
      <span style={getLifetimeBadgeStyle(service.lifetime)}>
        {service.lifetime.toUpperCase()}
      </span>
    </div>
  );
}

/**
 * Lifetime breakdown card component.
 */
interface LifetimeBreakdownCardProps {
  readonly lifetime: Lifetime;
  readonly stats: LifetimeStats;
  readonly maxTotal: number;
}

function LifetimeBreakdownCard({
  lifetime,
  stats,
  maxTotal,
}: LifetimeBreakdownCardProps): ReactElement {
  const barWidth = maxTotal > 0 ? (stats.totalDuration / maxTotal) * 100 : 0;

  const barStyle: CSSProperties = {
    ...localStyles.lifetimeBar,
    backgroundColor: getLifetimeBarColor(lifetime),
    width: `${Math.max(barWidth, stats.count > 0 ? 4 : 0)}%`,
  };

  return (
    <div
      data-testid={`lifetime-breakdown-${lifetime}`}
      style={localStyles.lifetimeCard}
    >
      <div style={localStyles.lifetimeHeader}>
        <span style={getLifetimeBadgeStyle(lifetime)}>
          {lifetime.toUpperCase()}
        </span>
      </div>
      <div style={localStyles.lifetimeStats}>
        <span>{stats.count} service{stats.count !== 1 ? "s" : ""}</span>
        <span>Avg: {formatDuration(stats.averageDuration)}</span>
        <span>Total: {formatDuration(stats.totalDuration)}</span>
      </div>
      <div style={barStyle} />
    </div>
  );
}

/**
 * Cache efficiency section component.
 */
interface CacheEfficiencySectionProps {
  readonly freshCount: number;
  readonly cachedCount: number;
  readonly freshDuration: number;
  readonly estimatedSavings: number;
}

function CacheEfficiencySection({
  freshCount,
  cachedCount,
  freshDuration,
  estimatedSavings,
}: CacheEfficiencySectionProps): ReactElement {
  const total = freshCount + cachedCount;
  const freshPercent = total > 0 ? (freshCount / total) * 100 : 0;
  const cachedPercent = total > 0 ? (cachedCount / total) * 100 : 0;

  return (
    <div data-testid="cache-efficiency-section" style={localStyles.section}>
      <div style={summaryStyles.sectionHeader}>Cache Efficiency</div>

      <div style={{ fontSize: "12px", marginBottom: "8px" }}>
        <div>
          Fresh Resolutions: <strong>{freshCount}</strong> | Time Spent:{" "}
          <strong>{formatDuration(freshDuration)}</strong>
        </div>
        <div data-testid="cache-estimated-savings">
          Cache Hits: <strong>{cachedCount}</strong> | Time Saved:{" "}
          <strong>~{formatDuration(estimatedSavings)}</strong> (estimated)
        </div>
      </div>

      <div style={localStyles.cacheBarContainer}>
        <div
          style={{
            ...localStyles.cacheBarFresh,
            width: `${freshPercent}%`,
          }}
        />
        <div
          style={{
            ...localStyles.cacheBarCached,
            width: `${cachedPercent}%`,
          }}
        />
      </div>

      <div style={localStyles.cacheLegend}>
        <div style={localStyles.cacheLegendItem}>
          <div
            style={{
              ...localStyles.cacheLegendDot,
              backgroundColor: "var(--hex-devtools-text-muted, #a6adc8)",
            }}
          />
          <span>Fresh ({freshPercent.toFixed(0)}%)</span>
        </div>
        <div style={localStyles.cacheLegendItem}>
          <div
            style={{
              ...localStyles.cacheLegendDot,
              backgroundColor: "var(--hex-devtools-cached, #89dceb)",
            }}
          />
          <span>Cached ({cachedPercent.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Export buttons component.
 */
interface ExportButtonsProps {
  readonly onExport: (format: TracingExportFormat) => void;
}

function ExportButtons({ onExport }: ExportButtonsProps): ReactElement {
  return (
    <div style={localStyles.exportContainer}>
      <button
        data-testid="summary-export-json"
        style={localStyles.exportButton}
        onClick={() => onExport("json")}
        type="button"
      >
        Export JSON
      </button>
      <button
        data-testid="summary-export-csv"
        style={localStyles.exportButton}
        onClick={() => onExport("csv")}
        type="button"
      >
        Export CSV
      </button>
      <button
        data-testid="summary-export-clipboard"
        style={localStyles.exportButton}
        onClick={() => onExport("clipboard")}
        type="button"
      >
        Copy to Clipboard
      </button>
    </div>
  );
}

/**
 * Empty state component.
 */
function EmptyState(): ReactElement {
  return (
    <div data-testid="summary-empty-state" style={localStyles.emptyStateContainer}>
      <div style={{ fontWeight: 500, marginBottom: "8px" }}>
        No trace data available
      </div>
      <div style={{ fontSize: "12px", color: "var(--hex-devtools-text-muted, #a6adc8)" }}>
        Statistics will appear here once services are resolved.
      </div>
    </div>
  );
}

// =============================================================================
// SummaryStatsView Component
// =============================================================================

/**
 * SummaryStatsView component for Resolution Tracing.
 *
 * Displays aggregate performance metrics including:
 * - Overview cards grid (Total Resolutions, Avg Time, Cache Hit Rate, Slow Count)
 * - Duration distribution bar chart with 5 buckets
 * - Slowest services list (top 5) with clickable rows
 * - Lifetime breakdown (Singleton/Scoped/Request)
 * - Cache efficiency visualization with stacked bar
 * - Export functionality (JSON, CSV, Clipboard)
 *
 * @param props - The component props
 * @returns A React element containing the summary stats view
 *
 * @example
 * ```tsx
 * function TracingSection() {
 *   return (
 *     <SummaryStatsView
 *       traces={traces}
 *       stats={stats}
 *       threshold={50}
 *       onNavigateToTrace={(id) => console.log('Navigate to', id)}
 *       onExport={(format) => console.log('Export as', format)}
 *     />
 *   );
 * }
 * ```
 */
export function SummaryStatsView({
  traces,
  stats,
  threshold,
  onNavigateToTrace,
  onExport,
}: SummaryStatsViewProps): ReactElement {
  // Compute derived data
  const durationDistribution = useMemo(
    () => computeDurationDistribution(traces),
    [traces]
  );

  const slowestServices = useMemo(
    () => getSlowestServices(traces, MAX_SLOWEST_SERVICES),
    [traces]
  );

  const lifetimeStats = useMemo(() => computeLifetimeStats(traces), [traces]);

  const cacheEfficiency = useMemo(
    () => computeCacheEfficiency(traces),
    [traces]
  );

  // Compute max values for bar scaling
  const maxBucketCount = useMemo(() => {
    let max = 0;
    for (const count of durationDistribution.values()) {
      if (count > max) max = count;
    }
    return max;
  }, [durationDistribution]);

  const maxSlowestDuration = useMemo(() => {
    const first = slowestServices[0];
    return first !== undefined ? first.duration : 0;
  }, [slowestServices]);

  const maxLifetimeTotal = useMemo(() => {
    return Math.max(
      lifetimeStats.singleton.totalDuration,
      lifetimeStats.scoped.totalDuration,
      lifetimeStats.request.totalDuration
    );
  }, [lifetimeStats]);

  // Navigation handler factory
  const createNavigationHandler = useCallback(
    (traceId: string) => () => {
      onNavigateToTrace(traceId);
    },
    [onNavigateToTrace]
  );

  // Handle empty state
  if (traces.length === 0) {
    return (
      <div data-testid="summary-stats-view" style={summaryStyles.container}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div data-testid="summary-stats-view" style={summaryStyles.container}>
      {/* Export Buttons */}
      <ExportButtons onExport={onExport} />

      {/* Overview Cards Grid */}
      <div style={summaryStyles.cardsGrid}>
        <OverviewCard
          testId="summary-card-total-resolutions"
          label="Total Resolutions"
          value={stats.totalResolutions.toString()}
        />
        <OverviewCard
          testId="summary-card-avg-time"
          label="Avg Time"
          value={formatDuration(stats.averageDuration)}
        />
        <OverviewCard
          testId="summary-card-cache-hit-rate"
          label="Cache Hit Rate"
          value={`${Math.round(stats.cacheHitRate * 100)}%`}
          subtext={`(${cacheEfficiency.cachedCount}/${traces.length})`}
        />
        <OverviewCard
          testId="summary-card-slow-count"
          label="Slow Count"
          value={stats.slowCount.toString()}
          subtext={`(> ${threshold}ms)`}
          isWarning={stats.slowCount > 0}
        />
      </div>

      {/* Duration Distribution */}
      <div style={localStyles.section}>
        <div style={summaryStyles.sectionHeader}>Duration Distribution</div>
        <div style={summaryStyles.barChart}>
          {DURATION_BUCKETS.map((bucket) => (
            <DurationBucketRow
              key={bucket.id}
              bucket={bucket}
              count={durationDistribution.get(bucket.id) ?? 0}
              total={traces.length}
              maxCount={maxBucketCount}
            />
          ))}
        </div>
      </div>

      {/* Slowest Services */}
      <div style={localStyles.section}>
        <div style={summaryStyles.sectionHeader}>
          Slowest Services (Top {MAX_SLOWEST_SERVICES})
        </div>
        <div data-testid="slowest-services-list">
          {slowestServices.map((service, index) => (
            <SlowestServiceRow
              key={service.traceId}
              index={index}
              service={service}
              maxDuration={maxSlowestDuration}
              onClick={createNavigationHandler(service.traceId)}
            />
          ))}
          {slowestServices.length === 0 && (
            <div style={{ fontSize: "12px", color: "var(--hex-devtools-text-muted, #a6adc8)", padding: "8px 0" }}>
              No services recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Lifetime Breakdown */}
      <div style={localStyles.section}>
        <div style={summaryStyles.sectionHeader}>By Lifetime</div>
        <LifetimeBreakdownCard
          lifetime="singleton"
          stats={lifetimeStats.singleton}
          maxTotal={maxLifetimeTotal}
        />
        <LifetimeBreakdownCard
          lifetime="scoped"
          stats={lifetimeStats.scoped}
          maxTotal={maxLifetimeTotal}
        />
        <LifetimeBreakdownCard
          lifetime="request"
          stats={lifetimeStats.request}
          maxTotal={maxLifetimeTotal}
        />
      </div>

      {/* Cache Efficiency */}
      <CacheEfficiencySection
        freshCount={cacheEfficiency.freshCount}
        cachedCount={cacheEfficiency.cachedCount}
        freshDuration={cacheEfficiency.freshDuration}
        estimatedSavings={cacheEfficiency.estimatedSavings}
      />
    </div>
  );
}
