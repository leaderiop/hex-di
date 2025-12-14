/**
 * Integration tests for Resolution Tracing feature.
 *
 * These tests verify end-to-end workflows and integration between components:
 * 1. End-to-end: createTracingContainer -> resolve -> data flow
 * 2. Integration: filter application across trace data
 * 3. Integration: pause/resume affects recording state
 * 4. Integration: pinned traces behavior (via MemoryCollector API)
 * 5. Integration: export functionality works for all formats
 *
 * These tests complement the unit tests from Task Groups 1-10 by
 * verifying that components work together correctly.
 */

import { describe, it, expect } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, TRACING_ACCESS } from "@hex-di/runtime";
import {
  createTracingContainer,
  MemoryCollector,
  type TraceEntry,
} from "../../src/tracing/index.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface UserService {
  getUser(id: string): { id: string; name: string };
}

interface CacheService {
  get(key: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const CacheServicePort = createPort<"CacheService", CacheService>(
  "CacheService"
);

function createTestGraph() {
  const LoggerAdapter = createAdapter({
    provides: LoggerPort,
    requires: [],
    lifetime: "singleton",
    factory: () => ({ log: () => {} }),
  });

  const DatabaseAdapter = createAdapter({
    provides: DatabasePort,
    requires: [LoggerPort],
    lifetime: "singleton",
    factory: () => ({ query: () => ({}) }),
  });

  const UserServiceAdapter = createAdapter({
    provides: UserServicePort,
    requires: [LoggerPort, DatabasePort],
    lifetime: "scoped",
    factory: (deps) => ({
      getUser: (id: string) => {
        deps.Logger.log(`Getting user ${id}`);
        return { id, name: "Test User" };
      },
    }),
  });

  const CacheServiceAdapter = createAdapter({
    provides: CacheServicePort,
    requires: [],
    lifetime: "request",
    factory: () => ({ get: () => null }),
  });

  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(UserServiceAdapter)
    .provide(CacheServiceAdapter)
    .build();
}

// =============================================================================
// End-to-End Data Flow Tests
// =============================================================================

describe("Resolution Tracing End-to-End Data Flow", () => {
  it("captures trace data through createTracingContainer -> resolve -> getTraces", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Perform resolutions
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(DatabasePort);

    // Verify trace data is captured and accessible
    const traces = tracingAPI.getTraces();
    expect(traces.length).toBeGreaterThanOrEqual(2);

    // Verify trace structure
    const loggerTrace = traces.find((t) => t.portName === "Logger");
    expect(loggerTrace).toBeDefined();
    expect(loggerTrace?.lifetime).toBe("singleton");
    expect(typeof loggerTrace?.duration).toBe("number");
    expect(typeof loggerTrace?.startTime).toBe("number");

    // Verify stats computation
    const stats = tracingAPI.getStats();
    expect(stats.totalResolutions).toBe(traces.length);
    expect(typeof stats.averageDuration).toBe("number");
  });

  it("flows data through subscription mechanism for real-time updates", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    const receivedTraces: TraceEntry[] = [];
    const unsubscribe = tracingAPI.subscribe((entry) => {
      receivedTraces.push(entry);
    });

    // Perform resolutions
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(CacheServicePort);

    // Verify subscription received traces
    expect(receivedTraces.length).toBeGreaterThanOrEqual(2);
    expect(receivedTraces.some((t) => t.portName === "Logger")).toBe(true);
    expect(receivedTraces.some((t) => t.portName === "CacheService")).toBe(
      true
    );

    unsubscribe();
  });
});

// =============================================================================
// Filter Integration Tests
// =============================================================================

describe("Resolution Tracing Filter Integration", () => {
  it("applies lifetime filter correctly across trace data", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Resolve services of different lifetimes
    tracingContainer.resolve(LoggerPort); // singleton
    const scope = tracingContainer.createScope();
    scope.resolve(UserServicePort); // scoped
    scope.resolve(CacheServicePort); // request

    const allTraces = tracingAPI.getTraces();

    // Filter by singleton
    const singletonTraces = tracingAPI.getTraces({ lifetime: "singleton" });
    expect(
      singletonTraces.every((t) => t.lifetime === "singleton")
    ).toBe(true);
    expect(singletonTraces.length).toBeLessThan(allTraces.length);

    // Filter by scoped
    const scopedTraces = tracingAPI.getTraces({ lifetime: "scoped" });
    expect(scopedTraces.every((t) => t.lifetime === "scoped")).toBe(true);

    // Filter by request
    const requestTraces = tracingAPI.getTraces({ lifetime: "request" });
    expect(requestTraces.every((t) => t.lifetime === "request")).toBe(true);
  });

  it("applies cache status filter correctly", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // First resolution - cache miss
    tracingContainer.resolve(LoggerPort);

    // Second resolution - cache hit
    tracingContainer.resolve(LoggerPort);

    const allTraces = tracingAPI.getTraces();
    expect(allTraces.length).toBe(2);

    // Filter for cache hits
    const cachedTraces = tracingAPI.getTraces({ isCacheHit: true });
    expect(cachedTraces.length).toBe(1);
    expect(cachedTraces[0]?.isCacheHit).toBe(true);

    // Filter for cache misses
    const freshTraces = tracingAPI.getTraces({ isCacheHit: false });
    expect(freshTraces.length).toBe(1);
    expect(freshTraces[0]?.isCacheHit).toBe(false);
  });

  it("combines multiple filter criteria with AND logic", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Resolve various services
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(LoggerPort); // Cache hit
    tracingContainer.resolve(DatabasePort);

    // Filter by lifetime AND cache status
    const singletonCacheHits = tracingAPI.getTraces({
      lifetime: "singleton",
      isCacheHit: true,
    });

    expect(
      singletonCacheHits.every(
        (t) => t.lifetime === "singleton" && t.isCacheHit
      )
    ).toBe(true);
  });
});

// =============================================================================
// Pause/Resume Integration Tests
// =============================================================================

describe("Resolution Tracing Pause/Resume Integration", () => {
  it("pause stops recording and resume restarts it", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Record one trace
    tracingContainer.resolve(LoggerPort);
    expect(tracingAPI.getTraces()).toHaveLength(1);

    // Pause recording
    tracingAPI.pause();
    expect(tracingAPI.isPaused()).toBe(true);

    // Resolutions during pause are not recorded
    tracingContainer.resolve(DatabasePort);
    expect(tracingAPI.getTraces()).toHaveLength(1);

    // Resume recording
    tracingAPI.resume();
    expect(tracingAPI.isPaused()).toBe(false);

    // Resolutions after resume are recorded
    tracingContainer.resolve(CacheServicePort);
    expect(tracingAPI.getTraces()).toHaveLength(2);
  });

  it("pause state is independent per container", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);

    const tracingContainer1 = createTracingContainer(baseContainer);
    const tracingContainer2 = createTracingContainer(baseContainer);

    const api1 = tracingContainer1[TRACING_ACCESS];
    const api2 = tracingContainer2[TRACING_ACCESS];

    // Pause container 1
    api1.pause();

    // Container 1 should be paused
    expect(api1.isPaused()).toBe(true);

    // Container 2 should still be recording
    expect(api2.isPaused()).toBe(false);

    // Resolve in container 2 should record
    tracingContainer2.resolve(LoggerPort);
    expect(api2.getTraces()).toHaveLength(1);

    // Resolve in container 1 should not record
    tracingContainer1.resolve(LoggerPort);
    expect(api1.getTraces()).toHaveLength(0);
  });
});

// =============================================================================
// Pinned Traces Integration Tests (using MemoryCollector API directly)
// =============================================================================

describe("Resolution Tracing Pinned Traces Integration", () => {
  it("auto-pins traces that exceed slow threshold via collector", () => {
    const collector = new MemoryCollector({
      maxTraces: 10,
      maxPinnedTraces: 5,
      slowThresholdMs: 0, // 0ms threshold means all traces are pinned
    });

    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer, {
      collector,
    });
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Resolve services (will be auto-pinned due to 0ms threshold)
    tracingContainer.resolve(LoggerPort);

    const traces = tracingAPI.getTraces();
    expect(traces.length).toBeGreaterThan(0);

    // Verify auto-pinning (0ms threshold means duration >= 0 is slow)
    const pinnedTraces = traces.filter((t) => t.isPinned);
    expect(pinnedTraces.length).toBeGreaterThan(0);
  });

  it("collector pin/unpin updates trace state correctly", () => {
    const collector = new MemoryCollector({
      slowThresholdMs: 10000, // High threshold to avoid auto-pinning
    });

    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer, {
      collector,
    });

    // Resolve a service
    tracingContainer.resolve(LoggerPort);

    const traces = collector.getTraces();
    const traceId = traces[0]?.id;
    expect(traceId).toBeDefined();

    // Initially not pinned
    expect(traces[0]?.isPinned).toBe(false);

    // Pin via collector
    collector.pin(traceId!);

    // Verify pinned state
    const updatedTraces = collector.getTraces();
    const pinnedTrace = updatedTraces.find((t) => t.id === traceId);
    expect(pinnedTrace?.isPinned).toBe(true);

    // Unpin via collector
    collector.unpin(traceId!);

    // Verify unpinned state
    const finalTraces = collector.getTraces();
    const unpinnedTrace = finalTraces.find((t) => t.id === traceId);
    expect(unpinnedTrace?.isPinned).toBe(false);
  });

  it("pinned traces survive FIFO eviction", () => {
    const collector = new MemoryCollector({
      maxTraces: 5,
      maxPinnedTraces: 3,
      slowThresholdMs: 10000, // High threshold to manually control pinning
    });

    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer, {
      collector,
    });

    // Resolve first service and pin it via collector
    tracingContainer.resolve(LoggerPort);
    const firstTraces = collector.getTraces();
    expect(firstTraces.length).toBe(1);
    const firstTraceId = firstTraces[0]!.id;
    collector.pin(firstTraceId);

    // Verify it's pinned
    const afterPin = collector.getTraces();
    expect(afterPin.find((t) => t.id === firstTraceId)?.isPinned).toBe(true);

    // Resolve more services to trigger eviction (need to exceed maxTraces)
    tracingContainer.resolve(DatabasePort);
    tracingContainer.resolve(CacheServicePort);
    tracingContainer.resolve(LoggerPort); // Cache hit
    tracingContainer.resolve(DatabasePort); // Cache hit
    tracingContainer.resolve(CacheServicePort);

    // Pinned trace should still exist (protected from FIFO)
    const finalTraces = collector.getTraces();
    const pinnedTrace = finalTraces.find((t) => t.id === firstTraceId);

    // The pinned trace should be preserved
    expect(pinnedTrace).toBeDefined();
    expect(pinnedTrace?.isPinned).toBe(true);
  });
});

// =============================================================================
// Export Functionality Integration Tests
// =============================================================================

describe("Resolution Tracing Export Integration", () => {
  it("provides trace data in correct format for JSON export", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Generate some traces
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(DatabasePort);

    const traces = tracingAPI.getTraces();
    const stats = tracingAPI.getStats();

    // Verify data structure is JSON-serializable
    const jsonData = JSON.stringify({ traces, stats });
    const parsed = JSON.parse(jsonData);

    expect(parsed.traces).toHaveLength(traces.length);
    expect(parsed.stats.totalResolutions).toBe(stats.totalResolutions);
  });

  it("provides trace data with all required fields for CSV export", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Generate traces
    tracingContainer.resolve(LoggerPort);

    const traces = tracingAPI.getTraces();
    const trace = traces[0];

    // Verify all CSV fields are present
    expect(trace).toHaveProperty("id");
    expect(trace).toHaveProperty("portName");
    expect(trace).toHaveProperty("lifetime");
    expect(trace).toHaveProperty("startTime");
    expect(trace).toHaveProperty("duration");
    expect(trace).toHaveProperty("isCacheHit");
    expect(trace).toHaveProperty("parentTraceId");
    expect(trace).toHaveProperty("scopeId");
    expect(trace).toHaveProperty("order");
    expect(trace).toHaveProperty("isPinned");
  });

  it("provides summary data for clipboard export", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Generate traces
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(LoggerPort); // Cache hit

    const stats = tracingAPI.getStats();

    // Verify summary data is complete
    expect(typeof stats.totalResolutions).toBe("number");
    expect(typeof stats.averageDuration).toBe("number");
    expect(typeof stats.cacheHitRate).toBe("number");
    expect(typeof stats.slowCount).toBe("number");
    expect(typeof stats.totalDuration).toBe("number");
    expect(stats.cacheHitRate).toBe(0.5); // 1 cache hit out of 2 resolutions
  });
});

// =============================================================================
// Scope Integration Tests
// =============================================================================

describe("Resolution Tracing Scope Integration", () => {
  it("tracks scoped service resolutions with scope context", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Create scope and resolve scoped service
    const scope = tracingContainer.createScope();
    scope.resolve(UserServicePort);

    const traces = tracingAPI.getTraces();
    const userServiceTrace = traces.find((t) => t.portName === "UserService");

    expect(userServiceTrace).toBeDefined();
    expect(userServiceTrace?.scopeId).not.toBeNull();
    expect(userServiceTrace?.lifetime).toBe("scoped");
  });

  it("differentiates traces from different scopes", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = tracingContainer[TRACING_ACCESS];

    // Create two scopes
    const scope1 = tracingContainer.createScope();
    const scope2 = tracingContainer.createScope();

    // Resolve same service in different scopes
    scope1.resolve(UserServicePort);
    scope2.resolve(UserServicePort);

    const traces = tracingAPI.getTraces();
    const userServiceTraces = traces.filter(
      (t) => t.portName === "UserService"
    );

    // Should have two traces (one per scope)
    expect(userServiceTraces.length).toBe(2);

    // Should have different scope IDs
    const scopeIds = userServiceTraces.map((t) => t.scopeId);
    expect(scopeIds[0]).not.toBe(scopeIds[1]);
  });
});
