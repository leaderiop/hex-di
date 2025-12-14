/**
 * Integration tests for Port Token System.
 *
 * These tests verify end-to-end workflows and scenarios that span
 * multiple components of the Port Token System:
 * 1. Complete port creation workflow with type and name verification
 * 2. Port objects have no prototype pollution (clean object structure)
 * 3. Real-world usage pattern demonstrating service interface + port + typeof
 * 4. Multiple independent ports can coexist without interference
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createPort,
  InferPortName,
  InferService,
  type Port,
} from "../src/index.js";

// =============================================================================
// Real-World Service Interfaces
// =============================================================================

/**
 * Example: Logging service interface representing a primary port
 */
interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

/**
 * Example: User repository interface representing a secondary port
 */
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<boolean>;
}

interface User {
  id: string;
  email: string;
  name: string;
}

/**
 * Example: Event bus interface for pub/sub communication
 */
interface IEventBus {
  publish<T>(event: string, payload: T): void;
  subscribe<T>(event: string, handler: (payload: T) => void): () => void;
}

// =============================================================================
// Integration Tests
// =============================================================================

describe("Integration: Complete Port Creation Workflow", () => {
  it("creates port, verifies type structure, and extracts components", () => {
    // Step 1: Create a port for a service interface
    const LoggerPort = createPort<"Logger", ILogger>("Logger");

    // Step 2: Verify runtime structure
    expect(LoggerPort.__portName).toBe("Logger");
    expect(Object.keys(LoggerPort)).toEqual(["__portName"]);
    expect(Object.isFrozen(LoggerPort)).toBe(true);

    // Step 3: Verify type-level name preservation
    type PortName = typeof LoggerPort["__portName"];
    expectTypeOf<PortName>().toEqualTypeOf<"Logger">();

    // Step 4: Extract and verify service type via utility
    type ExtractedService = InferService<typeof LoggerPort>;
    expectTypeOf<ExtractedService>().toEqualTypeOf<ILogger>();

    // Step 5: Extract and verify name type via utility
    type ExtractedName = InferPortName<typeof LoggerPort>;
    expectTypeOf<ExtractedName>().toEqualTypeOf<"Logger">();

    // Step 6: Verify reconstructed type matches original
    type ReconstructedPort = Port<ExtractedService, ExtractedName>;
    expectTypeOf<typeof LoggerPort>().toEqualTypeOf<ReconstructedPort>();
  });
});

describe("Integration: Port Object Cleanliness", () => {
  it("port objects have no prototype pollution or inherited enumerable properties", () => {
    const port = createPort<"CleanPort", ILogger>("CleanPort");

    // Verify only own enumerable properties
    const ownKeys = Object.keys(port);
    expect(ownKeys).toEqual(["__portName"]);

    // Verify no inherited enumerable properties leak through
    const allEnumerableKeys: string[] = [];
    for (const key in port) {
      allEnumerableKeys.push(key);
    }
    expect(allEnumerableKeys).toEqual(["__portName"]);

    // Verify the object has Object.prototype in its chain (normal frozen object)
    // but no additional prototype pollution
    expect(Object.getPrototypeOf(port)).toBe(Object.prototype);
  });

  it("port objects are not extensible after creation", () => {
    const port = createPort<"SealedPort", ILogger>("SealedPort");

    // Object should be frozen (sealed + non-writable properties)
    expect(Object.isFrozen(port)).toBe(true);
    expect(Object.isSealed(port)).toBe(true);
    expect(Object.isExtensible(port)).toBe(false);
  });
});

describe("Integration: Real-World Usage Pattern", () => {
  it("demonstrates service interface + port + typeof pattern for type-safe DI", () => {
    // Pattern: Define service interface, create port, use typeof for annotations

    // Step 1: Create ports for different services
    const LoggerPort = createPort<"Logger", ILogger>("Logger");
    const UserRepoPort = createPort<"UserRepository", IUserRepository>(
      "UserRepository"
    );
    const EventBusPort = createPort<"EventBus", IEventBus>("EventBus");

    // Step 2: Demonstrate value-type duality - ports are usable as types
    type LoggerPortType = typeof LoggerPort;
    type UserRepoPortType = typeof UserRepoPort;
    type EventBusPortType = typeof EventBusPort;

    // Step 3: Type annotations work correctly
    expectTypeOf<LoggerPortType>().toMatchTypeOf<Port<ILogger, "Logger">>();
    expectTypeOf<UserRepoPortType>().toMatchTypeOf<
      Port<IUserRepository, "UserRepository">
    >();
    expectTypeOf<EventBusPortType>().toMatchTypeOf<
      Port<IEventBus, "EventBus">
    >();

    // Step 4: Ports are distinct at runtime
    expect(LoggerPort).not.toBe(UserRepoPort);
    expect(UserRepoPort).not.toBe(EventBusPort);
    expect(LoggerPort.__portName).not.toBe(UserRepoPort.__portName);

    // Step 5: Ports can be stored in collections (common DI pattern)
    const ports = [LoggerPort, UserRepoPort, EventBusPort];
    expect(ports.map((p) => p.__portName)).toEqual([
      "Logger",
      "UserRepository",
      "EventBus",
    ]);
  });

  it("demonstrates nominal typing prevents accidental port confusion", () => {
    // Scenario: Two adapters implement the same interface but serve different purposes
    interface IStorage {
      get(key: string): Promise<string | null>;
      set(key: string, value: string): Promise<void>;
    }

    // Create two ports for the same interface but different purposes
    const CachePort = createPort<"Cache", IStorage>("Cache");
    const PersistentStorePort = createPort<"PersistentStore", IStorage>(
      "PersistentStore"
    );

    // At runtime, they have different names
    expect(CachePort.__portName).toBe("Cache");
    expect(PersistentStorePort.__portName).toBe("PersistentStore");

    // At type level, they are incompatible (nominal typing)
    expectTypeOf(CachePort).not.toEqualTypeOf(PersistentStorePort);
    expectTypeOf<typeof CachePort>().not.toMatchTypeOf<
      typeof PersistentStorePort
    >();

    // This prevents accidentally passing Cache where PersistentStore is expected
    // The following would cause a compile error if uncommented:
    // const wrongPort: typeof PersistentStorePort = CachePort; // Error!
  });
});

describe("Integration: Multiple Independent Ports", () => {
  it("multiple ports with same interface coexist without interference", () => {
    // Create multiple ports for the same interface
    const ConsoleLogger = createPort<"ConsoleLogger", ILogger>("ConsoleLogger");
    const FileLogger = createPort<"FileLogger", ILogger>("FileLogger");
    const NetworkLogger = createPort<"NetworkLogger", ILogger>("NetworkLogger");

    // Each port is independently frozen and immutable
    expect(Object.isFrozen(ConsoleLogger)).toBe(true);
    expect(Object.isFrozen(FileLogger)).toBe(true);
    expect(Object.isFrozen(NetworkLogger)).toBe(true);

    // Each port has its own distinct name
    expect(ConsoleLogger.__portName).toBe("ConsoleLogger");
    expect(FileLogger.__portName).toBe("FileLogger");
    expect(NetworkLogger.__portName).toBe("NetworkLogger");

    // All three are type-incompatible with each other
    expectTypeOf(ConsoleLogger).not.toEqualTypeOf(FileLogger);
    expectTypeOf(FileLogger).not.toEqualTypeOf(NetworkLogger);
    expectTypeOf(ConsoleLogger).not.toEqualTypeOf(NetworkLogger);

    // But all share the same service interface
    type ConsoleService = InferService<typeof ConsoleLogger>;
    type FileService = InferService<typeof FileLogger>;
    type NetworkService = InferService<typeof NetworkLogger>;

    expectTypeOf<ConsoleService>().toEqualTypeOf<ILogger>();
    expectTypeOf<FileService>().toEqualTypeOf<ILogger>();
    expectTypeOf<NetworkService>().toEqualTypeOf<ILogger>();
  });
});
