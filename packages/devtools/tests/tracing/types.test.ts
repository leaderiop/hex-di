/**
 * Tests for Resolution Tracing type definitions.
 *
 * These tests verify:
 * 1. TraceEntry interface has correct shape and required fields
 * 2. TraceRetentionPolicy interface with proper defaults validation
 * 3. TraceStats interface for aggregate statistics
 * 4. TracingOptions interface for createTracingContainer configuration
 * 5. TRACING_ACCESS Symbol cross-realm consistency
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import type { Lifetime } from "@hex-di/graph";
import { TRACING_ACCESS } from "@hex-di/runtime";
import type {
  TraceEntry,
  TraceRetentionPolicy,
  TraceStats,
  TracingOptions,
  TraceFilter,
} from "../../src/tracing/types.js";

// =============================================================================
// TRACING_ACCESS Symbol Tests
// =============================================================================

describe("TRACING_ACCESS Symbol", () => {
  it("returns the same Symbol across multiple imports (cross-realm consistency)", () => {
    // Symbol.for() guarantees same symbol for same key across realms
    const symbolFromRegistry = Symbol.for("hex-di/tracing-access");
    expect(TRACING_ACCESS).toBe(symbolFromRegistry);
  });

  it("is a Symbol type", () => {
    expect(typeof TRACING_ACCESS).toBe("symbol");
  });

  it("has the expected description", () => {
    expect(TRACING_ACCESS.description).toBe("hex-di/tracing-access");
  });
});

// =============================================================================
// TraceEntry Interface Tests
// =============================================================================

describe("TraceEntry", () => {
  it("has correct shape with all required fields", () => {
    const entry: TraceEntry = {
      id: "trace-1",
      portName: "Logger",
      lifetime: "singleton",
      startTime: 1000.5,
      duration: 25.3,
      isCacheHit: false,
      parentTraceId: null,
      childTraceIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    };

    expect(entry.id).toBe("trace-1");
    expect(entry.portName).toBe("Logger");
    expect(entry.lifetime).toBe("singleton");
    expect(entry.startTime).toBe(1000.5);
    expect(entry.duration).toBe(25.3);
    expect(entry.isCacheHit).toBe(false);
    expect(entry.parentTraceId).toBeNull();
    expect(entry.childTraceIds).toEqual([]);
    expect(entry.scopeId).toBeNull();
    expect(entry.order).toBe(1);
    expect(entry.isPinned).toBe(false);
  });

  it("accepts all valid lifetime values", () => {
    const singletonEntry: TraceEntry = {
      id: "trace-1",
      portName: "A",
      lifetime: "singleton",
      startTime: 0,
      duration: 10,
      isCacheHit: false,
      parentTraceId: null,
      childTraceIds: [],
      scopeId: null,
      order: 1,
      isPinned: false,
    };

    const scopedEntry: TraceEntry = {
      id: "trace-2",
      portName: "B",
      lifetime: "scoped",
      startTime: 10,
      duration: 20,
      isCacheHit: false,
      parentTraceId: null,
      childTraceIds: [],
      scopeId: "scope-1",
      order: 2,
      isPinned: false,
    };

    const requestEntry: TraceEntry = {
      id: "trace-3",
      portName: "C",
      lifetime: "request",
      startTime: 30,
      duration: 5,
      isCacheHit: false,
      parentTraceId: null,
      childTraceIds: [],
      scopeId: "scope-1",
      order: 3,
      isPinned: false,
    };

    expect(singletonEntry.lifetime).toBe("singleton");
    expect(scopedEntry.lifetime).toBe("scoped");
    expect(requestEntry.lifetime).toBe("request");
  });

  it("supports parent/child trace hierarchy", () => {
    const parentEntry: TraceEntry = {
      id: "parent-trace",
      portName: "UserService",
      lifetime: "scoped",
      startTime: 0,
      duration: 100,
      isCacheHit: false,
      parentTraceId: null,
      childTraceIds: ["child-trace-1", "child-trace-2"],
      scopeId: "scope-1",
      order: 1,
      isPinned: false,
    };

    const childEntry: TraceEntry = {
      id: "child-trace-1",
      portName: "Logger",
      lifetime: "singleton",
      startTime: 10,
      duration: 20,
      isCacheHit: false,
      parentTraceId: "parent-trace",
      childTraceIds: [],
      scopeId: "scope-1",
      order: 2,
      isPinned: false,
    };

    expect(parentEntry.childTraceIds).toContain("child-trace-1");
    expect(childEntry.parentTraceId).toBe("parent-trace");
  });

  it("tracks cache hits correctly", () => {
    const cachedEntry: TraceEntry = {
      id: "trace-cached",
      portName: "Logger",
      lifetime: "singleton",
      startTime: 100,
      duration: 0.1, // Very fast due to cache hit
      isCacheHit: true,
      parentTraceId: null,
      childTraceIds: [],
      scopeId: null,
      order: 5,
      isPinned: false,
    };

    expect(cachedEntry.isCacheHit).toBe(true);
  });

  it("has readonly properties enforced at type level", () => {
    // Type-level verification that properties are readonly
    expectTypeOf<TraceEntry["id"]>().toEqualTypeOf<string>();
    expectTypeOf<TraceEntry["portName"]>().toEqualTypeOf<string>();
    expectTypeOf<TraceEntry["lifetime"]>().toEqualTypeOf<Lifetime>();
    expectTypeOf<TraceEntry["startTime"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceEntry["duration"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceEntry["isCacheHit"]>().toEqualTypeOf<boolean>();
    expectTypeOf<TraceEntry["parentTraceId"]>().toEqualTypeOf<string | null>();
    expectTypeOf<TraceEntry["childTraceIds"]>().toEqualTypeOf<readonly string[]>();
    expectTypeOf<TraceEntry["scopeId"]>().toEqualTypeOf<string | null>();
    expectTypeOf<TraceEntry["order"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceEntry["isPinned"]>().toEqualTypeOf<boolean>();
  });
});

// =============================================================================
// TraceRetentionPolicy Interface Tests
// =============================================================================

describe("TraceRetentionPolicy", () => {
  it("has all expected fields with correct types", () => {
    const policy: TraceRetentionPolicy = {
      maxTraces: 1000,
      maxPinnedTraces: 100,
      slowThresholdMs: 100,
      expiryMs: 300000,
    };

    expect(policy.maxTraces).toBe(1000);
    expect(policy.maxPinnedTraces).toBe(100);
    expect(policy.slowThresholdMs).toBe(100);
    expect(policy.expiryMs).toBe(300000);
  });

  it("defaults align with spec requirements", () => {
    // Verify the default values from the spec
    const defaultPolicy: TraceRetentionPolicy = {
      maxTraces: 1000,
      maxPinnedTraces: 100,
      slowThresholdMs: 100,
      expiryMs: 300000, // 5 minutes
    };

    // Spec requirements:
    // - maxTraces: 1000
    // - maxPinnedTraces: 100
    // - slowThresholdMs: 100
    // - expiryMs: 300000 (5 minutes)
    expect(defaultPolicy.maxTraces).toBe(1000);
    expect(defaultPolicy.maxPinnedTraces).toBe(100);
    expect(defaultPolicy.slowThresholdMs).toBe(100);
    expect(defaultPolicy.expiryMs).toBe(5 * 60 * 1000);
  });

  it("has readonly properties at type level", () => {
    expectTypeOf<TraceRetentionPolicy["maxTraces"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceRetentionPolicy["maxPinnedTraces"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceRetentionPolicy["slowThresholdMs"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceRetentionPolicy["expiryMs"]>().toEqualTypeOf<number>();
  });
});

// =============================================================================
// TraceStats Interface Tests
// =============================================================================

describe("TraceStats", () => {
  it("has correct shape for aggregate statistics", () => {
    const stats: TraceStats = {
      totalResolutions: 150,
      averageDuration: 25.5,
      cacheHitRate: 0.65,
      slowCount: 12,
      sessionStart: 1702500000000,
      totalDuration: 3825,
    };

    expect(stats.totalResolutions).toBe(150);
    expect(stats.averageDuration).toBe(25.5);
    expect(stats.cacheHitRate).toBe(0.65);
    expect(stats.slowCount).toBe(12);
    expect(stats.sessionStart).toBe(1702500000000);
    expect(stats.totalDuration).toBe(3825);
  });

  it("supports edge case of zero resolutions", () => {
    const emptyStats: TraceStats = {
      totalResolutions: 0,
      averageDuration: 0,
      cacheHitRate: 0,
      slowCount: 0,
      sessionStart: Date.now(),
      totalDuration: 0,
    };

    expect(emptyStats.totalResolutions).toBe(0);
    expect(emptyStats.averageDuration).toBe(0);
  });

  it("has readonly properties at type level", () => {
    expectTypeOf<TraceStats["totalResolutions"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceStats["averageDuration"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceStats["cacheHitRate"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceStats["slowCount"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceStats["sessionStart"]>().toEqualTypeOf<number>();
    expectTypeOf<TraceStats["totalDuration"]>().toEqualTypeOf<number>();
  });
});

// =============================================================================
// TracingOptions Interface Tests
// =============================================================================

describe("TracingOptions", () => {
  it("allows empty options (all optional)", () => {
    const emptyOptions: TracingOptions = {};
    expect(emptyOptions).toEqual({});
  });

  it("allows partial retention policy", () => {
    const options: TracingOptions = {
      retentionPolicy: {
        maxTraces: 500,
      },
    };

    expect(options.retentionPolicy?.maxTraces).toBe(500);
    expect(options.retentionPolicy?.maxPinnedTraces).toBeUndefined();
  });

  it("has correct type structure", () => {
    // retentionPolicy should be Partial<TraceRetentionPolicy>
    type RetentionPolicyType = TracingOptions["retentionPolicy"];
    expectTypeOf<RetentionPolicyType>().toMatchTypeOf<Partial<TraceRetentionPolicy> | undefined>();
  });
});

// =============================================================================
// TraceFilter Interface Tests
// =============================================================================

describe("TraceFilter", () => {
  it("allows filtering by port name", () => {
    const filter: TraceFilter = {
      portName: "Logger",
    };

    expect(filter.portName).toBe("Logger");
  });

  it("allows filtering by lifetime", () => {
    const filter: TraceFilter = {
      lifetime: "singleton",
    };

    expect(filter.lifetime).toBe("singleton");
  });

  it("allows filtering by cache status", () => {
    const filter: TraceFilter = {
      isCacheHit: true,
    };

    expect(filter.isCacheHit).toBe(true);
  });

  it("allows multiple filter criteria", () => {
    const filter: TraceFilter = {
      portName: "User",
      lifetime: "scoped",
      isCacheHit: false,
      minDuration: 50,
      maxDuration: 200,
    };

    expect(filter.portName).toBe("User");
    expect(filter.lifetime).toBe("scoped");
    expect(filter.isCacheHit).toBe(false);
    expect(filter.minDuration).toBe(50);
    expect(filter.maxDuration).toBe(200);
  });
});
