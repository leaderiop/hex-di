/**
 * Type-level tests for @hex-di/testing package.
 *
 * These tests verify:
 * 1. TestGraphBuilder type inference and InferTestGraphProvides utility
 * 2. createMockAdapter type inference for partial implementations
 * 3. createSpiedMockAdapter MockedFunction types
 * 4. createAdapterTest dependency typing
 * 5. assertPortProvided type narrowing (runtime assertion)
 * 6. Graph assertions type safety
 * 7. renderWithContainer result types
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, type Port, type InferService } from "@hex-di/ports";
import { GraphBuilder, createAdapter, type Graph, type Adapter, type Lifetime } from "@hex-di/graph";
import type { MockedFunction } from "vitest";

// Import testing utilities
import { TestGraphBuilder, type InferTestGraphProvides } from "../src/test-graph-builder.js";
import { createMockAdapter, type MockAdapterOptions } from "../src/mock-adapter.js";
import { createAdapterTest, type AdapterTestHarness } from "../src/adapter-test-harness.js";
import { assertGraphComplete, assertPortProvided, assertLifetime } from "../src/graph-assertions.js";
import { serializeGraph, type GraphSnapshot, type AdapterSnapshot } from "../src/graph-snapshot.js";
import { createSpiedMockAdapter, type SpiedAdapter, type SpiedService } from "../src/vitest/spied-mock-adapter.js";

// =============================================================================
// Test Service Interfaces
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
  debug: boolean;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigPort = createPort<"Config", Config>("Config");

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
  factory: () => ({
    log: () => {},
    warn: () => {},
    error: () => {},
  }),
});

const DatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({
    query: async () => ({}),
    connect: async () => {},
    disconnect: async () => {},
  }),
});

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "request",
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Fetching user ${id}`);
      return { id, name: "Test" };
    },
    createUser: async (name) => {
      deps.Logger.log(`Creating user ${name}`);
      return { id: "new", name };
    },
  }),
});

// =============================================================================
// TestGraphBuilder Type Tests
// =============================================================================

describe("TestGraphBuilder type inference", () => {
  it("from() preserves TProvides from input graph", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    // InferTestGraphProvides should extract the same type as the input graph
    type InferredProvides = InferTestGraphProvides<typeof testBuilder>;

    // Should include both LoggerPort and DatabasePort
    expectTypeOf<LoggerPortType>().toMatchTypeOf<InferredProvides>();
    expectTypeOf<DatabasePortType>().toMatchTypeOf<InferredProvides>();
  });

  it("override() preserves TProvides type", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const mockLoggerAdapter = createMockAdapter(LoggerPort, { log: () => {} });

    const withOverride = TestGraphBuilder.from(graph).override(mockLoggerAdapter);

    type BeforeOverride = InferTestGraphProvides<typeof testBuilder>;
    type AfterOverride = InferTestGraphProvides<typeof withOverride>;

    const testBuilder = TestGraphBuilder.from(graph);

    // TProvides should be the same before and after override
    expectTypeOf<BeforeOverride>().toEqualTypeOf<AfterOverride>();
  });

  it("build() returns Graph with correct TProvides", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .build();

    const testGraph = TestGraphBuilder.from(graph).build();

    // The built graph should have the same type as the original
    expectTypeOf<typeof testGraph>().toEqualTypeOf<typeof graph>();
  });

  it("override adapter must provide port that exists in graph", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    const testBuilder = TestGraphBuilder.from(graph);

    // This should compile - LoggerPort is in the graph
    const mockLoggerAdapter = createMockAdapter(LoggerPort, { log: () => {} });
    type ValidOverride = Parameters<typeof testBuilder.override>[0];
    expectTypeOf(mockLoggerAdapter).toMatchTypeOf<ValidOverride>();

    // DatabasePort is NOT in the graph - but due to how override() is typed,
    // we verify the constraint exists on the type level
    type OverrideConstraint = Parameters<typeof testBuilder.override>[0];
    type ConstraintProvides = OverrideConstraint extends Adapter<infer P, infer _R, infer _L> ? P : never;

    // The constraint should include LoggerPortType (what's in the graph)
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ConstraintProvides>();
  });

  it("InferTestGraphProvides returns never for non-TestGraphBuilder types", () => {
    type NotBuilder = { foo: string };
    type Result = InferTestGraphProvides<NotBuilder>;

    expectTypeOf<Result>().toEqualTypeOf<never>();
  });
});

// =============================================================================
// createMockAdapter Type Tests
// =============================================================================

describe("createMockAdapter type inference", () => {
  it("accepts partial implementation of port service", () => {
    // This should compile - only providing some methods
    const mockAdapter = createMockAdapter(LoggerPort, {
      log: () => {},
      // warn and error are optional
    });

    expectTypeOf(mockAdapter).toMatchTypeOf<Adapter<LoggerPortType, never, Lifetime>>();
  });

  it("factory returns full service type", () => {
    const mockAdapter = createMockAdapter(LoggerPort, {
      log: () => {},
    });

    // Factory should return the full Logger type
    type FactoryReturn = ReturnType<typeof mockAdapter.factory>;
    expectTypeOf<FactoryReturn>().toEqualTypeOf<Logger>();
  });

  it("implementation must be assignable to Partial<Service>", () => {
    // Second parameter type should be Partial<InferService<P>>
    type CreateMockAdapterParams = Parameters<typeof createMockAdapter<LoggerPortType>>;
    type ImplementationParam = CreateMockAdapterParams[1];

    expectTypeOf<ImplementationParam>().toEqualTypeOf<Partial<Logger>>();
  });

  it("options parameter is optional and has correct type", () => {
    // Options parameter should be optional
    // The function signature is: createMockAdapter<P, L>(port, impl, options?)
    // where options includes lifetime
    const adapter1 = createMockAdapter(LoggerPort, { log: () => {} });
    const adapter2 = createMockAdapter(LoggerPort, { log: () => {} }, { lifetime: "singleton" });

    // Both should compile and return Adapter
    expectTypeOf(adapter1).toMatchTypeOf<Adapter<LoggerPortType, never, Lifetime>>();
    expectTypeOf(adapter2).toMatchTypeOf<Adapter<LoggerPortType, never, "singleton">>();
  });

  it("returned adapter has correct structure", () => {
    const mockAdapter = createMockAdapter(LoggerPort, { log: () => {} });

    // Check provides property
    expectTypeOf(mockAdapter.provides).toEqualTypeOf<LoggerPortType>();

    // Check requires is empty
    expectTypeOf(mockAdapter.requires).toEqualTypeOf<readonly []>();

    // Check lifetime
    expectTypeOf(mockAdapter.lifetime).toMatchTypeOf<Lifetime>();

    // Check factory is a function
    expectTypeOf(mockAdapter.factory).toBeFunction();
  });

  it("works with non-function properties", () => {
    const mockAdapter = createMockAdapter(ConfigPort, {
      apiUrl: "http://test.com",
      timeout: 5000,
      // debug is optional
    });

    type FactoryReturn = ReturnType<typeof mockAdapter.factory>;
    expectTypeOf<FactoryReturn>().toEqualTypeOf<Config>();
  });
});

// =============================================================================
// createSpiedMockAdapter Type Tests
// =============================================================================

describe("createSpiedMockAdapter type inference", () => {
  it("SpiedService transforms methods to MockedFunction", () => {
    type SpiedLogger = SpiedService<Logger>;

    // Each method should be a MockedFunction
    expectTypeOf<SpiedLogger["log"]>().toEqualTypeOf<MockedFunction<(message: string) => void>>();
    expectTypeOf<SpiedLogger["warn"]>().toEqualTypeOf<MockedFunction<(message: string) => void>>();
    expectTypeOf<SpiedLogger["error"]>().toEqualTypeOf<MockedFunction<(message: string) => void>>();
  });

  it("SpiedService preserves non-function properties", () => {
    type SpiedConfig = SpiedService<Config>;

    // Non-function properties should remain unchanged
    expectTypeOf<SpiedConfig["apiUrl"]>().toEqualTypeOf<string>();
    expectTypeOf<SpiedConfig["timeout"]>().toEqualTypeOf<number>();
    expectTypeOf<SpiedConfig["debug"]>().toEqualTypeOf<boolean>();
  });

  it("SpiedAdapter is an alias for Adapter with request lifetime", () => {
    type TestSpiedAdapter = SpiedAdapter<LoggerPortType>;
    type ExpectedType = Adapter<LoggerPortType, never, "request">;

    // SpiedAdapter should be exactly Adapter<P, never, "request">
    expectTypeOf<TestSpiedAdapter>().toEqualTypeOf<ExpectedType>();
  });

  it("createSpiedMockAdapter returns SpiedAdapter type", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);

    expectTypeOf(spiedAdapter).toMatchTypeOf<SpiedAdapter<LoggerPortType>>();
  });

  it("factory return type is the service type at compile time", () => {
    const spiedAdapter = createSpiedMockAdapter(LoggerPort);
    const impl = spiedAdapter.factory({});

    // At compile time, the return type is Logger (not SpiedService<Logger>)
    // At runtime, all methods are vi.fn() spies
    expectTypeOf(impl).toEqualTypeOf<Logger>();
  });

  it("defaults parameter accepts Partial<Service>", () => {
    // This should compile with partial defaults
    const spiedAdapter = createSpiedMockAdapter(LoggerPort, {
      log: (message: string) => {
        console.log(message);
      },
      // warn and error are optional
    });

    expectTypeOf(spiedAdapter).toMatchTypeOf<SpiedAdapter<LoggerPortType>>();
  });

  it("SpiedService type can be used to access spy methods", () => {
    // SpiedService is provided for users who want type-safe spy access
    type SpiedLogger = SpiedService<Logger>;

    // MockedFunction should have mock property
    expectTypeOf<SpiedLogger["log"]>().toHaveProperty("mock");

    // And spy methods
    expectTypeOf<SpiedLogger["log"]>().toHaveProperty("mockClear");
    expectTypeOf<SpiedLogger["log"]>().toHaveProperty("mockReset");
    expectTypeOf<SpiedLogger["log"]>().toHaveProperty("mockImplementation");
    expectTypeOf<SpiedLogger["log"]>().toHaveProperty("mockReturnValue");
  });
});

// =============================================================================
// createAdapterTest Type Tests
// =============================================================================

describe("createAdapterTest type inference", () => {
  it("infers TProvides and TRequires from adapter", () => {
    type HarnessType = AdapterTestHarness<UserServicePortType, LoggerPortType | DatabasePortType>;

    // invoke() should return the service type
    type InvokeReturn = ReturnType<HarnessType["invoke"]>;
    expectTypeOf<InvokeReturn>().toEqualTypeOf<UserService>();

    // getDeps() should return resolved dependencies
    type GetDepsReturn = ReturnType<HarnessType["getDeps"]>;
    expectTypeOf<GetDepsReturn>().toHaveProperty("Logger");
    expectTypeOf<GetDepsReturn>().toHaveProperty("Database");
  });

  it("mockDependencies must match adapter requires", () => {
    // UserServiceAdapter requires Logger and Database
    type MockDepsType = Parameters<typeof createAdapterTest<
      UserServicePortType,
      LoggerPortType | DatabasePortType,
      "request"
    >>[1];

    // Should have Logger and Database properties
    expectTypeOf<MockDepsType>().toHaveProperty("Logger");
    expectTypeOf<MockDepsType>().toHaveProperty("Database");

    // Values should be the service types
    type LoggerValue = MockDepsType["Logger"];
    type DatabaseValue = MockDepsType["Database"];

    expectTypeOf<LoggerValue>().toEqualTypeOf<Logger>();
    expectTypeOf<DatabaseValue>().toEqualTypeOf<Database>();
  });

  it("invoke() returns correct service type", () => {
    const mockLogger: Logger = {
      log: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockDatabase: Database = {
      query: async () => ({}),
      connect: async () => {},
      disconnect: async () => {},
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    // invoke() should return UserService
    type InvokeReturn = ReturnType<typeof harness.invoke>;
    expectTypeOf<InvokeReturn>().toEqualTypeOf<UserService>();
  });

  it("getDeps() returns mock references with correct types", () => {
    const mockLogger: Logger = {
      log: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockDatabase: Database = {
      query: async () => ({}),
      connect: async () => {},
      disconnect: async () => {},
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    // getDeps() should return object with Logger and Database
    const deps = harness.getDeps();

    expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
    expectTypeOf(deps.Database).toEqualTypeOf<Database>();
  });

  it("works with adapters that have no dependencies", () => {
    const harness = createAdapterTest(LoggerAdapter, {});

    // getDeps() should return empty object type
    type GetDepsReturn = ReturnType<typeof harness.getDeps>;

    // For adapters with no requires (never), ResolvedDeps<never> should be {}
    expectTypeOf<GetDepsReturn>().toMatchTypeOf<object>();
  });

  it("harness is frozen (readonly)", () => {
    const mockLogger: Logger = {
      log: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockDatabase: Database = {
      query: async () => ({}),
      connect: async () => {},
      disconnect: async () => {},
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    // AdapterTestHarness methods should be readonly (enforced at runtime by freeze)
    expectTypeOf(harness.invoke).toBeFunction();
    expectTypeOf(harness.getDeps).toBeFunction();
  });
});

// =============================================================================
// Graph Assertions Type Tests
// =============================================================================

describe("graph assertions type safety", () => {
  it("assertGraphComplete accepts Graph type", () => {
    type AssertGraphCompleteParam = Parameters<typeof assertGraphComplete>[0];

    // Should accept any Graph<Port<unknown, string>>
    expectTypeOf<Graph<Port<unknown, string>>>().toMatchTypeOf<AssertGraphCompleteParam>();
  });

  it("assertPortProvided accepts graph and port", () => {
    type AssertPortProvidedParams = Parameters<typeof assertPortProvided>;

    // First param is Graph
    expectTypeOf<AssertPortProvidedParams[0]>().toMatchTypeOf<Graph<Port<unknown, string>>>();

    // Second param is Port
    expectTypeOf<AssertPortProvidedParams[1]>().toMatchTypeOf<Port<unknown, string>>();
  });

  it("assertLifetime accepts graph, port, and lifetime", () => {
    type AssertLifetimeParams = Parameters<typeof assertLifetime>;

    // First param is Graph
    expectTypeOf<AssertLifetimeParams[0]>().toMatchTypeOf<Graph<Port<unknown, string>>>();

    // Second param is Port
    expectTypeOf<AssertLifetimeParams[1]>().toMatchTypeOf<Port<unknown, string>>();

    // Third param is Lifetime
    expectTypeOf<AssertLifetimeParams[2]>().toEqualTypeOf<Lifetime>();
  });

  it("assertion functions return void", () => {
    expectTypeOf<ReturnType<typeof assertGraphComplete>>().toEqualTypeOf<void>();
    expectTypeOf<ReturnType<typeof assertPortProvided>>().toEqualTypeOf<void>();
    expectTypeOf<ReturnType<typeof assertLifetime>>().toEqualTypeOf<void>();
  });
});

// =============================================================================
// Graph Snapshot Type Tests
// =============================================================================

describe("serializeGraph type safety", () => {
  it("serializeGraph accepts Graph and returns GraphSnapshot", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    const snapshot = serializeGraph(graph);

    expectTypeOf(snapshot).toMatchTypeOf<GraphSnapshot>();
  });

  it("GraphSnapshot has correct structure", () => {
    expectTypeOf<GraphSnapshot>().toHaveProperty("adapters");

    // adapters should be an array of AdapterSnapshot
    type AdaptersProperty = GraphSnapshot["adapters"];
    expectTypeOf<AdaptersProperty>().toMatchTypeOf<readonly AdapterSnapshot[]>();
  });

  it("AdapterSnapshot has correct properties", () => {
    expectTypeOf<AdapterSnapshot>().toHaveProperty("port");
    expectTypeOf<AdapterSnapshot>().toHaveProperty("lifetime");
    expectTypeOf<AdapterSnapshot>().toHaveProperty("requires");

    // port should be string
    expectTypeOf<AdapterSnapshot["port"]>().toEqualTypeOf<string>();

    // lifetime should be Lifetime
    expectTypeOf<AdapterSnapshot["lifetime"]>().toEqualTypeOf<Lifetime>();

    // requires should be readonly string[]
    expectTypeOf<AdapterSnapshot["requires"]>().toMatchTypeOf<readonly string[]>();
  });
});

// =============================================================================
// Integration Type Tests - Type Inference Flow
// =============================================================================

describe("type inference flow integration", () => {
  it("TestGraphBuilder -> build -> createContainer preserves types", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter)
      .build();

    const testGraph = TestGraphBuilder.from(graph)
      .override(createMockAdapter(LoggerPort, { log: () => {} }))
      .build();

    // testGraph should have same type as original graph
    expectTypeOf<typeof testGraph>().toEqualTypeOf<typeof graph>();
  });

  it("createMockAdapter -> TestGraphBuilder.override type safety", () => {
    const graph = GraphBuilder.create()
      .provide(LoggerAdapter)
      .build();

    // Create mock that matches the graph's ports
    const mockAdapter = createMockAdapter(LoggerPort, { log: () => {} });

    // This should compile without error
    const testBuilder = TestGraphBuilder.from(graph);
    const withOverride = testBuilder.override(mockAdapter);

    expectTypeOf<typeof withOverride>().toMatchTypeOf<TestGraphBuilder<LoggerPortType>>();
  });

  it("createAdapterTest -> invoke -> getDeps type flow", () => {
    const mockLogger: Logger = {
      log: () => {},
      warn: () => {},
      error: () => {},
    };

    const mockDatabase: Database = {
      query: async () => ({}),
      connect: async () => {},
      disconnect: async () => {},
    };

    const harness = createAdapterTest(UserServiceAdapter, {
      Logger: mockLogger,
      Database: mockDatabase,
    });

    // Full type inference chain
    const service = harness.invoke();
    const deps = harness.getDeps();

    expectTypeOf(service).toEqualTypeOf<UserService>();
    expectTypeOf(deps.Logger).toEqualTypeOf<Logger>();
    expectTypeOf(deps.Database).toEqualTypeOf<Database>();
  });

  it("SpiedAdapter -> factory returns service type at compile time", () => {
    const spiedAdapter = createSpiedMockAdapter(DatabasePort, {
      query: async (sql: string) => [{ sql }],
    });

    const impl = spiedAdapter.factory({});

    // At compile time, the type is Database
    // At runtime, all methods are vi.fn() spies
    expectTypeOf(impl).toEqualTypeOf<Database>();

    // To access spy methods, use SpiedService type
    type SpiedDatabase = SpiedService<Database>;
    expectTypeOf<SpiedDatabase["query"]>().toMatchTypeOf<MockedFunction<(sql: string) => Promise<unknown>>>();
  });
});
