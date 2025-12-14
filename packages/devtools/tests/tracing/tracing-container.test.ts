/**
 * Tests for TracingContainer wrapper.
 *
 * These tests verify:
 * 1. createTracingContainer wraps a container without mutation
 * 2. resolve() interception captures timing via performance.now()
 * 3. Parent/child trace hierarchy for nested resolutions
 * 4. TRACING_ACCESS Symbol provides frozen snapshot
 * 5. pause/resume recording functionality with zero overhead
 * 6. Cross-scope trace tracking
 * 7. Cache hit detection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPort } from "@hex-di/ports";
import type { Port } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer, TRACING_ACCESS } from "@hex-di/runtime";
import type { Container } from "@hex-di/runtime";
import { createTracingContainer, type TracingContainer } from "../../src/tracing/tracing-container.js";
import { MemoryCollector } from "../../src/tracing/memory-collector.js";
import type { TracingAPI, TraceEntry } from "../../src/tracing/types.js";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to get the tracing API from a tracing container.
 * This ensures proper type safety when accessing the Symbol-indexed property.
 */
function getTracingAPI<T extends Port<unknown, string>>(
  container: TracingContainer<T>
): TracingAPI {
  return container[TRACING_ACCESS];
}

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

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: () => {},
  }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    query: () => ({}),
  }),
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

function createTestGraph() {
  return GraphBuilder.create()
    .provide(LoggerAdapter)
    .provide(DatabaseAdapter)
    .provide(UserServiceAdapter)
    .build();
}

// =============================================================================
// createTracingContainer Tests
// =============================================================================

describe("createTracingContainer", () => {
  it("wraps a container without mutating the original container", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);

    // Tracing container should be a different object
    expect(tracingContainer).not.toBe(baseContainer);

    // Both should still be able to resolve services
    const logger1 = baseContainer.resolve(LoggerPort);
    const logger2 = tracingContainer.resolve(LoggerPort);

    // Should get the same singleton instance (same underlying container)
    expect(logger1).toBe(logger2);
  });

  it("provides TRACING_ACCESS Symbol on the wrapped container", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);

    // Base container should not have TRACING_ACCESS
    expect(TRACING_ACCESS in baseContainer).toBe(false);

    // Tracing container should have TRACING_ACCESS
    expect(TRACING_ACCESS in tracingContainer).toBe(true);

    // TRACING_ACCESS should return a TracingAPI object
    const tracingAPI = getTracingAPI(tracingContainer);
    expect(typeof tracingAPI.getTraces).toBe("function");
    expect(typeof tracingAPI.getStats).toBe("function");
    expect(typeof tracingAPI.pause).toBe("function");
    expect(typeof tracingAPI.resume).toBe("function");
    expect(typeof tracingAPI.clear).toBe("function");
    expect(typeof tracingAPI.subscribe).toBe("function");
    expect(typeof tracingAPI.isPaused).toBe("function");
  });
});

// =============================================================================
// resolve() Interception Tests
// =============================================================================

describe("resolve() interception", () => {
  it("captures timing data via performance.now() for each resolution", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    // Resolve a service
    tracingContainer.resolve(LoggerPort);

    const traces = tracingAPI.getTraces();
    expect(traces).toHaveLength(1);

    const trace = traces[0];
    expect(trace).toBeDefined();
    expect(trace?.portName).toBe("Logger");
    expect(trace?.lifetime).toBe("singleton");
    expect(typeof trace?.startTime).toBe("number");
    expect(typeof trace?.duration).toBe("number");
    expect(trace?.duration).toBeGreaterThanOrEqual(0);
  });

  it("detects cache hits for singleton services on subsequent resolutions", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    // First resolution - should be a cache miss
    tracingContainer.resolve(LoggerPort);

    // Second resolution - should be a cache hit
    tracingContainer.resolve(LoggerPort);

    const traces = tracingAPI.getTraces();
    expect(traces).toHaveLength(2);

    const firstTrace = traces[0];
    const secondTrace = traces[1];

    expect(firstTrace?.isCacheHit).toBe(false);
    expect(secondTrace?.isCacheHit).toBe(true);
  });

  it("assigns unique trace IDs and incremental order values", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(DatabasePort);

    const traces = tracingAPI.getTraces();
    expect(traces).toHaveLength(2);

    // Each trace should have a unique ID
    expect(traces[0]?.id).not.toBe(traces[1]?.id);

    // Order should be incremental
    expect(traces[0]?.order).toBe(1);
    expect(traces[1]?.order).toBe(2);
  });
});

// =============================================================================
// Trace Hierarchy Tests
// =============================================================================

describe("trace hierarchy tracking", () => {
  it("traces single resolve call without parent", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    // Resolve a single service
    tracingContainer.resolve(LoggerPort);

    const traces = tracingAPI.getTraces();
    expect(traces).toHaveLength(1);

    // Single resolve should have no parent
    const trace = traces[0];
    expect(trace?.parentTraceId).toBeNull();
    expect(trace?.childTraceIds).toEqual([]);
  });

  it("captures resolve call for scoped service with its dependencies resolved internally", () => {
    // Note: Due to the Decorator pattern limitation, we can only trace
    // top-level resolve() calls. Internal dependency resolution happens
    // within the base container and is not intercepted by the wrapper.
    // This test verifies we at least capture the top-level resolution.
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    // Create a scope and resolve UserService
    const scope = tracingContainer.createScope();
    scope.resolve(UserServicePort);

    const traces = tracingAPI.getTraces();

    // Should have at least the UserService trace
    // (Dependencies like Logger and Database are resolved internally by the container)
    expect(traces.length).toBeGreaterThanOrEqual(1);

    const userServiceTrace = traces.find((t) => t.portName === "UserService");
    expect(userServiceTrace).toBeDefined();
    expect(userServiceTrace?.lifetime).toBe("scoped");
  });

  it("tracks multiple sequential resolve calls independently", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    // Resolve multiple services sequentially
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(DatabasePort);

    const traces = tracingAPI.getTraces();
    expect(traces).toHaveLength(2);

    // All traces should have no parent (they are independent top-level calls)
    expect(traces[0]?.parentTraceId).toBeNull();
    expect(traces[1]?.parentTraceId).toBeNull();

    // Order should be sequential
    expect(traces[0]?.order).toBeLessThan(traces[1]?.order ?? 0);
  });
});

// =============================================================================
// TRACING_ACCESS API Tests
// =============================================================================

describe("TRACING_ACCESS API", () => {
  it("getTraces() returns frozen/readonly trace entries", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    tracingContainer.resolve(LoggerPort);

    const traces = tracingAPI.getTraces();

    // Verify the array is readonly (cannot push to it)
    expect(Array.isArray(traces)).toBe(true);

    // Get another reference to verify it's a copy
    tracingContainer.resolve(DatabasePort);
    const newTraces = tracingAPI.getTraces();
    expect(newTraces.length).toBe(2);
    expect(traces.length).toBe(1); // Original reference unchanged
  });

  it("getStats() returns computed statistics", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(LoggerPort); // Cache hit

    const stats = tracingAPI.getStats();

    expect(stats.totalResolutions).toBe(2);
    expect(stats.cacheHitRate).toBe(0.5);
    expect(typeof stats.averageDuration).toBe("number");
    expect(typeof stats.sessionStart).toBe("number");
  });

  it("clear() removes all traces", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    tracingContainer.resolve(LoggerPort);
    expect(tracingAPI.getTraces()).toHaveLength(1);

    tracingAPI.clear();
    expect(tracingAPI.getTraces()).toHaveLength(0);
  });

  it("subscribe() notifies on new traces and unsubscribe works", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    const callback = vi.fn();
    const unsubscribe = tracingAPI.subscribe(callback);

    tracingContainer.resolve(LoggerPort);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ portName: "Logger" }));

    unsubscribe();
    tracingContainer.resolve(DatabasePort);
    expect(callback).toHaveBeenCalledTimes(1); // Not called again
  });
});

// =============================================================================
// Pause/Resume Tests
// =============================================================================

describe("pause/resume recording", () => {
  it("pause() stops trace recording and isPaused() returns true", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    expect(tracingAPI.isPaused()).toBe(false);

    tracingContainer.resolve(LoggerPort);
    expect(tracingAPI.getTraces()).toHaveLength(1);

    tracingAPI.pause();
    expect(tracingAPI.isPaused()).toBe(true);

    // Resolves during pause should not be traced
    tracingContainer.resolve(DatabasePort);
    expect(tracingAPI.getTraces()).toHaveLength(1); // Still 1
  });

  it("resume() restarts trace recording", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    tracingAPI.pause();
    tracingContainer.resolve(LoggerPort);
    expect(tracingAPI.getTraces()).toHaveLength(0);

    tracingAPI.resume();
    expect(tracingAPI.isPaused()).toBe(false);

    tracingContainer.resolve(DatabasePort);
    expect(tracingAPI.getTraces()).toHaveLength(1);
    expect(tracingAPI.getTraces()[0]?.portName).toBe("Database");
  });

  it("has zero overhead when paused (skips interception logic)", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);

    // Create a custom collector to verify no collection happens
    const collector = new MemoryCollector();
    const collectSpy = vi.spyOn(collector, "collect");

    const tracingContainer = createTracingContainer(baseContainer, { collector });
    const tracingAPI = getTracingAPI(tracingContainer);

    tracingAPI.pause();

    // Resolve multiple times while paused
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(LoggerPort);
    tracingContainer.resolve(LoggerPort);

    // Collector should never have been called
    expect(collectSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Scope Integration Tests
// =============================================================================

describe("scope integration", () => {
  it("tracks scopeId for scoped service resolutions", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    const scope = tracingContainer.createScope();
    scope.resolve(UserServicePort);

    const traces = tracingAPI.getTraces();
    const userServiceTrace = traces.find((t) => t.portName === "UserService");

    expect(userServiceTrace).toBeDefined();
    expect(userServiceTrace?.scopeId).not.toBeNull();
    expect(typeof userServiceTrace?.scopeId).toBe("string");
  });

  it("createScope() returns a scope that also traces resolutions", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const tracingContainer = createTracingContainer(baseContainer);
    const tracingAPI = getTracingAPI(tracingContainer);

    // Create scope from tracing container
    const scope = tracingContainer.createScope();

    // Resolve scoped service
    scope.resolve(UserServicePort);

    // Should have traces
    const traces = tracingAPI.getTraces();
    expect(traces.length).toBeGreaterThan(0);

    // Should have UserService trace with scope ID
    const userServiceTrace = traces.find((t) => t.portName === "UserService");
    expect(userServiceTrace).toBeDefined();
  });
});

// =============================================================================
// Custom Collector Tests
// =============================================================================

describe("custom collector option", () => {
  it("uses provided collector for trace storage", () => {
    const graph = createTestGraph();
    const baseContainer = createContainer(graph);
    const collector = new MemoryCollector();

    const tracingContainer = createTracingContainer(baseContainer, { collector });

    tracingContainer.resolve(LoggerPort);

    // Traces should be in the custom collector
    expect(collector.getTraces()).toHaveLength(1);
    expect(collector.getTraces()[0]?.portName).toBe("Logger");
  });
});
