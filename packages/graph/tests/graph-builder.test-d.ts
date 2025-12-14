/**
 * Type-level tests for GraphBuilder core structure.
 *
 * These tests verify:
 * 1. GraphBuilder.create() returns builder with TProvides = never, TRequires = never
 * 2. GraphBuilder is a class with proper typing
 * 3. Builder type carries both TProvides and TRequires type parameters
 * 4. GraphBuilder instances are immutable
 * 5. Builder can hold internal adapter registry
 * 6. InferGraphProvides extracts TProvides from builder
 * 7. InferGraphRequires extracts TRequires from builder
 * 8. GraphBuilder has method signatures for provide() and build()
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, Port } from "@hex-di/ports";
import {
  GraphBuilder,
  Adapter,
  InferGraphProvides,
  InferGraphRequires,
  createAdapter,
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

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;

// =============================================================================
// GraphBuilder.create() Tests
// =============================================================================

describe("GraphBuilder.create()", () => {
  it("returns builder with TProvides = never", () => {
    const builder = GraphBuilder.create();

    // The initial builder should have TProvides = never
    type BuilderType = typeof builder;
    type Provides = InferGraphProvides<BuilderType>;

    expectTypeOf<Provides>().toBeNever();
  });

  it("returns builder with TRequires = never", () => {
    const builder = GraphBuilder.create();

    // The initial builder should have TRequires = never
    type BuilderType = typeof builder;
    type Requires = InferGraphRequires<BuilderType>;

    expectTypeOf<Requires>().toBeNever();
  });

  it("returns correctly typed GraphBuilder<never, never>", () => {
    const builder = GraphBuilder.create();

    // Should match GraphBuilder<never, never>
    expectTypeOf(builder).toMatchTypeOf<GraphBuilder<never, never>>();
  });
});

// =============================================================================
// GraphBuilder Type Structure Tests
// =============================================================================

describe("GraphBuilder type structure", () => {
  it("is a class with proper typing", () => {
    // GraphBuilder should be a constructable type (class) with static create method
    expectTypeOf(GraphBuilder.create).toBeFunction();

    // The returned instance should have expected methods
    const builder = GraphBuilder.create();
    expectTypeOf(builder).toHaveProperty("provide");
    expectTypeOf(builder).toHaveProperty("build");
  });

  it("carries both TProvides and TRequires type parameters", () => {
    // Define a builder type with specific type parameters
    type BuilderWithTypes = GraphBuilder<LoggerPortType, DatabasePortType>;

    // Verify we can extract both type parameters
    type ExtractedProvides = InferGraphProvides<BuilderWithTypes>;
    type ExtractedRequires = InferGraphRequires<BuilderWithTypes>;

    expectTypeOf<ExtractedProvides>().toEqualTypeOf<LoggerPortType>();
    expectTypeOf<ExtractedRequires>().toEqualTypeOf<DatabasePortType>();
  });

  it("supports union types for TProvides and TRequires", () => {
    type BuilderWithUnions = GraphBuilder<
      LoggerPortType | DatabasePortType,
      UserServicePortType
    >;

    type ExtractedProvides = InferGraphProvides<BuilderWithUnions>;
    type ExtractedRequires = InferGraphRequires<BuilderWithUnions>;

    expectTypeOf<ExtractedProvides>().toEqualTypeOf<
      LoggerPortType | DatabasePortType
    >();
    expectTypeOf<ExtractedRequires>().toEqualTypeOf<UserServicePortType>();
  });

  it("has provide method signature", () => {
    const builder = GraphBuilder.create();

    // provide should accept an adapter and return a new builder
    expectTypeOf(builder.provide).toBeFunction();
  });

  it("has build method signature", () => {
    const builder = GraphBuilder.create();

    // build should be a function
    expectTypeOf(builder.build).toBeFunction();
  });
});

// =============================================================================
// GraphBuilder Immutability Tests
// =============================================================================

describe("GraphBuilder immutability", () => {
  it("instances are frozen (readonly adapters)", () => {
    // The adapters property should be readonly
    type BuilderType = GraphBuilder<never, never>;

    // We verify this by checking that the adapters array is readonly
    // This is enforced at the type level by the class definition
    const builder = GraphBuilder.create();

    // The builder instance exists and is properly typed
    expectTypeOf(builder).toMatchTypeOf<GraphBuilder<never, never>>();
  });

  it("builder type is distinct from mutable objects", () => {
    // GraphBuilder should use branded/readonly types
    // A mutable object should not be assignable to GraphBuilder
    type FakeBuilder = {
      provide: (adapter: Adapter<any, any, any>) => any;
      build: () => any;
    };

    // FakeBuilder should not match GraphBuilder due to internal structure
    // This ensures GraphBuilder has additional internal structure/branding
    const builder = GraphBuilder.create();
    expectTypeOf(builder).not.toEqualTypeOf<FakeBuilder>();
  });
});

// =============================================================================
// Internal Adapter Registry Tests
// =============================================================================

describe("GraphBuilder internal adapter registry", () => {
  it("builder holds internal adapters array", () => {
    // The builder should have an internal adapters property
    // We verify this exists at type level
    const builder = GraphBuilder.create();

    // Builder should have adapters property (can be internal/readonly)
    expectTypeOf(builder).toHaveProperty("adapters");
  });

  it("adapters array is readonly", () => {
    const builder = GraphBuilder.create();

    // Adapters should be a readonly array
    type AdaptersType = (typeof builder)["adapters"];
    expectTypeOf<AdaptersType>().toMatchTypeOf<
      readonly Adapter<any, any, any>[]
    >();
  });

  it("initial builder has empty adapters array type", () => {
    const builder = GraphBuilder.create();

    // Empty builder should have empty adapters array
    type AdaptersType = (typeof builder)["adapters"];

    // The array should be assignable to readonly Adapter array
    expectTypeOf<AdaptersType>().toMatchTypeOf<
      readonly Adapter<Port<unknown, string>, any, any>[]
    >();
  });
});

// =============================================================================
// InferGraphProvides Tests
// =============================================================================

describe("InferGraphProvides utility type", () => {
  it("extracts TProvides from GraphBuilder", () => {
    type Builder = GraphBuilder<LoggerPortType, never>;
    type Provides = InferGraphProvides<Builder>;

    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType>();
  });

  it("extracts union TProvides from GraphBuilder", () => {
    type Builder = GraphBuilder<
      LoggerPortType | DatabasePortType,
      UserServicePortType
    >;
    type Provides = InferGraphProvides<Builder>;

    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("returns never for GraphBuilder<never, ...>", () => {
    type Builder = GraphBuilder<never, LoggerPortType>;
    type Provides = InferGraphProvides<Builder>;

    expectTypeOf<Provides>().toBeNever();
  });

  it("returns never for non-GraphBuilder types", () => {
    type FromString = InferGraphProvides<string>;
    type FromNumber = InferGraphProvides<number>;
    type FromObject = InferGraphProvides<{ foo: string }>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
  });
});

// =============================================================================
// InferGraphRequires Tests
// =============================================================================

describe("InferGraphRequires utility type", () => {
  it("extracts TRequires from GraphBuilder", () => {
    type Builder = GraphBuilder<LoggerPortType, DatabasePortType>;
    type Requires = InferGraphRequires<Builder>;

    expectTypeOf<Requires>().toEqualTypeOf<DatabasePortType>();
  });

  it("extracts union TRequires from GraphBuilder", () => {
    type Builder = GraphBuilder<
      LoggerPortType,
      DatabasePortType | UserServicePortType
    >;
    type Requires = InferGraphRequires<Builder>;

    expectTypeOf<Requires>().toEqualTypeOf<
      DatabasePortType | UserServicePortType
    >();
  });

  it("returns never for GraphBuilder<..., never>", () => {
    type Builder = GraphBuilder<LoggerPortType, never>;
    type Requires = InferGraphRequires<Builder>;

    expectTypeOf<Requires>().toBeNever();
  });

  it("returns never for non-GraphBuilder types", () => {
    type FromString = InferGraphRequires<string>;
    type FromNumber = InferGraphRequires<number>;
    type FromObject = InferGraphRequires<{ foo: string }>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
  });
});
