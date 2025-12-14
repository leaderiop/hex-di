/**
 * MemoMap unit tests.
 *
 * Tests for the internal MemoMap class that manages instance caching
 * per scope/container with LIFO disposal ordering.
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { MemoMap } from "../src/memo-map.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): unknown;
}

interface Cache {
  get(key: string): unknown;
}

const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");
const CachePort = createPort<"Cache", Cache>("Cache");

// =============================================================================
// getOrElseMemoize Tests
// =============================================================================

describe("MemoMap.getOrElseMemoize", () => {
  test("returns cached instance on subsequent calls", () => {
    const memoMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };
    const factory = vi.fn(() => logger);

    const first = memoMap.getOrElseMemoize(LoggerPort, factory);
    const second = memoMap.getOrElseMemoize(LoggerPort, factory);

    expect(first).toBe(second);
    expect(first).toBe(logger);
  });

  test("calls factory only once per port", () => {
    const memoMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };
    const factory = vi.fn(() => logger);

    memoMap.getOrElseMemoize(LoggerPort, factory);
    memoMap.getOrElseMemoize(LoggerPort, factory);
    memoMap.getOrElseMemoize(LoggerPort, factory);

    expect(factory).toHaveBeenCalledTimes(1);
  });

  test("tracks creation order correctly for LIFO disposal", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    const logger: Logger = { log: vi.fn() };
    const database: Database = { query: vi.fn() };
    const cache: Cache = { get: vi.fn() };

    memoMap.getOrElseMemoize(LoggerPort, () => logger, () => {
      disposalOrder.push("Logger");
    });
    memoMap.getOrElseMemoize(DatabasePort, () => database, () => {
      disposalOrder.push("Database");
    });
    memoMap.getOrElseMemoize(CachePort, () => cache, () => {
      disposalOrder.push("Cache");
    });

    await memoMap.dispose();

    // LIFO: Cache (last created) -> Database -> Logger (first created)
    expect(disposalOrder).toEqual(["Cache", "Database", "Logger"]);
  });
});

// =============================================================================
// fork Tests
// =============================================================================

describe("MemoMap.fork", () => {
  test("creates child with shared parent entries", () => {
    const parentMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };

    parentMap.getOrElseMemoize(LoggerPort, () => logger);

    const childMap = parentMap.fork();

    // Child should see parent's cached instance
    const childFactory = vi.fn(() => ({ log: vi.fn() }));
    const childLogger = childMap.getOrElseMemoize(LoggerPort, childFactory);

    expect(childLogger).toBe(logger);
    expect(childFactory).not.toHaveBeenCalled();
  });

  test("child has independent entries for new ports", () => {
    const parentMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };

    parentMap.getOrElseMemoize(LoggerPort, () => logger);

    const childMap = parentMap.fork();
    const database: Database = { query: vi.fn() };

    // Child creates its own instance for a new port
    childMap.getOrElseMemoize(DatabasePort, () => database);

    // Parent should not have the child's entry
    expect(parentMap.has(DatabasePort)).toBe(false);
    expect(childMap.has(DatabasePort)).toBe(true);
  });
});

// =============================================================================
// dispose Tests
// =============================================================================

describe("MemoMap.dispose", () => {
  test("calls finalizers in LIFO order", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    const logger: Logger = { log: vi.fn() };
    const database: Database = { query: vi.fn() };

    memoMap.getOrElseMemoize(LoggerPort, () => logger, () => {
      disposalOrder.push("Logger");
    });
    memoMap.getOrElseMemoize(DatabasePort, () => database, () => {
      disposalOrder.push("Database");
    });

    await memoMap.dispose();

    expect(disposalOrder).toEqual(["Database", "Logger"]);
  });

  test("continues on finalizer error and aggregates multiple errors", async () => {
    const memoMap = new MemoMap();
    const disposalOrder: string[] = [];

    const logger: Logger = { log: vi.fn() };
    const database: Database = { query: vi.fn() };
    const cache: Cache = { get: vi.fn() };

    memoMap.getOrElseMemoize(LoggerPort, () => logger, () => {
      disposalOrder.push("Logger");
      throw new Error("Logger finalizer failed");
    });
    memoMap.getOrElseMemoize(DatabasePort, () => database, () => {
      disposalOrder.push("Database");
      throw new Error("Database finalizer failed");
    });
    memoMap.getOrElseMemoize(CachePort, () => cache, () => {
      disposalOrder.push("Cache");
      // This one succeeds
    });

    // Dispose should throw AggregateError
    let thrownError: unknown;
    try {
      await memoMap.dispose();
    } catch (error) {
      thrownError = error;
    }

    // Verify error type
    expect(thrownError).toBeInstanceOf(AggregateError);

    // All finalizers should have been called despite errors (LIFO order)
    expect(disposalOrder).toEqual(["Cache", "Database", "Logger"]);
  });

  test("aggregates multiple errors into AggregateError", async () => {
    const memoMap = new MemoMap();

    const logger: Logger = { log: vi.fn() };
    const database: Database = { query: vi.fn() };

    memoMap.getOrElseMemoize(LoggerPort, () => logger, () => {
      throw new Error("Logger finalizer failed");
    });
    memoMap.getOrElseMemoize(DatabasePort, () => database, () => {
      throw new Error("Database finalizer failed");
    });

    try {
      await memoMap.dispose();
      expect.fail("Expected dispose to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      const aggregateError = error as AggregateError;
      expect(aggregateError.errors).toHaveLength(2);
      expect(aggregateError.errors[0]).toBeInstanceOf(Error);
      expect(aggregateError.errors[1]).toBeInstanceOf(Error);
    }
  });
});

// =============================================================================
// has Tests
// =============================================================================

describe("MemoMap.has", () => {
  test("returns true for cached port in own cache", () => {
    const memoMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };

    memoMap.getOrElseMemoize(LoggerPort, () => logger);

    expect(memoMap.has(LoggerPort)).toBe(true);
    expect(memoMap.has(DatabasePort)).toBe(false);
  });

  test("returns true for cached port in parent cache", () => {
    const parentMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };

    parentMap.getOrElseMemoize(LoggerPort, () => logger);

    const childMap = parentMap.fork();

    expect(childMap.has(LoggerPort)).toBe(true);
    expect(childMap.has(DatabasePort)).toBe(false);
  });
});

// =============================================================================
// isDisposed Tests
// =============================================================================

describe("MemoMap.isDisposed", () => {
  test("returns false before disposal", () => {
    const memoMap = new MemoMap();

    expect(memoMap.isDisposed).toBe(false);
  });

  test("returns true after disposal", async () => {
    const memoMap = new MemoMap();

    await memoMap.dispose();

    expect(memoMap.isDisposed).toBe(true);
  });
});

// =============================================================================
// Metadata Enhancement Tests
// =============================================================================

describe("MemoMap metadata", () => {
  test("captures resolvedAt timestamp on instance creation", () => {
    const memoMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };
    const beforeCreation = Date.now();

    memoMap.getOrElseMemoize(LoggerPort, () => logger);

    const afterCreation = Date.now();
    const entries = Array.from(memoMap.entries());

    expect(entries).toHaveLength(1);
    const [port, metadata] = entries[0]!;
    expect(port).toBe(LoggerPort);
    expect(metadata.resolvedAt).toBeGreaterThanOrEqual(beforeCreation);
    expect(metadata.resolvedAt).toBeLessThanOrEqual(afterCreation);
  });

  test("increments resolutionOrder correctly across memoizations", () => {
    const memoMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };
    const database: Database = { query: vi.fn() };
    const cache: Cache = { get: vi.fn() };

    memoMap.getOrElseMemoize(LoggerPort, () => logger);
    memoMap.getOrElseMemoize(DatabasePort, () => database);
    memoMap.getOrElseMemoize(CachePort, () => cache);

    const entries = Array.from(memoMap.entries());

    expect(entries).toHaveLength(3);
    // Verify order increments sequentially
    expect(entries[0]![1].resolutionOrder).toBe(0);
    expect(entries[1]![1].resolutionOrder).toBe(1);
    expect(entries[2]![1].resolutionOrder).toBe(2);
  });

  test("entries() iterator returns all cached entries with metadata", () => {
    const memoMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };
    const database: Database = { query: vi.fn() };

    memoMap.getOrElseMemoize(LoggerPort, () => logger);
    memoMap.getOrElseMemoize(DatabasePort, () => database);

    const entries = Array.from(memoMap.entries());

    expect(entries).toHaveLength(2);
    // Check first entry
    expect(entries[0]![0]).toBe(LoggerPort);
    expect(entries[0]![1]).toHaveProperty("resolvedAt");
    expect(entries[0]![1]).toHaveProperty("resolutionOrder");
    // Check second entry
    expect(entries[1]![0]).toBe(DatabasePort);
    expect(entries[1]![1]).toHaveProperty("resolvedAt");
    expect(entries[1]![1]).toHaveProperty("resolutionOrder");
  });

  test("metadata is preserved through subsequent getOrElseMemoize calls", () => {
    const memoMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };

    // First call creates the entry with metadata
    memoMap.getOrElseMemoize(LoggerPort, () => logger);
    const entriesBefore = Array.from(memoMap.entries());
    const metadataBefore = entriesBefore[0]![1];

    // Second call should not change metadata
    memoMap.getOrElseMemoize(LoggerPort, () => ({ log: vi.fn() }));
    const entriesAfter = Array.from(memoMap.entries());
    const metadataAfter = entriesAfter[0]![1];

    // Metadata should remain unchanged
    expect(entriesAfter).toHaveLength(1);
    expect(metadataAfter.resolvedAt).toBe(metadataBefore.resolvedAt);
    expect(metadataAfter.resolutionOrder).toBe(metadataBefore.resolutionOrder);
  });

  test("fork() resets resolution counter for child MemoMap", () => {
    const parentMap = new MemoMap();
    const logger: Logger = { log: vi.fn() };
    const database: Database = { query: vi.fn() };

    // Parent resolves two services
    parentMap.getOrElseMemoize(LoggerPort, () => logger);
    parentMap.getOrElseMemoize(DatabasePort, () => database);

    // Fork creates child with reset counter
    const childMap = parentMap.fork();
    const cache: Cache = { get: vi.fn() };

    // Child resolves a new service
    childMap.getOrElseMemoize(CachePort, () => cache);

    // Child's entry should start from 0
    const childEntries = Array.from(childMap.entries());
    expect(childEntries).toHaveLength(1);
    expect(childEntries[0]![1].resolutionOrder).toBe(0);

    // Parent's entries should be unchanged
    const parentEntries = Array.from(parentMap.entries());
    expect(parentEntries).toHaveLength(2);
    expect(parentEntries[0]![1].resolutionOrder).toBe(0);
    expect(parentEntries[1]![1].resolutionOrder).toBe(1);
  });
});
