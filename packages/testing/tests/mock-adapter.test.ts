/**
 * createMockAdapter unit tests.
 *
 * Tests for the createMockAdapter function that creates type-safe mock
 * adapters with partial implementations for testing scenarios.
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createMockAdapter } from "../src/mock-adapter.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
  createUser(name: string): Promise<{ id: string; name: string }>;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// createMockAdapter Tests
// =============================================================================

describe("createMockAdapter", () => {
  test("creates adapter with partial implementation", () => {
    const logFn = vi.fn();
    const mockAdapter = createMockAdapter(LoggerPort, {
      log: logFn,
    });

    // Verify adapter structure
    expect(mockAdapter.provides).toBe(LoggerPort);
    expect(mockAdapter.requires).toEqual([]);
    expect(typeof mockAdapter.factory).toBe("function");
  });

  test("missing methods throw descriptive error when called", () => {
    const mockAdapter = createMockAdapter(LoggerPort, {
      log: vi.fn(),
      // warn and error are not implemented
    });

    const mockLogger = mockAdapter.factory({});

    // Implemented method should work
    expect(() => mockLogger.log("test")).not.toThrow();

    // Missing method should throw descriptive error
    expect(() => mockLogger.warn("test")).toThrow(
      "Method 'warn' not implemented on mock for port 'Logger'"
    );

    expect(() => mockLogger.error("test")).toThrow(
      "Method 'error' not implemented on mock for port 'Logger'"
    );
  });

  test("type inference works for partial implementation", () => {
    // This test verifies TypeScript inference - if it compiles, the types work
    const mockAdapter = createMockAdapter(DatabasePort, {
      // Only implementing query, not connect or disconnect
      query: vi.fn().mockResolvedValue({ rows: [] }),
    });

    const mockDb = mockAdapter.factory({});

    // TypeScript should allow calling any method from the interface
    // (runtime will throw for unimplemented ones)
    expect(mockDb.query).toBeDefined();
  });

  test("default lifetime is 'request' for test isolation", () => {
    const mockAdapter = createMockAdapter(LoggerPort, {
      log: vi.fn(),
    });

    expect(mockAdapter.lifetime).toBe("request");
  });

  test("configurable lifetime via options", () => {
    const singletonMock = createMockAdapter(
      LoggerPort,
      { log: vi.fn() },
      { lifetime: "singleton" }
    );

    const scopedMock = createMockAdapter(
      LoggerPort,
      { log: vi.fn() },
      { lifetime: "scoped" }
    );

    const requestMock = createMockAdapter(
      LoggerPort,
      { log: vi.fn() },
      { lifetime: "request" }
    );

    expect(singletonMock.lifetime).toBe("singleton");
    expect(scopedMock.lifetime).toBe("scoped");
    expect(requestMock.lifetime).toBe("request");
  });

  test("adapter works with createContainer", () => {
    const logFn = vi.fn();
    const mockAdapter = createMockAdapter(LoggerPort, {
      log: logFn,
      warn: vi.fn(),
      error: vi.fn(),
    });

    const graph = GraphBuilder.create().provide(mockAdapter).build();

    const container = createContainer(graph);
    const logger = container.resolve(LoggerPort);

    logger.log("test message");

    expect(logFn).toHaveBeenCalledWith("test message");
  });
});

// =============================================================================
// Integration with Dependencies Tests
// =============================================================================

describe("createMockAdapter with dependencies", () => {
  test("mock adapter can be used as dependency for other adapters", () => {
    const logFn = vi.fn();
    const mockLoggerAdapter = createMockAdapter(LoggerPort, {
      log: logFn,
      warn: vi.fn(),
      error: vi.fn(),
    });

    const UserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "request",
      factory: (deps) => ({
        getUser: async (id: string) => {
          deps.Logger.log(`Fetching user ${id}`);
          return { id, name: "Test User" };
        },
        createUser: async (name: string) => {
          deps.Logger.log(`Creating user ${name}`);
          return { id: "new-id", name };
        },
      }),
    });

    const graph = GraphBuilder.create()
      .provide(mockLoggerAdapter)
      .provide(UserServiceAdapter)
      .build();

    const container = createContainer(graph);
    const userService = container.resolve(UserServicePort);

    userService.getUser("123");

    expect(logFn).toHaveBeenCalledWith("Fetching user 123");
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("createMockAdapter edge cases", () => {
  test("empty implementation creates adapter with all methods throwing", () => {
    const mockAdapter = createMockAdapter(LoggerPort, {});
    const mockLogger = mockAdapter.factory({});

    expect(() => mockLogger.log("test")).toThrow(
      "Method 'log' not implemented on mock for port 'Logger'"
    );
  });

  test("proxy correctly forwards property access for implemented methods", () => {
    const logFn = vi.fn();
    const mockAdapter = createMockAdapter(LoggerPort, {
      log: logFn,
    });

    const mockLogger = mockAdapter.factory({});

    // Property access should work
    expect(mockLogger.log).toBe(logFn);
  });

  test("non-function properties are accessible if provided", () => {
    interface Config {
      apiUrl: string;
      timeout: number;
      debug: boolean;
    }

    const ConfigPort = createPort<"Config", Config>("Config");

    const mockAdapter = createMockAdapter(ConfigPort, {
      apiUrl: "http://test.com",
      timeout: 5000,
      // debug not provided
    });

    const mockConfig = mockAdapter.factory({});

    expect(mockConfig.apiUrl).toBe("http://test.com");
    expect(mockConfig.timeout).toBe(5000);
  });
});
