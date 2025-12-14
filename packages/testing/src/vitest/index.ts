/**
 * @hex-di/testing/vitest - Vitest-Specific Testing Utilities
 *
 * This subpath provides testing utilities that integrate specifically with Vitest,
 * including automatic test container lifecycle management and spied mock adapters.
 *
 * ## Why a Separate Subpath?
 *
 * These utilities require Vitest as a peer dependency and use Vitest-specific APIs
 * such as `beforeEach`, `afterEach`, and `vi.fn()`. By isolating them in a subpath,
 * the main `@hex-di/testing` entry point remains framework-agnostic.
 *
 * ## Key Features
 *
 * - **useTestContainer**: Vitest hook for automatic container lifecycle management
 *   with `beforeEach`/`afterEach` integration.
 *
 * - **createSpiedMockAdapter**: Create mock adapters with all methods wrapped as
 *   `vi.fn()` for easy spy assertions.
 *
 * - **createTestContainer**: Standalone container creation for use outside Vitest
 *   describe blocks or with custom lifecycle management.
 *
 * ## Quick Start
 *
 * @example Using useTestContainer
 * ```typescript
 * import { describe, it, expect } from 'vitest';
 * import { useTestContainer, createSpiedMockAdapter } from '@hex-di/testing/vitest';
 * import { TestGraphBuilder } from '@hex-di/testing';
 * import { productionGraph } from '../src/graph';
 * import { LoggerPort, UserServicePort } from '../src/ports';
 *
 * describe('UserService', () => {
 *   const mockLogger = createSpiedMockAdapter(LoggerPort);
 *
 *   const { container, scope } = useTestContainer(() =>
 *     TestGraphBuilder.from(productionGraph)
 *       .override(mockLogger)
 *       .build()
 *   );
 *
 *   it('should log when fetching user', async () => {
 *     const userService = scope.resolve(UserServicePort);
 *     await userService.getUser('123');
 *
 *     expect(mockLogger.implementation.log).toHaveBeenCalled();
 *   });
 * });
 * ```
 *
 * @example Using createSpiedMockAdapter with default implementations
 * ```typescript
 * import { createSpiedMockAdapter } from '@hex-di/testing/vitest';
 * import { DatabasePort } from '../src/ports';
 *
 * const mockDb = createSpiedMockAdapter(DatabasePort, {
 *   query: async () => [{ id: '1', name: 'Test User' }],
 * });
 *
 * // All methods are vi.fn() and can be asserted
 * expect(mockDb.implementation.query).toHaveBeenCalledWith('SELECT * FROM users');
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Spied Mock Adapter (Task Group 4)
// =============================================================================

export { createSpiedMockAdapter } from "./spied-mock-adapter.js";
export type { SpiedAdapter, SpiedService } from "./spied-mock-adapter.js";

// =============================================================================
// Test Container Utilities (Task Group 5)
// =============================================================================

/**
 * Vitest hook for automatic test container lifecycle management.
 *
 * Creates a fresh container before each test and disposes it after each test
 * completes. The graph factory is called per-test to support test-specific
 * overrides when used with TestGraphBuilder.
 *
 * @example
 * ```typescript
 * import { useTestContainer } from '@hex-di/testing/vitest';
 * import { TestGraphBuilder } from '@hex-di/testing';
 *
 * describe('UserService', () => {
 *   const { scope } = useTestContainer(() =>
 *     TestGraphBuilder.from(productionGraph)
 *       .override(mockLoggerAdapter)
 *       .build()
 *   );
 *
 *   it('should fetch user', async () => {
 *     const userService = scope.resolve(UserServicePort);
 *     const user = await userService.getUser('123');
 *     expect(user).toBeDefined();
 *   });
 * });
 * ```
 *
 * @see {@link createTestContainer} for manual lifecycle management
 */
export { useTestContainer } from "./use-test-container.js";

/**
 * Creates a test container with manual lifecycle management.
 *
 * Unlike useTestContainer, this function does not integrate with Vitest's
 * lifecycle hooks. Use this when you need container creation outside of
 * describe blocks or custom lifecycle management.
 *
 * @example
 * ```typescript
 * import { createTestContainer } from '@hex-di/testing/vitest';
 *
 * test('manual container management', async () => {
 *   const { scope, dispose } = createTestContainer(testGraph);
 *
 *   try {
 *     const service = scope.resolve(ServicePort);
 *     // ... test service
 *   } finally {
 *     await dispose();
 *   }
 * });
 * ```
 *
 * @see {@link useTestContainer} for automatic lifecycle management
 */
export { createTestContainer } from "./use-test-container.js";

/**
 * Return type for useTestContainer hook.
 *
 * @see {@link useTestContainer}
 */
export type { UseTestContainerResult } from "./use-test-container.js";

/**
 * Return type for createTestContainer utility.
 *
 * @see {@link createTestContainer}
 */
export type { TestContainerResult } from "./use-test-container.js";
