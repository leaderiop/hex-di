/**
 * @hex-di/runtime - Runtime Container Layer
 *
 * The runtime layer of HexDI that creates immutable containers from validated graphs
 * and provides type-safe service resolution with lifetime management, circular
 * dependency detection, and structured error handling.
 *
 * ## Key Features
 *
 * - **Type-Safe Resolution**: Resolve services with compile-time validation that
 *   the port exists in the container and correct return type inference.
 *
 * - **Lifetime Management**: Three lifetime scopes (singleton, scoped, request)
 *   with proper instance caching and isolation.
 *
 * - **Scope Hierarchy**: Create child scopes for request-scoped services with
 *   proper singleton inheritance and scoped instance isolation.
 *
 * - **Circular Dependency Detection**: Lazy detection at resolution time with
 *   detailed error messages showing the dependency chain.
 *
 * - **LIFO Disposal**: Proper cleanup with finalizers called in reverse creation
 *   order (last created, first disposed).
 *
 * - **Structured Errors**: Rich error hierarchy with stable codes for
 *   programmatic handling.
 *
 * ## Quick Start
 *
 * @example Basic usage
 * ```typescript
 * import { createPort } from '@hex-di/ports';
 * import { createAdapter, GraphBuilder } from '@hex-di/graph';
 * import { createContainer } from '@hex-di/runtime';
 *
 * // Define service interfaces
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create ports
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * // Create adapters
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'singleton',
 *   factory: () => ({ log: console.log })
 * });
 *
 * // Build graph and create container
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 *
 * // Resolve services
 * const logger = container.resolve(LoggerPort);
 * logger.log('Hello, world!');
 *
 * // Cleanup
 * await container.dispose();
 * ```
 *
 * @example Using scopes for request-scoped services
 * ```typescript
 * // Create a scope for each request
 * async function handleRequest() {
 *   const scope = container.createScope();
 *   try {
 *     const userContext = scope.resolve(UserContextPort);
 *     // ... handle request with scoped services
 *   } finally {
 *     await scope.dispose();
 *   }
 * }
 * ```
 *
 * @example Error handling
 * ```typescript
 * import {
 *   createContainer,
 *   ContainerError,
 *   CircularDependencyError,
 *   FactoryError
 * } from '@hex-di/runtime';
 *
 * try {
 *   const service = container.resolve(SomePort);
 * } catch (error) {
 *   if (error instanceof CircularDependencyError) {
 *     console.error('Circular dependency:', error.dependencyChain);
 *   } else if (error instanceof FactoryError) {
 *     console.error('Factory failed for:', error.portName);
 *     console.error('Cause:', error.cause);
 *   } else if (error instanceof ContainerError) {
 *     console.error(`Container error [${error.code}]:`, error.message);
 *   }
 * }
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
 * These types are commonly used alongside runtime types, so they are
 * re-exported to reduce import boilerplate in consumer code.
 */
export type { Port, InferService, InferPortName } from "@hex-di/ports";

/**
 * Re-export types from @hex-di/graph for consumer convenience.
 *
 * These types are commonly used alongside runtime types for building
 * dependency graphs and creating containers.
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

// =============================================================================
// Error Hierarchy
// =============================================================================

/**
 * Error classes for container-related failures.
 *
 * All errors extend {@link ContainerError} which provides:
 * - `code`: Stable string constant for programmatic handling
 * - `isProgrammingError`: Boolean indicating if error is a programming mistake
 *
 * @see {@link ContainerError} - Abstract base class for all container errors
 * @see {@link CircularDependencyError} - Thrown when circular dependency detected
 * @see {@link FactoryError} - Thrown when adapter factory throws
 * @see {@link DisposedScopeError} - Thrown when resolving from disposed scope
 * @see {@link ScopeRequiredError} - Thrown when resolving scoped port from container
 */
export {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
} from "./errors.js";

// =============================================================================
// Container and Scope Types
// =============================================================================

/**
 * Container and Scope branded types for type-safe service resolution.
 *
 * @see {@link Container} - Root container created from a validated graph
 * @see {@link Scope} - Child scope for managing scoped service lifetimes
 */
export type { Container, Scope } from "./types.js";

// =============================================================================
// Type Utility Functions
// =============================================================================

/**
 * Type utilities for working with Container and Scope types.
 *
 * @see {@link InferContainerProvides} - Extract TProvides from Container type
 * @see {@link InferScopeProvides} - Extract TProvides from Scope type
 * @see {@link IsResolvable} - Check if port is resolvable from container/scope
 * @see {@link ServiceFromContainer} - Extract service type for port from container
 */
export type {
  InferContainerProvides,
  InferScopeProvides,
  IsResolvable,
  ServiceFromContainer,
} from "./types.js";

// =============================================================================
// Container Factory
// =============================================================================

/**
 * Factory function for creating containers from validated graphs.
 *
 * @see {@link createContainer} - Create an immutable container from a Graph
 */
export { createContainer } from "./container.js";

// =============================================================================
// Resolution Hooks
// =============================================================================

/**
 * Resolution hooks for instrumentation and tracing.
 *
 * Hooks are called during service resolution and enable instrumentation
 * like tracing without modifying core resolution logic. When hooks are
 * not provided, there is zero overhead.
 *
 * @see {@link ResolutionHooks} - Hook configuration object
 * @see {@link ResolutionHookContext} - Context passed to beforeResolve
 * @see {@link ResolutionResultContext} - Context passed to afterResolve
 * @see {@link ContainerOptions} - Options for createContainer with hooks
 */
export type {
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
  ContainerOptions,
} from "./resolution-hooks.js";

// =============================================================================
// Captive Dependency Prevention Types
// =============================================================================

/**
 * Type utilities for compile-time captive dependency prevention.
 *
 * Captive dependency is a DI anti-pattern where a longer-lived service
 * (e.g., singleton) depends on a shorter-lived service (e.g., scoped).
 * These types enable compile-time detection with zero runtime cost.
 *
 * @see {@link LifetimeLevel} - Maps lifetime to numeric level for comparison
 * @see {@link CaptiveDependencyError} - Error type for captive dependency violations
 * @see {@link ValidateCaptiveDependency} - Validate single dependency relationship
 * @see {@link ValidateAllDependencies} - Validate all dependencies of an adapter
 */
export type {
  LifetimeLevel,
  CaptiveDependencyError,
  ValidateCaptiveDependency,
  ValidateAllDependencies,
} from "./captive-dependency.js";

// =============================================================================
// Container State Inspection
// =============================================================================

/**
 * Symbol-based access protocol for container state inspection.
 *
 * The INTERNAL_ACCESS Symbol grants controlled read-only access to container
 * and scope internal state. This enables DevTools to inspect runtime behavior
 * without exposing mutable implementation details.
 *
 * @see {@link INTERNAL_ACCESS} - Symbol for accessing internal state
 * @see {@link TRACING_ACCESS} - Symbol for accessing tracing capabilities
 * @see {@link ContainerInternalState} - Container internal state snapshot type
 * @see {@link ScopeInternalState} - Scope internal state snapshot type
 * @see {@link MemoMapSnapshot} - MemoMap snapshot type for instance inspection
 * @see {@link InternalAccessor} - Accessor function type
 */
export { INTERNAL_ACCESS, TRACING_ACCESS } from "./inspector-symbols.js";

/**
 * Type definitions for container state inspection snapshots.
 *
 * These types define the structure of frozen snapshots returned by the
 * INTERNAL_ACCESS Symbol accessor. All properties are readonly to reinforce
 * the immutable nature of inspection data.
 */
export type {
  ContainerInternalState,
  ScopeInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
  AdapterInfo,
  InternalAccessor,
  HasInternalAccess,
  ContainerInspector,
  ContainerSnapshot,
  SingletonEntry,
  ScopeTree,
} from "./inspector-types.js";

/**
 * Factory function for creating container inspectors.
 *
 * The inspector provides runtime state inspection capabilities for DevTools
 * and debugging purposes. It returns serializable, frozen snapshots of
 * container state without exposing mutable internals.
 *
 * @see {@link createInspector} - Create an inspector for a container
 * @see {@link getInternalAccessor} - Get the internal accessor from a container
 * @see {@link ContainerInspector} - Interface returned by createInspector
 * @see {@link ContainerSnapshot} - Snapshot structure returned by inspector.snapshot()
 * @see {@link ScopeTree} - Hierarchical scope tree structure
 */
export { createInspector, getInternalAccessor } from "./create-inspector.js";
