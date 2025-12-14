/**
 * Tests for Resolution Tracing style utilities.
 *
 * These tests verify:
 * 1. getPerformanceBarStyle returns correct colors based on duration and threshold
 * 2. getTraceRowStyle applies correct state styles
 * 3. formatDuration formats all duration ranges correctly
 */

import { describe, it, expect } from "vitest";
import {
  getPerformanceBarStyle,
  getTraceRowStyle,
  formatDuration,
  timelineStyles,
  tracingStyles,
} from "../src/react/styles.js";

// =============================================================================
// getPerformanceBarStyle Tests
// =============================================================================

describe("getPerformanceBarStyle", () => {
  it("returns cached style when isCacheHit is true", () => {
    const style = getPerformanceBarStyle(100, 50, true);

    expect(style).toEqual(timelineStyles.barCached);
  });

  it("returns slow style when duration exceeds threshold", () => {
    const style = getPerformanceBarStyle(60, 50, false);

    expect(style).toEqual(timelineStyles.barSlow);
  });

  it("returns medium style when duration is between 50% and 100% of threshold", () => {
    // threshold is 50ms, so medium range is 25ms-50ms
    const style = getPerformanceBarStyle(30, 50, false);

    expect(style).toEqual(timelineStyles.barMedium);
  });

  it("returns fast style when duration is below 50% of threshold", () => {
    // threshold is 50ms, so fast is below 25ms
    const style = getPerformanceBarStyle(10, 50, false);

    expect(style).toEqual(timelineStyles.barFast);
  });
});

// =============================================================================
// getTraceRowStyle Tests
// =============================================================================

describe("getTraceRowStyle", () => {
  it("returns base row style when no special states", () => {
    const style = getTraceRowStyle(false, false, false);

    expect(style).toMatchObject(timelineStyles.row);
  });

  it("applies slow style when isSlow is true", () => {
    const style = getTraceRowStyle(false, true, false);

    expect(style).toMatchObject(timelineStyles.rowSlow);
  });

  it("applies cached style when isCacheHit is true and not slow", () => {
    const style = getTraceRowStyle(false, false, true);

    expect(style).toMatchObject(timelineStyles.rowCached);
  });

  it("applies expanded style when isExpanded is true", () => {
    const style = getTraceRowStyle(true, false, false);

    expect(style).toMatchObject(timelineStyles.rowExpanded);
  });

  it("prioritizes slow over cached style", () => {
    const style = getTraceRowStyle(false, true, true);

    // Should have slow styles, not cached
    expect(style).toMatchObject(timelineStyles.rowSlow);
  });
});

// =============================================================================
// formatDuration Tests
// =============================================================================

describe("formatDuration", () => {
  it("formats sub-millisecond durations as '<0.1ms'", () => {
    expect(formatDuration(0.05)).toBe("<0.1ms");
    expect(formatDuration(0.09)).toBe("<0.1ms");
  });

  it("formats small durations with one decimal place", () => {
    expect(formatDuration(0.5)).toBe("0.5ms");
    expect(formatDuration(5.3)).toBe("5.3ms");
    expect(formatDuration(9.9)).toBe("9.9ms");
  });

  it("formats medium durations as whole milliseconds", () => {
    expect(formatDuration(10)).toBe("10ms");
    expect(formatDuration(50)).toBe("50ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats large durations in seconds", () => {
    expect(formatDuration(1000)).toBe("1.00s");
    expect(formatDuration(1500)).toBe("1.50s");
    expect(formatDuration(5000)).toBe("5.00s");
  });
});

// =============================================================================
// CSS Property Consistency Tests
// =============================================================================

/**
 * Tests to verify CSS style objects don't mix shorthand and non-shorthand properties.
 * This prevents React warnings about conflicting style properties during rerenders.
 *
 * React warning: "Removing a style property during rerender (borderBottomColor)
 * when a conflicting property is set (borderBottom) can lead to styling bugs."
 */
describe("CSS Property Consistency", () => {
  describe("tracingStyles border properties", () => {
    it("viewToggleTabActive should use borderBottom shorthand, not borderBottomColor", () => {
      // The base viewToggleTab uses borderBottom shorthand
      const baseHasShorthand = "borderBottom" in tracingStyles.viewToggleTab;
      expect(baseHasShorthand).toBe(true);

      // The active state should also use borderBottom shorthand
      // NOT borderBottomColor (which causes React warnings)
      const activeHasShorthand =
        "borderBottom" in tracingStyles.viewToggleTabActive;
      const activeHasSpecific =
        "borderBottomColor" in tracingStyles.viewToggleTabActive;

      // This test will FAIL with the bug:
      // activeHasSpecific will be true (bug)
      // activeHasShorthand will be false (bug)
      expect(activeHasSpecific).toBe(false);
      expect(activeHasShorthand).toBe(true);
    });
  });
});
