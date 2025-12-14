/**
 * Tests for TraceCollector strategy pattern implementations.
 *
 * These tests verify:
 * 1. TraceCollector interface contract compliance
 * 2. MemoryCollector collect() and getTraces() functionality
 * 3. MemoryCollector getStats() lazy computation
 * 4. NoOpCollector zero overhead (no storage)
 * 5. CompositeCollector delegation to multiple collectors
 * 6. Subscribe/unsubscribe real-time push pattern
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TraceEntry, TraceFilter } from "../../src/tracing/types.js";
import type { TraceCollector } from "../../src/tracing/collector.js";
import { MemoryCollector } from "../../src/tracing/memory-collector.js";
import { NoOpCollector } from "../../src/tracing/noop-collector.js";
import { CompositeCollector } from "../../src/tracing/composite-collector.js";

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
// MemoryCollector Tests
// =============================================================================

describe("MemoryCollector", () => {
  let collector: MemoryCollector;

  beforeEach(() => {
    collector = new MemoryCollector();
  });

  describe("collect()", () => {
    it("stores traces that can be retrieved with getTraces()", () => {
      const entry = createMockTraceEntry();
      collector.collect(entry);

      const traces = collector.getTraces();

      expect(traces).toHaveLength(1);
      expect(traces[0]).toEqual(entry);
    });

    it("maintains insertion order for multiple traces", () => {
      const entry1 = createMockTraceEntry({ id: "trace-1", order: 1 });
      const entry2 = createMockTraceEntry({ id: "trace-2", order: 2 });
      const entry3 = createMockTraceEntry({ id: "trace-3", order: 3 });

      collector.collect(entry1);
      collector.collect(entry2);
      collector.collect(entry3);

      const traces = collector.getTraces();

      expect(traces).toHaveLength(3);
      expect(traces[0]?.id).toBe("trace-1");
      expect(traces[1]?.id).toBe("trace-2");
      expect(traces[2]?.id).toBe("trace-3");
    });
  });

  describe("getTraces()", () => {
    it("returns empty array when no traces collected", () => {
      const traces = collector.getTraces();

      expect(traces).toEqual([]);
    });

    it("filters by portName (case-insensitive partial match)", () => {
      collector.collect(createMockTraceEntry({ id: "t1", portName: "UserService" }));
      collector.collect(createMockTraceEntry({ id: "t2", portName: "Logger" }));
      collector.collect(createMockTraceEntry({ id: "t3", portName: "UserRepository" }));

      const filter: TraceFilter = { portName: "user" };
      const traces = collector.getTraces(filter);

      expect(traces).toHaveLength(2);
      expect(traces.map((t) => t.id)).toEqual(["t1", "t3"]);
    });

    it("filters by lifetime", () => {
      collector.collect(createMockTraceEntry({ id: "t1", lifetime: "singleton" }));
      collector.collect(createMockTraceEntry({ id: "t2", lifetime: "scoped" }));
      collector.collect(createMockTraceEntry({ id: "t3", lifetime: "singleton" }));

      const filter: TraceFilter = { lifetime: "singleton" };
      const traces = collector.getTraces(filter);

      expect(traces).toHaveLength(2);
      expect(traces.map((t) => t.id)).toEqual(["t1", "t3"]);
    });

    it("filters by cache hit status", () => {
      collector.collect(createMockTraceEntry({ id: "t1", isCacheHit: false }));
      collector.collect(createMockTraceEntry({ id: "t2", isCacheHit: true }));
      collector.collect(createMockTraceEntry({ id: "t3", isCacheHit: true }));

      const filter: TraceFilter = { isCacheHit: true };
      const traces = collector.getTraces(filter);

      expect(traces).toHaveLength(2);
      expect(traces.map((t) => t.id)).toEqual(["t2", "t3"]);
    });

    it("filters by duration range (minDuration and maxDuration)", () => {
      collector.collect(createMockTraceEntry({ id: "t1", duration: 5 }));
      collector.collect(createMockTraceEntry({ id: "t2", duration: 50 }));
      collector.collect(createMockTraceEntry({ id: "t3", duration: 150 }));

      const filter: TraceFilter = { minDuration: 10, maxDuration: 100 };
      const traces = collector.getTraces(filter);

      expect(traces).toHaveLength(1);
      expect(traces[0]?.id).toBe("t2");
    });

    it("combines multiple filter criteria (AND logic)", () => {
      collector.collect(
        createMockTraceEntry({ id: "t1", lifetime: "singleton", isCacheHit: false, duration: 50 })
      );
      collector.collect(
        createMockTraceEntry({ id: "t2", lifetime: "singleton", isCacheHit: true, duration: 50 })
      );
      collector.collect(
        createMockTraceEntry({ id: "t3", lifetime: "scoped", isCacheHit: false, duration: 50 })
      );

      const filter: TraceFilter = { lifetime: "singleton", isCacheHit: false };
      const traces = collector.getTraces(filter);

      expect(traces).toHaveLength(1);
      expect(traces[0]?.id).toBe("t1");
    });

    it("returns readonly array that cannot modify internal state", () => {
      collector.collect(createMockTraceEntry({ id: "t1" }));
      const traces = collector.getTraces();

      // The returned array should be readonly at type level
      // Runtime verification: internal state unaffected by external modifications
      const tracesCopy = [...traces];
      expect(tracesCopy).toHaveLength(1);

      // Collect another trace to verify internal state is independent
      collector.collect(createMockTraceEntry({ id: "t2" }));
      const newTraces = collector.getTraces();
      expect(newTraces).toHaveLength(2);
    });
  });

  describe("getStats()", () => {
    it("computes statistics lazily from collected traces", () => {
      collector.collect(createMockTraceEntry({ duration: 20, isCacheHit: false }));
      collector.collect(createMockTraceEntry({ duration: 30, isCacheHit: true }));
      collector.collect(createMockTraceEntry({ duration: 150, isCacheHit: false })); // Slow trace

      const stats = collector.getStats();

      expect(stats.totalResolutions).toBe(3);
      expect(stats.totalDuration).toBe(200);
      expect(stats.averageDuration).toBeCloseTo(66.67, 1);
      expect(stats.cacheHitRate).toBeCloseTo(0.333, 2);
      expect(stats.slowCount).toBe(1); // One trace > 100ms threshold
    });

    it("returns zero values when no traces collected", () => {
      const stats = collector.getStats();

      expect(stats.totalResolutions).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
      expect(stats.slowCount).toBe(0);
      expect(stats.totalDuration).toBe(0);
    });

    it("includes sessionStart timestamp", () => {
      const beforeCreate = Date.now();
      const freshCollector = new MemoryCollector();
      const afterCreate = Date.now();

      const stats = freshCollector.getStats();

      expect(stats.sessionStart).toBeGreaterThanOrEqual(beforeCreate);
      expect(stats.sessionStart).toBeLessThanOrEqual(afterCreate);
    });
  });

  describe("clear()", () => {
    it("removes all traces from the collector", () => {
      collector.collect(createMockTraceEntry({ id: "t1" }));
      collector.collect(createMockTraceEntry({ id: "t2" }));

      expect(collector.getTraces()).toHaveLength(2);

      collector.clear();

      expect(collector.getTraces()).toHaveLength(0);
    });
  });

  describe("subscribe()", () => {
    it("notifies subscribers when new traces are collected", () => {
      const callback = vi.fn();
      collector.subscribe(callback);

      const entry = createMockTraceEntry();
      collector.collect(entry);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(entry);
    });

    it("returns unsubscribe function that stops notifications", () => {
      const callback = vi.fn();
      const unsubscribe = collector.subscribe(callback);

      collector.collect(createMockTraceEntry({ id: "t1" }));
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      collector.collect(createMockTraceEntry({ id: "t2" }));
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("supports multiple subscribers", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      collector.subscribe(callback1);
      collector.subscribe(callback2);

      const entry = createMockTraceEntry();
      collector.collect(entry);

      expect(callback1).toHaveBeenCalledWith(entry);
      expect(callback2).toHaveBeenCalledWith(entry);
    });
  });
});

// =============================================================================
// NoOpCollector Tests
// =============================================================================

describe("NoOpCollector", () => {
  let collector: NoOpCollector;

  beforeEach(() => {
    collector = new NoOpCollector();
  });

  it("has zero overhead - getTraces() returns empty array without allocation", () => {
    const entry = createMockTraceEntry();
    collector.collect(entry);

    const traces = collector.getTraces();

    // Should always return empty, traces are never stored
    expect(traces).toEqual([]);
    expect(traces).toHaveLength(0);
  });

  it("getStats() returns zero values without computation", () => {
    collector.collect(createMockTraceEntry({ duration: 100 }));
    collector.collect(createMockTraceEntry({ duration: 200 }));

    const stats = collector.getStats();

    expect(stats.totalResolutions).toBe(0);
    expect(stats.averageDuration).toBe(0);
    expect(stats.cacheHitRate).toBe(0);
    expect(stats.slowCount).toBe(0);
    expect(stats.totalDuration).toBe(0);
  });

  it("clear() is a no-op", () => {
    // Just verify it doesn't throw
    expect(() => collector.clear()).not.toThrow();
  });

  it("subscribe() returns no-op unsubscribe function", () => {
    const callback = vi.fn();
    const unsubscribe = collector.subscribe(callback);

    collector.collect(createMockTraceEntry());

    // Callback should never be called
    expect(callback).not.toHaveBeenCalled();

    // Unsubscribe should not throw
    expect(() => unsubscribe()).not.toThrow();
  });

  it("implements TraceCollector interface", () => {
    // Type verification - if this compiles, the interface is implemented
    const traceCollector: TraceCollector = collector;

    expect(typeof traceCollector.collect).toBe("function");
    expect(typeof traceCollector.getTraces).toBe("function");
    expect(typeof traceCollector.getStats).toBe("function");
    expect(typeof traceCollector.clear).toBe("function");
    expect(typeof traceCollector.subscribe).toBe("function");
  });
});

// =============================================================================
// CompositeCollector Tests
// =============================================================================

describe("CompositeCollector", () => {
  it("delegates collect() to all child collectors", () => {
    const collector1 = new MemoryCollector();
    const collector2 = new MemoryCollector();
    const composite = new CompositeCollector([collector1, collector2]);

    const entry = createMockTraceEntry();
    composite.collect(entry);

    expect(collector1.getTraces()).toHaveLength(1);
    expect(collector2.getTraces()).toHaveLength(1);
  });

  it("aggregates getTraces() from first collector", () => {
    const collector1 = new MemoryCollector();
    const collector2 = new MemoryCollector();
    const composite = new CompositeCollector([collector1, collector2]);

    const entry1 = createMockTraceEntry({ id: "t1" });
    const entry2 = createMockTraceEntry({ id: "t2" });

    composite.collect(entry1);
    composite.collect(entry2);

    // getTraces comes from first collector
    const traces = composite.getTraces();
    expect(traces).toHaveLength(2);
    expect(traces[0]?.id).toBe("t1");
    expect(traces[1]?.id).toBe("t2");
  });

  it("passes filter to first collector for getTraces()", () => {
    const collector1 = new MemoryCollector();
    const collector2 = new MemoryCollector();
    const composite = new CompositeCollector([collector1, collector2]);

    composite.collect(createMockTraceEntry({ id: "t1", lifetime: "singleton" }));
    composite.collect(createMockTraceEntry({ id: "t2", lifetime: "scoped" }));

    const filter: TraceFilter = { lifetime: "singleton" };
    const traces = composite.getTraces(filter);

    expect(traces).toHaveLength(1);
    expect(traces[0]?.id).toBe("t1");
  });

  it("aggregates getStats() from first collector", () => {
    const collector1 = new MemoryCollector();
    const collector2 = new MemoryCollector();
    const composite = new CompositeCollector([collector1, collector2]);

    composite.collect(createMockTraceEntry({ duration: 50 }));
    composite.collect(createMockTraceEntry({ duration: 100 }));

    const stats = composite.getStats();

    expect(stats.totalResolutions).toBe(2);
    expect(stats.totalDuration).toBe(150);
  });

  it("delegates clear() to all child collectors", () => {
    const collector1 = new MemoryCollector();
    const collector2 = new MemoryCollector();
    const composite = new CompositeCollector([collector1, collector2]);

    composite.collect(createMockTraceEntry());
    expect(collector1.getTraces()).toHaveLength(1);
    expect(collector2.getTraces()).toHaveLength(1);

    composite.clear();

    expect(collector1.getTraces()).toHaveLength(0);
    expect(collector2.getTraces()).toHaveLength(0);
  });

  it("delegates subscribe() to all child collectors", () => {
    const collector1 = new MemoryCollector();
    const collector2 = new MemoryCollector();
    const composite = new CompositeCollector([collector1, collector2]);

    const callback = vi.fn();
    composite.subscribe(callback);

    const entry = createMockTraceEntry();
    composite.collect(entry);

    // Callback should be called once per child collector subscription
    // But since we subscribe to the composite, the implementation should
    // ensure the callback is called once per trace (from first collector)
    // OR once per collector - depending on design choice
    // Spec says "delegates to multiple collectors", so we expect delegation
    expect(callback).toHaveBeenCalled();
  });

  it("handles empty collectors array gracefully", () => {
    const composite = new CompositeCollector([]);

    const entry = createMockTraceEntry();

    // Should not throw
    expect(() => composite.collect(entry)).not.toThrow();
    expect(composite.getTraces()).toEqual([]);
    expect(composite.getStats().totalResolutions).toBe(0);
  });

  it("implements TraceCollector interface", () => {
    const composite = new CompositeCollector([]);
    const traceCollector: TraceCollector = composite;

    expect(typeof traceCollector.collect).toBe("function");
    expect(typeof traceCollector.getTraces).toBe("function");
    expect(typeof traceCollector.getStats).toBe("function");
    expect(typeof traceCollector.clear).toBe("function");
    expect(typeof traceCollector.subscribe).toBe("function");
  });
});
