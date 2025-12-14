/**
 * Type-level tests for Adapter type and brand symbol.
 *
 * These tests verify:
 * 1. Adapter type captures TProvides as single Port type
 * 2. Adapter type captures TRequires as Port union (or never)
 * 3. Adapter type captures TLifetime as literal ('singleton' | 'scoped' | 'request')
 * 4. Two adapters with same provides but different requires are distinct types
 * 5. Adapter brand symbol is not accessible at value level
 * 6. Adapter with never requires has no dependencies
 * 7. Adapter carries factory function type in metadata
 * 8. ResolvedDeps correctly maps Port union to typed object
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, Port, InferService } from "@hex-di/ports";
import {
  Adapter,
  Lifetime,
  ResolvedDeps,
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
// Lifetime Type Tests
// =============================================================================

describe("Lifetime type", () => {
  it("is a union of singleton, scoped, and request literals", () => {
    expectTypeOf<Lifetime>().toEqualTypeOf<
      "singleton" | "scoped" | "request"
    >();
  });

  it("accepts valid lifetime values", () => {
    const singleton: Lifetime = "singleton";
    const scoped: Lifetime = "scoped";
    const request: Lifetime = "request";

    expectTypeOf(singleton).toMatchTypeOf<Lifetime>();
    expectTypeOf(scoped).toMatchTypeOf<Lifetime>();
    expectTypeOf(request).toMatchTypeOf<Lifetime>();
  });

  it("rejects invalid lifetime values", () => {
    // @ts-expect-error - "invalid" is not a valid Lifetime
    const invalid: Lifetime = "invalid";
  });
});

// =============================================================================
// Adapter Type Tests
// =============================================================================

describe("Adapter type", () => {
  it("captures TProvides as single Port type", () => {
    type LoggerAdapter = Adapter<LoggerPortType, never, "singleton">;

    // The provides property should be the LoggerPort type
    expectTypeOf<LoggerAdapter["provides"]>().toEqualTypeOf<LoggerPortType>();
  });

  it("captures TRequires as Port union", () => {
    type ServiceAdapter = Adapter<
      UserServicePortType,
      LoggerPortType | DatabasePortType,
      "scoped"
    >;

    // TRequires is captured in the brand tuple
    // We verify via the requires array type that it tracks dependencies
    type RequiresType = ServiceAdapter["requires"];
    expectTypeOf<RequiresType>().toMatchTypeOf<readonly Port<unknown, string>[]>();
  });

  it("captures TRequires as never for zero dependencies", () => {
    type NoDepsAdapter = Adapter<LoggerPortType, never, "singleton">;

    // When TRequires is never, requires should be empty array
    expectTypeOf<NoDepsAdapter["requires"]>().toEqualTypeOf<readonly []>();
  });

  it("captures TLifetime as literal type", () => {
    type SingletonAdapter = Adapter<LoggerPortType, never, "singleton">;
    type ScopedAdapter = Adapter<LoggerPortType, never, "scoped">;
    type RequestAdapter = Adapter<LoggerPortType, never, "request">;

    expectTypeOf<SingletonAdapter["lifetime"]>().toEqualTypeOf<"singleton">();
    expectTypeOf<ScopedAdapter["lifetime"]>().toEqualTypeOf<"scoped">();
    expectTypeOf<RequestAdapter["lifetime"]>().toEqualTypeOf<"request">();
  });

  it("produces distinct types for same provides but different requires", () => {
    type AdapterWithLogger = Adapter<
      UserServicePortType,
      LoggerPortType,
      "scoped"
    >;
    type AdapterWithDatabase = Adapter<
      UserServicePortType,
      DatabasePortType,
      "scoped"
    >;

    // These should be distinct types despite same TProvides and TLifetime
    expectTypeOf<AdapterWithLogger>().not.toEqualTypeOf<AdapterWithDatabase>();
  });

  it("produces distinct types for same provides but different lifetimes", () => {
    type SingletonAdapter = Adapter<LoggerPortType, never, "singleton">;
    type ScopedAdapter = Adapter<LoggerPortType, never, "scoped">;

    // Different lifetimes = different types
    expectTypeOf<SingletonAdapter>().not.toEqualTypeOf<ScopedAdapter>();
  });

  it("carries factory function type in metadata", () => {
    type NoDepsAdapter = Adapter<LoggerPortType, never, "singleton">;
    type WithDepsAdapter = Adapter<
      UserServicePortType,
      LoggerPortType | DatabasePortType,
      "scoped"
    >;

    // Factory for no-deps adapter takes empty object
    expectTypeOf<NoDepsAdapter["factory"]>().toMatchTypeOf<
      (deps: Record<string, never>) => Logger
    >();

    // Factory for with-deps adapter takes resolved deps object
    type FactoryType = WithDepsAdapter["factory"];
    type ExpectedDeps = {
      Logger: Logger;
      Database: Database;
    };
    expectTypeOf<FactoryType>().toMatchTypeOf<
      (deps: ExpectedDeps) => UserService
    >();
  });

  it("achieves nominal typing via brand symbol", () => {
    type Adapter1 = Adapter<LoggerPortType, never, "singleton">;
    type Adapter2 = Adapter<LoggerPortType, never, "singleton">;

    // Same type parameters should produce equivalent types
    expectTypeOf<Adapter1>().toEqualTypeOf<Adapter2>();

    // A structurally similar object should NOT match Adapter due to brand
    type FakeAdapter = {
      readonly provides: LoggerPortType;
      readonly requires: readonly [];
      readonly lifetime: "singleton";
      readonly factory: (deps: Record<string, never>) => Logger;
    };

    // FakeAdapter lacks the brand, so it should not match
    expectTypeOf<FakeAdapter>().not.toMatchTypeOf<Adapter1>();
  });
});

// =============================================================================
// ResolvedDeps Type Tests
// =============================================================================

describe("ResolvedDeps utility type", () => {
  it("maps never to empty object", () => {
    type EmptyDeps = ResolvedDeps<never>;

    // Record<string, unknown> allows adapters with no dependencies to be
    // compatible with GraphBuilder.provide() under function contravariance
    expectTypeOf<EmptyDeps>().toEqualTypeOf<Record<string, unknown>>();
  });

  it("maps single Port to object with port name as key", () => {
    type SingleDep = ResolvedDeps<LoggerPortType>;

    expectTypeOf<SingleDep>().toEqualTypeOf<{ Logger: Logger }>();
  });

  it("maps Port union to object with all port names as keys", () => {
    type MultipleDeps = ResolvedDeps<LoggerPortType | DatabasePortType>;

    expectTypeOf<MultipleDeps>().toEqualTypeOf<{
      Logger: Logger;
      Database: Database;
    }>();
  });

  it("correctly infers service types from Ports", () => {
    type AllDeps = ResolvedDeps<
      LoggerPortType | DatabasePortType | ConfigPortType
    >;

    // Each key should have the correct service type
    expectTypeOf<AllDeps["Logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<AllDeps["Database"]>().toEqualTypeOf<Database>();
    expectTypeOf<AllDeps["Config"]>().toEqualTypeOf<ConfigService>();
  });

  it("produces distinct types for different Port combinations", () => {
    type DepsA = ResolvedDeps<LoggerPortType>;
    type DepsB = ResolvedDeps<DatabasePortType>;
    type DepsAB = ResolvedDeps<LoggerPortType | DatabasePortType>;

    expectTypeOf<DepsA>().not.toEqualTypeOf<DepsB>();
    expectTypeOf<DepsA>().not.toEqualTypeOf<DepsAB>();
    expectTypeOf<DepsB>().not.toEqualTypeOf<DepsAB>();
  });
});
