/**
 * TracingControlsBar React component for Resolution Tracing.
 *
 * Provides filtering, sorting, and threshold controls for the
 * Resolution Tracing section. Includes search input with debounce,
 * filter button groups, sort dropdown, threshold slider, recording
 * indicator, and active filters bar.
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactElement,
  type CSSProperties,
  type ChangeEvent,
} from "react";
import type { Lifetime } from "@hex-di/graph";
import {
  controlsStyles,
  serviceListStyles,
  containerInspectorStyles,
  formatDuration,
} from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Cache status filter options.
 */
export type TracingStatusFilter = "fresh" | "cached" | null;

/**
 * Sort options for traces.
 */
export type TracingSortOption =
  | "chronological"
  | "slowest"
  | "fastest"
  | "alphabetical"
  | "alphabetical-desc"
  | "resolution-order";

/**
 * Export format options.
 */
export type TracingExportFormat = "json" | "csv" | "clipboard";

/**
 * Filter state for traces.
 */
export interface TracingFilters {
  /** Search query for port names (case-insensitive partial match) */
  readonly searchQuery: string;
  /** Lifetime filter (null = all) */
  readonly lifetime: Lifetime | null;
  /** Cache status filter (null = all) */
  readonly status: TracingStatusFilter;
  /** Show only slow traces (exceeding threshold) */
  readonly slowOnly: boolean;
}

/**
 * Props for the TracingControlsBar component.
 */
export interface TracingControlsBarProps {
  /** Current filter state */
  readonly filters: TracingFilters;
  /** Current sort option */
  readonly sort: TracingSortOption;
  /** Current threshold value in milliseconds */
  readonly threshold: number;
  /** Whether tracing is currently recording */
  readonly isRecording: boolean;
  /** Number of traces captured */
  readonly traceCount: number;
  /** Total duration of all traces in milliseconds */
  readonly totalDuration: number;
  /** Callback when filters change */
  readonly onFiltersChange: (filters: TracingFilters) => void;
  /** Callback when sort option changes */
  readonly onSortChange: (sort: TracingSortOption) => void;
  /** Callback when threshold changes */
  readonly onThresholdChange: (threshold: number) => void;
  /** Callback when clear all is clicked */
  readonly onClear: () => void;
  /** Callback when pause/resume toggle is clicked */
  readonly onPauseToggle: () => void;
  /** Callback when export is clicked */
  readonly onExport: (format: TracingExportFormat) => void;
}

/**
 * Sort option configuration.
 */
interface SortOptionConfig {
  readonly value: TracingSortOption;
  readonly label: string;
}

/**
 * Sort options configuration.
 */
const SORT_OPTIONS: readonly SortOptionConfig[] = [
  { value: "chronological", label: "Chronological" },
  { value: "slowest", label: "Slowest First" },
  { value: "fastest", label: "Fastest First" },
  { value: "alphabetical", label: "Alphabetical (A-Z)" },
  { value: "alphabetical-desc", label: "Alphabetical (Z-A)" },
  { value: "resolution-order", label: "Resolution Order" },
] as const;

/**
 * Threshold slider configuration.
 */
const THRESHOLD_CONFIG = {
  min: 5,
  max: 500,
  step: 5,
  default: 50,
} as const;

// =============================================================================
// Local Styles
// =============================================================================

/**
 * Local styles that extend or override imported styles.
 */
const localStyles: {
  readonly searchContainer: CSSProperties;
  readonly searchInput: CSSProperties;
  readonly searchClearButton: CSSProperties;
  readonly filterLabel: CSSProperties;
  readonly statusFiltersRow: CSSProperties;
  readonly pauseButton: CSSProperties;
  readonly pauseButtonActive: CSSProperties;
  readonly recordingDotPaused: CSSProperties;
  readonly recordingText: CSSProperties;
  readonly recordingTextPaused: CSSProperties;
  readonly statsItem: CSSProperties;
  readonly statsLabel: CSSProperties;
  readonly statsValue: CSSProperties;
  readonly clearFiltersButton: CSSProperties;
} = {
  searchContainer: {
    ...serviceListStyles.searchContainer,
    flex: 1,
    maxWidth: "300px",
  },
  searchInput: {
    ...serviceListStyles.searchInput,
    width: "100%",
  },
  searchClearButton: {
    ...serviceListStyles.searchClearButton,
  },
  filterLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginRight: "8px",
  },
  statusFiltersRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  pauseButton: {
    ...containerInspectorStyles.refreshButton,
    minWidth: "70px",
  },
  pauseButtonActive: {
    backgroundColor: "var(--hex-devtools-accent, #89b4fa)",
    color: "#1e1e2e",
    border: "1px solid var(--hex-devtools-accent, #89b4fa)",
  },
  recordingDotPaused: {
    ...controlsStyles.recordingDot,
    backgroundColor: "var(--hex-devtools-text-muted, #a6adc8)",
    animation: "none",
  },
  recordingText: {
    fontWeight: 600,
    color: "var(--hex-devtools-slow, #f38ba8)",
  },
  recordingTextPaused: {
    fontWeight: 500,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  statsItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--hex-devtools-text, #cdd6f4)",
  },
  statsLabel: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  statsValue: {
    fontWeight: 600,
  },
  clearFiltersButton: {
    ...containerInspectorStyles.refreshButton,
    marginLeft: "auto",
  },
};

// =============================================================================
// SearchInput Component
// =============================================================================

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * Search input with debounced value updates.
 */
function SearchInput({ value, onChange }: SearchInputProps): ReactElement {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced update
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [localValue, value, onChange]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
  }, [onChange]);

  return (
    <div style={localStyles.searchContainer}>
      <input
        data-testid="tracing-search"
        type="text"
        placeholder="Search traces..."
        value={localValue}
        onChange={handleChange}
        style={localStyles.searchInput}
        aria-label="Search traces"
      />
      {localValue.length > 0 && (
        <button
          data-testid="tracing-search-clear"
          style={localStyles.searchClearButton}
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          x
        </button>
      )}
    </div>
  );
}

// =============================================================================
// FilterButton Component
// =============================================================================

interface FilterButtonProps {
  readonly testId: string;
  readonly label: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
  readonly activeColor?: string;
}

/**
 * Filter toggle button with aria-pressed state.
 */
function FilterButton({
  testId,
  label,
  isActive,
  onClick,
  activeColor,
}: FilterButtonProps): ReactElement {
  const baseStyle = serviceListStyles.filterButton;
  const activeStyle: CSSProperties = activeColor
    ? {
        ...serviceListStyles.filterButtonActive,
        backgroundColor: activeColor,
        border: `1px solid ${activeColor}`,
      }
    : serviceListStyles.filterButtonActive;

  const style: CSSProperties = {
    ...baseStyle,
    ...(isActive ? activeStyle : {}),
  };

  return (
    <button
      data-testid={testId}
      style={style}
      onClick={onClick}
      type="button"
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
}

// =============================================================================
// LifetimeFilterGroup Component
// =============================================================================

interface LifetimeFilterGroupProps {
  readonly value: Lifetime | null;
  readonly onChange: (lifetime: Lifetime | null) => void;
}

/**
 * Lifetime filter button group.
 */
function LifetimeFilterGroup({
  value,
  onChange,
}: LifetimeFilterGroupProps): ReactElement {
  return (
    <div style={controlsStyles.filterGroup}>
      <span style={localStyles.filterLabel}>Lifetime:</span>
      <FilterButton
        testId="tracing-filter-lifetime-all"
        label="All"
        isActive={value === null}
        onClick={() => onChange(null)}
      />
      <FilterButton
        testId="tracing-filter-lifetime-singleton"
        label="Singleton"
        isActive={value === "singleton"}
        onClick={() => onChange("singleton")}
        activeColor="var(--hex-devtools-singleton, #a6e3a1)"
      />
      <FilterButton
        testId="tracing-filter-lifetime-scoped"
        label="Scoped"
        isActive={value === "scoped"}
        onClick={() => onChange("scoped")}
        activeColor="var(--hex-devtools-scoped, #89b4fa)"
      />
      <FilterButton
        testId="tracing-filter-lifetime-request"
        label="Request"
        isActive={value === "request"}
        onClick={() => onChange("request")}
        activeColor="var(--hex-devtools-request, #fab387)"
      />
    </div>
  );
}

// =============================================================================
// StatusFilterGroup Component
// =============================================================================

interface StatusFilterGroupProps {
  readonly value: TracingStatusFilter;
  readonly onChange: (status: TracingStatusFilter) => void;
}

/**
 * Cache status filter button group.
 */
function StatusFilterGroup({
  value,
  onChange,
}: StatusFilterGroupProps): ReactElement {
  return (
    <div style={controlsStyles.filterGroup}>
      <span style={localStyles.filterLabel}>Status:</span>
      <FilterButton
        testId="tracing-filter-status-all"
        label="All"
        isActive={value === null}
        onClick={() => onChange(null)}
      />
      <FilterButton
        testId="tracing-filter-status-fresh"
        label="Fresh"
        isActive={value === "fresh"}
        onClick={() => onChange("fresh")}
      />
      <FilterButton
        testId="tracing-filter-status-cached"
        label="Cached"
        isActive={value === "cached"}
        onClick={() => onChange("cached")}
        activeColor="var(--hex-devtools-cached, #89dceb)"
      />
    </div>
  );
}

// =============================================================================
// PerformanceFilterGroup Component
// =============================================================================

interface PerformanceFilterGroupProps {
  readonly slowOnly: boolean;
  readonly onChange: (slowOnly: boolean) => void;
}

/**
 * Performance filter button group (All / Slow Only).
 */
function PerformanceFilterGroup({
  slowOnly,
  onChange,
}: PerformanceFilterGroupProps): ReactElement {
  return (
    <div style={controlsStyles.filterGroup}>
      <span style={localStyles.filterLabel}>Performance:</span>
      <FilterButton
        testId="tracing-filter-performance-all"
        label="All"
        isActive={!slowOnly}
        onClick={() => onChange(false)}
      />
      <FilterButton
        testId="tracing-filter-performance-slow"
        label="Slow Only"
        isActive={slowOnly}
        onClick={() => onChange(true)}
        activeColor="var(--hex-devtools-slow, #f38ba8)"
      />
    </div>
  );
}

// =============================================================================
// SortDropdown Component
// =============================================================================

interface SortDropdownProps {
  readonly value: TracingSortOption;
  readonly onChange: (sort: TracingSortOption) => void;
}

/**
 * Sort dropdown select.
 */
function SortDropdown({ value, onChange }: SortDropdownProps): ReactElement {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value as TracingSortOption);
    },
    [onChange]
  );

  return (
    <div style={controlsStyles.filterGroup}>
      <span style={localStyles.filterLabel}>Sort:</span>
      <select
        data-testid="tracing-sort-dropdown"
        value={value}
        onChange={handleChange}
        style={controlsStyles.sortDropdown}
        aria-label="Sort traces"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// ThresholdSlider Component
// =============================================================================

interface ThresholdSliderProps {
  readonly value: number;
  readonly onChange: (value: number) => void;
}

/**
 * Threshold slider with value label.
 */
function ThresholdSlider({
  value,
  onChange,
}: ThresholdSliderProps): ReactElement {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value, 10));
    },
    [onChange]
  );

  return (
    <div style={controlsStyles.thresholdContainer}>
      <span style={localStyles.filterLabel}>Threshold:</span>
      <input
        data-testid="tracing-threshold-slider"
        type="range"
        min={THRESHOLD_CONFIG.min}
        max={THRESHOLD_CONFIG.max}
        step={THRESHOLD_CONFIG.step}
        value={value}
        onChange={handleChange}
        style={controlsStyles.thresholdSlider}
        aria-label="Slow threshold"
      />
      <span data-testid="tracing-threshold-label" style={controlsStyles.thresholdLabel}>
        {value}ms
      </span>
    </div>
  );
}

// =============================================================================
// RecordingIndicator Component
// =============================================================================

interface RecordingIndicatorProps {
  readonly isRecording: boolean;
  readonly traceCount: number;
  readonly totalDuration: number;
  readonly onPauseToggle: () => void;
}

/**
 * Recording indicator with pause/resume toggle.
 */
function RecordingIndicator({
  isRecording,
  traceCount,
  totalDuration,
  onPauseToggle,
}: RecordingIndicatorProps): ReactElement {
  const dotStyle = isRecording
    ? controlsStyles.recordingDot
    : localStyles.recordingDotPaused;

  const textStyle = isRecording
    ? localStyles.recordingText
    : localStyles.recordingTextPaused;

  const pauseButtonStyle: CSSProperties = {
    ...localStyles.pauseButton,
    ...(isRecording ? {} : localStyles.pauseButtonActive),
  };

  return (
    <div style={controlsStyles.statusBar}>
      <div
        data-testid="tracing-recording-indicator"
        style={controlsStyles.recordingIndicator}
      >
        <span style={dotStyle} aria-hidden="true" />
        <span style={textStyle}>{isRecording ? "Recording" : "Paused"}</span>
      </div>

      <div data-testid="tracing-trace-count" style={localStyles.statsItem}>
        <span style={localStyles.statsLabel}>Traces:</span>
        <span style={localStyles.statsValue}>{traceCount}</span>
      </div>

      <div data-testid="tracing-total-duration" style={localStyles.statsItem}>
        <span style={localStyles.statsLabel}>Total:</span>
        <span style={localStyles.statsValue}>{formatDuration(totalDuration)}</span>
      </div>

      <button
        data-testid="tracing-pause-toggle"
        style={pauseButtonStyle}
        onClick={onPauseToggle}
        type="button"
        aria-label={isRecording ? "Pause recording" : "Resume recording"}
      >
        {isRecording ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

// =============================================================================
// FilterTag Component
// =============================================================================

interface FilterTagProps {
  readonly testId: string;
  readonly label: string;
  readonly onRemove: () => void;
}

/**
 * Removable filter tag pill.
 */
function FilterTag({ testId, label, onRemove }: FilterTagProps): ReactElement {
  return (
    <span data-testid={testId} style={controlsStyles.filterTag}>
      {label}
      <button
        data-testid={`${testId}-remove`}
        style={controlsStyles.filterTagRemove}
        onClick={onRemove}
        type="button"
        aria-label={`Remove ${label} filter`}
      >
        x
      </button>
    </span>
  );
}

// =============================================================================
// ActiveFiltersBar Component
// =============================================================================

interface ActiveFiltersBarProps {
  readonly filters: TracingFilters;
  readonly threshold: number;
  readonly onFiltersChange: (filters: TracingFilters) => void;
}

/**
 * Bar showing active filter tags with remove buttons.
 */
function ActiveFiltersBar({
  filters,
  threshold,
  onFiltersChange,
}: ActiveFiltersBarProps): ReactElement | null {
  const tags: Array<{ testId: string; label: string; onRemove: () => void }> =
    [];

  // Search query tag
  if (filters.searchQuery.length > 0) {
    tags.push({
      testId: "filter-tag-search",
      label: `"${filters.searchQuery}"`,
      onRemove: () => onFiltersChange({ ...filters, searchQuery: "" }),
    });
  }

  // Lifetime filter tag
  if (filters.lifetime !== null) {
    tags.push({
      testId: `filter-tag-lifetime-${filters.lifetime}`,
      label: filters.lifetime.charAt(0).toUpperCase() + filters.lifetime.slice(1),
      onRemove: () => onFiltersChange({ ...filters, lifetime: null }),
    });
  }

  // Status filter tag
  if (filters.status !== null) {
    tags.push({
      testId: `filter-tag-status-${filters.status}`,
      label: filters.status.charAt(0).toUpperCase() + filters.status.slice(1),
      onRemove: () => onFiltersChange({ ...filters, status: null }),
    });
  }

  // Slow only filter tag
  if (filters.slowOnly) {
    tags.push({
      testId: "filter-tag-slow-only",
      label: `Slow Only (>${threshold}ms)`,
      onRemove: () => onFiltersChange({ ...filters, slowOnly: false }),
    });
  }

  // Don't render if no active filters
  if (tags.length === 0) {
    return null;
  }

  const handleClearAll = useCallback(() => {
    onFiltersChange({
      searchQuery: "",
      lifetime: null,
      status: null,
      slowOnly: false,
    });
  }, [onFiltersChange]);

  return (
    <div data-testid="tracing-active-filters" style={controlsStyles.activeFiltersBar}>
      <span style={localStyles.filterLabel}>Active:</span>
      {tags.map((tag) => (
        <FilterTag
          key={tag.testId}
          testId={tag.testId}
          label={tag.label}
          onRemove={tag.onRemove}
        />
      ))}
      <button
        data-testid="tracing-clear-filters"
        style={localStyles.clearFiltersButton}
        onClick={handleClearAll}
        type="button"
        aria-label="Clear all filters"
      >
        Clear filters
      </button>
    </div>
  );
}

// =============================================================================
// TracingControlsBar Component
// =============================================================================

/**
 * TracingControlsBar component for Resolution Tracing.
 *
 * Features:
 * - Search input with 300ms debounce
 * - Lifetime filter buttons (All/Singleton/Scoped/Request)
 * - Status filter buttons (All/Fresh/Cached)
 * - Performance filter (All/Slow Only)
 * - Sort dropdown (Chronological, Slowest First, etc.)
 * - Threshold slider (5-500ms, step 5ms)
 * - Recording indicator with pause/resume toggle
 * - Active filters bar with removable tags
 *
 * @param props - The component props
 * @returns A React element containing the controls bar
 *
 * @example
 * ```tsx
 * function TracingSection() {
 *   const [filters, setFilters] = useState<TracingFilters>({
 *     searchQuery: "",
 *     lifetime: null,
 *     status: null,
 *     slowOnly: false,
 *   });
 *   const [sort, setSort] = useState<TracingSortOption>("chronological");
 *   const [threshold, setThreshold] = useState(50);
 *
 *   return (
 *     <TracingControlsBar
 *       filters={filters}
 *       sort={sort}
 *       threshold={threshold}
 *       isRecording={true}
 *       traceCount={15}
 *       totalDuration={234.5}
 *       onFiltersChange={setFilters}
 *       onSortChange={setSort}
 *       onThresholdChange={setThreshold}
 *       onClear={() => {}}
 *       onPauseToggle={() => {}}
 *       onExport={() => {}}
 *     />
 *   );
 * }
 * ```
 */
export function TracingControlsBar({
  filters,
  sort,
  threshold,
  isRecording,
  traceCount,
  totalDuration,
  onFiltersChange,
  onSortChange,
  onThresholdChange,
  onClear,
  onPauseToggle,
  onExport,
}: TracingControlsBarProps): ReactElement {
  // Handlers for filter changes
  const handleSearchChange = useCallback(
    (searchQuery: string) => {
      onFiltersChange({ ...filters, searchQuery });
    },
    [filters, onFiltersChange]
  );

  const handleLifetimeChange = useCallback(
    (lifetime: Lifetime | null) => {
      onFiltersChange({ ...filters, lifetime });
    },
    [filters, onFiltersChange]
  );

  const handleStatusChange = useCallback(
    (status: TracingStatusFilter) => {
      onFiltersChange({ ...filters, status });
    },
    [filters, onFiltersChange]
  );

  const handleSlowOnlyChange = useCallback(
    (slowOnly: boolean) => {
      onFiltersChange({ ...filters, slowOnly });
    },
    [filters, onFiltersChange]
  );

  const handleExportJson = useCallback(() => {
    onExport("json");
  }, [onExport]);

  return (
    <div data-testid="tracing-controls-bar" style={controlsStyles.container}>
      {/* Row 1: Search and Actions */}
      <div style={controlsStyles.row}>
        <SearchInput
          value={filters.searchQuery}
          onChange={handleSearchChange}
        />
        <button
          data-testid="tracing-clear-all"
          style={containerInspectorStyles.refreshButton}
          onClick={onClear}
          type="button"
          aria-label="Clear all traces"
        >
          Clear All
        </button>
        <button
          data-testid="tracing-export"
          style={containerInspectorStyles.refreshButton}
          onClick={handleExportJson}
          type="button"
          aria-label="Export traces"
        >
          Export
        </button>
      </div>

      {/* Row 2: Filters */}
      <div style={controlsStyles.row}>
        <LifetimeFilterGroup
          value={filters.lifetime}
          onChange={handleLifetimeChange}
        />
      </div>

      <div style={{ ...controlsStyles.row, ...localStyles.statusFiltersRow }}>
        <StatusFilterGroup
          value={filters.status}
          onChange={handleStatusChange}
        />
        <PerformanceFilterGroup
          slowOnly={filters.slowOnly}
          onChange={handleSlowOnlyChange}
        />
      </div>

      {/* Row 3: Sort and Threshold */}
      <div style={controlsStyles.row}>
        <SortDropdown value={sort} onChange={onSortChange} />
        <ThresholdSlider value={threshold} onChange={onThresholdChange} />
      </div>

      {/* Status Bar: Recording Indicator */}
      <RecordingIndicator
        isRecording={isRecording}
        traceCount={traceCount}
        totalDuration={totalDuration}
        onPauseToggle={onPauseToggle}
      />

      {/* Active Filters Bar */}
      <ActiveFiltersBar
        filters={filters}
        threshold={threshold}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
}
