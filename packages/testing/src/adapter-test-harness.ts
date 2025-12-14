/**
 * Adapter Test Harness
 *
 * Provides a harness for testing individual adapters in isolation with
 * mock dependencies. The harness validates all required dependencies are
 * provided at creation time and provides typed access to both the service
 * instance and mock dependencies for assertions.
 *
 * @module
 */

import type { Port, InferService, InferPortName } from "@hex-di/ports";
import type {
  Adapter,
  Lifetime,
  ResolvedDeps,
  InferAdapterProvides,
  InferAdapterRequires,
} from "@hex-di/graph";

// =============================================================================
// Types
// =============================================================================

/**
 * Test harness returned by `createAdapterTest`.
 *
 * Provides methods to invoke the adapter's factory and access mock dependencies
 * for spy assertions.
 *
 * @typeParam TProvides - The port type this adapter provides
 * @typeParam TRequires - Union of port types this adapter requires
 *
 * @example
 * ```typescript
 * const harness = createAdapterTest(UserServiceAdapter, {
 *   Logger: mockLogger,
 *   Database: mockDatabase,
 * });
 *
 * // Invoke factory to get service instance
 * const userService = harness.invoke();
 *
 * // Call service method
 * await userService.getUser('123');
 *
 * // Assert on mock dependencies
 * const deps = harness.getDeps();
 * expect(deps.Logger.log).toHaveBeenCalledWith('Fetching user 123');
 * ```
 */
export interface AdapterTestHarness<
  TProvides extends Port<unknown, string>,
  TRequires extends Port<unknown, string> | never,
> {
  /**
   * Invokes the adapter's factory function with the mock dependencies.
   *
   * Each call creates a fresh service instance by calling the factory,
   * allowing tests to verify factory behavior and service construction.
   *
   * @returns The service instance typed according to the adapter's provides port
   *
   * @example
   * ```typescript
   * const service = harness.invoke();
   * const user = await service.getUser('123');
   * ```
   */
  invoke(): InferService<TProvides>;

  /**
   * Returns a reference to the mock dependencies object.
   *
   * Use this to access mocks for spy assertions after invoking the service.
   * The returned object maintains the same shape as the dependencies passed
   * to `createAdapterTest`.
   *
   * @returns The mock dependencies object typed as ResolvedDeps<TRequires>
   *
   * @example
   * ```typescript
   * const service = harness.invoke();
   * service.doSomething();
   *
   * const deps = harness.getDeps();
   * expect(deps.Logger.log).toHaveBeenCalled();
   * expect(deps.Database.query).toHaveBeenCalledWith('SELECT ...');
   * ```
   */
  getDeps(): ResolvedDeps<TRequires>;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Validates that all required dependencies are provided.
 *
 * @param adapter - The adapter whose dependencies to validate
 * @param mockDependencies - The provided mock dependencies
 * @throws Error if any required dependency is missing
 *
 * @internal
 */
function validateDependencies<
  TProvides extends Port<unknown, string>,
  TRequires extends Port<unknown, string> | never,
  TLifetime extends Lifetime,
>(
  adapter: Adapter<TProvides, TRequires, TLifetime>,
  mockDependencies: Record<string, unknown>
): void {
  const requires = adapter.requires as readonly Port<unknown, string>[];

  for (const port of requires) {
    const portName = port.__portName as string;
    if (!(portName in mockDependencies)) {
      throw new Error(`Missing mock for required port '${portName}'`);
    }
  }
}

/**
 * Creates a test harness for testing an individual adapter's factory logic in isolation.
 *
 * This function provides a focused testing environment for a single adapter,
 * allowing you to supply mock dependencies and then invoke the factory to
 * get a typed service instance. The harness validates all required dependencies
 * at creation time, failing fast if any mocks are missing.
 *
 * @typeParam TProvides - The port type this adapter provides (inferred from adapter)
 * @typeParam TRequires - Union of port types this adapter requires (inferred from adapter)
 * @typeParam TLifetime - The adapter's lifetime scope (inferred from adapter)
 *
 * @param adapter - The adapter to test
 * @param mockDependencies - An object containing mock implementations for each
 *   required dependency, keyed by port name. Must include all dependencies
 *   declared in the adapter's `requires` array.
 *
 * @returns An `AdapterTestHarness` with `invoke()` and `getDeps()` methods
 *
 * @throws Error if any required dependency is missing from `mockDependencies`
 *
 * @remarks
 * - Dependencies are validated at creation time, not at `invoke()` time
 * - Each `invoke()` call creates a fresh service instance
 * - The `getDeps()` method returns the same mock objects passed at creation
 * - This harness is framework-agnostic and works with any test framework
 *
 * @example Basic usage with Vitest
 * ```typescript
 * import { createAdapterTest } from '@hex-di/testing';
 * import { vi } from 'vitest';
 *
 * const mockLogger = {
 *   log: vi.fn(),
 *   warn: vi.fn(),
 *   error: vi.fn(),
 * };
 *
 * const mockDatabase = {
 *   query: vi.fn().mockResolvedValue({ rows: [] }),
 *   connect: vi.fn(),
 *   disconnect: vi.fn(),
 * };
 *
 * const harness = createAdapterTest(UserServiceAdapter, {
 *   Logger: mockLogger,
 *   Database: mockDatabase,
 * });
 *
 * // Test the service
 * const userService = harness.invoke();
 * await userService.getUser('123');
 *
 * // Assert on mocks
 * expect(harness.getDeps().Logger.log).toHaveBeenCalledWith('Fetching user 123');
 * ```
 *
 * @example Adapter with no dependencies
 * ```typescript
 * const harness = createAdapterTest(ConfigAdapter, {});
 * const config = harness.invoke();
 *
 * expect(config.apiUrl).toBe('http://example.com');
 * ```
 *
 * @example Missing dependency throws immediately
 * ```typescript
 * // This throws: "Missing mock for required port 'Database'"
 * const harness = createAdapterTest(UserServiceAdapter, {
 *   Logger: mockLogger,
 *   // Database is missing!
 * });
 * ```
 *
 * @see {@link AdapterTestHarness} - The return type interface
 * @see {@link createMockAdapter} - For creating mock adapters for graph overrides
 */
export function createAdapterTest<
  TProvides extends Port<unknown, string>,
  TRequires extends Port<unknown, string> | never,
  TLifetime extends Lifetime,
>(
  adapter: Adapter<TProvides, TRequires, TLifetime>,
  mockDependencies: ResolvedDeps<TRequires>
): AdapterTestHarness<TProvides, TRequires> {
  // Validate all required dependencies are provided
  validateDependencies(adapter, mockDependencies as Record<string, unknown>);

  return Object.freeze({
    invoke(): InferService<TProvides> {
      return adapter.factory(mockDependencies);
    },

    getDeps(): ResolvedDeps<TRequires> {
      return mockDependencies;
    },
  });
}
