/**
 * Unit tests for createAdapter function.
 *
 * These tests verify runtime behavior:
 * 1. Returned adapter is frozen/immutable
 * 2. Adapter has all required properties
 * 3. Factory function is stored correctly
 */

import { describe, expect, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter } from "../src/index.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// createAdapter Unit Tests
// =============================================================================

describe("createAdapter function", () => {
  it("returns a frozen/immutable object", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Object should be frozen
    expect(Object.isFrozen(adapter)).toBe(true);
  });

  it("stores provides property correctly", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.provides).toBe(LoggerPort);
    expect(adapter.provides.__portName).toBe("Logger");
  });

  it("stores requires as readonly array", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: () => ({
        getUser: async (id) => ({ id, name: "test" }),
      }),
    });

    expect(adapter.requires).toEqual([LoggerPort, DatabasePort]);
    expect(adapter.requires.length).toBe(2);
  });

  it("stores empty requires array for zero dependencies", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    expect(adapter.requires).toEqual([]);
    expect(adapter.requires.length).toBe(0);
  });

  it("stores lifetime property correctly", () => {
    const singletonAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "scoped",
      factory: () => ({ log: () => {} }),
    });

    const requestAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => ({ log: () => {} }),
    });

    expect(singletonAdapter.lifetime).toBe("singleton");
    expect(scopedAdapter.lifetime).toBe("scoped");
    expect(requestAdapter.lifetime).toBe("request");
  });

  it("stores factory function correctly", () => {
    const loggerImpl = { log: (_msg: string) => {} };
    const factory = () => loggerImpl;

    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory,
    });

    // Factory should be stored and callable
    expect(adapter.factory).toBe(factory);
    expect(adapter.factory({})).toBe(loggerImpl);
  });

  it("factory receives dependencies object", () => {
    const mockLogger: Logger = { log: () => {} };
    const mockDatabase: Database = { query: async () => ({}) };

    let receivedDeps: unknown;

    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: (deps) => {
        receivedDeps = deps;
        return {
          getUser: async (id) => ({ id, name: "test" }),
        };
      },
    });

    // Call factory with mock dependencies
    adapter.factory({
      Logger: mockLogger,
      Database: mockDatabase,
    });

    expect(receivedDeps).toEqual({
      Logger: mockLogger,
      Database: mockDatabase,
    });
  });
});
