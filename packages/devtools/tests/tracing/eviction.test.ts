/**
 * Tests for MemoryCollector eviction policy implementation.
 *
 * These tests verify:
 * 1. FIFO eviction at maxTraces limit
 * 2. Slow trace auto-pinning (>slowThresholdMs)
 * 3. Pinned traces protected from FIFO eviction
 * 4. Time-based expiry for non-pinned traces
 * 5. Max pinned traces limit (oldest pinned dropped)
 * 6. Manual pin/unpin API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TraceEntry } from "../../src/tracing/types.js";
import { MemoryCollector } from "../../src/tracing/memory-collector.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockTraceEntry(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    id: "trace-1",
    portName: "TestService",
    lifetime: "singleton",
    startTime: 1000.0,
    duration: 25.5,
    isCacheHit: false,
    parentTraceId: null,
    childTraceIds: [],
    scopeId: null,
    order: 1,
    isPinned: false,
    ...overrides,
  };
}

// =============================================================================
// FIFO Eviction Tests
// =============================================================================

describe("MemoryCollector FIFO Eviction", () => {
  it("evicts oldest non-pinned traces when maxTraces is exceeded", () => {
    const collector = new MemoryCollector({ maxTraces: 5 });

    // Collect 5 traces (at limit)
    for (let i = 1; i <= 5; i++) {
      collector.collect(createMockTraceEntry({ id: `trace-${i}`, order: i, duration: 10 }));
    }

    expect(collector.getTraces()).toHaveLength(5);

    // Collect 6th trace - should evict trace-1 (oldest)
    collector.collect(createMockTraceEntry({ id: "trace-6", order: 6, duration: 10 }));

    const traces = collector.getTraces();
    expect(traces).toHaveLength(5);
    expect(traces.map((t) => t.id)).toEqual(["trace-2", "trace-3", "trace-4", "trace-5", "trace-6"]);
  });

  it("does not evict pinned traces during FIFO eviction", () => {
    const collector = new MemoryCollector({
      maxTraces: 5,
      slowThresholdMs: 50, // Traces >= 50ms are slow (auto-pinned)
    });

    // Collect 4 fast traces and 1 slow (pinned) trace
    collector.collect(createMockTraceEntry({ id: "trace-1", order: 1, duration: 10 }));
    collector.collect(createMockTraceEntry({ id: "trace-2-slow", order: 2, duration: 100 })); // Auto-pinned
    collector.collect(createMockTraceEntry({ id: "trace-3", order: 3, duration: 10 }));
    collector.collect(createMockTraceEntry({ id: "trace-4", order: 4, duration: 10 }));
    collector.collect(createMockTraceEntry({ id: "trace-5", order: 5, duration: 10 }));

    expect(collector.getTraces()).toHaveLength(5);

    // Collect 6th trace - should evict trace-1 (oldest non-pinned)
    collector.collect(createMockTraceEntry({ id: "trace-6", order: 6, duration: 10 }));

    const traces = collector.getTraces();
    expect(traces).toHaveLength(5);

    // trace-2-slow should still be present (pinned), trace-1 evicted
    const traceIds = traces.map((t) => t.id);
    expect(traceIds).toContain("trace-2-slow");
    expect(traceIds).not.toContain("trace-1");
    expect(traceIds).toContain("trace-6");
  });

  it("maintains correct order after multiple evictions", () => {
    const collector = new MemoryCollector({ maxTraces: 3 });

    // Collect 5 traces - should evict 2 oldest
    for (let i = 1; i <= 5; i++) {
      collector.collect(createMockTraceEntry({ id: `trace-${i}`, order: i, duration: 10 }));
    }

    const traces = collector.getTraces();
    expect(traces).toHaveLength(3);
    expect(traces.map((t) => t.id)).toEqual(["trace-3", "trace-4", "trace-5"]);
  });
});

// =============================================================================
// Slow Trace Auto-Pinning Tests
// =============================================================================

describe("MemoryCollector Slow Trace Auto-Pinning", () => {
  it("auto-pins traces that exceed slowThresholdMs", () => {
    const collector = new MemoryCollector({ slowThresholdMs: 100 });

    // Fast trace (not pinned)
    collector.collect(createMockTraceEntry({ id: "fast", duration: 50, isPinned: false }));

    // Slow trace (should be auto-pinned)
    collector.collect(createMockTraceEntry({ id: "slow", duration: 150, isPinned: false }));

    const traces = collector.getTraces();
    const fastTrace = traces.find((t) => t.id === "fast");
    const slowTrace = traces.find((t) => t.id === "slow");

    expect(fastTrace?.isPinned).toBe(false);
    expect(slowTrace?.isPinned).toBe(true);
  });

  it("pins traces exactly at the threshold", () => {
    const collector = new MemoryCollector({ slowThresholdMs: 100 });

    collector.collect(createMockTraceEntry({ id: "at-threshold", duration: 100, isPinned: false }));

    const traces = collector.getTraces();
    expect(traces[0]?.isPinned).toBe(true);
  });
});

// =============================================================================
// Pinned Trace Limit Tests
// =============================================================================

describe("MemoryCollector Pinned Trace Limit", () => {
  it("evicts oldest pinned traces when maxPinnedTraces is exceeded", () => {
    const collector = new MemoryCollector({
      maxTraces: 100,
      maxPinnedTraces: 3,
      slowThresholdMs: 50, // All our slow traces will be auto-pinned
    });

    // Collect 4 slow traces (all will be auto-pinned)
    for (let i = 1; i <= 4; i++) {
      collector.collect(createMockTraceEntry({
        id: `slow-${i}`,
        order: i,
        duration: 100, // Exceeds threshold, auto-pinned
      }));
    }

    const traces = collector.getTraces();
    const pinnedTraces = traces.filter((t) => t.isPinned);

    // Should have 3 pinned traces (maxPinnedTraces), oldest pinned dropped
    expect(pinnedTraces).toHaveLength(3);
    expect(pinnedTraces.map((t) => t.id)).toEqual(["slow-2", "slow-3", "slow-4"]);
  });

  it("respects maxPinnedTraces independent of maxTraces", () => {
    const collector = new MemoryCollector({
      maxTraces: 10,
      maxPinnedTraces: 2,
      slowThresholdMs: 50,
    });

    // Collect 5 fast and 3 slow traces
    for (let i = 1; i <= 3; i++) {
      collector.collect(createMockTraceEntry({ id: `fast-${i}`, order: i, duration: 10 }));
    }
    for (let i = 1; i <= 3; i++) {
      collector.collect(createMockTraceEntry({ id: `slow-${i}`, order: i + 3, duration: 100 }));
    }

    const traces = collector.getTraces();
    const pinnedTraces = traces.filter((t) => t.isPinned);
    const unpinnedTraces = traces.filter((t) => !t.isPinned);

    // Should have exactly 2 pinned traces (maxPinnedTraces)
    expect(pinnedTraces).toHaveLength(2);
    // All 3 fast traces should still be present
    expect(unpinnedTraces).toHaveLength(3);
  });
});

// =============================================================================
// Time-Based Expiry Tests
// =============================================================================

describe("MemoryCollector Time-Based Expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires non-pinned traces older than expiryMs on getTraces()", () => {
    const collector = new MemoryCollector({
      expiryMs: 1000, // 1 second for testing
      slowThresholdMs: 1000, // High threshold so traces are not auto-pinned
    });

    // Collect a trace
    collector.collect(createMockTraceEntry({ id: "trace-1", duration: 10 }));
    expect(collector.getTraces()).toHaveLength(1);

    // Advance time past expiry
    vi.advanceTimersByTime(1500);

    // Trace should be expired
    const traces = collector.getTraces();
    expect(traces).toHaveLength(0);
  });

  it("does not expire pinned traces", () => {
    const collector = new MemoryCollector({
      expiryMs: 1000,
      slowThresholdMs: 50, // Low threshold so trace is auto-pinned
    });

    // Collect a slow (pinned) trace
    collector.collect(createMockTraceEntry({ id: "slow-trace", duration: 100 }));
    expect(collector.getTraces()).toHaveLength(1);

    // Advance time past expiry
    vi.advanceTimersByTime(2000);

    // Pinned trace should still exist
    const traces = collector.getTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0]?.id).toBe("slow-trace");
  });

  it("expires multiple traces based on their individual collection times", () => {
    const collector = new MemoryCollector({
      expiryMs: 1000,
      slowThresholdMs: 1000,
    });

    // Collect first trace
    collector.collect(createMockTraceEntry({ id: "trace-1", duration: 10 }));

    // Advance 600ms
    vi.advanceTimersByTime(600);

    // Collect second trace
    collector.collect(createMockTraceEntry({ id: "trace-2", duration: 10 }));

    expect(collector.getTraces()).toHaveLength(2);

    // Advance another 500ms (total 1100ms from first trace, 500ms from second)
    vi.advanceTimersByTime(500);

    // First trace should be expired, second should remain
    const traces = collector.getTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0]?.id).toBe("trace-2");
  });
});

// =============================================================================
// Manual Pin/Unpin API Tests
// =============================================================================

describe("MemoryCollector Manual Pin/Unpin API", () => {
  it("pin() marks a trace as pinned", () => {
    const collector = new MemoryCollector({ slowThresholdMs: 1000 });

    collector.collect(createMockTraceEntry({ id: "trace-1", duration: 10, isPinned: false }));

    // Verify initially not pinned
    expect(collector.getTraces()[0]?.isPinned).toBe(false);

    // Pin the trace
    collector.pin("trace-1");

    // Verify now pinned
    expect(collector.getTraces()[0]?.isPinned).toBe(true);
  });

  it("unpin() marks a trace as unpinned", () => {
    const collector = new MemoryCollector({ slowThresholdMs: 50 });

    // Collect a slow trace (auto-pinned)
    collector.collect(createMockTraceEntry({ id: "slow-trace", duration: 100 }));

    // Verify initially pinned (auto-pinned due to slow duration)
    expect(collector.getTraces()[0]?.isPinned).toBe(true);

    // Unpin the trace
    collector.unpin("slow-trace");

    // Verify now unpinned
    expect(collector.getTraces()[0]?.isPinned).toBe(false);
  });

  it("unpinned traces become eligible for FIFO eviction", () => {
    const collector = new MemoryCollector({
      maxTraces: 3,
      slowThresholdMs: 50,
    });

    // Collect a slow (pinned) trace first
    collector.collect(createMockTraceEntry({ id: "slow-1", order: 1, duration: 100 }));

    // Collect 2 fast traces
    collector.collect(createMockTraceEntry({ id: "fast-1", order: 2, duration: 10 }));
    collector.collect(createMockTraceEntry({ id: "fast-2", order: 3, duration: 10 }));

    // Unpin the slow trace
    collector.unpin("slow-1");

    // Collect another trace - should evict slow-1 (now unpinned and oldest)
    collector.collect(createMockTraceEntry({ id: "fast-3", order: 4, duration: 10 }));

    const traces = collector.getTraces();
    expect(traces).toHaveLength(3);
    expect(traces.map((t) => t.id)).not.toContain("slow-1");
    expect(traces.map((t) => t.id)).toContain("fast-3");
  });

  it("pin() does nothing for non-existent trace IDs", () => {
    const collector = new MemoryCollector();

    collector.collect(createMockTraceEntry({ id: "trace-1" }));

    // Should not throw
    expect(() => collector.pin("non-existent")).not.toThrow();

    // Original trace unaffected
    expect(collector.getTraces()[0]?.isPinned).toBe(false);
  });

  it("unpin() does nothing for non-existent trace IDs", () => {
    const collector = new MemoryCollector({ slowThresholdMs: 50 });

    collector.collect(createMockTraceEntry({ id: "slow-trace", duration: 100 }));

    // Should not throw
    expect(() => collector.unpin("non-existent")).not.toThrow();

    // Original trace unaffected (still pinned)
    expect(collector.getTraces()[0]?.isPinned).toBe(true);
  });
});
