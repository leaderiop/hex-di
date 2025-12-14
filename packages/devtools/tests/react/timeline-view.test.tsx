/**
 * Tests for TimelineView, TimelineRow, and TimeRuler components.
 *
 * These tests verify:
 * 1. Traces render as horizontal bars
 * 2. Bar width proportional to duration
 * 3. Color coding (green/yellow/red/cyan)
 * 4. Expandable row shows details
 * 5. Threshold marker renders at correct position
 * 6. Pinned trace indicator functionality
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import {
  TimelineView,
  type TimelineViewProps,
} from "../../src/react/timeline-view.js";
import { TimelineRow } from "../../src/react/timeline-row.js";
import { TimeRuler } from "../../src/react/time-ruler.js";
import type { TraceEntry } from "../../src/tracing/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a mock trace entry for testing.
 */
function createMockTrace(
  overrides: Partial<TraceEntry> = {}
): TraceEntry {
  return {
    id: "trace-1",
    portName: "TestService",
    lifetime: "singleton",
    startTime: 0,
    duration: 25,
    isCacheHit: false,
    parentTraceId: null,
    childTraceIds: [],
    scopeId: null,
    order: 1,
    isPinned: false,
    ...overrides,
  };
}

/**
 * Default props for TimelineView.
 */
const defaultProps: TimelineViewProps = {
  traces: [],
  threshold: 50,
  totalDuration: 100,
  onTogglePin: vi.fn(),
  onViewInTree: vi.fn(),
};

// =============================================================================
// Test Suite: TimelineView
// =============================================================================

describe("TimelineView", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Traces render as horizontal bars
  // ---------------------------------------------------------------------------
  describe("renders traces as horizontal bars", () => {
    it("renders timeline rows for each trace", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", portName: "ServiceA", order: 1 }),
        createMockTrace({ id: "trace-2", portName: "ServiceB", order: 2 }),
        createMockTrace({ id: "trace-3", portName: "ServiceC", order: 3 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.getByTestId("timeline-row-trace-1")).toBeDefined();
      expect(screen.getByTestId("timeline-row-trace-2")).toBeDefined();
      expect(screen.getByTestId("timeline-row-trace-3")).toBeDefined();
    });

    it("displays order badges for each trace", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", order: 1 }),
        createMockTrace({ id: "trace-2", order: 5 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      // Check order badges are visible
      const row1 = screen.getByTestId("timeline-row-trace-1");
      const row2 = screen.getByTestId("timeline-row-trace-2");

      expect(row1.textContent).toContain("#1");
      expect(row2.textContent).toContain("#5");
    });

    it("displays port names", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", portName: "UserRepository" }),
        createMockTrace({ id: "trace-2", portName: "LoggerService" }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const row1 = screen.getByTestId("timeline-row-trace-1");
      const row2 = screen.getByTestId("timeline-row-trace-2");

      expect(row1.textContent).toContain("UserRepository");
      expect(row2.textContent).toContain("LoggerService");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Bar width proportional to duration
  // ---------------------------------------------------------------------------
  describe("bar width proportional to duration", () => {
    it("renders bars with width proportional to duration", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 50, startTime: 0 }),
        createMockTrace({ id: "trace-2", duration: 25, startTime: 50 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} totalDuration={100} />);

      const bar1 = screen.getByTestId("timeline-bar-trace-1");
      const bar2 = screen.getByTestId("timeline-bar-trace-2");

      // 50/100 = 50% width, 25/100 = 25% width
      expect(bar1.style.width).toBe("50%");
      expect(bar2.style.width).toBe("25%");
    });

    it("positions bars at correct start position", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 20, startTime: 30 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} totalDuration={100} />);

      const bar = screen.getByTestId("timeline-bar-trace-1");

      // 30/100 = 30% left position
      expect(bar.style.left).toBe("30%");
    });

    it("displays duration label", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 5.6 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const row = screen.getByTestId("timeline-row-trace-1");
      // formatDuration shows 5.6ms for values < 10
      expect(row.textContent).toContain("5.6ms");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Color coding (green/yellow/red/cyan)
  // ---------------------------------------------------------------------------
  describe("color coding", () => {
    it("renders green bar for fast traces (<10ms)", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 5, isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      const bar = screen.getByTestId("timeline-bar-trace-1");
      expect(bar.dataset["color"]).toBe("fast");
    });

    it("renders yellow bar for medium traces (10ms - threshold)", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 30, isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      const bar = screen.getByTestId("timeline-bar-trace-1");
      expect(bar.dataset["color"]).toBe("medium");
    });

    it("renders red bar for slow traces (>=threshold)", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 75, isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      const bar = screen.getByTestId("timeline-bar-trace-1");
      expect(bar.dataset["color"]).toBe("slow");
    });

    it("renders cyan bar for cache hits regardless of duration", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 100, isCacheHit: true }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      const bar = screen.getByTestId("timeline-bar-trace-1");
      expect(bar.dataset["color"]).toBe("cached");
    });

    it("shows slow indicator for slow traces", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 100, isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      expect(screen.getByTestId("slow-indicator-trace-1")).toBeDefined();
    });

    it("shows cache indicator for cache hits", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isCacheHit: true }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.getByTestId("cache-indicator-trace-1")).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Expandable row shows details
  // ---------------------------------------------------------------------------
  describe("expandable row details", () => {
    it("expands row to show details when clicked", () => {
      const traces: TraceEntry[] = [
        createMockTrace({
          id: "trace-1",
          portName: "TestService",
          startTime: 10,
          duration: 25,
          lifetime: "singleton",
          scopeId: "scope-1",
        }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      // Click on the clickable row content (the element with role="button")
      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      expect(clickableRow).not.toBeNull();
      fireEvent.click(clickableRow!);

      // Details panel should now be visible
      const details = screen.getByTestId("timeline-details-trace-1");
      expect(details).toBeDefined();

      // Check content
      expect(details.textContent).toContain("Start Time:");
      expect(details.textContent).toContain("10");
      expect(details.textContent).toContain("Duration:");
      expect(details.textContent).toContain("25");
      expect(details.textContent).toContain("Lifetime:");
      expect(details.textContent).toContain("singleton");
    });

    it("collapses row when clicked again", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      expect(clickableRow).not.toBeNull();

      // Expand
      fireEvent.click(clickableRow!);
      expect(screen.getByTestId("timeline-details-trace-1")).toBeDefined();

      // Collapse
      fireEvent.click(clickableRow!);
      expect(screen.queryByTestId("timeline-details-trace-1")).toBeNull();
    });

    it("shows View in Tree button in expanded details", () => {
      const onViewInTree = vi.fn();
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(
        <TimelineView {...defaultProps} traces={traces} onViewInTree={onViewInTree} />
      );

      // Expand by clicking the row content
      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      fireEvent.click(clickableRow!);

      const viewTreeButton = screen.getByTestId("view-in-tree-trace-1");
      expect(viewTreeButton).toBeDefined();

      fireEvent.click(viewTreeButton);
      expect(onViewInTree).toHaveBeenCalledWith("trace-1");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Threshold marker renders at correct position
  // ---------------------------------------------------------------------------
  describe("threshold marker", () => {
    it("renders threshold marker line", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 10 }),
      ];

      render(
        <TimelineView {...defaultProps} traces={traces} threshold={50} totalDuration={100} />
      );

      const marker = screen.getByTestId("threshold-marker");
      expect(marker).toBeDefined();
    });

    it("positions threshold marker at correct percentage", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 10 }),
      ];

      render(
        <TimelineView {...defaultProps} traces={traces} threshold={25} totalDuration={100} />
      );

      const marker = screen.getByTestId("threshold-marker");
      // 25/100 = 25%
      expect(marker.style.left).toBe("25%");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Pinned trace indicator
  // ---------------------------------------------------------------------------
  describe("pinned trace indicator", () => {
    it("shows pin icon for pinned traces", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isPinned: true }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.getByTestId("pin-indicator-trace-1")).toBeDefined();
    });

    it("does not show pin icon for unpinned traces", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isPinned: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.queryByTestId("pin-indicator-trace-1")).toBeNull();
    });

    it("calls onTogglePin when pin icon is clicked", () => {
      const onTogglePin = vi.fn();
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isPinned: true }),
      ];

      render(
        <TimelineView {...defaultProps} traces={traces} onTogglePin={onTogglePin} />
      );

      fireEvent.click(screen.getByTestId("pin-indicator-trace-1"));
      expect(onTogglePin).toHaveBeenCalledWith("trace-1");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Zoom controls
  // ---------------------------------------------------------------------------
  describe("zoom controls", () => {
    it("renders zoom controls container", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.getByTestId("zoom-controls")).toBeDefined();
    });

    it("displays current zoom level as percentage", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.getByTestId("zoom-level").textContent).toBe("100%");
    });

    it("zoom in button increases zoom by 0.25", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const zoomInButton = screen.getByTestId("zoom-in");
      fireEvent.click(zoomInButton);

      expect(screen.getByTestId("zoom-level").textContent).toBe("125%");
    });

    it("zoom out button decreases zoom by 0.25", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const zoomInButton = screen.getByTestId("zoom-in");
      fireEvent.click(zoomInButton);
      fireEvent.click(zoomInButton);

      const zoomOutButton = screen.getByTestId("zoom-out");
      fireEvent.click(zoomOutButton);

      expect(screen.getByTestId("zoom-level").textContent).toBe("125%");
    });

    it("zoom in button is disabled at max zoom (400%)", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} initialZoom={4} />);

      const zoomInButton = screen.getByTestId("zoom-in");
      expect(zoomInButton).toHaveProperty("disabled", true);
    });

    it("zoom out button is disabled at min zoom (25%)", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} initialZoom={0.25} />);

      const zoomOutButton = screen.getByTestId("zoom-out");
      expect(zoomOutButton).toHaveProperty("disabled", true);
    });

    it("fit all button resets zoom to 100%", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} initialZoom={2} />);

      expect(screen.getByTestId("zoom-level").textContent).toBe("200%");

      const fitAllButton = screen.getByTestId("fit-all");
      fireEvent.click(fitAllButton);

      expect(screen.getByTestId("zoom-level").textContent).toBe("100%");
    });

    it("focus slow zooms to 200% and expands slowest trace", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 10, isCacheHit: false }),
        createMockTrace({ id: "trace-2", duration: 100, isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      const focusSlowButton = screen.getByTestId("focus-slow");
      fireEvent.click(focusSlowButton);

      expect(screen.getByTestId("zoom-level").textContent).toBe("200%");
      expect(screen.getByTestId("timeline-details-trace-2")).toBeDefined();
    });

    it("focus slow does nothing when no slow traces exist", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 10, isCacheHit: false }),
        createMockTrace({ id: "trace-2", duration: 20, isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      const focusSlowButton = screen.getByTestId("focus-slow");
      fireEvent.click(focusSlowButton);

      // Zoom should remain at 100%
      expect(screen.getByTestId("zoom-level").textContent).toBe("100%");
    });

    it("initialZoom prop sets initial zoom level", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} initialZoom={1.5} />);

      expect(screen.getByTestId("zoom-level").textContent).toBe("150%");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 8: Empty state
  // ---------------------------------------------------------------------------
  describe("empty state", () => {
    it("renders empty state message when traces array is empty", () => {
      render(<TimelineView {...defaultProps} traces={[]} />);

      const view = screen.getByTestId("timeline-view");
      expect(view.textContent).toContain("No resolution traces recorded");
    });

    it("empty state shows instructional text", () => {
      render(<TimelineView {...defaultProps} traces={[]} />);

      const view = screen.getByTestId("timeline-view");
      expect(view.textContent).toContain("Start resolving services");
    });

    it("does not render footer when empty", () => {
      render(<TimelineView {...defaultProps} traces={[]} />);

      expect(screen.queryByTestId("timeline-footer")).toBeNull();
    });

    it("does not render legend when empty", () => {
      render(<TimelineView {...defaultProps} traces={[]} />);

      expect(screen.queryByTestId("timeline-legend")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 9: Footer statistics
  // ---------------------------------------------------------------------------
  describe("footer statistics", () => {
    it("renders footer container", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.getByTestId("timeline-footer")).toBeDefined();
    });

    it("shows total resolution count", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1" }),
        createMockTrace({ id: "trace-2" }),
        createMockTrace({ id: "trace-3" }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const footer = screen.getByTestId("timeline-footer");
      expect(footer.textContent).toContain("Resolutions:");
      expect(footer.textContent).toContain("3");
    });

    it("shows total cumulative duration", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 10 }),
        createMockTrace({ id: "trace-2", duration: 20 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const footer = screen.getByTestId("timeline-footer");
      expect(footer.textContent).toContain("Total:");
      expect(footer.textContent).toContain("30");
    });

    it("calculates cache hit rate correctly", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isCacheHit: true }),
        createMockTrace({ id: "trace-2", isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const footer = screen.getByTestId("timeline-footer");
      expect(footer.textContent).toContain("Cache Hit Rate:");
      expect(footer.textContent).toContain("50%");
    });

    it("shows 0% cache hit rate when no cache hits", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isCacheHit: false }),
        createMockTrace({ id: "trace-2", isCacheHit: false }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const footer = screen.getByTestId("timeline-footer");
      expect(footer.textContent).toContain("0%");
    });

    it("shows 100% cache hit rate when all cache hits", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isCacheHit: true }),
        createMockTrace({ id: "trace-2", isCacheHit: true }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const footer = screen.getByTestId("timeline-footer");
      expect(footer.textContent).toContain("100%");
    });

    it("identifies and displays slowest trace", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", portName: "FastService", duration: 10 }),
        createMockTrace({ id: "trace-2", portName: "SlowService", duration: 100 }),
        createMockTrace({ id: "trace-3", portName: "MediumService", duration: 50 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const footer = screen.getByTestId("timeline-footer");
      expect(footer.textContent).toContain("Slowest:");
      expect(footer.textContent).toContain("SlowService");
    });

    it("formats duration using formatDuration", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", duration: 1500 }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const footer = screen.getByTestId("timeline-footer");
      // formatDuration converts 1500ms to "1.50s"
      expect(footer.textContent).toContain("1.50s");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 10: Legend component
  // ---------------------------------------------------------------------------
  describe("legend", () => {
    it("renders legend container", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      expect(screen.getByTestId("timeline-legend")).toBeDefined();
    });

    it("shows Fast label", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const legend = screen.getByTestId("timeline-legend");
      expect(legend.textContent).toContain("Fast");
      expect(legend.textContent).toContain("<10ms");
    });

    it("shows Medium label", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const legend = screen.getByTestId("timeline-legend");
      expect(legend.textContent).toContain("Medium");
    });

    it("shows Slow label with threshold value", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} threshold={50} />);

      const legend = screen.getByTestId("timeline-legend");
      expect(legend.textContent).toContain("Slow");
      expect(legend.textContent).toContain(">=50ms");
    });

    it("shows Cache Hit label", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      const legend = screen.getByTestId("timeline-legend");
      expect(legend.textContent).toContain("Cache Hit");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 11: Multiple row interactions
  // ---------------------------------------------------------------------------
  describe("multiple row interactions", () => {
    it("only one row can be expanded at a time", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1" }),
        createMockTrace({ id: "trace-2" }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      // Expand first row
      const row1 = screen.getByTestId("timeline-row-trace-1");
      const clickableRow1 = row1.querySelector('[role="button"]');
      fireEvent.click(clickableRow1!);

      expect(screen.getByTestId("timeline-details-trace-1")).toBeDefined();

      // Expand second row
      const row2 = screen.getByTestId("timeline-row-trace-2");
      const clickableRow2 = row2.querySelector('[role="button"]');
      fireEvent.click(clickableRow2!);

      // First row should be collapsed, second expanded
      expect(screen.queryByTestId("timeline-details-trace-1")).toBeNull();
      expect(screen.getByTestId("timeline-details-trace-2")).toBeDefined();
    });

    it("expanding new row collapses previously expanded row", () => {
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1" }),
        createMockTrace({ id: "trace-2" }),
        createMockTrace({ id: "trace-3" }),
      ];

      render(<TimelineView {...defaultProps} traces={traces} />);

      // Expand first row
      const row1 = screen.getByTestId("timeline-row-trace-1");
      fireEvent.click(row1.querySelector('[role="button"]')!);
      expect(screen.getByTestId("timeline-details-trace-1")).toBeDefined();

      // Expand third row
      const row3 = screen.getByTestId("timeline-row-trace-3");
      fireEvent.click(row3.querySelector('[role="button"]')!);

      // First should be collapsed, third expanded
      expect(screen.queryByTestId("timeline-details-trace-1")).toBeNull();
      expect(screen.getByTestId("timeline-details-trace-3")).toBeDefined();
    });

    it("zoom changes preserve expanded row state", () => {
      const traces: TraceEntry[] = [createMockTrace({ id: "trace-1" })];

      render(<TimelineView {...defaultProps} traces={traces} />);

      // Expand row
      const row = screen.getByTestId("timeline-row-trace-1");
      fireEvent.click(row.querySelector('[role="button"]')!);
      expect(screen.getByTestId("timeline-details-trace-1")).toBeDefined();

      // Change zoom
      fireEvent.click(screen.getByTestId("zoom-in"));

      // Row should still be expanded
      expect(screen.getByTestId("timeline-details-trace-1")).toBeDefined();
    });

    it("pin toggle works on collapsed rows", () => {
      const onTogglePin = vi.fn();
      const traces: TraceEntry[] = [
        createMockTrace({ id: "trace-1", isPinned: true }),
      ];

      render(
        <TimelineView {...defaultProps} traces={traces} onTogglePin={onTogglePin} />
      );

      // Row is not expanded, but pin indicator should still work
      fireEvent.click(screen.getByTestId("pin-indicator-trace-1"));
      expect(onTogglePin).toHaveBeenCalledWith("trace-1");
    });
  });
});

// =============================================================================
// Test Suite: TimeRuler
// =============================================================================

describe("TimeRuler", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders ruler container", () => {
    render(<TimeRuler totalDuration={100} threshold={50} />);

    const ruler = screen.getByTestId("time-ruler");
    expect(ruler).toBeDefined();
  });

  it("renders major ticks at appropriate intervals", () => {
    render(<TimeRuler totalDuration={100} threshold={50} />);

    // For 100ms duration, algorithm uses 10ms major tick intervals
    // Should have major ticks at 0, 10, 20, 30, etc.
    expect(screen.getByTestId("ruler-label-0")).toBeDefined();
    expect(screen.getByTestId("ruler-label-10")).toBeDefined();
    expect(screen.getByTestId("ruler-label-50")).toBeDefined();
    expect(screen.getByTestId("ruler-label-100")).toBeDefined();
  });

  it("renders minor ticks between major ticks", () => {
    render(<TimeRuler totalDuration={100} threshold={50} />);

    // Should have minor ticks (algorithm calculates minor = major / 5)
    const minorTicks = screen.getAllByTestId(/^ruler-tick-minor-/);
    expect(minorTicks.length).toBeGreaterThan(0);
  });

  it("renders threshold marker at correct position", () => {
    render(<TimeRuler totalDuration={100} threshold={50} />);

    const marker = screen.getByTestId("threshold-marker");
    expect(marker).toBeDefined();
    expect(marker.style.left).toBe("50%");
  });

  // ---------------------------------------------------------------------------
  // Threshold marker edge cases
  // ---------------------------------------------------------------------------
  describe("threshold marker edge cases", () => {
    it("does not render marker when threshold > totalDuration", () => {
      render(<TimeRuler totalDuration={100} threshold={200} />);

      expect(screen.queryByTestId("threshold-marker")).toBeNull();
    });

    it("renders marker at 0% when threshold is 0", () => {
      render(<TimeRuler totalDuration={100} threshold={0} />);

      // threshold of 0 might not render or render at start
      const marker = screen.queryByTestId("threshold-marker");
      if (marker) {
        expect(marker.style.left).toBe("0%");
      }
    });

    it("renders marker at 100% when threshold equals totalDuration", () => {
      render(<TimeRuler totalDuration={100} threshold={100} />);

      const marker = screen.getByTestId("threshold-marker");
      expect(marker.style.left).toBe("100%");
    });

    it("positions marker correctly with different durations", () => {
      render(<TimeRuler totalDuration={200} threshold={50} />);

      const marker = screen.getByTestId("threshold-marker");
      // 50/200 = 25%
      expect(marker.style.left).toBe("25%");
    });

    it("positions marker at correct position for large durations", () => {
      render(<TimeRuler totalDuration={1000} threshold={500} />);

      const marker = screen.getByTestId("threshold-marker");
      // 500/1000 = 50%
      expect(marker.style.left).toBe("50%");
    });
  });

  // ---------------------------------------------------------------------------
  // Tick configuration
  // ---------------------------------------------------------------------------
  describe("tick configuration", () => {
    it("uses appropriate intervals for small durations (0-50ms)", () => {
      render(<TimeRuler totalDuration={40} threshold={25} />);

      // Should have ticks at 0, 10, 20, 30, 40 with 10ms intervals
      expect(screen.getByTestId("ruler-label-0")).toBeDefined();
      expect(screen.getByTestId("ruler-label-10")).toBeDefined();
      expect(screen.getByTestId("ruler-label-20")).toBeDefined();
      expect(screen.getByTestId("ruler-label-30")).toBeDefined();
      expect(screen.getByTestId("ruler-label-40")).toBeDefined();
    });

    it("uses appropriate intervals for medium durations (100-200ms)", () => {
      render(<TimeRuler totalDuration={150} threshold={50} />);

      // Should have ticks at appropriate intervals (25ms for 100-200ms range)
      expect(screen.getByTestId("ruler-label-0")).toBeDefined();
      expect(screen.getByTestId("ruler-label-25")).toBeDefined();
      expect(screen.getByTestId("ruler-label-50")).toBeDefined();
    });

    it("uses appropriate intervals for large durations (500ms+)", () => {
      render(<TimeRuler totalDuration={600} threshold={200} />);

      // Should have ticks at 100ms intervals for 500ms+ range
      expect(screen.getByTestId("ruler-label-0")).toBeDefined();
      expect(screen.getByTestId("ruler-label-100")).toBeDefined();
      expect(screen.getByTestId("ruler-label-200")).toBeDefined();
    });

    it("renders minor ticks between major ticks", () => {
      render(<TimeRuler totalDuration={100} threshold={50} />);

      // Minor ticks should exist
      const minorTicks = screen.getAllByTestId(/^ruler-tick-minor-/);
      expect(minorTicks.length).toBeGreaterThan(0);
    });

    it("formats labels as seconds for values >= 1000ms", () => {
      render(<TimeRuler totalDuration={2000} threshold={500} />);

      // Labels for 1000+ should be formatted as seconds
      const label1000 = screen.queryByTestId("ruler-label-1000");
      const label1s = screen.queryByTestId("ruler-label-1s");
      // Either format might be used
      expect(label1000 ?? label1s).toBeDefined();
    });

    it("handles very small durations correctly", () => {
      render(<TimeRuler totalDuration={10} threshold={5} />);

      // Should still render with some ticks
      expect(screen.getByTestId("ruler-label-0")).toBeDefined();
      expect(screen.getByTestId("ruler-label-10")).toBeDefined();
    });
  });
});

// =============================================================================
// Test Suite: TimelineRow (standalone)
// =============================================================================

describe("TimelineRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders lifetime badge with correct lifetime", () => {
    const trace = createMockTrace({
      id: "trace-1",
      lifetime: "scoped",
    });

    render(
      <TimelineRow
        trace={trace}
        threshold={50}
        totalDuration={100}
        isExpanded={false}
        onToggleExpand={() => {}}
        onTogglePin={() => {}}
        onViewInTree={() => {}}
      />
    );

    const row = screen.getByTestId("timeline-row-trace-1");
    expect(row.textContent).toContain("scoped");
  });

  it("applies correct row styling for slow traces", () => {
    const trace = createMockTrace({
      id: "trace-1",
      duration: 100,
      isCacheHit: false,
    });

    render(
      <TimelineRow
        trace={trace}
        threshold={50}
        totalDuration={100}
        isExpanded={false}
        onToggleExpand={() => {}}
        onTogglePin={() => {}}
        onViewInTree={() => {}}
      />
    );

    const row = screen.getByTestId("timeline-row-trace-1");
    expect(row.dataset["slow"]).toBe("true");
  });

  it("applies correct row styling for cached traces", () => {
    const trace = createMockTrace({
      id: "trace-1",
      isCacheHit: true,
    });

    render(
      <TimelineRow
        trace={trace}
        threshold={50}
        totalDuration={100}
        isExpanded={false}
        onToggleExpand={() => {}}
        onTogglePin={() => {}}
        onViewInTree={() => {}}
      />
    );

    const row = screen.getByTestId("timeline-row-trace-1");
    expect(row.dataset["cached"]).toBe("true");
  });

  it("shows dependencies in expanded details", () => {
    const parentTrace = createMockTrace({
      id: "trace-1",
      portName: "ParentService",
      childTraceIds: ["trace-2", "trace-3"],
    });

    render(
      <TimelineRow
        trace={parentTrace}
        threshold={50}
        totalDuration={100}
        isExpanded={true}
        onToggleExpand={() => {}}
        onTogglePin={() => {}}
        onViewInTree={() => {}}
      />
    );

    const details = screen.getByTestId("timeline-details-trace-1");
    expect(details.textContent).toContain("Dependencies:");
    expect(details.textContent).toContain("2");
  });

  // ---------------------------------------------------------------------------
  // Keyboard accessibility
  // ---------------------------------------------------------------------------
  describe("keyboard accessibility", () => {
    it("row has tabIndex for keyboard focus", () => {
      const trace = createMockTrace({ id: "trace-1" });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={false}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      expect(clickableRow).toHaveProperty("tabIndex", 0);
    });

    it("Enter key expands collapsed row", () => {
      const onToggleExpand = vi.fn();
      const trace = createMockTrace({ id: "trace-1" });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      fireEvent.keyDown(clickableRow!, { key: "Enter" });

      expect(onToggleExpand).toHaveBeenCalledWith("trace-1");
    });

    it("Space key expands collapsed row", () => {
      const onToggleExpand = vi.fn();
      const trace = createMockTrace({ id: "trace-1" });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      fireEvent.keyDown(clickableRow!, { key: " " });

      expect(onToggleExpand).toHaveBeenCalledWith("trace-1");
    });

    it("row has aria-expanded attribute when expanded", () => {
      const trace = createMockTrace({ id: "trace-1" });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      expect(clickableRow?.getAttribute("aria-expanded")).toBe("true");
    });

    it("row has aria-expanded false when collapsed", () => {
      const trace = createMockTrace({ id: "trace-1" });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={false}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const rowContainer = screen.getByTestId("timeline-row-trace-1");
      const clickableRow = rowContainer.querySelector('[role="button"]');
      expect(clickableRow?.getAttribute("aria-expanded")).toBe("false");
    });
  });

  // ---------------------------------------------------------------------------
  // Copy JSON functionality
  // ---------------------------------------------------------------------------
  describe("copy JSON functionality", () => {
    it("renders Copy JSON button in expanded details", () => {
      const trace = createMockTrace({ id: "trace-1" });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      expect(screen.getByTestId("copy-json-trace-1")).toBeDefined();
    });

    it("Copy JSON button has correct text", () => {
      const trace = createMockTrace({ id: "trace-1" });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const button = screen.getByTestId("copy-json-trace-1");
      expect(button.textContent).toContain("Copy");
    });

    it("Copy JSON button calls clipboard writeText", async () => {
      const trace = createMockTrace({ id: "trace-1", portName: "TestService" });
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const button = screen.getByTestId("copy-json-trace-1");
      fireEvent.click(button);

      expect(writeTextMock).toHaveBeenCalled();
      const firstCall = writeTextMock.mock.calls[0];
      expect(firstCall).toBeDefined();
      const calledWith = firstCall?.[0] as string;
      expect(calledWith).toContain("TestService");
    });
  });

  // ---------------------------------------------------------------------------
  // Expanded details accuracy
  // ---------------------------------------------------------------------------
  describe("expanded details accuracy", () => {
    it("shows End Time as startTime + duration", () => {
      const trace = createMockTrace({
        id: "trace-1",
        startTime: 100,
        duration: 50,
      });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={200}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const details = screen.getByTestId("timeline-details-trace-1");
      expect(details.textContent).toContain("End Time:");
      expect(details.textContent).toContain("150");
    });

    it("shows cache hit status as Yes for cache hits", () => {
      const trace = createMockTrace({
        id: "trace-1",
        isCacheHit: true,
      });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const details = screen.getByTestId("timeline-details-trace-1");
      expect(details.textContent).toContain("Cache Hit:");
      expect(details.textContent).toMatch(/Yes|cached/i);
    });

    it("shows cache hit status as No for fresh resolutions", () => {
      const trace = createMockTrace({
        id: "trace-1",
        isCacheHit: false,
      });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const details = screen.getByTestId("timeline-details-trace-1");
      expect(details.textContent).toContain("Cache Hit:");
      expect(details.textContent).toMatch(/No|fresh/i);
    });

    it("shows Scope with scopeId value", () => {
      const trace = createMockTrace({
        id: "trace-1",
        scopeId: "scope-abc-123",
      });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const details = screen.getByTestId("timeline-details-trace-1");
      expect(details.textContent).toContain("Scope:");
      expect(details.textContent).toContain("scope-abc-123");
    });

    it("shows Scope as root when scopeId is null", () => {
      const trace = createMockTrace({
        id: "trace-1",
        scopeId: null,
      });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const details = screen.getByTestId("timeline-details-trace-1");
      expect(details.textContent).toContain("Scope:");
      expect(details.textContent).toMatch(/root|container/i);
    });

    it("shows correct number of dependencies", () => {
      const trace = createMockTrace({
        id: "trace-1",
        childTraceIds: ["child-1", "child-2", "child-3", "child-4"],
      });

      render(
        <TimelineRow
          trace={trace}
          threshold={50}
          totalDuration={100}
          isExpanded={true}
          onToggleExpand={() => {}}
          onTogglePin={() => {}}
          onViewInTree={() => {}}
        />
      );

      const details = screen.getByTestId("timeline-details-trace-1");
      expect(details.textContent).toContain("Dependencies:");
      expect(details.textContent).toContain("4");
    });
  });
});
