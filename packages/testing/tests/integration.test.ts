/**
 * Integration tests for @hex-di/testing package.
 *
 * These tests verify end-to-end workflows combining multiple testing utilities:
 * 1. TestGraphBuilder -> createTestContainer -> resolve workflow
 * 2. createMockAdapter -> createSpiedMockAdapter -> assertions workflow
 * 3. Full adapter testing workflow with createAdapterTest
 * 4. Graph assertions with TestGraphBuilder integration
 * 5. Snapshot testing with graph overrides
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPort } from "@hex-di/ports";
import { GraphBuilder, createAdapter } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Import all testing utilities
import { TestGraphBuilder } from "../src/test-graph-builder.js";
import { createMockAdapter } from "../src/mock-adapter.js";
import { createAdapterTest } from "../src/adapter-test-harness.js";
import {
  assertGraphComplete,
  assertPortProvided,
  assertLifetime,
} from "../src/graph-assertions.js";
import { serializeGraph } from "../src/graph-snapshot.js";
import {
  createSpiedMockAdapter,
  type SpiedService,
} from "../src/vitest/spied-mock-adapter.js";
import { createTestContainer, useTestContainer } from "../src/vitest/use-test-container.js";

// =============================================================================
// Test Service Interfaces
// =============================================================================

interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown[]>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string; email: string } | null>;
  save(user: { name: string; email: string }): Promise<{ id: string; name: string; email: string }>;
}

interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface UserService {
  getUser(id: string): Promise<{ id: string; name: string; email: string }>;
  createUser(name: string, email: string): Promise<{ id: string; name: string; email: string }>;
  notifyUser(userId: string, message: string): Promise<void>;
}

// =============================================================================
// Test Port Tokens
// =============================================================================

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const UserRepositoryPort = createPort<"UserRepository", UserRepository>("UserRepository");
const EmailServicePort = createPort<"EmailService", EmailService>("EmailService");
const UserServicePort = createPort<"UserService", UserService>("UserService");

// =============================================================================
// Production Adapters
// =============================================================================

const ProductionLoggerAdapter = createAdapter({
  provides: LoggerPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({
    log: (message) => console.log(`[LOG] ${message}`),
    warn: (message) => console.warn(`[WARN] ${message}`),
    error: (message) => console.error(`[ERROR] ${message}`),
  }),
});

const ProductionDatabaseAdapter = createAdapter({
  provides: DatabasePort,
  requires: [LoggerPort],
  lifetime: "singleton",
  factory: (deps) => ({
    query: async <T>(sql: string): Promise<T[]> => {
      deps.Logger.log(`Executing query: ${sql}`);
      return []; // Production would actually query
    },
    connect: async () => {
      deps.Logger.log("Connecting to database");
    },
    disconnect: async () => {
      deps.Logger.log("Disconnecting from database");
    },
  }),
  finalizer: async (db) => {
    await db.disconnect();
  },
});

const ProductionUserRepositoryAdapter = createAdapter({
  provides: UserRepositoryPort,
  requires: [DatabasePort, LoggerPort],
  lifetime: "request",
  factory: (deps) => ({
    findById: async (id) => {
      deps.Logger.log(`Finding user by id: ${id}`);
      const results = await deps.Database.query(
        `SELECT * FROM users WHERE id = '${id}'`
      ) as { id: string; name: string; email: string }[];
      return results[0] ?? null;
    },
    save: async (user) => {
      deps.Logger.log(`Saving user: ${user.name}`);
      await deps.Database.query(`INSERT INTO users (name, email) VALUES ('${user.name}', '${user.email}')`);
      return { id: "new-id", ...user };
    },
  }),
});

const ProductionEmailServiceAdapter = createAdapter({
  provides: EmailServicePort,
  requires: [LoggerPort],
  lifetime: "request",
  factory: (deps) => ({
    send: async (to, subject, body) => {
      deps.Logger.log(`Sending email to ${to}: ${subject}`);
      // Production would actually send email
    },
  }),
});

const ProductionUserServiceAdapter = createAdapter({
  provides: UserServicePort,
  requires: [UserRepositoryPort, EmailServicePort, LoggerPort],
  lifetime: "request",
  factory: (deps) => ({
    getUser: async (id) => {
      deps.Logger.log(`Getting user ${id}`);
      const user = await deps.UserRepository.findById(id);
      if (!user) {
        throw new Error(`User ${id} not found`);
      }
      return user;
    },
    createUser: async (name, email) => {
      deps.Logger.log(`Creating user ${name}`);
      const user = await deps.UserRepository.save({ name, email });
      await deps.EmailService.send(email, "Welcome!", `Hello ${name}, welcome to our service!`);
      return user;
    },
    notifyUser: async (userId, message) => {
      const user = await deps.UserRepository.findById(userId);
      if (user) {
        await deps.EmailService.send(user.email, "Notification", message);
      }
    },
  }),
});

// Production graph
const productionGraph = GraphBuilder.create()
  .provide(ProductionLoggerAdapter)
  .provide(ProductionDatabaseAdapter)
  .provide(ProductionUserRepositoryAdapter)
  .provide(ProductionEmailServiceAdapter)
  .provide(ProductionUserServiceAdapter)
  .build();

// =============================================================================
// Integration Test: TestGraphBuilder -> createTestContainer -> resolve
// =============================================================================

describe("TestGraphBuilder -> createTestContainer -> resolve workflow", () => {
  it("overrides production adapters and resolves services correctly", async () => {
    // Create singleton mocks so we can track calls across resolutions
    const logFn = vi.fn();
    const findByIdFn = vi.fn().mockResolvedValue({ id: "123", name: "Test User", email: "test@example.com" });

    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn, warn: vi.fn(), error: vi.fn() }),
    });

    const mockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn().mockResolvedValue([]), connect: vi.fn(), disconnect: vi.fn() }),
    });

    const mockUserRepositoryAdapter = createAdapter({
      provides: UserRepositoryPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        findById: findByIdFn,
        save: vi.fn().mockResolvedValue({ id: "generated-id", name: "Test", email: "test@example.com" }),
      }),
    });

    const mockEmailServiceAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ send: vi.fn() }),
    });

    // Build test graph with overrides
    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(mockLoggerAdapter)
      .override(mockDatabaseAdapter)
      .override(mockUserRepositoryAdapter)
      .override(mockEmailServiceAdapter)
      .build();

    // Create test container
    const { scope, dispose } = createTestContainer(testGraph);

    try {
      // Resolve and use the service
      const userService = scope.resolve(UserServicePort);
      const user = await userService.getUser("123");

      // Verify service returned correct data
      expect(user).toEqual({
        id: "123",
        name: "Test User",
        email: "test@example.com",
      });

      // Verify mock interactions
      expect(logFn).toHaveBeenCalledWith("Getting user 123");
      expect(findByIdFn).toHaveBeenCalledWith("123");
    } finally {
      await dispose();
    }
  });

  it("handles complex workflows with multiple service interactions", async () => {
    // Create singleton mocks with captured spy functions
    const logFn = vi.fn();
    const sendEmailFn = vi.fn();
    const saveFn = vi.fn().mockResolvedValue({ id: "new-user-id", name: "Alice", email: "alice@example.com" });

    const mockLoggerAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ log: logFn, warn: vi.fn(), error: vi.fn() }),
    });

    const mockDatabaseAdapter = createAdapter({
      provides: DatabasePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ query: vi.fn().mockResolvedValue([]), connect: vi.fn(), disconnect: vi.fn() }),
    });

    const mockUserRepositoryAdapter = createAdapter({
      provides: UserRepositoryPort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({
        findById: vi.fn().mockResolvedValue(null),
        save: saveFn,
      }),
    });

    const mockEmailServiceAdapter = createAdapter({
      provides: EmailServicePort,
      requires: [],
      lifetime: "singleton",
      factory: () => ({ send: sendEmailFn }),
    });

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(mockLoggerAdapter)
      .override(mockDatabaseAdapter)
      .override(mockUserRepositoryAdapter)
      .override(mockEmailServiceAdapter)
      .build();

    const { scope, dispose } = createTestContainer(testGraph);

    try {
      const userService = scope.resolve(UserServicePort);

      // Create a new user
      const newUser = await userService.createUser("Alice", "alice@example.com");

      expect(newUser).toEqual({
        id: "new-user-id",
        name: "Alice",
        email: "alice@example.com",
      });

      // Verify email was sent (using captured spy, not resolved instance)
      expect(sendEmailFn).toHaveBeenCalledWith(
        "alice@example.com",
        "Welcome!",
        "Hello Alice, welcome to our service!"
      );
    } finally {
      await dispose();
    }
  });
});

// =============================================================================
// Integration Test: createMockAdapter + createSpiedMockAdapter workflow
// =============================================================================

describe("createMockAdapter + createSpiedMockAdapter workflow", () => {
  it("combines partial mock with spied mock for different behaviors", async () => {
    // Use createMockAdapter for simple stub (throws on unimplemented methods)
    const simpleLoggerMock = createMockAdapter(LoggerPort, {
      log: () => {}, // Just a no-op
      // warn and error will throw if called
    });

    // Use createSpiedMockAdapter for full tracking
    const spiedDatabaseMock = createSpiedMockAdapter(DatabasePort, {
      query: async () => [{ id: "1", name: "Found" }],
      connect: async () => {},
      disconnect: async () => {},
    });

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(simpleLoggerMock)
      .override(spiedDatabaseMock)
      .build();

    const { scope, dispose } = createTestContainer(testGraph);

    try {
      // Using simple mock - just works, no tracking needed
      const logger = scope.resolve(LoggerPort);
      logger.log("test"); // Works
      expect(() => logger.warn("test")).toThrow("not implemented"); // Throws

      // Using spied mock - full tracking
      const db = scope.resolve(DatabasePort);
      const results = await db.query("SELECT * FROM users");

      expect(results).toEqual([{ id: "1", name: "Found" }]);

      // SpiedMockAdapter enables call tracking
      const spiedDb = db as SpiedService<Database>;
      expect(spiedDb.query).toHaveBeenCalledWith("SELECT * FROM users");
      expect(spiedDb.query.mock.calls).toHaveLength(1);
    } finally {
      await dispose();
    }
  });

  it("spied mock can be reconfigured mid-test", async () => {
    const spiedMock = createSpiedMockAdapter(UserRepositoryPort);

    const simpleLoggerMock = createMockAdapter(LoggerPort, {
      log: () => {},
      warn: () => {},
      error: () => {},
    });

    const simpleDbMock = createMockAdapter(DatabasePort, {
      query: async () => [],
      connect: async () => {},
      disconnect: async () => {},
    });

    const simpleEmailMock = createMockAdapter(EmailServicePort, {
      send: async () => {},
    });

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(simpleLoggerMock)
      .override(simpleDbMock)
      .override(spiedMock)
      .override(simpleEmailMock)
      .build();

    const { scope, dispose } = createTestContainer(testGraph);

    try {
      const userRepo = scope.resolve(UserRepositoryPort) as SpiedService<UserRepository>;

      // Configure behavior for first scenario
      userRepo.findById.mockResolvedValueOnce({ id: "1", name: "Alice", email: "alice@test.com" });

      const user1 = await userRepo.findById("1");
      expect(user1?.name).toBe("Alice");

      // Reconfigure for second scenario
      userRepo.findById.mockResolvedValueOnce(null);

      const user2 = await userRepo.findById("2");
      expect(user2).toBeNull();

      // Both calls tracked
      expect(userRepo.findById.mock.calls).toEqual([["1"], ["2"]]);
    } finally {
      await dispose();
    }
  });
});

// =============================================================================
// Integration Test: createAdapterTest for isolated adapter testing
// =============================================================================

describe("createAdapterTest integration", () => {
  it("tests adapter factory with mock dependencies", async () => {
    const mockLogger: Logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockUserRepository: UserRepository = {
      findById: vi.fn().mockResolvedValue({ id: "123", name: "Bob", email: "bob@test.com" }),
      save: vi.fn().mockResolvedValue({ id: "new", name: "New User", email: "new@test.com" }),
    };

    const mockEmailService: EmailService = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    const harness = createAdapterTest(ProductionUserServiceAdapter, {
      Logger: mockLogger,
      UserRepository: mockUserRepository,
      EmailService: mockEmailService,
    });

    const userService = harness.invoke();

    // Test getUser
    const user = await userService.getUser("123");
    expect(user).toEqual({ id: "123", name: "Bob", email: "bob@test.com" });

    // Verify dependencies were called via getDeps()
    expect(harness.getDeps().Logger.log).toHaveBeenCalledWith("Getting user 123");
    expect(harness.getDeps().UserRepository.findById).toHaveBeenCalledWith("123");
  });

  it("creates fresh service instance on each invoke()", async () => {
    let instanceCount = 0;

    const CountingAdapter = createAdapter({
      provides: LoggerPort,
      requires: [],
      lifetime: "request",
      factory: () => {
        instanceCount++;
        const currentInstance = instanceCount;
        return {
          log: (msg: string) => console.log(`Instance ${currentInstance}: ${msg}`),
          warn: () => {},
          error: () => {},
        };
      },
    });

    const harness = createAdapterTest(CountingAdapter, {});

    harness.invoke();
    harness.invoke();
    harness.invoke();

    expect(instanceCount).toBe(3);
  });
});

// =============================================================================
// Integration Test: Graph assertions with TestGraphBuilder
// =============================================================================

describe("graph assertions with TestGraphBuilder", () => {
  it("assertGraphComplete works on test graphs", () => {
    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(createMockAdapter(LoggerPort, { log: () => {}, warn: () => {}, error: () => {} }))
      .build();

    // Should not throw - graph is still complete
    expect(() => assertGraphComplete(testGraph)).not.toThrow();
  });

  it("assertPortProvided works on test graphs with overrides", () => {
    const mockLoggerAdapter = createMockAdapter(LoggerPort, { log: () => {} });

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(mockLoggerAdapter)
      .build();

    // All ports should still be provided
    expect(() => assertPortProvided(testGraph, LoggerPort)).not.toThrow();
    expect(() => assertPortProvided(testGraph, DatabasePort)).not.toThrow();
    expect(() => assertPortProvided(testGraph, UserServicePort)).not.toThrow();
  });

  it("assertLifetime reflects overridden adapter lifetime", () => {
    // Original Logger is singleton, override with request
    const mockLoggerAdapter = createMockAdapter(
      LoggerPort,
      { log: () => {} },
      { lifetime: "request" }
    );

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(mockLoggerAdapter)
      .build();

    // Lifetime should be the override's lifetime
    expect(() => assertLifetime(testGraph, LoggerPort, "request")).not.toThrow();

    // Original lifetime assertion should fail
    expect(() => assertLifetime(testGraph, LoggerPort, "singleton")).toThrow();
  });
});

// =============================================================================
// Integration Test: Snapshot testing with graph modifications
// =============================================================================

describe("snapshot testing with graph modifications", () => {
  it("serializes overridden graph for comparison", () => {
    const mockLoggerAdapter = createMockAdapter(
      LoggerPort,
      { log: () => {} },
      { lifetime: "request" }
    );

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(mockLoggerAdapter)
      .build();

    const snapshot = serializeGraph(testGraph);

    // Find Logger in snapshot
    const loggerSnapshot = snapshot.adapters.find((a) => a.port === "Logger");
    expect(loggerSnapshot?.lifetime).toBe("request"); // Reflects override

    // Can still snapshot the full structure
    expect(snapshot.adapters).toHaveLength(5);
    expect(snapshot).toMatchSnapshot();
  });

  it("compares production vs test graph snapshots", () => {
    const productionSnapshot = serializeGraph(productionGraph);

    const mockLoggerAdapter = createMockAdapter(
      LoggerPort,
      { log: () => {} },
      { lifetime: "request" }
    );

    const testGraph = TestGraphBuilder.from(productionGraph)
      .override(mockLoggerAdapter)
      .build();

    const testSnapshot = serializeGraph(testGraph);

    // Same number of adapters
    expect(testSnapshot.adapters).toHaveLength(productionSnapshot.adapters.length);

    // Logger lifetime differs
    const prodLogger = productionSnapshot.adapters.find((a) => a.port === "Logger");
    const testLogger = testSnapshot.adapters.find((a) => a.port === "Logger");

    expect(prodLogger?.lifetime).toBe("singleton");
    expect(testLogger?.lifetime).toBe("request");

    // Other adapters unchanged
    const prodDatabase = productionSnapshot.adapters.find((a) => a.port === "Database");
    const testDatabase = testSnapshot.adapters.find((a) => a.port === "Database");

    expect(prodDatabase).toEqual(testDatabase);
  });
});

// =============================================================================
// Integration Test: useTestContainer hook integration
// =============================================================================

describe("useTestContainer workflow integration", () => {
  describe("with TestGraphBuilder factory", () => {
    // Mock adapters created inside factory for fresh instances per test
    const testContext = useTestContainer(() => {
      const mockLogger = createSpiedMockAdapter(LoggerPort);
      const mockDatabase = createSpiedMockAdapter(DatabasePort);
      const mockUserRepository = createSpiedMockAdapter(UserRepositoryPort, {
        findById: async () => ({ id: "hook-test", name: "Hook User", email: "hook@test.com" }),
        save: async (user) => ({ id: "hook-id", ...user }),
      });
      const mockEmailService = createSpiedMockAdapter(EmailServicePort);

      return TestGraphBuilder.from(productionGraph)
        .override(mockLogger)
        .override(mockDatabase)
        .override(mockUserRepository)
        .override(mockEmailService)
        .build();
    });

    it("resolves services with mocks", async () => {
      const userService = testContext.scope.resolve(UserServicePort);
      const user = await userService.getUser("hook-test");

      expect(user.name).toBe("Hook User");
    });

    it("fresh mocks per test", () => {
      const logger = testContext.scope.resolve(LoggerPort) as SpiedService<Logger>;
      // Fresh mock - no prior calls from previous test
      expect(logger.log.mock.calls.length).toBe(0);
    });
  });
});
