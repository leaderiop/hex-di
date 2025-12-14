/**
 * Type-level tests for duplicate provider detection.
 *
 * These tests verify:
 * 1. Providing same port twice produces compile error
 * 2. Error message includes duplicated port name
 * 3. Different ports with same interface allowed
 * 4. First provide() succeeds, second triggers error
 * 5. Detection works across multiple provide() chains
 * 6. HasOverlap type predicate works correctly
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort } from "@hex-di/ports";
import {
  GraphBuilder,
  createAdapter,
  DuplicateProviderError,
  HasOverlap,
  InferGraphProvides,
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

interface AnotherLogger {
  log(message: string): void;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// Different port with same interface (but different name)
const AnotherLoggerPort = createPort<"AnotherLogger", AnotherLogger>("AnotherLogger");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;
type AnotherLoggerPortType = typeof AnotherLoggerPort;

// =============================================================================
// Test Adapters
// =============================================================================

const LoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ log: () => {} }),
});

const AnotherLoggerAdapter = createAdapter({
  provides: AnotherLoggerPort,
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

const UserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [LoggerPort, DatabasePort],
  lifetime: "scoped",
  factory: () => ({ getUser: async (id) => ({ id, name: "test" }) }),
});

// Duplicate adapter for LoggerPort (same port as LoggerAdapter)
const DuplicateLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "request",
  factory: () => ({ log: () => {} }),
});

// =============================================================================
// HasOverlap Type Predicate Tests
// =============================================================================

describe("HasOverlap type predicate", () => {
  it("returns true when ports overlap", () => {
    type Overlap = HasOverlap<LoggerPortType, LoggerPortType>;
    expectTypeOf<Overlap>().toEqualTypeOf<true>();
  });

  it("returns false when ports are different", () => {
    type NoOverlap = HasOverlap<LoggerPortType, DatabasePortType>;
    expectTypeOf<NoOverlap>().toEqualTypeOf<false>();
  });

  it("returns true when there is partial overlap in unions", () => {
    type PartialOverlap = HasOverlap<
      LoggerPortType | DatabasePortType,
      LoggerPortType | UserServicePortType
    >;
    expectTypeOf<PartialOverlap>().toEqualTypeOf<true>();
  });

  it("returns false when unions have no overlap", () => {
    type NoOverlap = HasOverlap<
      LoggerPortType | DatabasePortType,
      UserServicePortType
    >;
    expectTypeOf<NoOverlap>().toEqualTypeOf<false>();
  });

  it("returns false when either type is never", () => {
    type WithNeverA = HasOverlap<never, LoggerPortType>;
    type WithNeverB = HasOverlap<LoggerPortType, never>;
    type BothNever = HasOverlap<never, never>;

    expectTypeOf<WithNeverA>().toEqualTypeOf<false>();
    expectTypeOf<WithNeverB>().toEqualTypeOf<false>();
    expectTypeOf<BothNever>().toEqualTypeOf<false>();
  });
});

// =============================================================================
// Duplicate Provider Detection Tests
// =============================================================================

describe("duplicate provider detection", () => {
  it("providing same port twice produces error type", () => {
    const builder = GraphBuilder.create().provide(LoggerAdapter);
    const duplicateBuilder = builder.provide(DuplicateLoggerAdapter);

    // The result should be a DuplicateProviderError type
    type Result = typeof duplicateBuilder;
    expectTypeOf<Result>().toMatchTypeOf<DuplicateProviderError<LoggerPortType>>();
  });

  it("error message includes duplicated port name", () => {
    type ErrorType = DuplicateProviderError<LoggerPortType>;

    // Verify the error message structure
    expectTypeOf<ErrorType["__message"]>().toEqualTypeOf<"Duplicate provider for: Logger">();
    expectTypeOf<ErrorType["__errorBrand"]>().toEqualTypeOf<"DuplicateProviderError">();
  });

  it("different ports with same interface are allowed", () => {
    // LoggerPort and AnotherLoggerPort have the same interface but different names
    // They should NOT trigger duplicate detection
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(AnotherLoggerAdapter);

    // Should be a valid GraphBuilder, not an error
    type Result = typeof builder;
    type Provides = InferGraphProvides<Result>;

    // Both ports should be provided
    expectTypeOf<Provides>().toEqualTypeOf<LoggerPortType | AnotherLoggerPortType>();
  });

  it("first provide() succeeds, second triggers error", () => {
    // First provide() returns a valid GraphBuilder
    const firstBuilder = GraphBuilder.create().provide(LoggerAdapter);
    type FirstBuilderType = typeof firstBuilder;

    // Verify first builder is a valid GraphBuilder with Logger provided
    expectTypeOf<InferGraphProvides<FirstBuilderType>>().toEqualTypeOf<LoggerPortType>();

    // Second provide() with duplicate should return error type
    const secondBuilder = firstBuilder.provide(DuplicateLoggerAdapter);
    type SecondBuilderType = typeof secondBuilder;

    // The result should be a DuplicateProviderError
    expectTypeOf<SecondBuilderType>().toMatchTypeOf<DuplicateProviderError<LoggerPortType>>();
  });

  it("detection works across multiple provide() chains", () => {
    // Build a chain with multiple valid adapters
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    // Adding a duplicate Logger at the end should trigger error
    const withDuplicate = builder.provide(DuplicateLoggerAdapter);
    type Result = typeof withDuplicate;

    // Should be an error type
    expectTypeOf<Result>().toMatchTypeOf<DuplicateProviderError<LoggerPortType>>();
  });

  it("non-overlapping ports are allowed in any order", () => {
    // All different ports - should work fine
    const builder = GraphBuilder.create()
      .provide(LoggerAdapter)
      .provide(DatabaseAdapter)
      .provide(UserServiceAdapter);

    // Should be a valid GraphBuilder
    type Result = typeof builder;
    type Provides = InferGraphProvides<Result>;

    // All ports should be provided
    expectTypeOf<Provides>().toEqualTypeOf<
      LoggerPortType | DatabasePortType | UserServicePortType
    >();
  });
});
