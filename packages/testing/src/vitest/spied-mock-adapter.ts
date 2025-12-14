/**
 * Spied Mock Adapter Utilities for Vitest
 *
 * Provides factory functions for creating type-safe mock adapters where all
 * methods are wrapped with vi.fn() for spy tracking. This enables powerful
 * test assertions on method calls, arguments, and return values.
 *
 * @module
 */

import { vi, type MockedFunction } from "vitest";
import type { Port, InferService, InferPortName } from "@hex-di/ports";
import { createAdapter, type Adapter, type Lifetime } from "@hex-di/graph";

// =============================================================================
// Types
// =============================================================================

/**
 * A mapped type that transforms all methods in a service interface to MockedFunction.
 *
 * This enables TypeScript to understand that each method on the spied implementation
 * has spy capabilities like `mock.calls`, `mockImplementation()`, etc.
 *
 * @typeParam T - The service interface type
 *
 * @example
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 *   warn(message: string): void;
 * }
 *
 * type SpiedLogger = SpiedService<Logger>;
 * // {
 * //   log: MockedFunction<(message: string) => void>;
 * //   warn: MockedFunction<(message: string) => void>;
 * // }
 * ```
 */
export type SpiedService<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => infer Return
    ? MockedFunction<(...args: Args) => Return>
    : T[K];
};

/**
 * Type alias for an adapter that provides spied services.
 *
 * This is the return type of `createSpiedMockAdapter`. At the type level, it's
 * a standard Adapter, but at runtime the factory returns a Proxy where all
 * methods are vi.fn() spies.
 *
 * Use `SpiedService<InferService<P>>` to get the type of the resolved service
 * when you need access to the spy methods (mock.calls, mockImplementation, etc).
 *
 * @typeParam P - The Port type that this adapter provides (service must be an object)
 *
 * @example
 * ```typescript
 * const spiedAdapter = createSpiedMockAdapter(LoggerPort);
 *
 * // Type is Adapter<typeof LoggerPort, never, "request">
 * const graph = GraphBuilder.create().provide(spiedAdapter).build();
 *
 * const logger = container.resolve(LoggerPort);
 * // To access spy methods, cast to SpiedService:
 * const spiedLogger = logger as SpiedService<Logger>;
 * expect(spiedLogger.log.mock.calls).toEqual([['test']]);
 * ```
 */
export type SpiedAdapter<P extends Port<object, string>> = Adapter<P, never, "request">;

// =============================================================================
// Implementation
// =============================================================================

/**
 * Creates a spied mock adapter where all methods are wrapped with vi.fn().
 *
 * This function creates an adapter that implements a port's service interface
 * with all methods as Vitest spy functions. This enables:
 * - Call tracking: `spy.mock.calls`, `spy.mock.results`
 * - Call assertions: `expect(spy).toHaveBeenCalledWith(...)`
 * - Mock configuration: `spy.mockImplementation()`, `spy.mockReturnValue()`
 *
 * @typeParam P - The Port type that this mock adapter provides
 *
 * @param port - The port token that this adapter provides
 * @param defaults - Optional default implementations for methods.
 *   When provided, the spy will call through to the default implementation.
 *   Methods without defaults return undefined when called.
 *
 * @returns A frozen SpiedAdapter where all service methods are vi.fn() spies
 *
 * @remarks
 * - Default lifetime is `'request'` for test isolation (fresh instance per resolution)
 * - All methods are spies regardless of whether defaults are provided
 * - The adapter is frozen for immutability
 * - Unlike createMockAdapter, this does NOT throw on missing methods -
 *   methods without defaults simply return undefined
 *
 * @example Basic usage - all methods as bare spies
 * ```typescript
 * import { createSpiedMockAdapter } from '@hex-di/testing/vitest';
 *
 * const spiedLogger = createSpiedMockAdapter(LoggerPort);
 * const graph = TestGraphBuilder.from(productionGraph)
 *   .override(spiedLogger)
 *   .build();
 *
 * const container = createContainer(graph);
 * const logger = container.resolve(LoggerPort);
 *
 * logger.log('test');
 *
 * expect(logger.log).toHaveBeenCalledWith('test');
 * expect(logger.log.mock.calls).toEqual([['test']]);
 * ```
 *
 * @example With default implementations
 * ```typescript
 * const spiedDb = createSpiedMockAdapter(DatabasePort, {
 *   query: async (sql) => [{ id: '1', name: 'Test' }],
 *   connect: async () => {},
 * });
 *
 * const db = spiedDb.factory({});
 * const result = await db.query('SELECT * FROM users');
 *
 * expect(result).toEqual([{ id: '1', name: 'Test' }]);
 * expect(db.query).toHaveBeenCalledWith('SELECT * FROM users');
 * ```
 *
 * @example Configuring spies after creation
 * ```typescript
 * const spiedCalc = createSpiedMockAdapter(CalculatorPort);
 * const calc = spiedCalc.factory({});
 *
 * // Configure spy behavior
 * calc.add.mockImplementation((a, b) => a + b);
 * calc.multiply.mockReturnValue(42);
 *
 * expect(calc.add(2, 3)).toBe(5);
 * expect(calc.multiply(1, 2)).toBe(42);
 * ```
 *
 * @see {@link SpiedAdapter} - The return type with MockedFunction methods
 * @see {@link SpiedService} - The mapped type for spied service interfaces
 */
export function createSpiedMockAdapter<P extends Port<object, string>>(
  port: P,
  defaults?: Partial<InferService<P>>
): SpiedAdapter<P> {
  // Create the adapter using createAdapter
  // The factory returns a Proxy where all methods are vi.fn() spies
  return createAdapter({
    provides: port,
    requires: [],
    lifetime: "request",
    factory: () => createSpiedImplementation<InferService<P>>(defaults),
  });
}

/**
 * Creates a Proxy-based implementation where all property accesses return
 * vi.fn() spies, optionally wrapping default implementations.
 *
 * @param defaults - Optional default implementations for methods
 * @returns A Proxy that returns spies for all method accesses.
 *   The return type is T (not SpiedService<T>) because SpiedService<T> is
 *   a subtype of T (MockedFunction<F> extends F via intersection).
 *   Callers who need the SpiedService type should use type assertion.
 *
 * @internal
 */
function createSpiedImplementation<T extends object>(
  defaults?: Partial<T>
): T {
  // Cache created spies to return the same spy for the same property
  const spyCache = new Map<string | symbol, MockedFunction<(...args: unknown[]) => unknown>>();

  const handler: ProxyHandler<object> = {
    get(_target, prop, _receiver) {
      // Skip special properties
      if (typeof prop === "symbol") {
        return undefined;
      }

      // Return cached spy if it exists
      if (spyCache.has(prop)) {
        return spyCache.get(prop);
      }

      // Check if there's a default implementation
      const defaultImpl = defaults?.[prop as keyof typeof defaults];

      // Create a new spy, optionally with the default implementation
      const spy = typeof defaultImpl === "function"
        ? vi.fn(defaultImpl as (...args: unknown[]) => unknown)
        : vi.fn();

      // Cache and return the spy
      spyCache.set(prop, spy);
      return spy;
    },

    // Ensure has() returns true for all string properties
    has(_target, prop) {
      return typeof prop === "string";
    },
  };

  // The proxy returns MockedFunction for all property accesses
  // SpiedService<T> is a subtype of T, so this is type-safe
  return new Proxy({}, handler) as T;
}
