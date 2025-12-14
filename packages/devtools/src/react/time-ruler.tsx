/**
 * TimeRuler React component for Resolution Tracing Timeline.
 *
 * Displays a time ruler with major and minor tick marks,
 * time labels, and a threshold marker line.
 *
 * @packageDocumentation
 */

import React, { useMemo, type ReactElement, type CSSProperties } from "react";
import { timelineStyles, formatDuration } from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the TimeRuler component.
 */
export interface TimeRulerProps {
  /** Total duration of the timeline in milliseconds */
  readonly totalDuration: number;
  /** Slow threshold value in milliseconds */
  readonly threshold: number;
  /** Current zoom level (1 = 100%) */
  readonly zoom?: number;
}

/**
 * Configuration for tick intervals based on total duration.
 */
interface TickConfig {
  /** Major tick interval in ms */
  readonly majorInterval: number;
  /** Minor tick interval in ms (between major ticks) */
  readonly minorInterval: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default major tick interval (25ms).
 */
const DEFAULT_MAJOR_INTERVAL = 25;

/**
 * Default minor tick interval (5ms).
 */
const DEFAULT_MINOR_INTERVAL = 5;

/**
 * Minimum ticks to display.
 */
const MIN_TICKS = 4;

/**
 * Maximum ticks to display.
 */
const MAX_TICKS = 20;

// =============================================================================
// Local Styles
// =============================================================================

const localStyles: {
  readonly container: CSSProperties;
  readonly tickContainer: CSSProperties;
  readonly majorTick: CSSProperties;
  readonly minorTick: CSSProperties;
  readonly thresholdMarker: CSSProperties;
} = {
  container: {
    ...timelineStyles.ruler,
    position: "relative",
    userSelect: "none",
  },
  tickContainer: {
    position: "relative",
    height: "100%",
  },
  majorTick: {
    ...timelineStyles.rulerTick,
    height: "8px",
  },
  minorTick: {
    ...timelineStyles.rulerTick,
    height: "4px",
    top: "20px",
  },
  thresholdMarker: {
    ...timelineStyles.thresholdLine,
    borderLeft: "1px dashed var(--hex-devtools-threshold, #f38ba8)",
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate tick configuration based on total duration.
 *
 * Adjusts intervals to keep tick count within reasonable bounds.
 *
 * @param totalDuration - Total timeline duration in ms
 * @returns Tick configuration with major and minor intervals
 */
function calculateTickConfig(totalDuration: number): TickConfig {
  // Default intervals
  let majorInterval = DEFAULT_MAJOR_INTERVAL;
  let minorInterval = DEFAULT_MINOR_INTERVAL;

  // Scale up for longer durations
  if (totalDuration > 500) {
    majorInterval = 100;
    minorInterval = 25;
  } else if (totalDuration > 200) {
    majorInterval = 50;
    minorInterval = 10;
  } else if (totalDuration > 100) {
    majorInterval = 25;
    minorInterval = 5;
  } else if (totalDuration > 50) {
    majorInterval = 10;
    minorInterval = 2;
  } else {
    majorInterval = 10;
    minorInterval = 2;
  }

  // Ensure we don't have too many or too few ticks
  const tickCount = Math.floor(totalDuration / majorInterval);
  if (tickCount > MAX_TICKS) {
    majorInterval = Math.ceil(totalDuration / MAX_TICKS);
    minorInterval = majorInterval / 5;
  } else if (tickCount < MIN_TICKS && totalDuration > 0) {
    majorInterval = Math.max(1, Math.floor(totalDuration / MIN_TICKS));
    minorInterval = majorInterval / 5;
  }

  return { majorInterval, minorInterval };
}

/**
 * Generate tick positions for the ruler.
 *
 * @param totalDuration - Total timeline duration in ms
 * @param config - Tick configuration
 * @returns Arrays of major and minor tick values
 */
function generateTicks(
  totalDuration: number,
  config: TickConfig
): { major: number[]; minor: number[] } {
  const major: number[] = [];
  const minor: number[] = [];

  if (totalDuration <= 0) {
    return { major: [0], minor: [] };
  }

  // Generate major ticks
  for (let t = 0; t <= totalDuration; t += config.majorInterval) {
    major.push(t);
  }

  // Ensure end tick is included if not already
  const lastMajorTick = major[major.length - 1];
  if (lastMajorTick !== undefined && lastMajorTick < totalDuration) {
    major.push(totalDuration);
  }

  // Generate minor ticks (between major ticks)
  for (let t = config.minorInterval; t < totalDuration; t += config.minorInterval) {
    // Skip if this is a major tick position
    if (t % config.majorInterval !== 0) {
      minor.push(t);
    }
  }

  return { major, minor };
}

// =============================================================================
// TimeRuler Component
// =============================================================================

/**
 * TimeRuler component for the timeline header.
 *
 * Features:
 * - Auto-scaling tick intervals based on total duration
 * - Major ticks with time labels
 * - Minor ticks for finer granularity
 * - Threshold marker (red dashed line)
 *
 * @param props - The component props
 * @returns A React element containing the time ruler
 *
 * @example
 * ```tsx
 * <TimeRuler
 *   totalDuration={250}
 *   threshold={50}
 *   zoom={1}
 * />
 * ```
 */
export function TimeRuler({
  totalDuration,
  threshold,
  zoom = 1,
}: TimeRulerProps): ReactElement {
  // Calculate tick configuration and positions
  const { tickConfig, ticks } = useMemo(() => {
    const config = calculateTickConfig(totalDuration);
    const tickPositions = generateTicks(totalDuration, config);
    return { tickConfig: config, ticks: tickPositions };
  }, [totalDuration]);

  // Calculate threshold position as percentage
  const thresholdPosition = useMemo(() => {
    if (totalDuration <= 0) return 0;
    return (threshold / totalDuration) * 100;
  }, [threshold, totalDuration]);

  /**
   * Convert time value to percentage position.
   */
  const getPositionPercent = (time: number): number => {
    if (totalDuration <= 0) return 0;
    return (time / totalDuration) * 100;
  };

  /**
   * Format time label for display.
   */
  const formatTimeLabel = (time: number): string => {
    if (time >= 1000) {
      return `${(time / 1000).toFixed(1)}s`;
    }
    return `${Math.round(time)}ms`;
  };

  return (
    <div data-testid="time-ruler" style={localStyles.container}>
      {/* Major ticks with labels */}
      {ticks.major.map((time) => (
        <React.Fragment key={`major-${time}`}>
          <div
            data-testid={`ruler-tick-major-${time}`}
            style={{
              ...localStyles.majorTick,
              left: `${getPositionPercent(time)}%`,
            }}
          />
          <span
            data-testid={`ruler-label-${time}`}
            style={{
              ...timelineStyles.rulerLabel,
              left: `${getPositionPercent(time)}%`,
            }}
          >
            {formatTimeLabel(time)}
          </span>
        </React.Fragment>
      ))}

      {/* Minor ticks */}
      {ticks.minor.map((time) => (
        <div
          key={`minor-${time}`}
          data-testid={`ruler-tick-minor-${time}`}
          style={{
            ...localStyles.minorTick,
            left: `${getPositionPercent(time)}%`,
          }}
        />
      ))}

      {/* Threshold marker */}
      {thresholdPosition > 0 && thresholdPosition <= 100 && (
        <div
          data-testid="threshold-marker"
          style={{
            ...localStyles.thresholdMarker,
            left: `${thresholdPosition}%`,
          }}
          aria-label={`Slow threshold: ${threshold}ms`}
        />
      )}
    </div>
  );
}
