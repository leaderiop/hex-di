/**
 * Type-level tests for resolution type safety.
 *
 * These tests verify that the resolve method on Container and Scope:
 * 1. Accepts ports that are in TProvides
 * 2. Rejects ports not in TProvides (compile error)
 * 3. Returns the correct service type via InferService
 * 4. Works correctly with port unions
 * 5. Has consistent type safety between Container and Scope
 * 6. Supports type inference without explicit annotations
 * 7. Handles complex TProvides scenarios (large unions, complex interfaces, generics)
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
  close(): void;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string }>;
  createUser(name: string): Promise<{ id: string; name: string }>;
}

interface ConfigService {
  get(key: string): string | undefined;
  getRequired(key: string): string;
}

interface CacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
}

interface AuthService {
  authenticate(token: string): Promise<{ userId: string; roles: string[] }>;
  authorize(userId: string, permission: string): Promise<boolean>;
}

interface MetricsService {
  increment(metric: string, value?: number): void;
  gauge(metric: string, value: number): void;
  histogram(metric: string, value: number): void;
}

interface EventBus {
  emit<T>(event: string, payload: T): void;
  on<T>(event: string, handler: (payload: T) => void): () => void;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const ConfigServicePort = createPort<"ConfigService", ConfigService>("ConfigService");
const CacheServicePort = createPort<"CacheService", CacheService>("CacheService");
const AuthServicePort = createPort<"AuthService", AuthService>("AuthService");
const MetricsServicePort = createPort<"MetricsService", MetricsService>("MetricsService");
const EventBusPort = createPort<"EventBus", EventBus>("EventBus");

type LoggerPortType = typeof LoggerPort;
type DatabasePortType = typeof DatabasePort;
type UserServicePortType = typeof UserServicePort;
type ConfigServicePortType = typeof ConfigServicePort;
type CacheServicePortType = typeof CacheServicePort;
type AuthServicePortType = typeof AuthServicePort;
type MetricsServicePortType = typeof MetricsServicePort;
type EventBusPortType = typeof EventBusPort;

// =============================================================================
// Resolve Accepts Port in TProvides
// =============================================================================

describe("resolve accepts port in TProvides", () => {
  it("Container.resolve accepts single port in TProvides", () => {
    type TestContainer = Container<LoggerPortType>;

    // The resolve method's parameter type should accept LoggerPortType
    type ResolveParam = Parameters<TestContainer["resolve"]>[0];
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ResolveParam>();
  });

  it("Container.resolve accepts any port in TProvides union", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType | UserServicePortType>;

    // The resolve method's parameter type should be the union of valid ports
    type ResolveParam = Parameters<TestContainer["resolve"]>[0];

    // All three port types should be assignable to the parameter type
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ResolveParam>();
    expectTypeOf<DatabasePortType>().toMatchTypeOf<ResolveParam>();
    expectTypeOf<UserServicePortType>().toMatchTypeOf<ResolveParam>();
  });

  it("Scope.resolve accepts single port in TProvides", () => {
    type TestScope = Scope<LoggerPortType>;

    type ResolveParam = Parameters<TestScope["resolve"]>[0];
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ResolveParam>();
  });

  it("Scope.resolve accepts any port in TProvides union", () => {
    type TestScope = Scope<LoggerPortType | DatabasePortType | UserServicePortType>;

    type ResolveParam = Parameters<TestScope["resolve"]>[0];
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ResolveParam>();
    expectTypeOf<DatabasePortType>().toMatchTypeOf<ResolveParam>();
    expectTypeOf<UserServicePortType>().toMatchTypeOf<ResolveParam>();
  });
});

// =============================================================================
// Resolve Rejects Port Not in TProvides (Compile Error)
// =============================================================================

describe("resolve rejects port not in TProvides", () => {
  it("Container.resolve rejects port not in TProvides", () => {
    type TestContainer = Container<LoggerPortType>;

    type ResolveParam = Parameters<TestContainer["resolve"]>[0];

    // DatabasePort is NOT in TProvides, so it should NOT match the parameter type
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<ResolveParam>();
    expectTypeOf<UserServicePortType>().not.toMatchTypeOf<ResolveParam>();
  });

  it("Container.resolve rejects port not in TProvides union", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType>;

    type ResolveParam = Parameters<TestContainer["resolve"]>[0];

    // UserServicePort and ConfigServicePort are NOT in TProvides
    expectTypeOf<UserServicePortType>().not.toMatchTypeOf<ResolveParam>();
    expectTypeOf<ConfigServicePortType>().not.toMatchTypeOf<ResolveParam>();
  });

  it("Scope.resolve rejects port not in TProvides", () => {
    type TestScope = Scope<LoggerPortType>;

    type ResolveParam = Parameters<TestScope["resolve"]>[0];

    // DatabasePort is NOT in TProvides
    expectTypeOf<DatabasePortType>().not.toMatchTypeOf<ResolveParam>();
    expectTypeOf<UserServicePortType>().not.toMatchTypeOf<ResolveParam>();
  });

  it("Scope.resolve rejects port not in TProvides union", () => {
    type TestScope = Scope<LoggerPortType | DatabasePortType>;

    type ResolveParam = Parameters<TestScope["resolve"]>[0];

    // UserServicePort and ConfigServicePort are NOT in TProvides
    expectTypeOf<UserServicePortType>().not.toMatchTypeOf<ResolveParam>();
    expectTypeOf<ConfigServicePortType>().not.toMatchTypeOf<ResolveParam>();
  });
});

// =============================================================================
// Resolve Return Type Matches InferService<P>
// =============================================================================

describe("resolve return type matches InferService<P>", () => {
  it("InferService extracts correct service type from port", () => {
    // Verify InferService works correctly for all our ports
    type LoggerService = InferService<LoggerPortType>;
    expectTypeOf<LoggerService>().toEqualTypeOf<Logger>();

    type DatabaseService = InferService<DatabasePortType>;
    expectTypeOf<DatabaseService>().toEqualTypeOf<Database>();

    type UserServiceType = InferService<UserServicePortType>;
    expectTypeOf<UserServiceType>().toEqualTypeOf<UserService>();
  });

  it("Container.resolve return type uses InferService correctly", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType>;

    // The resolve method should return the service type inferred from the port
    // We verify this by checking the return type when we know the parameter type
    type ResolveMethod = TestContainer["resolve"];

    // When we instantiate the generic with LoggerPortType, the return should be Logger
    type LoggerResult = ReturnType<typeof resolveLogger>;
    function resolveLogger(container: TestContainer) {
      return container.resolve(LoggerPort);
    }
    expectTypeOf<LoggerResult>().toEqualTypeOf<Logger>();

    // When we instantiate the generic with DatabasePortType, the return should be Database
    type DatabaseResult = ReturnType<typeof resolveDatabase>;
    function resolveDatabase(container: TestContainer) {
      return container.resolve(DatabasePort);
    }
    expectTypeOf<DatabaseResult>().toEqualTypeOf<Database>();
  });

  it("Scope.resolve return type uses InferService correctly", () => {
    type TestScope = Scope<LoggerPortType | DatabasePortType>;

    type LoggerResult = ReturnType<typeof resolveScopeLogger>;
    function resolveScopeLogger(scope: TestScope) {
      return scope.resolve(LoggerPort);
    }
    expectTypeOf<LoggerResult>().toEqualTypeOf<Logger>();

    type DatabaseResult = ReturnType<typeof resolveScopeDatabase>;
    function resolveScopeDatabase(scope: TestScope) {
      return scope.resolve(DatabasePort);
    }
    expectTypeOf<DatabaseResult>().toEqualTypeOf<Database>();
  });
});

// =============================================================================
// Resolve Works with Port Union TProvides
// =============================================================================

describe("resolve works with Port union TProvides", () => {
  it("Container with large union correctly narrows return type", () => {
    type LargeUnion =
      | LoggerPortType
      | DatabasePortType
      | UserServicePortType
      | ConfigServicePortType
      | CacheServicePortType
      | AuthServicePortType
      | MetricsServicePortType
      | EventBusPortType;

    type TestContainer = Container<LargeUnion>;

    // Test each port returns the correct service type
    function resolveAll(container: TestContainer) {
      const logger = container.resolve(LoggerPort);
      const database = container.resolve(DatabasePort);
      const userService = container.resolve(UserServicePort);
      const config = container.resolve(ConfigServicePort);
      const cache = container.resolve(CacheServicePort);
      const auth = container.resolve(AuthServicePort);
      const metrics = container.resolve(MetricsServicePort);
      const eventBus = container.resolve(EventBusPort);

      return { logger, database, userService, config, cache, auth, metrics, eventBus };
    }

    type Results = ReturnType<typeof resolveAll>;

    expectTypeOf<Results["logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Results["database"]>().toEqualTypeOf<Database>();
    expectTypeOf<Results["userService"]>().toEqualTypeOf<UserService>();
    expectTypeOf<Results["config"]>().toEqualTypeOf<ConfigService>();
    expectTypeOf<Results["cache"]>().toEqualTypeOf<CacheService>();
    expectTypeOf<Results["auth"]>().toEqualTypeOf<AuthService>();
    expectTypeOf<Results["metrics"]>().toEqualTypeOf<MetricsService>();
    expectTypeOf<Results["eventBus"]>().toEqualTypeOf<EventBus>();
  });

  it("Scope with large union correctly narrows return type", () => {
    type LargeUnion =
      | LoggerPortType
      | DatabasePortType
      | UserServicePortType
      | ConfigServicePortType;

    type TestScope = Scope<LargeUnion>;

    function resolveAll(scope: TestScope) {
      const logger = scope.resolve(LoggerPort);
      const database = scope.resolve(DatabasePort);
      const userService = scope.resolve(UserServicePort);
      const config = scope.resolve(ConfigServicePort);

      return { logger, database, userService, config };
    }

    type Results = ReturnType<typeof resolveAll>;

    expectTypeOf<Results["logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Results["database"]>().toEqualTypeOf<Database>();
    expectTypeOf<Results["userService"]>().toEqualTypeOf<UserService>();
    expectTypeOf<Results["config"]>().toEqualTypeOf<ConfigService>();
  });
});

// =============================================================================
// Scope.resolve Has Same Type Safety as Container.resolve
// =============================================================================

describe("Scope.resolve has same type safety as Container.resolve", () => {
  it("Container and Scope resolve have identical type parameter constraints", () => {
    type TestTProvides = LoggerPortType | DatabasePortType | UserServicePortType;

    type ContainerResolve = Container<TestTProvides>["resolve"];
    type ScopeResolve = Scope<TestTProvides>["resolve"];

    // Both should have the same parameter type constraint
    type ContainerParam = Parameters<ContainerResolve>[0];
    type ScopeParam = Parameters<ScopeResolve>[0];

    // The parameter types should be equivalent
    expectTypeOf<ContainerParam>().toEqualTypeOf<ScopeParam>();
  });

  it("Container and Scope resolve return same type for same port", () => {
    type TestTProvides = LoggerPortType | DatabasePortType;

    type TestContainer = Container<TestTProvides>;
    type TestScope = Scope<TestTProvides>;

    function resolveFromContainer(container: TestContainer) {
      return container.resolve(LoggerPort);
    }

    function resolveFromScope(scope: TestScope) {
      return scope.resolve(LoggerPort);
    }

    // Both should return Logger
    type ContainerResult = ReturnType<typeof resolveFromContainer>;
    type ScopeResult = ReturnType<typeof resolveFromScope>;

    expectTypeOf<ContainerResult>().toEqualTypeOf<ScopeResult>();
    expectTypeOf<ContainerResult>().toEqualTypeOf<Logger>();
    expectTypeOf<ScopeResult>().toEqualTypeOf<Logger>();
  });

  it("Scope created from Container has same TProvides", () => {
    type TestTProvides = LoggerPortType | DatabasePortType;

    type TestContainer = Container<TestTProvides>;

    // createScope returns Scope with same TProvides
    type CreatedScope = ReturnType<TestContainer["createScope"]>;

    // The created scope should have the same TProvides as the container
    expectTypeOf<CreatedScope>().toEqualTypeOf<Scope<TestTProvides>>();

    // And its resolve parameter should match
    type ScopeParam = Parameters<CreatedScope["resolve"]>[0];
    type ContainerParam = Parameters<TestContainer["resolve"]>[0];
    expectTypeOf<ScopeParam>().toEqualTypeOf<ContainerParam>();
  });
});

// =============================================================================
// Type Inference Works Without Explicit Annotations
// =============================================================================

describe("type inference works without explicit annotations", () => {
  it("Container resolve infers return type without annotation", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType>;

    // Create a function that uses the container without explicit type annotations on variables
    function useContainer(container: TestContainer) {
      // No type annotation on the variable - TypeScript should infer
      const logger = container.resolve(LoggerPort);
      const database = container.resolve(DatabasePort);

      // Return them so we can verify the inferred types
      return { logger, database };
    }

    type Results = ReturnType<typeof useContainer>;

    // Verify inference worked correctly
    expectTypeOf<Results["logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Results["database"]>().toEqualTypeOf<Database>();
  });

  it("Scope resolve infers return type without annotation", () => {
    type TestScope = Scope<LoggerPortType | UserServicePortType>;

    function useScope(scope: TestScope) {
      const logger = scope.resolve(LoggerPort);
      const userService = scope.resolve(UserServicePort);

      return { logger, userService };
    }

    type Results = ReturnType<typeof useScope>;

    expectTypeOf<Results["logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Results["userService"]>().toEqualTypeOf<UserService>();
  });

  it("chained scope creation preserves type inference", () => {
    type TestContainer = Container<LoggerPortType | DatabasePortType | UserServicePortType>;

    function useNestedScopes(container: TestContainer) {
      // Chained scope creation without explicit type annotations
      const scope = container.createScope();
      const nestedScope = scope.createScope();

      // Both scopes should have the same TProvides
      const scopeLogger = scope.resolve(LoggerPort);
      const nestedLogger = nestedScope.resolve(LoggerPort);

      return { scopeLogger, nestedLogger };
    }

    type Results = ReturnType<typeof useNestedScopes>;

    expectTypeOf<Results["scopeLogger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Results["nestedLogger"]>().toEqualTypeOf<Logger>();
  });
});

// =============================================================================
// Complex TProvides Scenarios
// =============================================================================

describe("complex TProvides scenarios", () => {
  // Test: Large union types (8+ ports)
  it("handles large union types correctly", () => {
    type LargeUnion =
      | LoggerPortType
      | DatabasePortType
      | UserServicePortType
      | ConfigServicePortType
      | CacheServicePortType
      | AuthServicePortType
      | MetricsServicePortType
      | EventBusPortType;

    type TestContainer = Container<LargeUnion>;
    type TestScope = Scope<LargeUnion>;

    // Verify all 8 ports are valid parameters
    type ContainerParam = Parameters<TestContainer["resolve"]>[0];
    type ScopeParam = Parameters<TestScope["resolve"]>[0];

    expectTypeOf<LoggerPortType>().toMatchTypeOf<ContainerParam>();
    expectTypeOf<EventBusPortType>().toMatchTypeOf<ContainerParam>();
    expectTypeOf<LoggerPortType>().toMatchTypeOf<ScopeParam>();
    expectTypeOf<EventBusPortType>().toMatchTypeOf<ScopeParam>();

    // Verify return types are correct
    function testContainer(container: TestContainer) {
      return container.resolve(MetricsServicePort);
    }
    function testScope(scope: TestScope) {
      return scope.resolve(MetricsServicePort);
    }

    expectTypeOf<ReturnType<typeof testContainer>>().toEqualTypeOf<MetricsService>();
    expectTypeOf<ReturnType<typeof testScope>>().toEqualTypeOf<MetricsService>();
  });

  // Test: Ports with complex service interfaces
  it("handles ports with complex service interfaces", () => {
    // Complex interface with generics, overloads, and nested types
    interface ComplexService {
      // Method with generic type parameter
      process<T extends object>(input: T): T & { processed: true };

      // Method returning a function
      createHandler(name: string): (event: { type: string; payload: unknown }) => void;

      // Method with complex return type
      getStats(): {
        requests: number;
        errors: number;
        latency: { p50: number; p95: number; p99: number };
      };

      // Async method with union return type
      fetch(id: string): Promise<{ data: unknown } | { error: string }>;
    }

    const ComplexServicePort = createPort<"ComplexService", ComplexService>("ComplexService");
    type ComplexServicePortType = typeof ComplexServicePort;

    type TestContainer = Container<ComplexServicePortType>;

    function resolveComplex(container: TestContainer) {
      return container.resolve(ComplexServicePort);
    }

    type Result = ReturnType<typeof resolveComplex>;

    // Verify the resolved service has the complex interface
    expectTypeOf<Result>().toEqualTypeOf<ComplexService>();
  });

  // Test: Generic service interfaces
  it("handles generic service interfaces", () => {
    // Repository pattern with generic type
    interface Repository<TEntity> {
      findById(id: string): Promise<TEntity | null>;
      findAll(): Promise<TEntity[]>;
      save(entity: TEntity): Promise<TEntity>;
      delete(id: string): Promise<boolean>;
    }

    interface User {
      id: string;
      email: string;
      name: string;
    }

    interface Product {
      id: string;
      sku: string;
      price: number;
    }

    // Create ports for specific repository types
    const UserRepositoryPort = createPort<"UserRepository", Repository<User>>("UserRepository");
    const ProductRepositoryPort = createPort<"ProductRepository", Repository<Product>>("ProductRepository");

    type UserRepositoryPortType = typeof UserRepositoryPort;
    type ProductRepositoryPortType = typeof ProductRepositoryPort;

    type TestContainer = Container<UserRepositoryPortType | ProductRepositoryPortType>;

    function resolveRepos(container: TestContainer) {
      const userRepo = container.resolve(UserRepositoryPort);
      const productRepo = container.resolve(ProductRepositoryPort);
      return { userRepo, productRepo };
    }

    type Results = ReturnType<typeof resolveRepos>;

    // Verify correct generic instantiation
    expectTypeOf<Results["userRepo"]>().toEqualTypeOf<Repository<User>>();
    expectTypeOf<Results["productRepo"]>().toEqualTypeOf<Repository<Product>>();
  });

  // Test: Nested scope resolution preserves types through scope hierarchy
  it("nested scope resolution preserves types through hierarchy", () => {
    type TestTProvides =
      | LoggerPortType
      | DatabasePortType
      | UserServicePortType
      | ConfigServicePortType;

    type TestContainer = Container<TestTProvides>;

    // Create a chain of nested scopes
    function useNestedScopes(container: TestContainer) {
      const scope1 = container.createScope();
      const scope2 = scope1.createScope();
      const scope3 = scope2.createScope();

      // All scopes should have the same TProvides and type safety
      const scope1Logger = scope1.resolve(LoggerPort);
      const scope2Logger = scope2.resolve(LoggerPort);
      const scope3Logger = scope3.resolve(LoggerPort);

      return { scope1Logger, scope2Logger, scope3Logger };
    }

    type Results = ReturnType<typeof useNestedScopes>;

    // All should be Logger type
    expectTypeOf<Results["scope1Logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Results["scope2Logger"]>().toEqualTypeOf<Logger>();
    expectTypeOf<Results["scope3Logger"]>().toEqualTypeOf<Logger>();

    // All should be the same type
    expectTypeOf<Results["scope1Logger"]>().toEqualTypeOf<Results["scope2Logger"]>();
    expectTypeOf<Results["scope2Logger"]>().toEqualTypeOf<Results["scope3Logger"]>();
  });
});
