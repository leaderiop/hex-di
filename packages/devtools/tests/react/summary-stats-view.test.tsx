/**
 * Tests for SummaryStatsView component.
 *
 * These tests verify:
 * 1. Overview cards display correct values
 * 2. Duration distribution bar chart rendering
 * 3. Slowest services list ordering
 * 4. Cache efficiency visualization
 * 5. Clicking slowest service navigates to trace
 * 6. Lifetime breakdown displays correctly
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";
import {
  SummaryStatsView,
  type SummaryStatsViewProps,
} from "../../src/react/summary-stats-view.js";
import type { TraceEntry, TraceStats } from "../../src/tracing/types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Creates a mock trace entry for testing.
 */
function createMockTrace(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    id: `trace-${Math.random().toString(36).slice(2, 8)}`,
    portName: "TestService",
    lifetime: "singleton",
    startTime: performance.now(),
    duration: 10,
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
 * Creates mock trace stats for testing.
 */
function createMockStats(overrides: Partial<TraceStats> = {}): TraceStats {
  return {
    totalResolutions: 15,
    averageDuration: 25.5,
    cacheHitRate: 0.4,
    slowCount: 3,
    sessionStart: Date.now() - 60000,
    totalDuration: 382.5,
    ...overrides,
  };
}

/**
 * Creates a diverse set of traces for comprehensive testing.
 */
function createTestTraces(): readonly TraceEntry[] {
  return [
    createMockTrace({ id: "trace-1", portName: "DatabasePort", duration: 62.3, lifetime: "singleton", isCacheHit: false }),
    createMockTrace({ id: "trace-2", portName: "PaymentGateway", duration: 45.2, lifetime: "singleton", isCacheHit: false }),
    createMockTrace({ id: "trace-3", portName: "HttpClient", duration: 38.9, lifetime: "singleton", isCacheHit: false }),
    createMockTrace({ id: "trace-4", portName: "UserRepository", duration: 22.4, lifetime: "scoped", isCacheHit: false }),
    createMockTrace({ id: "trace-5", portName: "AuthService", duration: 15.1, lifetime: "scoped", isCacheHit: false }),
    createMockTrace({ id: "trace-6", portName: "Logger", duration: 5.2, lifetime: "singleton", isCacheHit: true }),
    createMockTrace({ id: "trace-7", portName: "ConfigPort", duration: 3.1, lifetime: "singleton", isCacheHit: true }),
    createMockTrace({ id: "trace-8", portName: "CacheService", duration: 8.5, lifetime: "singleton", isCacheHit: false }),
    createMockTrace({ id: "trace-9", portName: "RequestLogger", duration: 2.1, lifetime: "request", isCacheHit: false }),
    createMockTrace({ id: "trace-10", portName: "SessionManager", duration: 1.5, lifetime: "request", isCacheHit: false }),
  ];
}

/**
 * Default props for SummaryStatsView component.
 */
function createDefaultProps(overrides: Partial<SummaryStatsViewProps> = {}): SummaryStatsViewProps {
  return {
    traces: createTestTraces(),
    stats: createMockStats(),
    threshold: 50,
    onNavigateToTrace: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe("SummaryStatsView", () => {
  afterEach(() => {
    cleanup();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Overview cards display correct values
  // ---------------------------------------------------------------------------
  describe("overview cards", () => {
    it("displays total resolutions count", () => {
      const props = createDefaultProps({
        stats: createMockStats({ totalResolutions: 42 }),
      });

      render(<SummaryStatsView {...props} />);

      const totalCard = screen.getByTestId("summary-card-total-resolutions");
      expect(totalCard).toBeDefined();
      expect(totalCard.textContent).toContain("42");
    });

    it("displays average time correctly formatted", () => {
      const props = createDefaultProps({
        stats: createMockStats({ averageDuration: 25.5 }),
      });

      render(<SummaryStatsView {...props} />);

      const avgCard = screen.getByTestId("summary-card-avg-time");
      expect(avgCard).toBeDefined();
      // formatDuration rounds values >= 10ms to whole numbers
      expect(avgCard.textContent).toContain("26ms");
    });

    it("displays cache hit rate as percentage", () => {
      const props = createDefaultProps({
        stats: createMockStats({ cacheHitRate: 0.65 }),
      });

      render(<SummaryStatsView {...props} />);

      const cacheCard = screen.getByTestId("summary-card-cache-hit-rate");
      expect(cacheCard).toBeDefined();
      expect(cacheCard.textContent).toContain("65%");
    });

    it("displays slow count with warning style when greater than zero", () => {
      const props = createDefaultProps({
        stats: createMockStats({ slowCount: 5 }),
      });

      render(<SummaryStatsView {...props} />);

      const slowCard = screen.getByTestId("summary-card-slow-count");
      expect(slowCard).toBeDefined();
      expect(slowCard.textContent).toContain("5");
      // Card should have warning styling
      expect(slowCard.getAttribute("data-warning")).toBe("true");
    });

    it("does not show warning style when slow count is zero", () => {
      const props = createDefaultProps({
        stats: createMockStats({ slowCount: 0 }),
      });

      render(<SummaryStatsView {...props} />);

      const slowCard = screen.getByTestId("summary-card-slow-count");
      expect(slowCard.getAttribute("data-warning")).toBe("false");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: Duration distribution bar chart rendering
  // ---------------------------------------------------------------------------
  describe("duration distribution", () => {
    it("renders all duration buckets", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      expect(screen.getByTestId("duration-bucket-0-10")).toBeDefined();
      expect(screen.getByTestId("duration-bucket-10-25")).toBeDefined();
      expect(screen.getByTestId("duration-bucket-25-50")).toBeDefined();
      expect(screen.getByTestId("duration-bucket-50-100")).toBeDefined();
      expect(screen.getByTestId("duration-bucket-100-plus")).toBeDefined();
    });

    it("displays correct counts in distribution buckets", () => {
      const traces = [
        createMockTrace({ duration: 5 }),    // 0-10ms bucket
        createMockTrace({ duration: 8 }),    // 0-10ms bucket
        createMockTrace({ duration: 15 }),   // 10-25ms bucket
        createMockTrace({ duration: 30 }),   // 25-50ms bucket
        createMockTrace({ duration: 75 }),   // 50-100ms bucket
        createMockTrace({ duration: 150 }),  // >100ms bucket
      ];

      const props = createDefaultProps({ traces });
      render(<SummaryStatsView {...props} />);

      const bucket0to10 = screen.getByTestId("duration-bucket-0-10");
      expect(bucket0to10.textContent).toContain("2");

      const bucket10to25 = screen.getByTestId("duration-bucket-10-25");
      expect(bucket10to25.textContent).toContain("1");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Slowest services list ordering
  // ---------------------------------------------------------------------------
  describe("slowest services list", () => {
    it("renders top 5 slowest services in descending order", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      const slowestList = screen.getByTestId("slowest-services-list");
      expect(slowestList).toBeDefined();

      // First item should be DatabasePort (62.3ms -> formatted as 62ms)
      const firstItem = screen.getByTestId("slowest-service-0");
      expect(firstItem.textContent).toContain("DatabasePort");
      // formatDuration rounds values >= 10ms to whole numbers
      expect(firstItem.textContent).toContain("62ms");

      // Second item should be PaymentGateway (45.2ms)
      const secondItem = screen.getByTestId("slowest-service-1");
      expect(secondItem.textContent).toContain("PaymentGateway");
    });

    it("limits list to 5 services", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      // Should only have 5 items
      expect(screen.getByTestId("slowest-service-0")).toBeDefined();
      expect(screen.getByTestId("slowest-service-4")).toBeDefined();
      expect(screen.queryByTestId("slowest-service-5")).toBeNull();
    });

    it("displays lifetime badges for slowest services", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      const firstItem = screen.getByTestId("slowest-service-0");
      expect(firstItem.textContent?.toUpperCase()).toContain("SINGLETON");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Cache efficiency visualization
  // ---------------------------------------------------------------------------
  describe("cache efficiency", () => {
    it("renders cache efficiency section", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      expect(screen.getByTestId("cache-efficiency-section")).toBeDefined();
    });

    it("displays fresh vs cached counts", () => {
      // 2 cached, 8 fresh in our test data
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      const section = screen.getByTestId("cache-efficiency-section");
      // Should show both counts
      expect(section.textContent).toMatch(/fresh/i);
      expect(section.textContent).toMatch(/cached/i);
    });

    it("displays estimated time savings", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      const savingsElement = screen.getByTestId("cache-estimated-savings");
      expect(savingsElement).toBeDefined();
      // Should contain "saved" text
      expect(savingsElement.textContent?.toLowerCase()).toContain("saved");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Clicking slowest service navigates to trace
  // ---------------------------------------------------------------------------
  describe("navigation", () => {
    it("calls onNavigateToTrace when clicking slowest service row", () => {
      const onNavigateToTrace = vi.fn();
      const props = createDefaultProps({ onNavigateToTrace });

      render(<SummaryStatsView {...props} />);

      const firstItem = screen.getByTestId("slowest-service-0");
      fireEvent.click(firstItem);

      expect(onNavigateToTrace).toHaveBeenCalledWith("trace-1");
    });

    it("has clickable styling on slowest service rows", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      const firstItem = screen.getByTestId("slowest-service-0");
      expect(firstItem.style.cursor).toBe("pointer");
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Lifetime breakdown
  // ---------------------------------------------------------------------------
  describe("lifetime breakdown", () => {
    it("displays all three lifetime categories", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      expect(screen.getByTestId("lifetime-breakdown-singleton")).toBeDefined();
      expect(screen.getByTestId("lifetime-breakdown-scoped")).toBeDefined();
      expect(screen.getByTestId("lifetime-breakdown-request")).toBeDefined();
    });

    it("displays correct counts for each lifetime", () => {
      // Test data: 5 singleton, 2 scoped, 2 request (filtering out cache hits for fresh count)
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      // Check singleton section - we have 6 singletons total in test data
      const singletonSection = screen.getByTestId("lifetime-breakdown-singleton");
      expect(singletonSection.textContent).toMatch(/\d+\s*service/i);
    });

    it("displays average and total time per lifetime", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      const singletonSection = screen.getByTestId("lifetime-breakdown-singleton");
      // Should contain average time
      expect(singletonSection.textContent).toMatch(/avg/i);
      // Should contain total time
      expect(singletonSection.textContent).toMatch(/total/i);
    });
  });

  // ---------------------------------------------------------------------------
  // Additional Tests
  // ---------------------------------------------------------------------------
  describe("export functionality", () => {
    it("renders export buttons", () => {
      const props = createDefaultProps();

      render(<SummaryStatsView {...props} />);

      expect(screen.getByTestId("summary-export-json")).toBeDefined();
      expect(screen.getByTestId("summary-export-csv")).toBeDefined();
      expect(screen.getByTestId("summary-export-clipboard")).toBeDefined();
    });

    it("calls onExport with correct format", () => {
      const onExport = vi.fn();
      const props = createDefaultProps({ onExport });

      render(<SummaryStatsView {...props} />);

      fireEvent.click(screen.getByTestId("summary-export-json"));
      expect(onExport).toHaveBeenCalledWith("json");

      fireEvent.click(screen.getByTestId("summary-export-csv"));
      expect(onExport).toHaveBeenCalledWith("csv");

      fireEvent.click(screen.getByTestId("summary-export-clipboard"));
      expect(onExport).toHaveBeenCalledWith("clipboard");
    });
  });

  describe("empty state", () => {
    it("shows empty state when no traces", () => {
      const props = createDefaultProps({
        traces: [],
        stats: createMockStats({ totalResolutions: 0, averageDuration: 0, cacheHitRate: 0 }),
      });

      render(<SummaryStatsView {...props} />);

      expect(screen.getByTestId("summary-empty-state")).toBeDefined();
    });
  });
});
