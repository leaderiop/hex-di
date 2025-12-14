/**
 * Test Container Utilities for Vitest.
 *
 * Provides automatic container lifecycle management integrated with Vitest's
 * test lifecycle hooks (beforeEach/afterEach). These utilities ensure proper
 * test isolation by creating fresh containers for each test and disposing
 * them after each test completes.
 *
 * @packageDocumentation
 */

import { beforeEach, afterEach } from "vitest";
import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { Container, Scope } from "@hex-di/runtime";
import { createContainer } from "@hex-di/runtime";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for useTestContainer hook.
 *
 * Provides access to the test container and a pre-created scope for
 * convenient service resolution in tests.
 *
 * @typeParam TProvides - Union of Port types provided by the graph
 */
export interface UseTestContainerResult<TProvides extends Port<unknown, string>> {
  /**
   * The container instance created from the graph factory.
   *
   * Use this for container-level operations like createScope() or
   * when you need direct container access.
   *
   * @remarks
   * A fresh container is created before each test and disposed after
   * each test completes. Do not store references to this container
   * outside the test, as it will be disposed.
   */
  readonly container: Container<TProvides>;

  /**
   * A pre-created scope for convenient service resolution.
   *
   * This scope is created from the container before each test, providing
   * a convenient way to resolve services including scoped-lifetime services.
   *
   * @remarks
   * The scope is disposed automatically along with the container after
   * each test completes.
   */
  readonly scope: Scope<TProvides>;
}

/**
 * Return type for createTestContainer utility.
 *
 * Similar to UseTestContainerResult but includes an explicit dispose function
 * for manual lifecycle management.
 *
 * @typeParam TProvides - Union of Port types provided by the graph
 */
export interface TestContainerResult<TProvides extends Port<unknown, string>> {
  /**
   * The container instance created from the graph.
   *
   * @see UseTestContainerResult.container
   */
  readonly container: Container<TProvides>;

  /**
   * A pre-created scope for convenient service resolution.
   *
   * @see UseTestContainerResult.scope
   */
  readonly scope: Scope<TProvides>;

  /**
   * Disposes the container and all its resources.
   *
   * Call this function when you're done with the container to ensure
   * proper cleanup of resources and finalizers.
   *
   * @returns A Promise that resolves when disposal is complete
   */
  readonly dispose: () => Promise<void>;
}

// =============================================================================
// useTestContainer Hook
// =============================================================================

/**
 * Vitest hook for automatic test container lifecycle management.
 *
 * Creates a fresh container before each test and disposes it after each test
 * completes. The graph factory is called per-test to support test-specific
 * overrides when used with TestGraphBuilder.
 *
 * @typeParam TProvides - Union of Port types provided by the graph (inferred)
 *
 * @param graphFactory - Factory function that returns a Graph instance.
 *   Called before each test to create a fresh container.
 *
 * @returns Object with `container` and `scope` properties that are
 *   refreshed before each test. Access these properties inside your
 *   test cases to get the current test's container/scope.
 *
 * @remarks
 * - The graph factory is called before each test, allowing test-specific
 *   graph configuration when using TestGraphBuilder
 * - Container disposal (including all finalizers) is awaited after each test
 * - The returned object's properties are updated before each test - always
 *   access them inside test cases, not in describe block setup
 *
 * @example Basic usage
 * ```typescript
 * import { describe, it, expect } from 'vitest';
 * import { useTestContainer } from '@hex-di/testing/vitest';
 * import { productionGraph } from '../src/graph';
 * import { UserServicePort } from '../src/ports';
 *
 * describe('UserService', () => {
 *   const { scope } = useTestContainer(() => productionGraph);
 *
 *   it('should fetch user', async () => {
 *     const userService = scope.resolve(UserServicePort);
 *     const user = await userService.getUser('123');
 *     expect(user).toBeDefined();
 *   });
 * });
 * ```
 *
 * @example With TestGraphBuilder for overrides
 * ```typescript
 * import { useTestContainer } from '@hex-di/testing/vitest';
 * import { TestGraphBuilder, createMockAdapter } from '@hex-di/testing';
 *
 * describe('UserService with mocks', () => {
 *   const mockLogger = createMockAdapter(LoggerPort, {
 *     log: vi.fn(),
 *   });
 *
 *   const { scope } = useTestContainer(() =>
 *     TestGraphBuilder.from(productionGraph)
 *       .override(mockLogger)
 *       .build()
 *   );
 *
 *   it('should use mock logger', () => {
 *     const userService = scope.resolve(UserServicePort);
 *     userService.doSomething();
 *
 *     // mockLogger's log function was used
 *   });
 * });
 * ```
 *
 * @see {@link createTestContainer} - For manual lifecycle management without hooks
 * @see {@link TestGraphBuilder} - For creating test graphs with overrides
 */
export function useTestContainer<TProvides extends Port<unknown, string>>(
  graphFactory: () => Graph<TProvides>
): UseTestContainerResult<TProvides> {
  // Mutable storage for current test's container and scope
  // These are updated in beforeEach and accessed through the returned object
  let currentContainer: Container<TProvides> | null = null;
  let currentScope: Scope<TProvides> | null = null;

  // Register beforeEach hook to create fresh container
  beforeEach(() => {
    // Call factory to get graph (allows test-specific overrides)
    const graph = graphFactory();

    // Create fresh container and scope
    currentContainer = createContainer(graph);
    currentScope = currentContainer.createScope();
  });

  // Register afterEach hook to dispose container
  afterEach(async () => {
    if (currentContainer !== null) {
      // Await disposal to ensure finalizers complete
      await currentContainer.dispose();
      currentContainer = null;
      currentScope = null;
    }
  });

  // Return proxy object that provides access to current container/scope
  // Using getters ensures tests always get the current test's instances
  return {
    get container(): Container<TProvides> {
      if (currentContainer === null) {
        throw new Error(
          "useTestContainer: container is null. " +
            "This usually means you're accessing it outside a test case. " +
            "Make sure to access container/scope inside it() blocks."
        );
      }
      return currentContainer;
    },
    get scope(): Scope<TProvides> {
      if (currentScope === null) {
        throw new Error(
          "useTestContainer: scope is null. " +
            "This usually means you're accessing it outside a test case. " +
            "Make sure to access container/scope inside it() blocks."
        );
      }
      return currentScope;
    },
  };
}

// =============================================================================
// createTestContainer Utility
// =============================================================================

/**
 * Creates a test container with manual lifecycle management.
 *
 * Unlike useTestContainer, this function does not integrate with Vitest's
 * lifecycle hooks. Use this when you need:
 * - Container creation outside of describe blocks
 * - Custom lifecycle management
 * - One-off container creation for specific scenarios
 *
 * @typeParam TProvides - Union of Port types provided by the graph (inferred)
 *
 * @param graph - The Graph instance to create a container from.
 *   Typically from GraphBuilder.build() or TestGraphBuilder.build().
 *
 * @returns Object with `container`, `scope`, and `dispose` function
 *
 * @remarks
 * - You are responsible for calling `dispose()` when done
 * - The dispose function awaits all finalizers
 * - Both container and scope are disposed when `dispose()` is called
 *
 * @example Basic usage
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
 * @example With TestGraphBuilder
 * ```typescript
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockAdapter)
 *   .build();
 *
 * const { scope, dispose } = createTestContainer(testGraph);
 * const service = scope.resolve(ServicePort);
 *
 * // ... run tests
 *
 * await dispose(); // Clean up
 * ```
 *
 * @see {@link useTestContainer} - For automatic lifecycle management with Vitest hooks
 */
export function createTestContainer<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>
): TestContainerResult<TProvides> {
  const container = createContainer(graph);
  const scope = container.createScope();

  return Object.freeze({
    container,
    scope,
    dispose: () => container.dispose(),
  });
}
