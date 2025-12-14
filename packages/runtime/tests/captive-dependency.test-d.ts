/**
 * Type-level tests for captive dependency prevention.
 *
 * Captive dependency is a DI anti-pattern where a longer-lived service
 * (e.g., singleton) depends on a shorter-lived service (e.g., scoped/request).
 * This causes the shorter-lived service to be "captured" and held beyond
 * its intended lifetime.
 *
 * Lifetime hierarchy (lower level = longer lived):
 * - Singleton (1): lives for entire application lifetime
 * - Scoped (2): lives for duration of a scope
 * - Request (3): created fresh for each resolution
 *
 * Valid dependency directions:
 * - Singleton -> Singleton (same level)
 * - Scoped -> Singleton (longer-lived dependency - OK)
 * - Scoped -> Scoped (same level)
 * - Request -> Singleton (longer-lived dependency - OK)
 * - Request -> Scoped (longer-lived dependency - OK)
 * - Request -> Request (same level)
 *
 * Invalid (captive) dependencies:
 * - Singleton -> Scoped (shorter-lived dependency - CAPTIVE!)
 * - Singleton -> Request (shorter-lived dependency - CAPTIVE!)
 * - Scoped -> Request (shorter-lived dependency - CAPTIVE!)
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, type Lifetime } from "@hex-di/graph";
import type {
  LifetimeLevel,
  ValidateCaptiveDependency,
  CaptiveDependencyError,
} from "../src/index.js";

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

interface RequestContext {
  requestId: string;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const RequestContextPort = createPort<"RequestContext", RequestContext>("RequestContext");

// =============================================================================
// Test Adapters with Various Lifetimes
// =============================================================================

// Singleton adapter with no dependencies
const SingletonLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

// Scoped adapter with no dependencies
const ScopedDatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ query: async () => ({}) }),
});

// Request adapter with no dependencies
const RequestContextAdapter = createAdapter({
  provides: RequestContextPort,
  requires: [],
  lifetime: "request",
  factory: () => ({ requestId: "req-123" }),
});

// Singleton adapter depending on singleton (VALID)
const SingletonDependsOnSingletonAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Getting user ${id}`);
      return { id, name: "Test" };
    },
  }),
});

// Scoped adapter depending on singleton (VALID)
const ScopedDependsOnSingletonAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "scoped",
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Getting user ${id}`);
      return { id, name: "Test" };
    },
  }),
});

// Request adapter depending on any lifetime (VALID - request can depend on anything)
const RequestDependsOnSingletonAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort],
  lifetime: "request",
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Getting user ${id}`);
      return { id, name: "Test" };
    },
  }),
});

// =============================================================================
// LifetimeLevel Type Tests
// =============================================================================

describe("LifetimeLevel phantom type", () => {
  it("singleton maps to level 1", () => {
    type SingletonLevel = LifetimeLevel<"singleton">;
    expectTypeOf<SingletonLevel>().toEqualTypeOf<1>();
  });

  it("scoped maps to level 2", () => {
    type ScopedLevel = LifetimeLevel<"scoped">;
    expectTypeOf<ScopedLevel>().toEqualTypeOf<2>();
  });

  it("request maps to level 3", () => {
    type RequestLevel = LifetimeLevel<"request">;
    expectTypeOf<RequestLevel>().toEqualTypeOf<3>();
  });
});

// =============================================================================
// Valid Dependency Tests (should compile without error)
// =============================================================================

describe("Valid captive dependency scenarios (should compile)", () => {
  it("singleton depending on singleton compiles", () => {
    type Result = ValidateCaptiveDependency<
      typeof SingletonDependsOnSingletonAdapter,
      typeof SingletonLoggerAdapter
    >;

    // Should return the adapter type (not an error)
    expectTypeOf<Result>().toEqualTypeOf<typeof SingletonDependsOnSingletonAdapter>();
  });

  it("scoped depending on singleton compiles", () => {
    type Result = ValidateCaptiveDependency<
      typeof ScopedDependsOnSingletonAdapter,
      typeof SingletonLoggerAdapter
    >;

    // Should return the adapter type (not an error)
    expectTypeOf<Result>().toEqualTypeOf<typeof ScopedDependsOnSingletonAdapter>();
  });

  it("scoped depending on scoped compiles", () => {
    // Create a scoped adapter that depends on a scoped service
    const ScopedDependsOnScopedAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort],
      lifetime: "scoped",
      factory: (deps) => ({
        getUser: async (id) => {
          await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test" };
        },
      }),
    });

    type Result = ValidateCaptiveDependency<
      typeof ScopedDependsOnScopedAdapter,
      typeof ScopedDatabaseAdapter
    >;

    // Should return the adapter type (not an error)
    expectTypeOf<Result>().toEqualTypeOf<typeof ScopedDependsOnScopedAdapter>();
  });

  it("request depending on any lifetime compiles", () => {
    // Request depending on singleton
    type ResultSingleton = ValidateCaptiveDependency<
      typeof RequestDependsOnSingletonAdapter,
      typeof SingletonLoggerAdapter
    >;
    expectTypeOf<ResultSingleton>().toEqualTypeOf<typeof RequestDependsOnSingletonAdapter>();

    // Request depending on scoped
    const RequestDependsOnScopedAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort],
      lifetime: "request",
      factory: (deps) => ({
        getUser: async (id) => {
          await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test" };
        },
      }),
    });

    type ResultScoped = ValidateCaptiveDependency<
      typeof RequestDependsOnScopedAdapter,
      typeof ScopedDatabaseAdapter
    >;
    expectTypeOf<ResultScoped>().toEqualTypeOf<typeof RequestDependsOnScopedAdapter>();

    // Request depending on request
    const RequestDependsOnRequestAdapter = createAdapter({
      provides: UserServicePort,
      requires: [RequestContextPort],
      lifetime: "request",
      factory: (deps) => ({
        getUser: async (id) => {
          void deps.RequestContext.requestId; // Use the dependency
          return { id, name: "Test" };
        },
      }),
    });

    type ResultRequest = ValidateCaptiveDependency<
      typeof RequestDependsOnRequestAdapter,
      typeof RequestContextAdapter
    >;
    expectTypeOf<ResultRequest>().toEqualTypeOf<typeof RequestDependsOnRequestAdapter>();
  });
});

// =============================================================================
// Invalid Captive Dependency Tests (should produce error types)
// =============================================================================

describe("Invalid captive dependency scenarios (should produce error types)", () => {
  it("singleton depending on scoped produces error type", () => {
    // Singleton trying to depend on scoped - CAPTIVE!
    const SingletonDependsOnScopedAdapter = createAdapter({
      provides: UserServicePort,
      requires: [DatabasePort],
      lifetime: "singleton",
      factory: (deps) => ({
        getUser: async (id) => {
          await deps.Database.query(`SELECT * FROM users WHERE id = '${id}'`);
          return { id, name: "Test" };
        },
      }),
    });

    type Result = ValidateCaptiveDependency<
      typeof SingletonDependsOnScopedAdapter,
      typeof ScopedDatabaseAdapter
    >;

    // Should be a CaptiveDependencyError
    expectTypeOf<Result>().toMatchTypeOf<CaptiveDependencyError<string>>();
  });

  it("singleton depending on request produces error type", () => {
    // Singleton trying to depend on request - CAPTIVE!
    const SingletonDependsOnRequestAdapter = createAdapter({
      provides: UserServicePort,
      requires: [RequestContextPort],
      lifetime: "singleton",
      factory: (deps) => ({
        getUser: async (id) => {
          void deps.RequestContext.requestId; // Use the dependency
          return { id, name: "Test" };
        },
      }),
    });

    type Result = ValidateCaptiveDependency<
      typeof SingletonDependsOnRequestAdapter,
      typeof RequestContextAdapter
    >;

    // Should be a CaptiveDependencyError
    expectTypeOf<Result>().toMatchTypeOf<CaptiveDependencyError<string>>();
  });

  it("scoped depending on request produces error type", () => {
    // Scoped trying to depend on request - CAPTIVE!
    const ScopedDependsOnRequestAdapter = createAdapter({
      provides: UserServicePort,
      requires: [RequestContextPort],
      lifetime: "scoped",
      factory: (deps) => ({
        getUser: async (id) => {
          void deps.RequestContext.requestId; // Use the dependency
          return { id, name: "Test" };
        },
      }),
    });

    type Result = ValidateCaptiveDependency<
      typeof ScopedDependsOnRequestAdapter,
      typeof RequestContextAdapter
    >;

    // Should be a CaptiveDependencyError
    expectTypeOf<Result>().toMatchTypeOf<CaptiveDependencyError<string>>();
  });
});

// =============================================================================
// Error Message Tests
// =============================================================================

describe("CaptiveDependencyError type", () => {
  it("error type includes descriptive message", () => {
    type TestError = CaptiveDependencyError<"Singleton 'UserService' cannot depend on Scoped 'Database'">;

    // Error should have the __errorBrand property
    expectTypeOf<TestError>().toHaveProperty("__errorBrand");

    // Error should have the __message property with the descriptive message
    expectTypeOf<TestError["__message"]>().toEqualTypeOf<"Singleton 'UserService' cannot depend on Scoped 'Database'">();
  });

  it("error type has correct brand", () => {
    type TestError = CaptiveDependencyError<"Test message">;

    expectTypeOf<TestError["__errorBrand"]>().toEqualTypeOf<"CaptiveDependencyError">();
  });
});
