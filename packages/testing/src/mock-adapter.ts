/**
 * Mock Adapter Utilities
 *
 * Provides factory functions for creating type-safe mock adapters with
 * partial implementations. Missing methods throw descriptive errors at
 * runtime, making it easy to create focused test doubles.
 *
 * @module
 */

import type { Port, InferService, InferPortName } from "@hex-di/ports";
import { createAdapter, type Adapter, type Lifetime } from "@hex-di/graph";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for configuring mock adapter behavior.
 *
 * @property lifetime - The lifetime scope for the mock adapter.
 *   Defaults to 'request' for test isolation (fresh instance per resolution).
 *
 * @example
 * ```typescript
 * // Default: request lifetime
 * const mock1 = createMockAdapter(LoggerPort, { log: vi.fn() });
 *
 * // Singleton: same instance across all resolutions
 * const mock2 = createMockAdapter(LoggerPort, { log: vi.fn() }, { lifetime: 'singleton' });
 *
 * // Scoped: same instance within a scope
 * const mock3 = createMockAdapter(LoggerPort, { log: vi.fn() }, { lifetime: 'scoped' });
 * ```
 */
export interface MockAdapterOptions {
  /**
   * The lifetime scope for the mock adapter.
   *
   * - `'request'` (default): Fresh instance for every resolution. Best for test isolation.
   * - `'singleton'`: One instance shared across all resolutions in the container.
   * - `'scoped'`: One instance per scope.
   */
  lifetime?: Lifetime;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Creates a Proxy handler that wraps a partial implementation, throwing
 * descriptive errors for unimplemented methods.
 *
 * @param implementation - The partial implementation object
 * @param portName - The port name for error messages
 * @returns A Proxy handler for the mock implementation
 *
 * @internal
 */
function createMockProxyHandler<T extends object>(
  implementation: Partial<T>,
  portName: string
): ProxyHandler<Partial<T>> {
  return {
    get(target, prop, receiver) {
      // Check if property exists in the partial implementation
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      // For unimplemented properties, return a function that throws
      // This handles method calls on missing methods
      const propName = String(prop);

      // Skip special properties like Symbol.toStringTag, Symbol.toPrimitive, etc.
      if (typeof prop === "symbol") {
        return undefined;
      }

      // Return a throwing function for unimplemented methods
      return function notImplemented() {
        throw new Error(
          `Method '${propName}' not implemented on mock for port '${portName}'`
        );
      };
    },

    // Ensure has() returns true for all properties to maintain type compatibility
    // This allows "prop in mock" checks to pass even for unimplemented props
    has(_target, prop) {
      // Return true for string properties (likely methods/properties from interface)
      // This makes the proxy behave more like a complete object
      return typeof prop === "string";
    },
  };
}

/**
 * Creates a Proxy-wrapped mock implementation from a partial implementation.
 *
 * @param implementation - The partial implementation object
 * @param portName - The port name for error messages
 * @returns A Proxy that wraps the partial implementation
 *
 * @internal
 */
function createMockImplementation<T extends object>(
  implementation: Partial<T>,
  portName: string
): T {
  const handler = createMockProxyHandler(implementation, portName);
  return new Proxy(implementation, handler) as T;
}

/**
 * Creates a type-safe mock adapter for testing purposes.
 *
 * This function creates an adapter that implements a port's service interface
 * with a partial implementation. Any methods not provided in the implementation
 * will throw a descriptive error when called, making it easy to create focused
 * test doubles that only implement the methods needed for a specific test.
 *
 * @typeParam P - The Port type that this mock adapter provides
 *
 * @param port - The port token that this adapter provides
 * @param implementation - A partial implementation of the service interface.
 *   Only the methods needed for the test need to be provided.
 * @param options - Optional configuration for the mock adapter
 * @param options.lifetime - Lifetime scope for the adapter. Defaults to 'request'
 *   for test isolation.
 *
 * @returns A frozen Adapter object that can be used with GraphBuilder or TestGraphBuilder
 *
 * @remarks
 * - Default lifetime is `'request'` which provides test isolation by creating
 *   a fresh instance for each resolution.
 * - Missing methods are handled via Proxy and throw descriptive errors like:
 *   `"Method 'methodName' not implemented on mock for port 'PortName'"`
 * - The returned adapter is frozen for immutability.
 * - Non-function properties can also be partially provided.
 *
 * @example Basic usage with partial implementation
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 *   warn(message: string): void;
 *   error(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * // Only implement the methods your test needs
 * const mockLogger = createMockAdapter(LoggerPort, {
 *   log: vi.fn(),
 *   // warn and error will throw if called
 * });
 *
 * const graph = GraphBuilder.create()
 *   .provide(mockLogger)
 *   .build();
 * ```
 *
 * @example Using with TestGraphBuilder to override production adapters
 * ```typescript
 * import { TestGraphBuilder, createMockAdapter } from '@hex-di/testing';
 *
 * const mockDatabase = createMockAdapter(DatabasePort, {
 *   query: vi.fn().mockResolvedValue({ rows: [] }),
 *   // connect and disconnect not needed for this test
 * });
 *
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockDatabase)
 *   .build();
 * ```
 *
 * @example Configuring lifetime
 * ```typescript
 * // Singleton mock - same instance across all resolutions
 * const mockConfig = createMockAdapter(
 *   ConfigPort,
 *   { apiUrl: 'http://test.com' },
 *   { lifetime: 'singleton' }
 * );
 * ```
 *
 * @see {@link MockAdapterOptions} for configuration options
 * @see TestGraphBuilder for overriding adapters in tests
 */
export function createMockAdapter<
  P extends Port<object, string>,
  L extends Lifetime = "request",
>(
  port: P,
  implementation: Partial<InferService<P>>,
  options?: MockAdapterOptions & { lifetime?: L }
): Adapter<P, never, L> {
  const lifetime = (options?.lifetime ?? "request") as L;
  const portName = port.__portName as InferPortName<P>;

  return createAdapter({
    provides: port,
    requires: [],
    lifetime,
    factory: () => {
      return createMockImplementation(implementation, portName);
    },
  });
}
