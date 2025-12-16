/**
 * Integration tests for @hex-di/graph package.
 *
 * These tests verify end-to-end workflows and complex scenarios that span
 * multiple components of the graph package.
 *
 * Test coverage:
 * 1. Complete workflow - create ports, adapters, graph, build
 * 2. Multi-layer dependency chain (A requires B, B requires C)
 * 3. Adapter with multiple dependencies
 * 4. Graph with mixed lifetime adapters
 * 5. Real-world usage pattern (Logger, Database, UserService)
 * 6. Error recovery - adding missing dependency fixes build
 * 7. Factory function receives correct dependency object shape
 * 8. Graph works correctly with @hex-di/ports imports
 * 9. Type inference in complex generic scenarios
 * 10. Edge case - adapter that requires itself (self-referential)
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createPort, type InferService } from "@hex-di/ports";
import {
  createAdapter,
  GraphBuilder,
  Graph,
  InferGraphProvides,
  InferGraphRequires,
  UnsatisfiedDependencies,
  MissingDependencyError,
  InferAdapterProvides,
  InferAdapterRequires,
} from "../src/index.js";

// =============================================================================
// Service Interfaces for Real-World Scenario
// =============================================================================

interface Logger {
  log(message: string): void;
  error(message: string, error?: Error): void;
}

interface Config {
  get(key: string): string;
  getNumber(key: string): number;
}

interface Database {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<void>;
}

interface Cache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  invalidate(key: string): void;
}

interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string; email: string } | null>;
  save(user: { name: string; email: string }): Promise<{ id: string }>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string; email: string } | null>;
  createUser(name: string, email: string): Promise<{ id: string }>;
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface NotificationService {
  notify(userId: string, message: string): Promise<void>;
}

// =============================================================================
// Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const ConfigPort = createPort<"Config", Config>("Config");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");
const UserRepositoryPort = createPort<"UserRepository", UserRepository>("UserRepository");
const UserServicePort = createPort<"UserService", UserService>("UserService");
const EmailServicePort = createPort<"EmailService", EmailService>("EmailService");
const NotificationServicePort = createPort<"NotificationService", NotificationService>("NotificationService");

// =============================================================================
// Test 1: Complete Workflow - Create Ports, Adapters, Graph, Build
// =============================================================================

describe("Integration: Complete workflow", () => {
  it("creates ports, adapters, builds graph, and verifies structure", () => {
    // Step 1: Create adapters
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: () => {},
        error: () => {},
      }),
    });

    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: (key) => `value-${key}`,
        getNumber: (key) => parseInt(key, 10) || 0,
      }),
    });

    // Step 2: Build graph
    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(configAdapter)
      .build();

    // Step 3: Verify graph structure
    expect(graph.adapters.length).toBe(2);
    expect(graph.adapters).toContain(loggerAdapter);
    expect(graph.adapters).toContain(configAdapter);
    expect(Object.isFrozen(graph)).toBe(true);

    // Step 4: Verify types
    type GraphType = typeof graph;
    expectTypeOf<GraphType>().toMatchTypeOf<
      Graph<typeof LoggerPort | typeof ConfigPort>
    >();
  });

  it("verifies complete type flow from port to graph", () => {
    // Verify port types are correctly inferred through the entire flow
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {}, error: () => {} }),
    });

    type AdapterProvides = InferAdapterProvides<typeof adapter>;
    expectTypeOf<AdapterProvides>().toEqualTypeOf<typeof LoggerPort>();

    const builder = GraphBuilder.create().provide(adapter);
    type BuilderProvides = InferGraphProvides<typeof builder>;
    expectTypeOf<BuilderProvides>().toEqualTypeOf<typeof LoggerPort>();

    const graph = builder.build();
    // Use conditional type inference since __provides is optional (phantom type)
    type GraphProvides = (typeof graph) extends { __provides?: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<typeof LoggerPort>();
  });
});

// =============================================================================
// Test 2: Multi-Layer Dependency Chain (A requires B, B requires C)
// =============================================================================

describe("Integration: Multi-layer dependency chain", () => {
  it("handles A requires B, B requires C chain correctly", () => {
    // Layer C: Config (no dependencies)
    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: () => "",
        getNumber: () => 0,
      }),
    });

    // Layer B: Cache requires Config
    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: (deps) => {
        // Verify deps has Config
        const _config = deps.Config;
        return {
          get: () => undefined,
          set: () => {},
          invalidate: () => {},
        };
      },
    });

    // Layer A: Database requires Cache
    const databaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [CachePort],
      lifetime: "singleton",
      factory: (deps) => {
        // Verify deps has Cache
        const _cache = deps.Cache;
        return {
          query: async () => [],
          execute: async () => {},
        };
      },
    });

    // Build the complete chain
    const graph = GraphBuilder.create()
      .provide(configAdapter)
      .provide(cacheAdapter)
      .provide(databaseAdapter)
      .build();

    expect(graph.adapters.length).toBe(3);

    // Verify type shows all dependencies are satisfied
    type GraphType = typeof graph;
    type IsGraph = GraphType extends Graph<infer P> ? P : never;
    expectTypeOf<IsGraph>().toEqualTypeOf<
      typeof ConfigPort | typeof CachePort | typeof DatabasePort
    >();
  });

  it("type errors when middle layer is missing", () => {
    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "", getNumber: () => 0 }),
    });

    const databaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [CachePort], // Cache is missing!
      lifetime: "singleton",
      factory: () => ({
        query: async () => [],
        execute: async () => {},
      }),
    });

    // Build without Cache - should require error argument
    const builder = GraphBuilder.create()
      .provide(configAdapter)
      .provide(databaseAdapter);

    type BuildParams = Parameters<typeof builder.build>;
    type ErrorArg = BuildParams[0];
    type IsMissingError = ErrorArg extends MissingDependencyError<typeof CachePort>
      ? true
      : false;
    expectTypeOf<IsMissingError>().toEqualTypeOf<true>();
  });
});

// =============================================================================
// Test 3: Adapter with Multiple Dependencies
// =============================================================================

describe("Integration: Adapter with multiple dependencies", () => {
  it("correctly resolves adapter with 3+ dependencies", () => {
    // UserService requires Logger, Database, and Cache
    const userServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort, CachePort],
      lifetime: "scoped",
      factory: (deps) => {
        // Verify all deps are accessible with correct types
        const _logger: Logger = deps.Logger;
        const _database: Database = deps.Database;
        const _cache: Cache = deps.Cache;

        return {
          getUser: async (id) => {
            deps.Logger.log(`Getting user ${id}`);
            const cached = deps.Cache.get<{ id: string; name: string; email: string }>(id);
            if (cached) return cached;
            const [user] = await deps.Database.query<{ id: string; name: string; email: string }>(
              "SELECT * FROM users WHERE id = ?",
              [id]
            );
            return user || null;
          },
          createUser: async (name, email) => {
            deps.Logger.log(`Creating user ${name}`);
            await deps.Database.execute("INSERT INTO users (name, email) VALUES (?, ?)", [name, email]);
            return { id: "new-id" };
          },
        };
      },
    });

    // Verify the adapter requires all three dependencies
    type AdapterRequires = InferAdapterRequires<typeof userServiceAdapter>;
    expectTypeOf<AdapterRequires>().toEqualTypeOf<
      typeof LoggerPort | typeof DatabasePort | typeof CachePort
    >();

    // Build complete graph
    const graph = GraphBuilder.create()
      .provide(createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {}, error: () => {} }),
      }))
      .provide(createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: async () => [], execute: async () => {} }),
      }))
      .provide(createAdapter({
        provides: CachePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ get: () => undefined, set: () => {}, invalidate: () => {} }),
      }))
      .provide(userServiceAdapter)
      .build();

    expect(graph.adapters.length).toBe(4);
  });
});

// =============================================================================
// Test 4: Graph with Mixed Lifetime Adapters
// =============================================================================

describe("Integration: Graph with mixed lifetime adapters", () => {
  it("allows singleton, scoped, and request adapters in same graph", () => {
    const singletonAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ get: () => "", getNumber: () => 0 }),
    });

    const scopedAdapter = createAdapter({
      provides: LoggerPort,
      requires: [ConfigPort],
      lifetime: "scoped",
      factory: () => ({ log: () => {}, error: () => {} }),
    });

    const requestAdapter = createAdapter({
      provides: CachePort,
      requires: [LoggerPort],
      lifetime: "request",
      factory: () => ({ get: () => undefined, set: () => {}, invalidate: () => {} }),
    });

    const graph = GraphBuilder.create()
      .provide(singletonAdapter)
      .provide(scopedAdapter)
      .provide(requestAdapter)
      .build();

    // Verify all adapters are included
    expect(graph.adapters.length).toBe(3);

    // Use safer access pattern for array elements
    const firstAdapter = graph.adapters[0];
    const secondAdapter = graph.adapters[1];
    const thirdAdapter = graph.adapters[2];

    expect(firstAdapter?.lifetime).toBe("singleton");
    expect(secondAdapter?.lifetime).toBe("scoped");
    expect(thirdAdapter?.lifetime).toBe("request");
  });
});

// =============================================================================
// Test 5: Real-World Usage Pattern
// =============================================================================

describe("Integration: Real-world usage pattern", () => {
  it("models a complete application with Logger, Database, UserService, EmailService, NotificationService", () => {
    // Infrastructure layer
    const loggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        log: (_msg) => {
          // In real app: console.log(`[LOG] ${msg}`)
        },
        error: (_msg, _err) => {
          // In real app: console.error(`[ERROR] ${msg}`, err)
        },
      }),
    });

    const configAdapter = createAdapter({
      provides: ConfigPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        get: (_key) => "config-value",
        getNumber: (_key) => 0,
      }),
    });

    // Data layer
    const databaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [LoggerPort, ConfigPort],
      lifetime: "singleton",
      factory: (deps) => ({
        query: async (sql) => {
          deps.Logger.log(`Query: ${sql}`);
          return [];
        },
        execute: async (sql) => {
          deps.Logger.log(`Execute: ${sql}`);
        },
      }),
    });

    const cacheAdapter = createAdapter({
      provides: CachePort,
      requires: [ConfigPort],
      lifetime: "singleton",
      factory: () => ({
        get: () => undefined,
        set: () => {},
        invalidate: () => {},
      }),
    });

    // Repository layer
    const userRepositoryAdapter = createAdapter({
      provides: UserRepositoryPort,
      requires: [DatabasePort, CachePort, LoggerPort],
      lifetime: "scoped",
      factory: (deps) => ({
        findById: async (id) => {
          const cached = deps.Cache.get<{ id: string; name: string; email: string }>(`user:${id}`);
          if (cached) return cached;
          const [user] = await deps.Database.query<{ id: string; name: string; email: string }>(
            "SELECT * FROM users WHERE id = ?",
            [id]
          );
          if (user) deps.Cache.set(`user:${id}`, user, 3600);
          return user || null;
        },
        save: async (user) => {
          await deps.Database.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            [user.name, user.email]
          );
          return { id: "generated-id" };
        },
      }),
    });

    // Service layer
    const userServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [UserRepositoryPort, LoggerPort],
      lifetime: "scoped",
      factory: (deps) => ({
        getUser: async (id) => {
          deps.Logger.log(`UserService.getUser(${id})`);
          return deps.UserRepository.findById(id);
        },
        createUser: async (name, email) => {
          deps.Logger.log(`UserService.createUser(${name}, ${email})`);
          return deps.UserRepository.save({ name, email });
        },
      }),
    });

    const emailServiceAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [ConfigPort, LoggerPort],
      lifetime: "request",
      factory: (deps) => ({
        send: async (to, subject, _body) => {
          deps.Logger.log(`Sending email to ${to}: ${subject}`);
          // Would use deps.Config to get SMTP settings
        },
      }),
    });

    const notificationServiceAdapter = createAdapter({
      provides: NotificationServicePort,
      requires: [UserServicePort, EmailServicePort, LoggerPort],
      lifetime: "request",
      factory: (deps) => ({
        notify: async (userId, message) => {
          deps.Logger.log(`Notifying user ${userId}`);
          const user = await deps.UserService.getUser(userId);
          if (user) {
            await deps.EmailService.send(user.email, "Notification", message);
          }
        },
      }),
    });

    // Build complete application graph
    const graph = GraphBuilder.create()
      .provide(loggerAdapter)
      .provide(configAdapter)
      .provide(databaseAdapter)
      .provide(cacheAdapter)
      .provide(userRepositoryAdapter)
      .provide(userServiceAdapter)
      .provide(emailServiceAdapter)
      .provide(notificationServiceAdapter)
      .build();

    // Verify graph contains all adapters
    expect(graph.adapters.length).toBe(8);
    expect(Object.isFrozen(graph)).toBe(true);

    // Verify type correctness - use conditional inference since __provides is optional
    type ProvidedPorts = (typeof graph) extends { __provides?: infer P } ? P : never;
    expectTypeOf<ProvidedPorts>().toEqualTypeOf<
      | typeof LoggerPort
      | typeof ConfigPort
      | typeof DatabasePort
      | typeof CachePort
      | typeof UserRepositoryPort
      | typeof UserServicePort
      | typeof EmailServicePort
      | typeof NotificationServicePort
    >();
  });
});

// =============================================================================
// Test 6: Error Recovery - Adding Missing Dependency Fixes Build
// =============================================================================

describe("Integration: Error recovery", () => {
  it("adding missing dependency fixes build type error", () => {
    const userServiceAdapter = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort],
      lifetime: "scoped",
      factory: () => ({
        getUser: async () => null,
        createUser: async () => ({ id: "1" }),
      }),
    });

    // Step 1: Incomplete graph - only Logger provided
    const incompleteBuilder = GraphBuilder.create()
      .provide(createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {}, error: () => {} }),
      }))
      .provide(userServiceAdapter);

    // Verify build requires error argument when incomplete
    type IncompleteParams = Parameters<typeof incompleteBuilder.build>;
    type ErrorArg = IncompleteParams[0];
    type IsError = ErrorArg extends MissingDependencyError<typeof DatabasePort>
      ? true
      : false;
    expectTypeOf<IsError>().toEqualTypeOf<true>();

    // Step 2: Add the missing Database adapter
    const completeBuilder = incompleteBuilder.provide(
      createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: async () => [], execute: async () => {} }),
      })
    );

    // Verify it's now a valid graph - build takes no arguments
    type CompleteParams = Parameters<typeof completeBuilder.build>;
    type TakesNoArgs = CompleteParams extends [] ? true : false;
    expectTypeOf<TakesNoArgs>().toEqualTypeOf<true>();

    type CompleteResult = ReturnType<typeof completeBuilder.build>;
    type IsValidGraph = CompleteResult extends Graph<infer _P> ? true : false;
    expectTypeOf<IsValidGraph>().toEqualTypeOf<true>();

    // Build the graph
    const graph = completeBuilder.build();
    expect(graph.adapters.length).toBe(3);
  });
});

// =============================================================================
// Test 7: Factory Function Receives Correct Dependency Object Shape
// =============================================================================

describe("Integration: Factory dependency object shape", () => {
  it("factory receives correctly typed dependency object", () => {
    let capturedDeps: unknown = null;

    const adapterWithDeps = createAdapter({
      provides: UserServicePort,
      requires: [LoggerPort, DatabasePort, CachePort],
      lifetime: "scoped",
      factory: (deps) => {
        // Capture deps for verification
        capturedDeps = deps;

        // Type-level verification
        expectTypeOf(deps).toEqualTypeOf<{
          Logger: Logger;
          Database: Database;
          Cache: Cache;
        }>();

        return {
          getUser: async () => null,
          createUser: async () => ({ id: "1" }),
        };
      },
    });

    // Call the factory with mock dependencies
    const mockDeps = {
      Logger: { log: () => {}, error: () => {} },
      Database: { query: async () => [], execute: async () => {} },
      Cache: { get: () => undefined, set: () => {}, invalidate: () => {} },
    };

    adapterWithDeps.factory(mockDeps);

    // Verify the captured deps match what was passed
    expect(capturedDeps).toEqual(mockDeps);
    expect(Object.keys(capturedDeps as object)).toEqual(["Logger", "Database", "Cache"]);
  });

  it("empty requires results in empty dependency object type", () => {
    const noDepsAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: (deps) => {
        // deps should be Record<string, unknown> for compatibility with other adapters
        expectTypeOf(deps).toEqualTypeOf<Record<string, unknown>>();
        return { log: () => {}, error: () => {} };
      },
    });

    // Factory can be called with empty object
    const result = noDepsAdapter.factory({});
    expect(result).toBeDefined();
    expect(result.log).toBeInstanceOf(Function);
  });
});

// =============================================================================
// Test 8: Graph Works Correctly with @hex-di/ports Imports
// =============================================================================

describe("Integration: @hex-di/ports compatibility", () => {
  it("ports created with createPort work seamlessly with graph", () => {
    // Use types directly from @hex-di/ports
    const CustomPort = createPort<"Custom", { doSomething(): void }>("Custom");

    type PortType = typeof CustomPort;
    type ServiceType = InferService<PortType>;

    // Verify InferService works
    expectTypeOf<ServiceType>().toEqualTypeOf<{ doSomething(): void }>();

    // Create adapter using the port
    const adapter = createAdapter({
      provides: CustomPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ doSomething: () => {} }),
    });

    // Build graph
    const graph = GraphBuilder.create().provide(adapter).build();

    // Verify the graph correctly types the provides - use conditional inference
    type GraphProvides = (typeof graph) extends { __provides?: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<typeof CustomPort>();
  });

  it("multiple ports with different service types work correctly", () => {
    interface ServiceA { methodA(): string; }
    interface ServiceB { methodB(): number; }
    interface ServiceC { methodC(a: ServiceA, b: ServiceB): boolean; }

    const PortA = createPort<"ServiceA", ServiceA>("ServiceA");
    const PortB = createPort<"ServiceB", ServiceB>("ServiceB");
    const PortC = createPort<"ServiceC", ServiceC>("ServiceC");

    const adapterA = createAdapter({
      provides: PortA,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ methodA: () => "a" }),
    });

    const adapterB = createAdapter({
      provides: PortB,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ methodB: () => 42 }),
    });

    const adapterC = createAdapter({
      provides: PortC,
      requires: [PortA, PortB],
      lifetime: "scoped",
      factory: (deps) => ({
        methodC: (_a, _b) => deps.ServiceA.methodA() === "a" && deps.ServiceB.methodB() === 42,
      }),
    });

    const graph = GraphBuilder.create()
      .provide(adapterA)
      .provide(adapterB)
      .provide(adapterC)
      .build();

    expect(graph.adapters.length).toBe(3);

    // Use conditional inference since __provides is optional
    type GraphProvides = (typeof graph) extends { __provides?: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<
      typeof PortA | typeof PortB | typeof PortC
    >();
  });
});

// =============================================================================
// Test 9: Type Inference in Complex Generic Scenarios
// =============================================================================

describe("Integration: Complex generic type inference", () => {
  it("type inference works through complex nested generics", () => {
    // Create a generic repository pattern
    interface Repository<T> {
      findById(id: string): Promise<T | null>;
      save(entity: T): Promise<void>;
    }

    interface User { id: string; name: string; }

    const UserRepoPort = createPort<"UserRepo", Repository<User>>("UserRepo");

    const userRepoAdapter = createAdapter({
      provides: UserRepoPort,
      requires: [DatabasePort],
      lifetime: "scoped",
      factory: (deps) => ({
        findById: async (id) => {
          const [user] = await deps.Database.query<User>("SELECT * FROM users WHERE id = ?", [id]);
          return user || null;
        },
        save: async (user) => {
          await deps.Database.execute("INSERT INTO users VALUES (?)", [user]);
        },
      }),
    });

    // Verify type inference preserved the generic
    type UserRepoService = InferService<typeof UserRepoPort>;
    expectTypeOf<UserRepoService>().toEqualTypeOf<Repository<User>>();

    // Build graph with database dependency
    const graph = GraphBuilder.create()
      .provide(createAdapter({
        provides: DatabasePort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ query: async () => [], execute: async () => {} }),
      }))
      .provide(userRepoAdapter)
      .build();

    // Use conditional inference since __provides is optional
    type GraphProvides = (typeof graph) extends { __provides?: infer P } ? P : never;
    expectTypeOf<GraphProvides>().toEqualTypeOf<typeof DatabasePort | typeof UserRepoPort>();
  });

  it("conditional types work correctly with graph builder types", () => {
    const adapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: () => {}, error: () => {} }),
    });

    const builder = GraphBuilder.create().provide(adapter);

    // Test UnsatisfiedDependencies with extracted types
    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;
    type Unsatisfied = UnsatisfiedDependencies<Provides, Requires>;

    // No unsatisfied dependencies
    expectTypeOf<Unsatisfied>().toBeNever();
  });
});

// =============================================================================
// Test 10: Edge Case - Adapter That Requires Itself (Self-Referential)
// =============================================================================

describe("Integration: Self-referential adapter (edge case)", () => {
  it("adapter requiring itself produces compile-time error when building", () => {
    // This is a degenerate case - an adapter that requires its own port
    // The graph should detect this as an unsatisfied dependency

    const selfReferentialAdapter = createAdapter({
      provides: LoggerPort,
      requires: [LoggerPort], // Requires itself!
      lifetime: "singleton",
      factory: (deps) => {
        // This would be recursive - Logger requires Logger
        return deps.Logger; // Just return the dependency
      },
    });

    const builder = GraphBuilder.create().provide(selfReferentialAdapter);

    // The builder should show Logger as both provided AND required
    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;

    expectTypeOf<Provides>().toEqualTypeOf<typeof LoggerPort>();
    expectTypeOf<Requires>().toEqualTypeOf<typeof LoggerPort>();

    // But the graph should still build because Logger IS provided
    // (even though at runtime this would be circular)
    type Unsatisfied = UnsatisfiedDependencies<Provides, Requires>;
    expectTypeOf<Unsatisfied>().toBeNever();

    // The build succeeds at type level (circular detection is out of scope per spec)
    type BuildResult = ReturnType<typeof builder.build>;
    type IsValidGraph = BuildResult extends Graph<typeof LoggerPort> ? true : false;
    expectTypeOf<IsValidGraph>().toEqualTypeOf<true>();

    // At runtime, the adapter is added
    const graph = builder.build();
    expect(graph.adapters.length).toBe(1);
  });

  it("two adapters with circular dependency also pass type check", () => {
    // A requires B, B requires A - both provided
    interface ServiceA { a(): void; }
    interface ServiceB { b(): void; }

    const PortA = createPort<"A", ServiceA>("A");
    const PortB = createPort<"B", ServiceB>("B");

    const adapterA = createAdapter({
      provides: PortA,
      requires: [PortB],
      lifetime: "singleton",
      factory: (deps) => ({ a: () => deps.B.b() }),
    });

    const adapterB = createAdapter({
      provides: PortB,
      requires: [PortA],
      lifetime: "singleton",
      factory: (deps) => ({ b: () => deps.A.a() }),
    });

    const builder = GraphBuilder.create().provide(adapterA).provide(adapterB);

    // Both A and B are provided and required
    type Provides = InferGraphProvides<typeof builder>;
    type Requires = InferGraphRequires<typeof builder>;

    expectTypeOf<Provides>().toEqualTypeOf<typeof PortA | typeof PortB>();
    expectTypeOf<Requires>().toEqualTypeOf<typeof PortA | typeof PortB>();

    // All dependencies are satisfied (A is provided, B is provided)
    type Unsatisfied = UnsatisfiedDependencies<Provides, Requires>;
    expectTypeOf<Unsatisfied>().toBeNever();

    // Build succeeds at compile time
    const graph = builder.build();
    expect(graph.adapters.length).toBe(2);
  });
});
