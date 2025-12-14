/**
 * Type-level tests for dependency validation with union subtraction.
 *
 * These tests verify:
 * 1. Exclude<TRequires, TProvides> computes unsatisfied dependencies
 * 2. When all deps satisfied, Exclude<...> is `never`
 * 3. When deps missing, Exclude<...> is the missing Port union
 * 4. Partial satisfaction correctly shows remaining ports
 * 5. `never` requires always results in `never` unsatisfied
 * 6. Order of provide() calls doesn't affect validation result
 * 7. Validation works with complex multi-adapter graphs
 * 8. Utility types handle edge cases correctly
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  InferGraphProvides,
  InferGraphRequires,
  UnsatisfiedDependencies,
  IsSatisfied,
  ValidGraph,
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

interface CacheService {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", ConfigService>("Config");
const CachePort = createPort<"Cache", CacheService>("Cache");
const EmailPort = createPort<"Email", EmailService>("Email");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;
type ConfigPortType = typeof ConfigPort;
type CachePortType = typeof CachePort;
type EmailPortType = typeof EmailPort;

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

const EmailAdapter = createAdapter({
  provides: EmailPort,
  requires: [LoggerPort, ConfigPort],
  lifetime: "request",
  factory: () => ({ send: async () => {} }),
});

// =============================================================================
// Exclude<TRequires, TProvides> Computes Unsatisfied Dependencies Tests
// =============================================================================

describe("Exclude<TRequires, TProvides> computes unsatisfied dependencies", () => {
  it("computes unsatisfied deps using standard Exclude", () => {
    // Direct test of Exclude behavior
    type Provided = LoggerPortType | DatabasePortType;
    type Required = LoggerPortType | DatabasePortType | ConfigPortType;
    type Unsatisfied = Exclude<Required, Provided>;

    // ConfigPort is required but not provided
    expectTypeOf<Unsatisfied>().toEqualTypeOf<ConfigPortType>();
  });

  it("computes unsatisfied using UnsatisfiedDependencies utility", () => {
    type Provided = LoggerPortType | DatabasePortType;
    type Required = LoggerPortType | DatabasePortType | ConfigPortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toEqualTypeOf<ConfigPortType>();
  });

  it("identifies multiple missing dependencies", () => {
    type Provided = LoggerPortType;
    type Required = LoggerPortType | DatabasePortType | ConfigPortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    // Both DatabasePort and ConfigPort are missing
    expectTypeOf<Unsatisfied>().toEqualTypeOf<
      DatabasePortType | ConfigPortType
    >();
  });
});

// =============================================================================
// When All Deps Satisfied, Exclude<...> is `never` Tests
// =============================================================================

describe("when all deps satisfied, Exclude<...> is `never`", () => {
  it("returns never when all required ports are provided", () => {
    type Provided = LoggerPortType | DatabasePortType | ConfigPortType;
    type Required = LoggerPortType | DatabasePortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toBeNever();
  });

  it("returns never when provided exactly matches required", () => {
    type Provided = LoggerPortType | DatabasePortType;
    type Required = LoggerPortType | DatabasePortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toBeNever();
  });

  it("returns never for empty graph (no requirements)", () => {
    type Provided = never;
    type Required = never;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toBeNever();
  });

  it("IsSatisfied returns true when all deps provided", () => {
    type Provided = LoggerPortType | DatabasePortType;
    type Required = LoggerPortType | DatabasePortType;
    type Satisfied = IsSatisfied<Provided, Required>;

    expectTypeOf<Satisfied>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// When Deps Missing, Exclude<...> is the Missing Port Union Tests
// =============================================================================

describe("when deps missing, Exclude<...> is the missing Port union", () => {
  it("shows single missing port", () => {
    type Provided = LoggerPortType;
    type Required = LoggerPortType | DatabasePortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toEqualTypeOf<DatabasePortType>();
  });

  it("shows multiple missing ports as union", () => {
    type Provided = LoggerPortType;
    type Required =
      | LoggerPortType
      | DatabasePortType
      | ConfigPortType
      | CachePortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toEqualTypeOf<
      DatabasePortType | ConfigPortType | CachePortType
    >();
  });

  it("IsSatisfied returns false when deps missing", () => {
    type Provided = LoggerPortType;
    type Required = LoggerPortType | DatabasePortType;
    type Satisfied = IsSatisfied<Provided, Required>;

    expectTypeOf<Satisfied>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Partial Satisfaction Correctly Shows Remaining Ports Tests
// =============================================================================

describe("partial satisfaction correctly shows remaining ports", () => {
  it("shows one remaining when providing some deps", () => {
    type Provided = LoggerPortType | DatabasePortType;
    type Required = LoggerPortType | DatabasePortType | ConfigPortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toEqualTypeOf<ConfigPortType>();
  });

  it("progressively reduces unsatisfied deps", () => {
    type Required = LoggerPortType | DatabasePortType | ConfigPortType;

    // Step 0: Nothing provided
    type Step0 = UnsatisfiedDependencies<never, Required>;
    expectTypeOf<Step0>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | ConfigPortType
    >();

    // Step 1: Logger provided
    type Step1 = UnsatisfiedDependencies<LoggerPortType, Required>;
    expectTypeOf<Step1>().toEqualTypeOf<DatabasePortType | ConfigPortType>();

    // Step 2: Logger + Database provided
    type Step2 = UnsatisfiedDependencies<
      LoggerPortType | DatabasePortType,
      Required
    >;
    expectTypeOf<Step2>().toEqualTypeOf<ConfigPortType>();

    // Step 3: All provided
    type Step3 = UnsatisfiedDependencies<
      LoggerPortType | DatabasePortType | ConfigPortType,
      Required
    >;
    expectTypeOf<Step3>().toBeNever();
  });

  it("works with real graph builder types", () => {
    // Build graph step by step
    const step1 = GraphBuilder.create().provide(UserServiceAdapter);
    type R1 = InferGraphRequires<typeof step1>;
    type P1 = InferGraphProvides<typeof step1>;
    type U1 = UnsatisfiedDependencies<P1, R1>;

    // UserService requires Logger and Database
    expectTypeOf<U1>().toEqualTypeOf<LoggerPortType | DatabasePortType>();

    // Add Logger
    const step2 = step1.provide(LoggerAdapter);
    type R2 = InferGraphRequires<typeof step2>;
    type P2 = InferGraphProvides<typeof step2>;
    type U2 = UnsatisfiedDependencies<P2, R2>;

    // Now only Database is missing
    expectTypeOf<U2>().toEqualTypeOf<DatabasePortType>();

    // Add Database
    const step3 = step2.provide(DatabaseAdapter);
    type R3 = InferGraphRequires<typeof step3>;
    type P3 = InferGraphProvides<typeof step3>;
    type U3 = UnsatisfiedDependencies<P3, R3>;

    // All satisfied
    expectTypeOf<U3>().toBeNever();
  });
});

// =============================================================================
// `never` Requires Always Results in `never` Unsatisfied Tests
// =============================================================================

describe("`never` requires always results in `never` unsatisfied", () => {
  it("never requirements with never provides is satisfied", () => {
    type Unsatisfied = UnsatisfiedDependencies<never, never>;
    expectTypeOf<Unsatisfied>().toBeNever();
  });

  it("never requirements with some provides is satisfied", () => {
    type Unsatisfied = UnsatisfiedDependencies<LoggerPortType, never>;
    expectTypeOf<Unsatisfied>().toBeNever();
  });

  it("IsSatisfied with never requirements returns true", () => {
    type Satisfied1 = IsSatisfied<never, never>;
    type Satisfied2 = IsSatisfied<LoggerPortType, never>;
    type Satisfied3 = IsSatisfied<
      LoggerPortType | DatabasePortType | ConfigPortType,
      never
    >;

    expectTypeOf<Satisfied1>().toEqualTypeOf<true>();
    expectTypeOf<Satisfied2>().toEqualTypeOf<true>();
    expectTypeOf<Satisfied3>().toEqualTypeOf<true>();
  });

  it("adapters with no deps produce never unsatisfied", () => {
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(ConfigAdapter);

    type Provided = InferGraphProvides<typeof builder>;
    type Required = InferGraphRequires<typeof builder>;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    // All adapters have no dependencies
    expectTypeOf<Required>().toBeNever();
    expectTypeOf<Unsatisfied>().toBeNever();
  });
});

// =============================================================================
// Order of provide() Calls Doesn't Affect Validation Result Tests
// =============================================================================

describe("order of provide() calls doesn't affect validation result", () => {
  it("same validation result regardless of adapter order", () => {
    const orderABC = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    const orderCAB = GraphBuilder.create()
      .provide(UserServiceAdapter)
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter);

    const orderBCA = GraphBuilder.create()
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .provide(LoggerAdapter);

    // All should have same unsatisfied deps
    type U_ABC = UnsatisfiedDependencies<
      InferGraphProvides<typeof orderABC>,
      InferGraphRequires<typeof orderABC>
    >;
    type U_CAB = UnsatisfiedDependencies<
      InferGraphProvides<typeof orderCAB>,
      InferGraphRequires<typeof orderCAB>
    >;
    type U_BCA = UnsatisfiedDependencies<
      InferGraphProvides<typeof orderBCA>,
      InferGraphRequires<typeof orderBCA>
    >;

    // All should be never (all deps satisfied)
    expectTypeOf<U_ABC>().toBeNever();
    expectTypeOf<U_CAB>().toBeNever();
    expectTypeOf<U_BCA>().toBeNever();
  });

  it("incomplete graph same result regardless of order", () => {
    const order1 = GraphBuilder.create()
      .provide(UserServiceAdapter)
      .provide(LoggerAdapter);

    const order2 = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(UserServiceAdapter);

    type U1 = UnsatisfiedDependencies<
      InferGraphProvides<typeof order1>,
      InferGraphRequires<typeof order1>
    >;
    type U2 = UnsatisfiedDependencies<
      InferGraphProvides<typeof order2>,
      InferGraphRequires<typeof order2>
    >;

    // Both should show Database as missing
    expectTypeOf<U1>().toEqualTypeOf<DatabasePortType>();
    expectTypeOf<U2>().toEqualTypeOf<DatabasePortType>();
  });

  it("IsSatisfied same result regardless of order", () => {
    // Complete graph in different orders
    const completeA = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    const completeB = GraphBuilder.create()
      .provide(UserServiceAdapter)
      .provide(DatabaseAdapter)
      .provide(LoggerAdapter);

    type SatA = IsSatisfied<
      InferGraphProvides<typeof completeA>,
      InferGraphRequires<typeof completeA>
    >;
    type SatB = IsSatisfied<
      InferGraphProvides<typeof completeB>,
      InferGraphRequires<typeof completeB>
    >;

    expectTypeOf<SatA>().toEqualTypeOf<true>();
    expectTypeOf<SatB>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Validation Works with Complex Multi-Adapter Graphs Tests
// =============================================================================

describe("validation works with complex multi-adapter graphs", () => {
  it("validates graph with multiple layers of dependencies", () => {
    // Build a complex graph:
    // Logger (no deps)
    // Config (no deps)
    // Database (no deps)
    // Cache (requires Config)
    // UserService (requires Logger, Database)
    // Email (requires Logger, Config)

    const completeGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .provide(EmailAdapter);

    type Provided = InferGraphProvides<typeof completeGraph>;
    type Required = InferGraphRequires<typeof completeGraph>;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    // All 6 ports should be provided
    expectTypeOf<Provided>().toEqualTypeOf<
      | LoggerPortType
      | ConfigPortType
      | DatabasePortType
      | CachePortType
      | UserServicePortType
      | EmailPortType
    >();

    // Requirements are: Config, Logger, Database (from Cache, UserService, Email)
    // But all are provided, so unsatisfied should be never
    expectTypeOf<Unsatisfied>().toBeNever();
  });

  it("detects missing deps in complex graph", () => {
    // Build incomplete graph - missing Config and Database
    const incompleteGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(CacheAdapter) // requires Config
      .provide(UserServiceAdapter) // requires Logger, Database
      .provide(EmailAdapter); // requires Logger, Config

    type Provided = InferGraphProvides<typeof incompleteGraph>;
    type Required = InferGraphRequires<typeof incompleteGraph>;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    // Logger is provided
    // Config and Database are missing
    expectTypeOf<Unsatisfied>().toEqualTypeOf<
      ConfigPortType | DatabasePortType
    >();
  });

  it("IsSatisfied correctly evaluates complex graph", () => {
    const completeGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(ConfigAdapter)
      .provide(DatabaseAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter)
      .provide(EmailAdapter);

    const incompleteGraph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(CacheAdapter)
      .provide(UserServiceAdapter);

    type SatComplete = IsSatisfied<
      InferGraphProvides<typeof completeGraph>,
      InferGraphRequires<typeof completeGraph>
    >;
    type SatIncomplete = IsSatisfied<
      InferGraphProvides<typeof incompleteGraph>,
      InferGraphRequires<typeof incompleteGraph>
    >;

    expectTypeOf<SatComplete>().toEqualTypeOf<true>();
    expectTypeOf<SatIncomplete>().toEqualTypeOf<false>();
  });

  it("ValidGraph evaluates to graph type when satisfied", () => {
    type CompleteProv = LoggerPortType | DatabasePortType | UserServicePortType;
    type CompleteReq = LoggerPortType | DatabasePortType;
    type Result = ValidGraph<CompleteProv, CompleteReq>;

    // When satisfied, should not be an error type
    // It should be the graph representation type
    expectTypeOf<Result>().not.toBeNever();
  });

  it("ValidGraph evaluates to error info when unsatisfied", () => {
    type IncompleteProv = LoggerPortType;
    type IncompleteReq = LoggerPortType | DatabasePortType;
    type Result = ValidGraph<IncompleteProv, IncompleteReq>;

    // When unsatisfied, should have missing info
    // The result should contain information about what's missing
    type IsMissing = Result extends { __missing: infer M } ? M : never;
    expectTypeOf<IsMissing>().toEqualTypeOf<DatabasePortType>();
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe("validation utility types handle edge cases", () => {
  it("handles single port in provides and requires", () => {
    type Unsatisfied1 = UnsatisfiedDependencies<LoggerPortType, LoggerPortType>;
    type Unsatisfied2 = UnsatisfiedDependencies<
      LoggerPortType,
      DatabasePortType
    >;

    expectTypeOf<Unsatisfied1>().toBeNever();
    expectTypeOf<Unsatisfied2>().toEqualTypeOf<DatabasePortType>();
  });

  it("handles superset provides (more than needed)", () => {
    type Provided =
      | LoggerPortType
      | DatabasePortType
      | ConfigPortType
      | CachePortType;
    type Required = LoggerPortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    expectTypeOf<Unsatisfied>().toBeNever();
  });

  it("handles disjoint provides and requires", () => {
    type Provided = LoggerPortType | DatabasePortType;
    type Required = ConfigPortType | CachePortType;
    type Unsatisfied = UnsatisfiedDependencies<Provided, Required>;

    // No overlap means all requires are missing
    expectTypeOf<Unsatisfied>().toEqualTypeOf<ConfigPortType | CachePortType>();
  });

  it("IsSatisfied with provides=never and requires=port returns false", () => {
    type Satisfied = IsSatisfied<never, LoggerPortType>;
    expectTypeOf<Satisfied>().toEqualTypeOf<false>();
  });
});
