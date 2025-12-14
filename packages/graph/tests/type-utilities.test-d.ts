/**
 * Type-level tests for Type Inference Utilities.
 *
 * These tests verify:
 * 1. InferAdapterProvides<A> extracts provided port
 * 2. InferAdapterRequires<A> extracts required ports union
 * 3. InferAdapterLifetime<A> extracts lifetime literal
 * 4. InferGraphProvides<G> extracts all provided ports from builder
 * 5. InferGraphRequires<G> extracts all required ports from builder
 * 6. Utilities return never for invalid input types
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  Adapter,
  GraphBuilder,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  InferGraphProvides,
  InferGraphRequires,
  createAdapter,
  Lifetime,
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
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ query: async () => ({}) }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "request",
  factory: () => ({ get: () => "" }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: async (id) => ({ id, name: "test" }) }),
});

// =============================================================================
// InferAdapterProvides Tests
// =============================================================================

describe("InferAdapterProvides<T> utility type", () => {
  it("extracts provided port from adapter with no dependencies", () => {
    type Result = InferAdapterProvides<typeof LoggerAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("extracts provided port from adapter with dependencies", () => {
    type Result = InferAdapterProvides<typeof UserServiceAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<UserServicePortType>();
  });

  it("extracts provided port from manually typed Adapter", () => {
    type ManualAdapter = Adapter<LoggerPortType, DatabasePortType, "singleton">;
    type Result = InferAdapterProvides<ManualAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("returns never for non-Adapter types", () => {
    type FromString = InferAdapterProvides<string>;
    type FromNumber = InferAdapterProvides<number>;
    type FromBoolean = InferAdapterProvides<boolean>;
    type FromObject = InferAdapterProvides<{ foo: string }>;
    type FromArray = InferAdapterProvides<string[]>;
    type FromFunction = InferAdapterProvides<() => void>;
    type FromNull = InferAdapterProvides<null>;
    type FromUndefined = InferAdapterProvides<undefined>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromArray>().toBeNever();
    expectTypeOf<FromFunction>().toBeNever();
    expectTypeOf<FromNull>().toBeNever();
    expectTypeOf<FromUndefined>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferAdapterProvides<never>;

    expectTypeOf<FromNever>().toBeNever();
  });

  it("returns never for unknown type", () => {
    type FromUnknown = InferAdapterProvides<unknown>;

    expectTypeOf<FromUnknown>().toBeNever();
  });
});

// =============================================================================
// InferAdapterRequires Tests
// =============================================================================

describe("InferAdapterRequires<T> utility type", () => {
  it("extracts required ports union from adapter with dependencies", () => {
    type Result = InferAdapterRequires<typeof UserServiceAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("extracts never from adapter with no dependencies", () => {
    type Result = InferAdapterRequires<typeof LoggerAdapter>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts required port from manually typed Adapter", () => {
    type ManualAdapter = Adapter<
      UserServicePortType,
      LoggerPortType | DatabasePortType,
      "scoped"
    >;
    type Result = InferAdapterRequires<ManualAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("handles adapter with single dependency", () => {
    const SingleDepAdapter = createAdapter({
      provides: ConfigPort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });

    type Result = InferAdapterRequires<typeof SingleDepAdapter>;
    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("returns never for non-Adapter types", () => {
    type FromString = InferAdapterRequires<string>;
    type FromNumber = InferAdapterRequires<number>;
    type FromBoolean = InferAdapterRequires<boolean>;
    type FromObject = InferAdapterRequires<{ foo: string }>;
    type FromArray = InferAdapterRequires<string[]>;
    type FromFunction = InferAdapterRequires<() => void>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromArray>().toBeNever();
    expectTypeOf<FromFunction>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferAdapterRequires<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// InferAdapterLifetime Tests
// =============================================================================

describe("InferAdapterLifetime<T> utility type", () => {
  it("extracts singleton lifetime", () => {
    type Result = InferAdapterLifetime<typeof LoggerAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<"singleton">();
  });

  it("extracts scoped lifetime", () => {
    type Result = InferAdapterLifetime<typeof DatabaseAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<"scoped">();
  });

  it("extracts request lifetime", () => {
    type Result = InferAdapterLifetime<typeof ConfigAdapter>;

    expectTypeOf<Result>().toEqualTypeOf<"request">();
  });

  it("extracts lifetime from manually typed Adapter", () => {
    type SingletonAdapter = Adapter<LoggerPortType, never, "singleton">;
    type ScopedAdapter = Adapter<LoggerPortType, never, "scoped">;
    type RequestAdapter = Adapter<LoggerPortType, never, "request">;

    expectTypeOf<InferAdapterLifetime<SingletonAdapter>>().toEqualTypeOf<"singleton">();
    expectTypeOf<InferAdapterLifetime<ScopedAdapter>>().toEqualTypeOf<"scoped">();
    expectTypeOf<InferAdapterLifetime<RequestAdapter>>().toEqualTypeOf<"request">();
  });

  it("returns never for non-Adapter types", () => {
    type FromString = InferAdapterLifetime<string>;
    type FromNumber = InferAdapterLifetime<number>;
    type FromBoolean = InferAdapterLifetime<boolean>;
    type FromObject = InferAdapterLifetime<{ foo: string }>;
    type FromLifetime = InferAdapterLifetime<Lifetime>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromLifetime>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferAdapterLifetime<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// InferGraphProvides Tests
// =============================================================================

describe("InferGraphProvides<T> utility type", () => {
  it("extracts provided ports from builder with single adapter", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    type Result = InferGraphProvides<typeof builder>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType>();
  });

  it("extracts provided ports union from builder with multiple adapters", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter);
    type Result = InferGraphProvides<typeof builder>;

    expectTypeOf<Result>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | ConfigPortType
    >();
  });

  it("extracts never from empty builder", () => {
    const builder = GraphBuilder.create();
    type Result = InferGraphProvides<typeof builder>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts from manually typed GraphBuilder", () => {
    type ManualBuilder = GraphBuilder<
      LoggerPortType | DatabasePortType,
      ConfigPortType
    >;
    type Result = InferGraphProvides<ManualBuilder>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("returns never for non-GraphBuilder types", () => {
    type FromString = InferGraphProvides<string>;
    type FromNumber = InferGraphProvides<number>;
    type FromBoolean = InferGraphProvides<boolean>;
    type FromObject = InferGraphProvides<{ provides: LoggerPortType }>;
    type FromAdapter = InferGraphProvides<typeof LoggerAdapter>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromAdapter>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferGraphProvides<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// InferGraphRequires Tests
// =============================================================================

describe("InferGraphRequires<T> utility type", () => {
  it("extracts required ports from builder with adapter that has dependencies", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);
    type Result = InferGraphRequires<typeof builder>;

    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("extracts accumulated required ports from multiple adapters", () => {
    const SingleDepAdapter = createAdapter({
      provides: ConfigPort,
      requires: [LoggerPort],
      lifetime: "singleton",
      factory: () => ({ get: () => "" }),
    });

    const builder = GraphBuilder.create()
      .provide(UserServiceAdapter) // requires Logger, Database
      .provide(SingleDepAdapter); // requires Logger
    type Result = InferGraphRequires<typeof builder>;

    // Union of all requires: Logger | Database | Logger = Logger | Database
    expectTypeOf<Result>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("extracts never from builder with only no-dependency adapters", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);
    type Result = InferGraphRequires<typeof builder>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts never from empty builder", () => {
    const builder = GraphBuilder.create();
    type Result = InferGraphRequires<typeof builder>;

    expectTypeOf<Result>().toBeNever();
  });

  it("extracts from manually typed GraphBuilder", () => {
    type ManualBuilder = GraphBuilder<
      LoggerPortType,
      DatabasePortType | ConfigPortType
    >;
    type Result = InferGraphRequires<ManualBuilder>;

    expectTypeOf<Result>().toEqualTypeOf<DatabasePortType | ConfigPortType>();
  });

  it("returns never for non-GraphBuilder types", () => {
    type FromString = InferGraphRequires<string>;
    type FromNumber = InferGraphRequires<number>;
    type FromBoolean = InferGraphRequires<boolean>;
    type FromObject = InferGraphRequires<{ requires: LoggerPortType }>;
    type FromAdapter = InferGraphRequires<typeof LoggerAdapter>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromBoolean>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
    expectTypeOf<FromAdapter>().toBeNever();
  });

  it("returns never for never type", () => {
    type FromNever = InferGraphRequires<never>;

    expectTypeOf<FromNever>().toBeNever();
  });
});

// =============================================================================
// Combined Utility Tests
// =============================================================================

describe("utility type composition", () => {
  it("utilities work together to extract adapter information", () => {
    const adapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: () => ({ getUser: async (id) => ({ id, name: "test" }) }),
    });

    type Provides = InferAdapterProvides<typeof adapter>;
    type Requires = InferAdapterRequires<typeof adapter>;
    type LifetimeType = InferAdapterLifetime<typeof adapter>;

    expectTypeOf<Provides>().toEqualTypeOf<UserServicePortType>();
    expectTypeOf<Requires>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
    expectTypeOf<LifetimeType>().toEqualTypeOf<"scoped">();
  });

  it("utilities work together to extract builder information", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;

    expectTypeOf<Provides>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
    expectTypeOf<Requires>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("adapter utilities match graph builder accumulation", () => {
    // When we provide an adapter to a builder, the builder's provides
    // should match what InferAdapterProvides extracts from the adapter

    type AdapterProvides = InferAdapterProvides<typeof UserServiceAdapter>;
    type AdapterRequires = InferAdapterRequires<typeof UserServiceAdapter>;

    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    type BuilderProvides = InferGraphProvides<typeof builder>;
    type BuilderRequires = InferGraphRequires<typeof builder>;

    // For a single adapter, they should match
    expectTypeOf<AdapterProvides>().toEqualTypeOf<BuilderProvides>();
    expectTypeOf<AdapterRequires>().toEqualTypeOf<BuilderRequires>();
  });

  it("no any leakage in utility types", () => {
    // Verify that utility types don't produce `any` for valid inputs
    type Provides = InferAdapterProvides<typeof LoggerAdapter>;
    type Requires = InferAdapterRequires<typeof UserServiceAdapter>;
    type LifetimeType = InferAdapterLifetime<typeof LoggerAdapter>;
    type GraphProv = InferGraphProvides<GraphBuilder<LoggerPortType, never>>;
    type GraphReq = InferGraphRequires<GraphBuilder<never, DatabasePortType>>;

    // None of these should be `any`
    expectTypeOf<Provides>().not.toBeAny();
    expectTypeOf<Requires>().not.toBeAny();
    expectTypeOf<LifetimeType>().not.toBeAny();
    expectTypeOf<GraphProv>().not.toBeAny();
    expectTypeOf<GraphReq>().not.toBeAny();
  });
});
