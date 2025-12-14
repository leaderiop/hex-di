/**
 * Type-level tests for createAdapter function.
 *
 * These tests verify:
 * 1. createAdapter returns Adapter with correct provides type
 * 2. createAdapter infers requires from array as union type
 * 3. createAdapter preserves lifetime literal type
 * 4. Factory function receives correctly typed dependencies object
 * 5. Empty requires array results in `never` for TRequires
 * 6. Type inference works without explicit type annotations
 * 7. Factory return type must match `InferService<TProvides>`
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, Port, InferService } from "@hex-di/ports";
import { Adapter, createAdapter, ResolvedDeps } from "../src/index.js";

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

interface ConfigService {
  get(key: string): string;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", ConfigService>("Config");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;
type ConfigPortType = typeof ConfigPort;

// =============================================================================
// createAdapter Type Tests
// =============================================================================

describe("createAdapter function", () => {
  it("returns Adapter with correct provides type", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {} }),
    });

    // Verify the adapter provides the correct port
    expectTypeOf(adapter.provides).toEqualTypeOf<LoggerPortType>();
    expectTypeOf(adapter).toMatchTypeOf<Adapter<LoggerPortType, never, "singleton">>();
  });

  it("infers requires from array as union type", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: (deps) => ({
        getUser: async (id) => ({ id, name: "test" }),
      }),
    });

    // The requires property should be a readonly array containing the ports
    expectTypeOf(adapter.requires).toMatchTypeOf<readonly Port<unknown, string>[]>();

    // The adapter type should have the union of required ports
    expectTypeOf(adapter).toMatchTypeOf<
      Adapter<UserServicePortType, LoggerPortType | DatabasePortType, "scoped">
    >();
  });

  it("preserves lifetime literal type", () => {
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

    // Each adapter should preserve the literal lifetime type
    expectTypeOf(singletonAdapter.lifetime).toEqualTypeOf<"singleton">();
    expectTypeOf(scopedAdapter.lifetime).toEqualTypeOf<"scoped">();
    expectTypeOf(requestAdapter.lifetime).toEqualTypeOf<"request">();
  });

  it("factory function receives correctly typed dependencies object", () => {
    // With dependencies
    createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: (deps) => {
        // deps should have Logger and Database properties
        expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
        expectTypeOf(deps.Database).toEqualTypeOf<Database>();

        return {
          getUser: async (id) => ({ id, name: "test" }),
        };
      },
    });
  });

  it("empty requires array results in never for TRequires", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (deps) => {
        // deps should be Record<string, unknown> for compatibility with other adapters
        expectTypeOf(deps).toEqualTypeOf<Record<string, unknown>>();
        return { log: () => {} };
      },
    });

    // The requires property should be an empty readonly array
    expectTypeOf(adapter.requires).toEqualTypeOf<readonly []>();
  });

  it("type inference works without explicit type annotations", () => {
    // No explicit type annotations - everything should be inferred
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: (deps) => ({
        getUser: async (id) => {
          deps.Logger.log(`Getting user ${id}`);
          return { id, name: "test" };
        },
      }),
    });

    // Type should be fully inferred
    type AdapterType = typeof adapter;
    expectTypeOf<AdapterType>().toMatchTypeOf<
      Adapter<UserServicePortType, LoggerPortType | DatabasePortType, "scoped">
    >();
  });

  it("factory return type must match InferService<TProvides>", () => {
    // Valid: factory returns correct type
    const validAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: (_msg: string) => {} }),
    });

    // The factory return type should match the service type
    type FactoryReturnType = ReturnType<typeof validAdapter.factory>;
    expectTypeOf<FactoryReturnType>().toMatchTypeOf<Logger>();
  });

  it("works with single dependency", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort],
      lifetime: "request",
      factory: (deps) => {
        expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
        return {
          getUser: async (id) => ({ id, name: "test" }),
        };
      },
    });

    expectTypeOf(adapter).toMatchTypeOf<
      Adapter<UserServicePortType, LoggerPortType, "request">
    >();
  });
});
