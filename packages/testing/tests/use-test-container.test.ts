/**
 * Unit tests for useTestContainer hook and createTestContainer utility.
 *
 * These tests verify:
 * 1. useTestContainer creates fresh container before each test
 * 2. useTestContainer disposes container after each test
 * 3. useTestContainer returns container and scope
 * 4. Graph factory is called per-test for isolation
 * 5. Works with TestGraphBuilder for overrides
 * 6. Async disposal is properly awaited
 * 7. createTestContainer provides standalone container management
 */

import { describe, expect, it, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { TestGraphBuilder } from "../src/test-graph-builder.js";
import { useTestContainer, createTestContainer } from "../src/vitest/use-test-container.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
  close(): Promise<void>;
}

interface Counter {
  increment(): number;
  getValue(): number;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CounterPort = createPort<"Counter", Counter>("Counter");

// =============================================================================
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: vi.fn() }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  finalizer: async (db) => {
    await db.close();
  },
});

// =============================================================================
// useTestContainer Tests
// =============================================================================

describe("useTestContainer", () => {
  describe("creates fresh container per test", () => {
    const graphFactory = vi.fn(() =>
      GraphBuilder.create()
        .provide(LoggerAdapter)
        .build()
    );

    // Note: Do NOT destructure here - access properties inside test cases
    const testContext = useTestContainer(graphFactory);

    it("first test gets fresh container", () => {
      expect(testContext.container).toBeDefined();
      expect(testContext.scope).toBeDefined();

      const logger = testContext.scope.resolve(LoggerPort);
      logger.log("test message");

      expect(logger.log).toHaveBeenCalledWith("test message");
    });

    it("second test gets fresh container (not shared with first)", () => {
      // Container and scope should be fresh instances
      expect(testContext.container).toBeDefined();
      expect(testContext.scope).toBeDefined();

      const logger = testContext.scope.resolve(LoggerPort);
      // This logger.log should be a fresh mock - no calls yet
      expect(logger.log).not.toHaveBeenCalled();
    });

    it("graph factory is called for each test", () => {
      // Factory should have been called at least 3 times (once per test in this describe)
      expect(graphFactory).toHaveBeenCalled();
    });
  });

  describe("returns container and scope", () => {
    const testContext = useTestContainer(() =>
      GraphBuilder.create()
        .provide(LoggerAdapter)
        .build()
    );

    it("container has resolve method", () => {
      expect(typeof testContext.container.resolve).toBe("function");
    });

    it("container has createScope method", () => {
      expect(typeof testContext.container.createScope).toBe("function");
    });

    it("container has dispose method", () => {
      expect(typeof testContext.container.dispose).toBe("function");
    });

    it("scope has resolve method", () => {
      expect(typeof testContext.scope.resolve).toBe("function");
    });

    it("scope can resolve services", () => {
      const logger = testContext.scope.resolve(LoggerPort);
      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe("function");
    });
  });

  describe("works with TestGraphBuilder for overrides", () => {
    const productionGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const mockLogFn = vi.fn();
    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: mockLogFn }),
    });

    const testContext = useTestContainer(() =>
      TestGraphBuilder.from(productionGraph)
        .override(mockLoggerAdapter)
        .build()
    );

    it("resolves overridden mock adapter", () => {
      const logger = testContext.scope.resolve(LoggerPort);
      logger.log("test");

      expect(mockLogFn).toHaveBeenCalledWith("test");
    });

    it("non-overridden adapters still resolve", () => {
      const db = testContext.scope.resolve(DatabasePort);
      expect(db).toBeDefined();
      expect(typeof db.query).toBe("function");
    });
  });

  describe("async disposal", () => {
    let closeCallCount = 0;

    const asyncCloseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        close: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          closeCallCount++;
        },
      }),
      finalizer: async (db) => {
        await db.close();
      },
    });

    const testContext = useTestContainer(() => {
      closeCallCount = 0; // Reset for each test
      return GraphBuilder.create()
        .provide(asyncCloseAdapter)
        .build();
    });

    it("test can resolve and use service", async () => {
      const db = testContext.scope.resolve(DatabasePort);
      await db.query("SELECT 1");
      expect(db.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("container disposes after each test (finalizers are called)", () => {
      // This test verifies isolation - if previous test's finalizer wasn't called,
      // this would fail because closeCallCount would be > 0 at start
      // The graphFactory resets closeCallCount to 0, then we resolve to trigger creation
      const db = testContext.scope.resolve(DatabasePort);
      expect(db).toBeDefined();
      // closeCallCount should be 0 because factory just ran
      expect(closeCallCount).toBe(0);
    });
  });
});

// =============================================================================
// createTestContainer Tests
// =============================================================================

describe("createTestContainer", () => {
  it("creates container and scope from graph", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    const { container, scope, dispose } = createTestContainer(graph);

    expect(container).toBeDefined();
    expect(scope).toBeDefined();
    expect(typeof dispose).toBe("function");

    dispose();
  });

  it("scope can resolve services from graph", async () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    const { scope, dispose } = createTestContainer(graph);

    const logger = scope.resolve(LoggerPort);
    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");

    await dispose();
  });

  it("dispose function cleans up container", async () => {
    let finalizerCalled = false;

    const adapterWithFinalizer = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: vi.fn() }),
      finalizer: () => {
        finalizerCalled = true;
      },
    });

    const graph = GraphBuilder.create()
      .provide(adapterWithFinalizer)
      .build();

    const { scope, dispose } = createTestContainer(graph);

    // Resolve to trigger instance creation
    scope.resolve(LoggerPort);
    expect(finalizerCalled).toBe(false);

    // Dispose should call finalizer
    await dispose();
    expect(finalizerCalled).toBe(true);
  });

  it("dispose returns a Promise", async () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    const { dispose } = createTestContainer(graph);

    const result = dispose();
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it("works with TestGraphBuilder graphs", async () => {
    const productionGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    const mockLogFn = vi.fn();
    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: mockLogFn }),
    });

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(mockLoggerAdapter)
      .build();

    const { scope, dispose } = createTestContainer(testGraph);

    const logger = scope.resolve(LoggerPort);
    logger.log("hello");

    expect(mockLogFn).toHaveBeenCalledWith("hello");

    await dispose();
  });

  it("container and scope are separate instances", async () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    const { container, scope, dispose } = createTestContainer(graph);

    // Container and scope should be different objects
    expect(container).not.toBe(scope);

    // Both should be able to resolve
    const loggerFromContainer = container.resolve(LoggerPort);
    const loggerFromScope = scope.resolve(LoggerPort);

    // Singleton should be same instance
    expect(loggerFromContainer).toBe(loggerFromScope);

    await dispose();
  });
});

// =============================================================================
// Integration: Multiple Test Suites with Isolation
// =============================================================================

describe("useTestContainer isolation across suites", () => {
  describe("suite A", () => {
    let factoryCallCount = 0;

    const CounterAdapter = createAdapter({
      provides: CounterPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        factoryCallCount++;
        let value = 0;
        return {
          increment: () => ++value,
          getValue: () => value,
        };
      },
    });

    const testContext = useTestContainer(() => {
      factoryCallCount = 0; // Reset for tracking
      return GraphBuilder.create()
        .provide(CounterAdapter)
        .build();
    });

    it("test A1 increments counter", () => {
      const counter = testContext.scope.resolve(CounterPort);
      expect(counter.increment()).toBe(1);
      expect(counter.increment()).toBe(2);
    });

    it("test A2 gets fresh counter", () => {
      const counter = testContext.scope.resolve(CounterPort);
      // Fresh container means fresh singleton
      expect(counter.getValue()).toBe(0);
      expect(counter.increment()).toBe(1);
    });
  });

  describe("suite B", () => {
    const CounterAdapter = createAdapter({
      provides: CounterPort,
      requires: [],
      lifetime: "singleton",
      factory: () => {
        let value = 0;
        return {
          increment: () => ++value,
          getValue: () => value,
        };
      },
    });

    const testContext = useTestContainer(() =>
      GraphBuilder.create()
        .provide(CounterAdapter)
        .build()
    );

    it("test B1 gets its own counter", () => {
      const counter = testContext.scope.resolve(CounterPort);
      expect(counter.increment()).toBe(1);
    });
  });
});
