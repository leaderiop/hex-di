/**
 * Type-level tests for Container and Scope branded types.
 *
 * These tests verify:
 * 1. Container brand prevents structural compatibility
 * 2. Container<TProvides> captures TProvides type parameter
 * 3. Scope brand prevents structural compatibility
 * 4. Scope<TProvides> captures TProvides type parameter
 * 5. Container and Scope are distinct types (not interchangeable)
 */

import { describe, expectTypeOf, it } from "vitest";
import { createPort, Port, InferService } from "@hex-di/ports";
import type { Container, Scope } from "../src/index.js";

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
// Container Type Tests
// =============================================================================

describe("Container type", () => {
  it("brand prevents structural compatibility", () => {
    type RealContainer = Container<LoggerPortType>;

    // A structurally similar object should NOT match Container due to brand
    type FakeContainer = {
      resolve<P extends LoggerPortType>(port: P): InferService<P>;
      createScope(): Scope<LoggerPortType>;
      dispose(): Promise<void>;
    };

    // FakeContainer lacks the brand, so it should not match
    expectTypeOf<FakeContainer>().not.toMatchTypeOf<RealContainer>();
  });

  it("captures TProvides type parameter", () => {
    type SinglePortContainer = Container<LoggerPortType>;
    type MultiPortContainer = Container<LoggerPortType | DatabasePortType>;

    // Different TProvides should produce different types
    expectTypeOf<SinglePortContainer>().not.toEqualTypeOf<MultiPortContainer>();
  });

  it("has resolve method constrained to TProvides", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType>;

    // Container should have resolve method
    expectTypeOf<TestContainer>().toHaveProperty("resolve");

    // The resolve method should return the correct service type
    type ResolveMethod = TestContainer["resolve"];
    expectTypeOf<ResolveMethod>().toBeFunction();
  });

  it("has createScope method returning Scope with same TProvides", () => {
    type TestContainer = Container<LoggerPortType>;

    // Container should have createScope method
    expectTypeOf<TestContainer>().toHaveProperty("createScope");

    // createScope should return a Scope with the same TProvides
    type CreateScopeReturn = ReturnType<TestContainer["createScope"]>;
    expectTypeOf<CreateScopeReturn>().toEqualTypeOf<Scope<LoggerPortType>>();
  });

  it("has dispose method returning Promise<void>", () => {
    type TestContainer = Container<LoggerPortType>;

    // Container should have dispose method
    expectTypeOf<TestContainer>().toHaveProperty("dispose");

    // dispose should return Promise<void>
    type DisposeReturn = ReturnType<TestContainer["dispose"]>;
    expectTypeOf<DisposeReturn>().toEqualTypeOf<Promise<void>>();
  });
});

// =============================================================================
// Scope Type Tests
// =============================================================================

describe("Scope type", () => {
  it("brand prevents structural compatibility", () => {
    type RealScope = Scope<LoggerPortType>;

    // A structurally similar object should NOT match Scope due to brand
    type FakeScope = {
      resolve<P extends LoggerPortType>(port: P): InferService<P>;
      createScope(): Scope<LoggerPortType>;
      dispose(): Promise<void>;
    };

    // FakeScope lacks the brand, so it should not match
    expectTypeOf<FakeScope>().not.toMatchTypeOf<RealScope>();
  });

  it("captures TProvides type parameter", () => {
    type SinglePortScope = Scope<LoggerPortType>;
    type MultiPortScope = Scope<LoggerPortType | DatabasePortType>;

    // Different TProvides should produce different types
    expectTypeOf<SinglePortScope>().not.toEqualTypeOf<MultiPortScope>();
  });

  it("has resolve method constrained to TProvides", () => {
    type TestScope = Scope<LoggerPortType | DatabasePortType>;

    // Scope should have resolve method
    expectTypeOf<TestScope>().toHaveProperty("resolve");

    // The resolve method should return the correct service type
    type ResolveMethod = TestScope["resolve"];
    expectTypeOf<ResolveMethod>().toBeFunction();
  });

  it("has createScope method returning Scope with same TProvides", () => {
    type TestScope = Scope<LoggerPortType>;

    // Scope should have createScope method
    expectTypeOf<TestScope>().toHaveProperty("createScope");

    // createScope should return a Scope with the same TProvides
    type CreateScopeReturn = ReturnType<TestScope["createScope"]>;
    expectTypeOf<CreateScopeReturn>().toEqualTypeOf<Scope<LoggerPortType>>();
  });

  it("has dispose method returning Promise<void>", () => {
    type TestScope = Scope<LoggerPortType>;

    // Scope should have dispose method
    expectTypeOf<TestScope>().toHaveProperty("dispose");

    // dispose should return Promise<void>
    type DisposeReturn = ReturnType<TestScope["dispose"]>;
    expectTypeOf<DisposeReturn>().toEqualTypeOf<Promise<void>>();
  });
});

// =============================================================================
// Container and Scope Distinction Tests
// =============================================================================

describe("Container and Scope distinction", () => {
  it("Container and Scope are distinct types (not interchangeable)", () => {
    type TestContainer = Container<LoggerPortType>;
    type TestScope = Scope<LoggerPortType>;

    // Even with the same TProvides, Container and Scope should be distinct
    expectTypeOf<TestContainer>().not.toEqualTypeOf<TestScope>();

    // Container should not be assignable to Scope
    expectTypeOf<TestContainer>().not.toMatchTypeOf<TestScope>();

    // Scope should not be assignable to Container
    expectTypeOf<TestScope>().not.toMatchTypeOf<TestContainer>();
  });

  it("Container and Scope with different TProvides are distinct", () => {
    type ContainerA = Container<LoggerPortType>;
    type ContainerB = Container<DatabasePortType>;
    type ScopeA = Scope<LoggerPortType>;
    type ScopeB = Scope<DatabasePortType>;

    // All four types should be distinct
    expectTypeOf<ContainerA>().not.toEqualTypeOf<ContainerB>();
    expectTypeOf<ScopeA>().not.toEqualTypeOf<ScopeB>();
    expectTypeOf<ContainerA>().not.toEqualTypeOf<ScopeA>();
    expectTypeOf<ContainerB>().not.toEqualTypeOf<ScopeB>();
  });
});

// =============================================================================
// Type Utility Tests
// =============================================================================

import type {
  InferContainerProvides,
  InferScopeProvides,
  IsResolvable,
  ServiceFromContainer,
} from "../src/index.js";

describe("InferContainerProvides utility type", () => {
  it("extracts TProvides from Container type", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType>;

    // InferContainerProvides should extract the port union
    type ExtractedProvides = InferContainerProvides<TestContainer>;
    expectTypeOf<ExtractedProvides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("returns never for non-Container types", () => {
    type NotContainer = { resolve: () => void };

    // Should return never for types that are not Container
    type ExtractedProvides = InferContainerProvides<NotContainer>;
    expectTypeOf<ExtractedProvides>().toEqualTypeOf<never>();
  });
});

describe("InferScopeProvides utility type", () => {
  it("extracts TProvides from Scope type", () => {
    type TestScope = Scope<LoggerPortType | DatabasePortType>;

    // InferScopeProvides should extract the port union
    type ExtractedProvides = InferScopeProvides<TestScope>;
    expectTypeOf<ExtractedProvides>().toEqualTypeOf<LoggerPortType | DatabasePortType>();
  });

  it("returns never for non-Scope types", () => {
    type NotScope = { resolve: () => void };

    // Should return never for types that are not Scope
    type ExtractedProvides = InferScopeProvides<NotScope>;
    expectTypeOf<ExtractedProvides>().toEqualTypeOf<never>();
  });
});

describe("IsResolvable utility type", () => {
  it("returns true when port is in Container TProvides", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType>;

    // LoggerPort is in TProvides, should return true
    type CanResolveLogger = IsResolvable<TestContainer, LoggerPortType>;
    expectTypeOf<CanResolveLogger>().toEqualTypeOf<true>();

    // DatabasePort is in TProvides, should return true
    type CanResolveDatabase = IsResolvable<TestContainer, DatabasePortType>;
    expectTypeOf<CanResolveDatabase>().toEqualTypeOf<true>();
  });

  it("returns false when port is not in Container TProvides", () => {
    type TestContainer = Container<LoggerPortType>;

    // UserServicePort is NOT in TProvides, should return false
    type CanResolveUserService = IsResolvable<TestContainer, UserServicePortType>;
    expectTypeOf<CanResolveUserService>().toEqualTypeOf<false>();
  });

  it("works with Scope types", () => {
    type TestScope = Scope<LoggerPortType | DatabasePortType>;

    // LoggerPort is in TProvides, should return true
    type CanResolveLogger = IsResolvable<TestScope, LoggerPortType>;
    expectTypeOf<CanResolveLogger>().toEqualTypeOf<true>();

    // UserServicePort is NOT in TProvides, should return false
    type CanResolveUserService = IsResolvable<TestScope, UserServicePortType>;
    expectTypeOf<CanResolveUserService>().toEqualTypeOf<false>();
  });
});

describe("ServiceFromContainer utility type", () => {
  it("extracts correct service type from Container", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType>;

    // Should extract Logger service type for LoggerPort
    type LoggerService = ServiceFromContainer<TestContainer, LoggerPortType>;
    expectTypeOf<LoggerService>().toEqualTypeOf<Logger>();

    // Should extract Database service type for DatabasePort
    type DbService = ServiceFromContainer<TestContainer, DatabasePortType>;
    expectTypeOf<DbService>().toEqualTypeOf<Database>();
  });

  it("returns never for port not in Container TProvides", () => {
    type TestContainer = Container<LoggerPortType>;

    // UserServicePort is not in TProvides, should return never
    type NoService = ServiceFromContainer<TestContainer, UserServicePortType>;
    expectTypeOf<NoService>().toEqualTypeOf<never>();
  });

  it("works with Scope types", () => {
    type TestScope = Scope<LoggerPortType | DatabasePortType>;

    // Should extract Logger service type for LoggerPort
    type LoggerService = ServiceFromContainer<TestScope, LoggerPortType>;
    expectTypeOf<LoggerService>().toEqualTypeOf<Logger>();

    // UserServicePort is not in TProvides, should return never
    type NoService = ServiceFromContainer<TestScope, UserServicePortType>;
    expectTypeOf<NoService>().toEqualTypeOf<never>();
  });
});
