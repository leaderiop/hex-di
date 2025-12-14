/**
 * Tests for TracingControlsBar component.
 *
 * These tests verify:
 * 1. Search input with 300ms debounce
 * 2. Lifetime filter button toggles
 * 3. Threshold slider value changes
 * 4. Recording indicator state (recording/paused)
 * 5. Active filters display and removal
 */

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import React from "react";
import {
  TracingControlsBar,
  type TracingFilters,
  type TracingSortOption,
} from "../../src/react/tracing-controls-bar.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Default filter state for tests.
 */
const defaultFilters: TracingFilters = {
  searchQuery: "",
  lifetime: null,
  status: null,
  slowOnly: false,
};

/**
 * Default sort option for tests.
 */
const defaultSort: TracingSortOption = "chronological";

/**
 * Default threshold value (ms).
 */
const defaultThreshold = 50;

/**
 * Create mock handler functions for testing.
 */
function createMockHandlers() {
  return {
    onFiltersChange: vi.fn(),
    onSortChange: vi.fn(),
    onThresholdChange: vi.fn(),
    onClear: vi.fn(),
    onPauseToggle: vi.fn(),
    onExport: vi.fn(),
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("TracingControlsBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Search input with 300ms debounce
  // ---------------------------------------------------------------------------
  describe("search input with debounce", () => {
    it("renders search input", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const searchInput = screen.getByTestId("tracing-search");
      expect(searchInput).toBeDefined();
      expect(searchInput.getAttribute("placeholder")).toContain("Search");
    });

    it("debounces search input for 300ms", async () => {
      vi.useRealTimers();
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const searchInput = screen.getByTestId("tracing-search");

      // Type in search
      fireEvent.change(searchInput, { target: { value: "UserService" } });

      // Should not be called immediately
      expect(handlers.onFiltersChange).not.toHaveBeenCalled();

      // Wait for debounce
      await waitFor(
        () => {
          expect(handlers.onFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ searchQuery: "UserService" })
          );
        },
        { timeout: 500 }
      );

      vi.useFakeTimers();
    });

    it("shows clear button when search has value", async () => {
      vi.useRealTimers();
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={{ ...defaultFilters, searchQuery: "Logger" }}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      // Clear button should be visible
      const clearButton = screen.getByTestId("tracing-search-clear");
      expect(clearButton).toBeDefined();

      // Click clear button
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(handlers.onFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({ searchQuery: "" })
        );
      });

      vi.useFakeTimers();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Lifetime filter button toggles
  // ---------------------------------------------------------------------------
  describe("lifetime filter buttons", () => {
    it("renders all lifetime filter buttons", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      expect(screen.getByTestId("tracing-filter-lifetime-all")).toBeDefined();
      expect(screen.getByTestId("tracing-filter-lifetime-singleton")).toBeDefined();
      expect(screen.getByTestId("tracing-filter-lifetime-scoped")).toBeDefined();
      expect(screen.getByTestId("tracing-filter-lifetime-request")).toBeDefined();
    });

    it("toggles lifetime filter when clicked", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const singletonFilter = screen.getByTestId("tracing-filter-lifetime-singleton");
      fireEvent.click(singletonFilter);

      expect(handlers.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ lifetime: "singleton" })
      );
    });

    it("shows correct aria-pressed state for active filter", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={{ ...defaultFilters, lifetime: "scoped" }}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const scopedFilter = screen.getByTestId("tracing-filter-lifetime-scoped");
      const allFilter = screen.getByTestId("tracing-filter-lifetime-all");

      expect(scopedFilter.getAttribute("aria-pressed")).toBe("true");
      expect(allFilter.getAttribute("aria-pressed")).toBe("false");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Threshold slider value changes
  // ---------------------------------------------------------------------------
  describe("threshold slider", () => {
    it("renders threshold slider with correct value", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={75}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const slider = screen.getByTestId("tracing-threshold-slider");
      expect(slider).toBeDefined();
      expect(slider.getAttribute("value")).toBe("75");
    });

    it("displays threshold value label", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={100}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const label = screen.getByTestId("tracing-threshold-label");
      expect(label.textContent).toContain("100ms");
    });

    it("calls onThresholdChange when slider value changes", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={50}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const slider = screen.getByTestId("tracing-threshold-slider");
      fireEvent.change(slider, { target: { value: "150" } });

      expect(handlers.onThresholdChange).toHaveBeenCalledWith(150);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Recording indicator state (recording/paused)
  // ---------------------------------------------------------------------------
  describe("recording indicator", () => {
    it("shows recording state with pulsing dot when recording", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={15}
          totalDuration={234.5}
          {...handlers}
        />
      );

      const indicator = screen.getByTestId("tracing-recording-indicator");
      expect(indicator).toBeDefined();
      expect(indicator.textContent).toContain("Recording");
    });

    it("shows paused state when not recording", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={false}
          traceCount={15}
          totalDuration={234.5}
          {...handlers}
        />
      );

      const indicator = screen.getByTestId("tracing-recording-indicator");
      expect(indicator.textContent).toContain("Paused");
    });

    it("displays trace count and total duration", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={25}
          totalDuration={524}
          {...handlers}
        />
      );

      const countDisplay = screen.getByTestId("tracing-trace-count");
      expect(countDisplay.textContent).toContain("25");

      const durationDisplay = screen.getByTestId("tracing-total-duration");
      expect(durationDisplay.textContent).toContain("524ms");
    });

    it("calls onPauseToggle when pause/resume button is clicked", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const pauseButton = screen.getByTestId("tracing-pause-toggle");
      fireEvent.click(pauseButton);

      expect(handlers.onPauseToggle).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Active filters display and removal
  // ---------------------------------------------------------------------------
  describe("active filters bar", () => {
    it("displays active filter tags when filters are applied", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={{ ...defaultFilters, lifetime: "singleton", slowOnly: true }}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      // Should show filter tags
      const activeFiltersBar = screen.getByTestId("tracing-active-filters");
      expect(activeFiltersBar).toBeDefined();

      expect(screen.getByTestId("filter-tag-lifetime-singleton")).toBeDefined();
      expect(screen.getByTestId("filter-tag-slow-only")).toBeDefined();
    });

    it("removes filter when clicking tag remove button", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={{ ...defaultFilters, lifetime: "singleton" }}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const removeButton = screen.getByTestId("filter-tag-lifetime-singleton-remove");
      fireEvent.click(removeButton);

      expect(handlers.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ lifetime: null })
      );
    });

    it("hides active filters bar when no filters are applied", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      // Active filters bar should not be visible
      expect(screen.queryByTestId("tracing-active-filters")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Sort dropdown
  // ---------------------------------------------------------------------------
  describe("sort dropdown", () => {
    it("renders sort dropdown with correct value", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort="slowest"
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const sortDropdown = screen.getByTestId("tracing-sort-dropdown");
      expect(sortDropdown).toBeDefined();
      expect(sortDropdown).toHaveProperty("value", "slowest");
    });

    it("calls onSortChange when dropdown value changes", () => {
      const handlers = createMockHandlers();

      render(
        <TracingControlsBar
          filters={defaultFilters}
          sort={defaultSort}
          threshold={defaultThreshold}
          isRecording={true}
          traceCount={0}
          totalDuration={0}
          {...handlers}
        />
      );

      const sortDropdown = screen.getByTestId("tracing-sort-dropdown");
      fireEvent.change(sortDropdown, { target: { value: "fastest" } });

      expect(handlers.onSortChange).toHaveBeenCalledWith("fastest");
    });
  });
});
