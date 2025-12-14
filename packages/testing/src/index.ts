/**
 * @hex-di/testing - Testing Utilities for HexDI
 *
 * Provides testing utilities for HexDI dependency injection library, enabling
 * developers to override adapters, create type-safe mocks, and manage test
 * container lifecycles with proper isolation and cleanup.
 *
 * ## Key Features
 *
 * - **TestGraphBuilder**: Override adapters in tests to isolate units under test
 *   from their real dependencies.
 *
 * - **Mock Adapters**: Create type-safe mocks that validate against port contracts
 *   so you catch interface mismatches at compile time.
 *
 * - **Test Container Management**: Automatic test container cleanup so tests remain
 *   reliable and isolated without manual teardown.
 *
 * - **Graph Assertions**: Runtime validation utilities for asserting graph completeness
 *   and port configuration.
 *
 * - **Graph Snapshots**: Serialize dependency graphs for snapshot testing.
 *
 * ## Quick Start
 *
 * @example Override adapters in tests
 * ```typescript
 * import { TestGraphBuilder, createMockAdapter } from '@hex-di/testing';
 * import { productionGraph } from '../src/graph';
 * import { LoggerPort } from '../src/ports';
 *
 * // Create a mock adapter
 * const mockLogger = createMockAdapter(LoggerPort, {
 *   log: () => {}, // stub implementation
 * });
 *
 * // Override production adapters with test mocks
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockLogger)
 *   .build();
 *
 * // Use test graph with createContainer
 * const container = createContainer(testGraph);
 * ```
 *
 * @example Vitest integration
 * ```typescript
 * import { useTestContainer } from '@hex-di/testing/vitest';
 * import { testGraph } from './test-graph';
 *
 * describe('UserService', () => {
 *   const { container, scope } = useTestContainer(() => testGraph);
 *
 *   it('should fetch user', async () => {
 *     const userService = scope.resolve(UserServicePort);
 *     const user = await userService.getUser('123');
 *     expect(user).toBeDefined();
 *   });
 * });
 * ```
 *
 * @example Graph snapshot testing
 * ```typescript
 * import { serializeGraph } from '@hex-di/testing';
 * import { productionGraph } from '../src/graph';
 *
 * test('graph structure matches snapshot', () => {
 *   const snapshot = serializeGraph(productionGraph);
 *   expect(snapshot).toMatchSnapshot();
 * });
 *
 * // Example snapshot output:
 * // {
 * //   adapters: [
 * //     { port: "Config", lifetime: "singleton", requires: [] },
 * //     { port: "Database", lifetime: "singleton", requires: ["Config", "Logger"] },
 * //     { port: "Logger", lifetime: "singleton", requires: [] },
 * //     { port: "UserService", lifetime: "scoped", requires: ["Database", "Logger"] }
 * //   ]
 * // }
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-exports from Sibling Packages
// =============================================================================

/**
 * Re-export types from @hex-di/ports for consumer convenience.
 *
 * These types are commonly used alongside testing utilities for creating
 * mock adapters and type-safe test fixtures.
 */
export type { Port, InferService, InferPortName } from "@hex-di/ports";

/**
 * Re-export types from @hex-di/graph for consumer convenience.
 *
 * These types are commonly used alongside testing utilities for building
 * test graphs and creating mock adapters.
 */
export type {
  Graph,
  Adapter,
  Lifetime,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  ResolvedDeps,
} from "@hex-di/graph";

/**
 * Re-export types from @hex-di/runtime for consumer convenience.
 *
 * These types are commonly used alongside testing utilities for creating
 * test containers and scopes.
 */
export type { Container, Scope } from "@hex-di/runtime";

// =============================================================================
// TestGraphBuilder
// =============================================================================

/**
 * TestGraphBuilder - Immutable builder for creating test graphs with adapter overrides.
 *
 * Wraps a production Graph and allows specific adapters to be replaced with
 * test doubles (mocks, stubs, spies) while preserving the rest of the graph.
 * Each `.override()` call returns a NEW builder instance.
 *
 * @example
 * ```typescript
 * import { TestGraphBuilder } from '@hex-di/testing';
 * import { createAdapter } from '@hex-di/graph';
 *
 * const mockLoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'request',
 *   factory: () => ({ log: vi.fn() }),
 * });
 *
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockLoggerAdapter)
 *   .build();
 *
 * const container = createContainer(testGraph);
 * ```
 */
export { TestGraphBuilder } from "./test-graph-builder.js";

/**
 * Type utility to extract the TProvides type parameter from a TestGraphBuilder.
 *
 * @example
 * ```typescript
 * const testBuilder = TestGraphBuilder.from(productionGraph);
 * type Provided = InferTestGraphProvides<typeof testBuilder>;
 * // typeof LoggerPort | typeof DatabasePort | ...
 * ```
 */
export type { InferTestGraphProvides } from "./test-graph-builder.js";

// =============================================================================
// Mock Adapter Utilities (Task Group 3)
// =============================================================================

/**
 * Factory function for creating type-safe mock adapters with partial implementations.
 *
 * Creates an adapter that implements a port's service interface with a partial
 * implementation. Any methods not provided will throw a descriptive error when
 * called, making it easy to create focused test doubles.
 *
 * @example Basic usage with partial implementation
 * ```typescript
 * import { createMockAdapter } from '@hex-di/testing';
 *
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
 * ```
 *
 * @example Using with TestGraphBuilder to override production adapters
 * ```typescript
 * const mockDatabase = createMockAdapter(DatabasePort, {
 *   query: vi.fn().mockResolvedValue({ rows: [] }),
 * });
 *
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockDatabase)
 *   .build();
 * ```
 *
 * @see {@link MockAdapterOptions} for configuration options
 */
export { createMockAdapter } from "./mock-adapter.js";

/**
 * Configuration options type for createMockAdapter.
 *
 * @see {@link createMockAdapter} for usage examples
 */
export type { MockAdapterOptions } from "./mock-adapter.js";

// =============================================================================
// Adapter Test Harness (Task Group 6)
// =============================================================================

/**
 * Test harness for testing individual adapters in isolation with mock dependencies.
 *
 * Creates a harness that validates all required dependencies at creation time
 * and provides `invoke()` to call the adapter's factory and `getDeps()` to
 * access mock references for spy assertions.
 *
 * @example Testing an adapter with dependencies
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
 * };
 *
 * const harness = createAdapterTest(UserServiceAdapter, {
 *   Logger: mockLogger,
 *   Database: mockDatabase,
 * });
 *
 * // Invoke factory and test service
 * const userService = harness.invoke();
 * await userService.getUser('123');
 *
 * // Assert on mocks via getDeps()
 * expect(harness.getDeps().Logger.log).toHaveBeenCalledWith('Fetching user 123');
 * ```
 *
 * @see {@link AdapterTestHarness} - The return type interface
 */
export { createAdapterTest } from "./adapter-test-harness.js";

/**
 * The return type of `createAdapterTest`.
 *
 * Provides `invoke()` to call the adapter's factory with mock dependencies,
 * and `getDeps()` to access mock references for spy assertions.
 *
 * @see {@link createAdapterTest} for usage examples
 */
export type { AdapterTestHarness } from "./adapter-test-harness.js";

// =============================================================================
// Graph Assertions (Task Group 7)
// =============================================================================

/**
 * Graph assertion utilities for runtime validation of dependency graphs.
 *
 * These functions are useful in tests to verify:
 * - Graph completeness (all dependencies satisfied)
 * - Port presence (specific port is provided)
 * - Adapter lifetime configuration
 *
 * @example Validating graph completeness
 * ```typescript
 * import {
 *   assertGraphComplete,
 *   assertPortProvided,
 *   assertLifetime,
 * } from '@hex-di/testing';
 *
 * describe('Application Graph', () => {
 *   it('should be complete', () => {
 *     assertGraphComplete(productionGraph);
 *   });
 *
 *   it('should have logger configured as singleton', () => {
 *     assertPortProvided(productionGraph, LoggerPort);
 *     assertLifetime(productionGraph, LoggerPort, 'singleton');
 *   });
 * });
 * ```
 *
 * @see {@link GraphAssertionError} - The error thrown on assertion failures
 */
export {
  assertGraphComplete,
  assertPortProvided,
  assertLifetime,
  GraphAssertionError,
} from "./graph-assertions.js";

// =============================================================================
// Graph Snapshots (Task Group 8)
// =============================================================================

/**
 * Serialize a dependency graph to a JSON-serializable snapshot format.
 *
 * Converts a Graph to a deterministic, JSON-serializable representation
 * suitable for snapshot testing with Vitest's `toMatchSnapshot()`.
 *
 * @example Basic snapshot testing
 * ```typescript
 * import { serializeGraph } from '@hex-di/testing';
 *
 * test('graph structure', () => {
 *   const snapshot = serializeGraph(productionGraph);
 *   expect(snapshot).toMatchSnapshot();
 * });
 * ```
 *
 * @example Manual verification
 * ```typescript
 * const snapshot = serializeGraph(graph);
 *
 * expect(snapshot.adapters).toContainEqual({
 *   port: "UserService",
 *   lifetime: "scoped",
 *   requires: ["Database", "Logger"]
 * });
 * ```
 *
 * @see {@link GraphSnapshot} - The return type structure
 * @see {@link AdapterSnapshot} - Individual adapter snapshot structure
 */
export { serializeGraph } from "./graph-snapshot.js";

/**
 * Types for graph snapshot serialization.
 *
 * - `GraphSnapshot` - The complete serialized graph structure
 * - `AdapterSnapshot` - Individual adapter metadata
 * - `SerializeGraphOptions` - Options for the serializeGraph function
 */
export type {
  GraphSnapshot,
  AdapterSnapshot,
  SerializeGraphOptions,
} from "./graph-snapshot.js";

// =============================================================================
// React Testing Library Integration (Task Group 9)
// =============================================================================

/**
 * Render a React element with a DI container for testing.
 *
 * This helper wraps React Testing Library's `render` with HexDI's
 * `ContainerProvider`, making it easy to test components that use `usePort`
 * and other DI hooks.
 *
 * @example Basic usage
 * ```typescript
 * import { renderWithContainer } from '@hex-di/testing';
 * import { screen } from '@testing-library/react';
 *
 * it('renders user name', () => {
 *   renderWithContainer(<UserProfile />, appGraph);
 *   expect(screen.getByTestId('user-name')).toHaveTextContent('John');
 * });
 * ```
 *
 * @example With mock assertions
 * ```typescript
 * it('logs user fetch', () => {
 *   const testGraph = TestGraphBuilder.from(productionGraph)
 *     .override(mockLoggerAdapter)
 *     .build();
 *
 *   const { diContainer } = renderWithContainer(<UserProfile />, testGraph);
 *
 *   const logger = diContainer.resolve(LoggerPort);
 *   expect(logger.log).toHaveBeenCalledWith('Fetching user');
 * });
 * ```
 *
 * @see {@link RenderWithContainerResult} - The return type including diContainer
 */
export { renderWithContainer } from "./render-with-container.js";

/**
 * Result type for renderWithContainer.
 *
 * Extends RTL's RenderResult with `diContainer` for DI assertions.
 * Note: `diContainer` is used instead of `container` to avoid collision
 * with RTL's `container` which is the DOM element.
 */
export type { RenderWithContainerResult } from "./render-with-container.js";
