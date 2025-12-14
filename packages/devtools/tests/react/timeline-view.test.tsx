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
});
