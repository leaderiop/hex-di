/**
 * createSpiedMockAdapter unit tests.
 *
 * Tests for the createSpiedMockAdapter function that creates adapters
 * with all methods wrapped as vi.fn() for spy tracking.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import {
  createSpiedMockAdapter,
  type SpiedAdapter,
  type SpiedService,
} from "../src/vitest/spied-mock-adapter.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown[]>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface Calculator {
  add(a: number, b: number): number;
  multiply(a: number, b: number): number;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CalculatorPort = createPort<"Calculator", Calculator>("Calculator");

// =============================================================================
// createSpiedMockAdapter Tests
// =============================================================================

describe("createSpiedMockAdapter", () => {
  test("creates adapter with all methods as vi.fn()", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);

    // Verify adapter structure
    expect(spiedAdapter.provides).toBe(LoggerPort);
    expect(spiedAdapter.requires).toEqual([]);
    expect(typeof spiedAdapter.factory).toBe("function");

    // Get the implementation
    const impl = spiedAdapter.factory({});

    // All methods should be vi.fn() spies
    expect(vi.isMockFunction(impl.log)).toBe(true);
    expect(vi.isMockFunction(impl.warn)).toBe(true);
    expect(vi.isMockFunction(impl.error)).toBe(true);
  });

  test("spy methods are callable and trackable", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);
    const impl = spiedAdapter.factory({});

    // Call the spy methods
    impl.log("test message");
    impl.warn("warning message");
    impl.log("another message");

    // Verify spy tracking works
    expect(impl.log).toHaveBeenCalledTimes(2);
    expect(impl.log).toHaveBeenCalledWith("test message");
    expect(impl.log).toHaveBeenCalledWith("another message");
    expect(impl.warn).toHaveBeenCalledTimes(1);
    expect(impl.warn).toHaveBeenCalledWith("warning message");
    expect(impl.error).not.toHaveBeenCalled();
  });

  test("optional default implementations work", () => {
    const spiedAdapter = createSpiedMockAdapter(CalculatorPort, {
      add: (a: number, b: number) => a + b,
    });

    const impl = spiedAdapter.factory({});

    // Method with default implementation should work
    const result = impl.add(2, 3);
    expect(result).toBe(5);

    // And still be a spy
    expect(vi.isMockFunction(impl.add)).toBe(true);
    expect(impl.add).toHaveBeenCalledWith(2, 3);

    // Method without default implementation should also be a spy but return undefined
    const multiplyResult = impl.multiply(2, 3);
    expect(multiplyResult).toBeUndefined();
    expect(vi.isMockFunction(impl.multiply)).toBe(true);
  });

  test("spy.mock.calls tracking works correctly", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);
    // Use SpiedService type for spy access
    const impl = spiedAdapter.factory({}) as SpiedService<Logger>;

    impl.log("first");
    impl.log("second");
    impl.warn("warning");

    // Access mock.calls directly
    expect(impl.log.mock.calls).toEqual([["first"], ["second"]]);
    expect(impl.warn.mock.calls).toEqual([["warning"]]);
    expect(impl.error.mock.calls).toEqual([]);
  });

  test("default lifetime is request for test isolation", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);
    expect(spiedAdapter.lifetime).toBe("request");
  });

  test("works with createContainer for integration scenarios", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);

    const graph = GraphBuilder.create().provide(spiedAdapter).build();

    const container = createContainer(graph);
    const logger = container.resolve(LoggerPort);

    logger.log("test message");

    // The resolved instance should have spy capabilities
    expect(vi.isMockFunction(logger.log)).toBe(true);
    expect(logger.log).toHaveBeenCalledWith("test message");
  });
});

// =============================================================================
// SpiedAdapter Type Tests
// =============================================================================

describe("SpiedAdapter type", () => {
  test("implementation property has MockedFunction types at runtime", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);
    // At runtime, all methods are vi.fn() spies
    // Use SpiedService<T> type to access spy properties
    const impl = spiedAdapter.factory({}) as SpiedService<Logger>;

    // TypeScript now recognizes these as MockedFunction
    expect(impl.log.mock).toBeDefined();
    expect(impl.log.mock.calls).toBeDefined();
    expect(impl.log.mock.results).toBeDefined();
    expect(impl.log.mockClear).toBeDefined();
    expect(impl.log.mockReset).toBeDefined();
    expect(impl.log.mockImplementation).toBeDefined();
  });

  test("async methods work correctly with spies", async () => {
    const spiedAdapter = createSpiedMockAdapter(DatabasePort, {
      query: async (sql: string) => [{ id: 1, sql }],
      connect: async () => {},
      disconnect: async () => {},
    });

    // Use SpiedService type for spy access
    const impl = spiedAdapter.factory({}) as SpiedService<Database>;

    const result = await impl.query("SELECT * FROM users");
    expect(result).toEqual([{ id: 1, sql: "SELECT * FROM users" }]);

    expect(impl.query).toHaveBeenCalledWith("SELECT * FROM users");
    expect(impl.query.mock.calls).toEqual([["SELECT * FROM users"]]);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("createSpiedMockAdapter edge cases", () => {
  test("empty defaults parameter creates all methods as bare spies", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort, {});
    const impl = spiedAdapter.factory({});

    expect(vi.isMockFunction(impl.log)).toBe(true);
    expect(vi.isMockFunction(impl.warn)).toBe(true);
    expect(vi.isMockFunction(impl.error)).toBe(true);

    // All return undefined by default
    expect(impl.log("test")).toBeUndefined();
  });

  test("spy can be configured with mockImplementation after creation", () => {
    const spiedAdapter = createSpiedMockAdapter(CalculatorPort);
    // Use SpiedService type for spy access
    const impl = spiedAdapter.factory({}) as SpiedService<Calculator>;

    // Configure the spy after creation
    impl.add.mockImplementation((a: number, b: number) => a + b);

    expect(impl.add(5, 3)).toBe(8);
    expect(impl.add).toHaveBeenCalledWith(5, 3);
  });

  test("spy can be configured with mockReturnValue", () => {
    const spiedAdapter = createSpiedMockAdapter(CalculatorPort);
    // Use SpiedService type for spy access
    const impl = spiedAdapter.factory({}) as SpiedService<Calculator>;

    impl.add.mockReturnValue(42);

    expect(impl.add(1, 2)).toBe(42);
    expect(impl.add(100, 200)).toBe(42);
  });
});
