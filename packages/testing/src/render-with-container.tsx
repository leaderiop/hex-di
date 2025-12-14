/**
 * React Testing Library integration for @hex-di/testing.
 *
 * This module provides the `renderWithContainer` helper that wraps React Testing
 * Library's render function with ContainerProvider from @hex-di/react, enabling
 * easy testing of React components that use DI hooks.
 *
 * @remarks
 * This module imports the global shared ContainerProvider from @hex-di/react's
 * internal context module. This ensures that components using the global usePort
 * hook (imported from use-port.js) can resolve services from the provider.
 *
 * For applications using createTypedHooks for isolated contexts, test components
 * should use the same createTypedHooks instance for consistency.
 *
 * @packageDocumentation
 */

import React, { type ReactElement } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { ContainerProvider } from "@hex-di/react";
import { createContainer, type Container } from "@hex-di/runtime";
import type { Graph } from "@hex-di/graph";
import type { Port } from "@hex-di/ports";

// =============================================================================
// Types
// =============================================================================

/**
 * Result type for renderWithContainer.
 *
 * Extends the standard React Testing Library RenderResult with an additional
 * `diContainer` property that provides access to the DI container for
 * assertions and manual resolution.
 *
 * @typeParam TProvides - Union of Port types provided by the graph
 *
 * @remarks
 * The property is named `diContainer` to avoid collision with RTL's `container`
 * property which refers to the DOM container element.
 *
 * @example
 * ```typescript
 * const { diContainer, getByTestId } = renderWithContainer(<MyComponent />, graph);
 *
 * // Use RTL methods for DOM assertions
 * expect(getByTestId('user-name')).toHaveTextContent('John');
 *
 * // Use diContainer for DI-related assertions
 * const logger = diContainer.resolve(LoggerPort);
 * expect(logger.log).toHaveBeenCalledWith('User loaded');
 * ```
 */
export interface RenderWithContainerResult<TProvides extends Port<unknown, string>>
  extends RenderResult {
  /**
   * The DI container created for this render.
   *
   * Use this to resolve services for spy/mock assertions, or to create
   * scopes for additional testing scenarios.
   *
   * @remarks
   * Named `diContainer` to avoid collision with RTL's `container` DOM element.
   * Container disposal is the test's responsibility - consider calling
   * `diContainer.dispose()` in afterEach if needed.
   */
  readonly diContainer: Container<TProvides>;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Renders a React element with a DI container wrapping it in ContainerProvider.
 *
 * This helper combines React Testing Library's `render` with HexDI's
 * `ContainerProvider`, making it easy to test components that use `usePort`
 * and other DI hooks.
 *
 * @typeParam TProvides - Union of Port types provided by the graph (inferred)
 *
 * @param element - The React element to render
 * @param graph - The dependency graph to create a container from
 * @param options - Optional RTL render options (container, baseElement, etc.)
 *
 * @returns RenderResult from RTL plus the DI container as `diContainer`
 *
 * @remarks
 * - Creates a fresh container for each call
 * - The container is NOT automatically disposed - tests should dispose if needed
 * - RTL's `cleanup` handles React unmounting but not container disposal
 * - Use `diContainer` to access the container (not `container` which is the DOM element)
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
 *   const mockLoggerAdapter = createMockAdapter(LoggerPort, {
 *     log: vi.fn(),
 *   });
 *
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
 * @example With custom render options
 * ```typescript
 * const customContainer = document.createElement('div');
 *
 * renderWithContainer(<MyComponent />, graph, {
 *   container: customContainer,
 * });
 * ```
 *
 * @example With TestGraphBuilder
 * ```typescript
 * const testGraph = TestGraphBuilder.from(productionGraph)
 *   .override(mockLogger)
 *   .override(mockDatabase)
 *   .build();
 *
 * renderWithContainer(<App />, testGraph);
 * ```
 */
export function renderWithContainer<TProvides extends Port<unknown, string>>(
  element: ReactElement,
  graph: Graph<TProvides>,
  options?: RenderOptions
): RenderWithContainerResult<TProvides> {
  // Create a container from the provided graph
  const diContainer = createContainer(graph);

  // Wrap the element with the global shared ContainerProvider
  // This uses the same context that the global usePort hook consumes
  const wrappedElement = (
    <ContainerProvider container={diContainer}>
      {element}
    </ContainerProvider>
  );

  // Render using RTL and spread the result
  const renderResult = render(wrappedElement, options);

  // Return combined result with diContainer
  return {
    ...renderResult,
    diContainer,
  };
}
