/**
 * Type-level tests for GraphBuilder.build() method.
 *
 * These tests verify:
 * 1. build() callable when all deps satisfied
 * 2. build() blocked with type error when deps missing
 * 3. Error message shows missing port names
 * 4. Empty graph (no adapters) builds successfully
 * 5. build() returns Graph with correct type information
 * 6. Built graph is immutable (type-level readonly)
 * 7. Built graph contains all registered adapters
 * 8. Error appears at .build() call site
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  Graph,
  MissingDependencyError,
  InferGraphProvides,
  Lifetime,
  Adapter,
} from "../src/index.js";
import type { Port } from "@hex-di/ports";

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

interface CacheService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", ConfigService>("Config");
const CachePort = createPort<"Cache", CacheService>("Cache");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;
type ConfigPortType = typeof ConfigPort;
type CachePortType = typeof CachePort;

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
  lifetime: "singleton",
  factory: () => ({ query: async () => ({}) }),
});

const ConfigAdapter = createAdapter({
  provides: ConfigPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ get: () => "" }),
});

const CacheAdapter = createAdapter({
  provides: CachePort,
  requires: [ConfigPort],
  lifetime: "singleton",
  factory: () => ({ get: () => null, set: () => {} }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: async (id) => ({ id, name: "test" }) }),
});

// =============================================================================
// build() Callable When All Deps Satisfied Tests
// =============================================================================

describe("build() callable when all deps satisfied", () => {
  it("builds successfully when no dependencies required", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const graph = builder.build();

    // Should return Graph type, not error type
    type BuildResult = typeof graph;
    type IsGraph = BuildResult extends Graph<LoggerPortType> ? true : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });

  it("builds successfully when all dependencies provided", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    const graph = builder.build();

    // Should return Graph with all ports
    type BuildResult = typeof graph;
    type IsGraph = BuildResult extends Graph<
      LoggerPortType | DatabasePortType | UserServicePortType
    >
      ? true
      : false;
    expectTypeOf<IsGraph>().toEqualTypeOf<true>();
  });

  it("builds successfully with complex dependency chain", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter);

    type BuildResult = ReturnType<typeof builder.build>;

    // Should not be an error type
    type IsError = BuildResult extends { __errorBrand: string } ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();
  });

  it("order of provide() does not affect build success", () => {
    // Provide dependencies before the adapter that needs them
    const builderA = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    // Provide adapter before its dependencies
    const builderB = GraphBuilder.create()
      .provide(UserServiceAdapter)
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);

    type ResultA = ReturnType<typeof builderA.build>;
    type ResultB = ReturnType<typeof builderB.build>;

    // Both should succeed (not be error types)
    type IsErrorA = ResultA extends { __errorBrand: string } ? true : false;
    type IsErrorB = ResultB extends { __errorBrand: string } ? true : false;

    expectTypeOf<IsErrorA>().toEqualTypeOf<false>();
    expectTypeOf<IsErrorB>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// build() Blocked With Type Error When Deps Missing Tests
// =============================================================================

describe("build() blocked with type error when deps missing", () => {
  it("requires error argument when single dependency missing", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);

    // build() should require an argument when deps are missing
    type BuildParams = Parameters<typeof builder.build>;
    type RequiresArg = BuildParams extends [infer Arg] ? true : false;
    expectTypeOf<RequiresArg>().toEqualTypeOf<true>();

    // The required argument should be the MissingDependencyError
    type ArgType = BuildParams[0];
    type IsError = ArgType extends MissingDependencyError<ConfigPortType>
      ? true
      : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("requires error argument when multiple dependencies missing", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    type BuildParams = Parameters<typeof builder.build>;
    type ArgType = BuildParams[0];

    // Should require MissingDependencyError with both missing ports
    type IsError = ArgType extends MissingDependencyError<
      LoggerPortType | DatabasePortType
    >
      ? true
      : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("requires error argument when some but not all deps provided", () => {
    const builder = GraphBuilder.create()
      .provide(UserServiceAdapter)
      .provide(LoggerAdapter);
    // Database is still missing

    type BuildParams = Parameters<typeof builder.build>;
    type ArgType = BuildParams[0];

    // Should require error with just Database missing
    type IsError = ArgType extends MissingDependencyError<DatabasePortType>
      ? true
      : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();
  });

  it("error argument has __errorBrand for discrimination", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    type BuildParams = Parameters<typeof builder.build>;
    type ArgType = BuildParams[0];

    // Should have the MissingDependencyError brand
    type Brand = ArgType extends { __errorBrand: infer B } ? B : never;
    expectTypeOf<Brand>().toEqualTypeOf<"MissingDependencyError">();
  });
});

// =============================================================================
// Error Message Shows Missing Port Names Tests
// =============================================================================

describe("error message shows missing port names", () => {
  it("error __message includes single missing port name", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);

    type BuildParams = Parameters<typeof builder.build>;
    type ArgType = BuildParams[0];
    type Message = ArgType extends { __message: infer M } ? M : never;

    expectTypeOf<Message>().toEqualTypeOf<"Missing dependencies: Config">();
  });

  it("error __message includes multiple missing port names", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    type BuildParams = Parameters<typeof builder.build>;
    type ArgType = BuildParams[0];
    type Message = ArgType extends { __message: infer M } ? M : never;

    // Should be a union of error messages for each missing port
    expectTypeOf<Message>().toEqualTypeOf<
      "Missing dependencies: Logger" | "Missing dependencies: Database"
    >();
  });

  it("error __message has correct prefix format", () => {
    const builder = GraphBuilder.create().provide(CacheAdapter);

    type BuildParams = Parameters<typeof builder.build>;
    type ArgType = BuildParams[0];
    type Message = ArgType extends { __message: infer M } ? M : never;

    // Verify the message starts with the expected prefix
    type HasPrefix = Message extends `Missing dependencies: ${string}`
      ? true
      : false;
    expectTypeOf<HasPrefix>().toEqualTypeOf<true>();
  });

  it("error carries __missing property with missing ports", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    type BuildParams = Parameters<typeof builder.build>;
    type ArgType = BuildParams[0];
    type MissingPorts = ArgType extends { __missing: infer M } ? M : never;

    expectTypeOf<MissingPorts>().toEqualTypeOf<
      LoggerPortType | DatabasePortType
    >();
  });
});

// =============================================================================
// Empty Graph Builds Successfully Tests
// =============================================================================

describe("empty graph (no adapters) builds successfully", () => {
  it("empty builder builds to Graph<never>", () => {
    const builder = GraphBuilder.create();
    const graph = builder.build();

    type BuildResult = typeof graph;

    // Should be Graph<never>
    type IsEmptyGraph = BuildResult extends Graph<never> ? true : false;
    expectTypeOf<IsEmptyGraph>().toEqualTypeOf<true>();
  });

  it("empty graph is not an error type", () => {
    const builder = GraphBuilder.create();

    type BuildResult = ReturnType<typeof builder.build>;

    // Should not have error brand
    type IsError = BuildResult extends { __errorBrand: string } ? true : false;
    expectTypeOf<IsError>().toEqualTypeOf<false>();
  });

  it("empty graph has adapters property", () => {
    const builder = GraphBuilder.create();
    const graph = builder.build();

    type BuildResult = typeof graph;

    // Should have adapters property
    type HasAdapters = BuildResult extends { adapters: readonly unknown[] }
      ? true
      : false;
    expectTypeOf<HasAdapters>().toEqualTypeOf<true>();
  });

  it("empty graph has __provides tracking type", () => {
    const builder = GraphBuilder.create();
    const graph = builder.build();

    type BuildResult = typeof graph;

    // Should have __provides property (even if never) - optional because phantom types have no runtime value
    type ProvidesType = BuildResult extends { __provides?: infer P } ? P : unknown;
    expectTypeOf<ProvidesType>().toBeNever();
  });
});

// =============================================================================
// build() Returns Graph With Correct Type Information Tests
// =============================================================================

describe("build() returns Graph with correct type information", () => {
  it("Graph has TProvides matching provided ports", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);

    const graph = builder.build();

    type BuildResult = typeof graph;
    type Provides = BuildResult extends Graph<infer P> ? P : never;

    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("Graph __provides property tracks provided ports union", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    const graph = builder.build();

    // Use conditional type inference since __provides is optional (phantom type)
    type ProvidesType = (typeof graph) extends { __provides?: infer P } ? P : never;

    expectTypeOf<ProvidesType>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
  });

  it("Graph adapters array is readonly", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const graph = builder.build();

    type AdaptersType = (typeof graph)["adapters"];

    // Should be a readonly array
    type IsReadonly = AdaptersType extends readonly unknown[] ? true : false;
    expectTypeOf<IsReadonly>().toEqualTypeOf<true>();
  });

  it("Graph type is distinct from error type", () => {
    const validBuilder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    const invalidBuilder = GraphBuilder.create().provide(UserServiceAdapter);

    type ValidResult = ReturnType<typeof validBuilder.build>;

    // Valid result should have adapters (Graph has adapters)
    type HasAdapters = ValidResult extends { adapters: readonly unknown[] }
      ? true
      : false;
    expectTypeOf<HasAdapters>().toEqualTypeOf<true>();

    // Valid result should NOT have error brand
    type ValidHasErrorBrand = ValidResult extends { __errorBrand: string }
      ? true
      : false;
    expectTypeOf<ValidHasErrorBrand>().toEqualTypeOf<false>();

    // Invalid builder requires error argument - check parameter has error brand
    type InvalidParams = Parameters<typeof invalidBuilder.build>;
    type InvalidParamHasErrorBrand = InvalidParams[0] extends { __errorBrand: string }
      ? true
      : false;
    expectTypeOf<InvalidParamHasErrorBrand>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Built Graph Is Immutable Tests
// =============================================================================

describe("built graph is immutable (type-level readonly)", () => {
  it("Graph adapters array type is readonly", () => {
    type GraphAdapters = Graph<LoggerPortType>["adapters"];

    // Verify it's a readonly array at type level
    type IsReadonly = GraphAdapters extends readonly Adapter<
      Port<unknown, string>,
      Port<unknown, string> | never,
      Lifetime
    >[]
      ? true
      : false;
    expectTypeOf<IsReadonly>().toEqualTypeOf<true>();
  });

  it("Graph __provides is tracked correctly", () => {
    type TestGraph = Graph<LoggerPortType | DatabasePortType>;

    // Use conditional type inference to extract the phantom type parameter
    // Direct property access returns T | undefined since __provides is optional
    type Provides = TestGraph extends { __provides?: infer P } ? P : never;
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("Graph structure is readonly", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    // Adapters should be readonly
    type AdaptersType = (typeof graph)["adapters"];
    type IsReadonlyArray = AdaptersType extends readonly unknown[] ? true : false;
    expectTypeOf<IsReadonlyArray>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Built Graph Contains All Registered Adapters Tests
// =============================================================================

describe("built graph contains all registered adapters", () => {
  it("graph adapters array has correct element type", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    type AdaptersType = (typeof graph)["adapters"];
    type ElementType = AdaptersType[number];

    // Element type should be compatible with Adapter
    type IsAdapter = ElementType extends Adapter<
      Port<unknown, string>,
      Port<unknown, string> | never,
      Lifetime
    >
      ? true
      : false;
    expectTypeOf<IsAdapter>().toEqualTypeOf<true>();
  });

  it("graph carries information about all provided ports", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .build();

    // Use conditional type inference since __provides is optional (phantom type)
    type ProvidesType = (typeof graph) extends { __provides?: infer P } ? P : never;

    // All 5 ports should be tracked
    expectTypeOf<ProvidesType>().toEqualTypeOf<
      | LoggerPortType
      | DatabasePortType
      | ConfigPortType
      | CachePortType
      | UserServicePortType
    >();
  });
});

// =============================================================================
// Error Appears At .build() Call Site Tests
// =============================================================================

describe("error appears at .build() call site", () => {
  it("build() parameter type shows error information when deps missing", () => {
    const incompleteBuilder = GraphBuilder.create().provide(UserServiceAdapter);

    // The error information is in the required parameter of build()
    type BuildParams = Parameters<typeof incompleteBuilder.build>;
    type ErrorArg = BuildParams[0];

    // Error should have all diagnostic properties
    type HasErrorBrand = ErrorArg extends { __errorBrand: string }
      ? true
      : false;
    type HasMessage = ErrorArg extends { __message: string }
      ? true
      : false;
    type HasMissing = ErrorArg extends {
      __missing: Port<unknown, string>;
    }
      ? true
      : false;

    expectTypeOf<HasErrorBrand>().toEqualTypeOf<true>();
    expectTypeOf<HasMessage>().toEqualTypeOf<true>();
    expectTypeOf<HasMissing>().toEqualTypeOf<true>();
  });

  it("builder type before build() does not show error", () => {
    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    // Builder itself should still be a valid GraphBuilder
    type BuilderType = typeof builder;

    // Should have provide and build methods
    expectTypeOf<BuilderType>().toHaveProperty("provide");
    expectTypeOf<BuilderType>().toHaveProperty("build");

    // Verify it matches GraphBuilder shape
    type Provides = InferGraphProvides<BuilderType>;
    expectTypeOf<Provides>().toEqualTypeOf<UserServicePortType>();
  });

  it("error is contained in parameter type, causing compile error on call", () => {
    // This tests that the error appears when you TRY to call build()
    // without providing the required dependencies

    const builder = GraphBuilder.create().provide(UserServiceAdapter);

    // The build method is still a function
    expectTypeOf(builder.build).toBeFunction();

    // But it requires an error argument - check parameter has error brand
    type BuildParams = Parameters<typeof builder.build>;
    type HasErrorBrand = BuildParams[0] extends { __errorBrand: "MissingDependencyError" }
      ? true
      : false;
    expectTypeOf<HasErrorBrand>().toEqualTypeOf<true>();
  });
});
