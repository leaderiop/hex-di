/**
 * createAdapterTest unit tests.
 *
 * Tests for the createAdapterTest harness function that provides isolation
 * for testing a single adapter's factory logic with mock dependencies.
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter } from "@hex-di/graph";
import { createAdapterTest } from "../src/adapter-test-harness.js";

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

interface Config {
  apiUrl: string;
  timeout: number;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", Config>("Config");

// =============================================================================
// Test Adapters
// =============================================================================

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: (deps) => ({
    getUser: async (id: string) => {
      deps.Logger.log(`Fetching user ${id}`);
      const result = await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
      return { id, name: (result as { name: string }).name ?? "Unknown" };
    },
    createUser: async (name: string) => {
      deps.Logger.log(`Creating user ${name}`);
      await deps.Database.query(`INSERT INTO users (name) VALUES ('${name}')`);
      return { id: "new-id", name };
    },
  }),
});

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: (message: string) => console.log(message),
    warn: (message: string) => console.warn(message),
    error: (message: string) => console.error(message),
  }),
});

// =============================================================================
// createAdapterTest Tests
// =============================================================================

describe("createAdapterTest", () => {
  test("accepts adapter and mock dependencies", () => {
    const mockLogger: Logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase: Database = {
      query: vi.fn().mockResolvedValue({ name: "Test User" }),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    expect(harness).toBeDefined();
    expect(typeof harness.invoke).toBe("function");
    expect(typeof harness.getDeps).toBe("function");
  });

  test("invoke() calls factory with mock dependencies and returns service", async () => {
    const logFn = vi.fn();
    const queryFn = vi.fn().mockResolvedValue({ name: "Alice" });

    const mockLogger: Logger = {
      log: logFn,
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase: Database = {
      query: queryFn,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    const userService = harness.invoke();

    // Verify service is returned
    expect(userService).toBeDefined();
    expect(typeof userService.getUser).toBe("function");
    expect(typeof userService.createUser).toBe("function");

    // Call service method and verify mock was used
    const user = await userService.getUser("123");

    expect(logFn).toHaveBeenCalledWith("Fetching user 123");
    expect(queryFn).toHaveBeenCalledWith("SELECT * FROM users WHERE id = '123'");
    expect(user).toEqual({ id: "123", name: "Alice" });
  });

  test("getDeps() returns mock references for spy assertions", () => {
    const mockLogger: Logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase: Database = {
      query: vi.fn().mockResolvedValue({}),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    const deps = harness.getDeps();

    // Verify getDeps returns references to mocks
    expect(deps.Logger).toBe(mockLogger);
    expect(deps.Database).toBe(mockDatabase);

    // Use service and verify spy on getDeps() reference works
    const service = harness.invoke();
    service.getUser("456");

    expect(deps.Logger.log).toHaveBeenCalledWith("Fetching user 456");
  });

  test("validates all required dependencies are provided at creation", () => {
    const mockLogger: Logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Missing Database dependency
    expect(() => {
      createAdapterTest(UserServiceAdapter, {
        Logger: mockLogger,
        // Database is missing
      } as never);
    }).toThrow("Missing mock for required port 'Database'");

    // Missing Logger dependency
    const mockDatabase: Database = {
      query: vi.fn().mockResolvedValue({}),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    expect(() => {
      createAdapterTest(UserServiceAdapter, {
        Database: mockDatabase,
        // Logger is missing
      } as never);
    }).toThrow("Missing mock for required port 'Logger'");
  });

  test("returned service matches port type", async () => {
    const mockLogger: Logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase: Database = {
      query: vi.fn().mockResolvedValue({ name: "Bob" }),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    const service = harness.invoke();

    // TypeScript verifies this at compile time, but let's also verify runtime behavior
    const user = await service.getUser("test");
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("name");

    const newUser = await service.createUser("Charlie");
    expect(newUser).toHaveProperty("id");
    expect(newUser).toHaveProperty("name");
  });

  test("works with adapters that have no dependencies", () => {
    const harness = createAdapterTest(LoggerAdapter, {});

    const logger = harness.invoke();

    expect(logger).toBeDefined();
    expect(typeof logger.log).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");

    // getDeps returns empty object for adapters with no dependencies
    const deps = harness.getDeps();
    expect(deps).toEqual({});
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe("createAdapterTest error handling", () => {
  test("wraps factory errors with descriptive message", () => {
    const FailingAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "request",
      factory: () => {
        throw new Error("Configuration file not found");
      },
    });

    const harness = createAdapterTest(FailingAdapter, {});

    expect(() => harness.invoke()).toThrow("Configuration file not found");
  });

  test("allows multiple invoke() calls to create fresh service instances", async () => {
    let factoryCallCount = 0;

    const CountingUserServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "request",
      factory: (deps) => {
        factoryCallCount++;
        // Capture the count at factory creation time
        const instanceId = factoryCallCount;
        return {
          getUser: async (id: string) => {
            deps.Logger.log(`Instance ${instanceId}: Fetching user ${id}`);
            return { id, name: `User from instance ${instanceId}` };
          },
          createUser: async (name: string) => ({ id: `id-${instanceId}`, name }),
        };
      },
    });

    const mockLogger: Logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockDatabase: Database = {
      query: vi.fn().mockResolvedValue({}),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    const harness = createAdapterTest(CountingUserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    const service1 = harness.invoke();
    const service2 = harness.invoke();

    // Factory should be called twice - once per invoke()
    expect(factoryCallCount).toBe(2);

    // Each service should have its own captured instance ID
    const user1 = await service1.getUser("a");
    const user2 = await service2.getUser("b");

    expect(user1.name).toBe("User from instance 1");
    expect(user2.name).toBe("User from instance 2");
  });
});
