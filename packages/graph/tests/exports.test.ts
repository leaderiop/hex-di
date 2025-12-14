/**
 * Tests for public API surface.
 *
 * These tests verify:
 * 1. `createAdapter` is exported and callable
 * 2. `GraphBuilder` is exported with `create()` method
 * 3. `Adapter`, `Graph`, `Lifetime` types are exported
 * 4. All utility types are exported and functional
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { createPort, type Port } from "@hex-di/ports";
import {
  // Function exports
  createAdapter,
  GraphBuilder,
  // Type exports
  type Adapter,
  type Graph,
  type Lifetime,
  type ResolvedDeps,
  // Utility type exports
  type InferAdapterProvides,
  type InferAdapterRequires,
  type InferAdapterLifetime,
  type InferGraphProvides,
  type InferGraphRequires,
  // Error type exports
  type MissingDependencyError,
  type DuplicateProviderError,
} from "../src/index.js";

// Sample service interfaces for testing
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<unknown>;
}

// Create test ports
const LoggerPort = createPort<"Logger", Logger>("Logger");
const DatabasePort = createPort<"Database", Database>("Database");

describe("Public API exports", () => {
  describe("createAdapter function", () => {
    it("createAdapter is exported and callable", () => {
      // createAdapter should be a function
      expect(typeof createAdapter).toBe("function");

      // Should be callable and return an adapter object
      const adapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      expect(adapter).toBeDefined();
      expect(adapter.provides).toBe(LoggerPort);
      expect(adapter.lifetime).toBe("singleton");
      expect(Object.isFrozen(adapter)).toBe(true);
    });
  });

  describe("GraphBuilder class", () => {
    it("GraphBuilder is exported with create() static method", () => {
      // GraphBuilder should be a class/constructor
      expect(typeof GraphBuilder).toBe("function");
      expect(typeof GraphBuilder.create).toBe("function");

      // create() should return a builder instance
      const builder = GraphBuilder.create();
      expect(builder).toBeInstanceOf(GraphBuilder);
      expect(typeof builder.provide).toBe("function");
      expect(typeof builder.build).toBe("function");
    });
  });

  describe("Type exports", () => {
    it("Adapter, Graph, and Lifetime types are exported and usable", () => {
      // Create an adapter with explicit type annotation
      const adapter: Adapter<typeof LoggerPort, never, "singleton"> = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      // Verify Adapter type works correctly
      expectTypeOf(adapter).toMatchTypeOf<Adapter<typeof LoggerPort, never, "singleton">>();

      // Verify Lifetime type works correctly
      const lifetime: Lifetime = "singleton";
      expectTypeOf(lifetime).toMatchTypeOf<Lifetime>();
      expectTypeOf<Lifetime>().toEqualTypeOf<"singleton" | "scoped" | "request">();

      // Verify Graph type works correctly
      const graph = GraphBuilder.create().provide(adapter).build();
      expectTypeOf(graph).toMatchTypeOf<Graph<typeof LoggerPort>>();
    });

    it("all utility types are exported and functional", () => {
      // Create adapters to test utility types against
      const loggerAdapter = createAdapter({
        provides: LoggerPort,
        requires: [],
        lifetime: "singleton",
        factory: () => ({ log: () => {} }),
      });

      const dbAdapter = createAdapter({
        provides: DatabasePort,
        requires: [LoggerPort],
        lifetime: "scoped",
        factory: (deps) => {
          deps.Logger.log("Creating database");
          return { query: async () => ({}) };
        },
      });

      // InferAdapterProvides
      type ProvidedByLogger = InferAdapterProvides<typeof loggerAdapter>;
      expectTypeOf<ProvidedByLogger>().toEqualTypeOf<typeof LoggerPort>();

      // InferAdapterRequires
      type RequiredByDb = InferAdapterRequires<typeof dbAdapter>;
      expectTypeOf<RequiredByDb>().toEqualTypeOf<typeof LoggerPort>();

      // InferAdapterLifetime
      type LoggerLifetime = InferAdapterLifetime<typeof loggerAdapter>;
      expectTypeOf<LoggerLifetime>().toEqualTypeOf<"singleton">();

      // ResolvedDeps
      type LoggerDeps = ResolvedDeps<typeof LoggerPort>;
      expectTypeOf<LoggerDeps>().toEqualTypeOf<{ Logger: Logger }>();

      // InferGraphProvides and InferGraphRequires
      const builder = GraphBuilder.create().provide(dbAdapter);
      type GraphProvides = InferGraphProvides<typeof builder>;
      type GraphRequires = InferGraphRequires<typeof builder>;

      expectTypeOf<GraphProvides>().toEqualTypeOf<typeof DatabasePort>();
      expectTypeOf<GraphRequires>().toEqualTypeOf<typeof LoggerPort>();

      // Error types are exported
      type MissingError = MissingDependencyError<typeof LoggerPort>;
      expectTypeOf<MissingError>().toMatchTypeOf<{
        readonly __errorBrand: "MissingDependencyError";
        readonly __message: "Missing dependencies: Logger";
        readonly __missing: typeof LoggerPort;
      }>();

      type DuplicateError = DuplicateProviderError<typeof LoggerPort>;
      expectTypeOf<DuplicateError>().toMatchTypeOf<{
        readonly __errorBrand: "DuplicateProviderError";
        readonly __message: "Duplicate provider for: Logger";
        readonly __duplicate: typeof LoggerPort;
      }>();
    });
  });
});
