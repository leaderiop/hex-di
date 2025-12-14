/**
 * Resolution hooks for @hex-di/runtime.
 *
 * Provides optional lifecycle hooks that fire during service resolution.
 * These hooks enable instrumentation (like tracing) without modifying
 * core resolution logic. When hooks are not provided, there is zero overhead.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { Lifetime } from "@hex-di/graph";

// =============================================================================
// Hook Context Types
// =============================================================================

/**
 * Context provided to resolution hooks before resolution begins.
 *
 * Contains information about the port being resolved, its lifetime,
 * scope context, and parent resolution (for nested dependencies).
 *
 * @remarks
 * - `parentPort` is null for top-level resolutions, non-null for dependencies
 * - `isCacheHit` indicates whether the instance already exists in cache
 * - `depth` is 0 for top-level, 1 for first-level dependencies, etc.
 * - All properties are readonly to ensure hook consumers don't modify state
 *
 * @example
 * ```typescript
 * const hooks: ResolutionHooks = {
 *   beforeResolve: (context) => {
 *     console.log(`Resolving ${context.portName} at depth ${context.depth}`);
 *     if (context.parentPort) {
 *       console.log(`  Parent: ${context.parentPort.__portName}`);
 *     }
 *   },
 * };
 * ```
 */
export interface ResolutionHookContext {
  /**
   * The port being resolved.
   * Can be used to identify the service type.
   */
  readonly port: Port<unknown, string>;

  /**
   * Name of the port being resolved.
   * Convenience property equivalent to `port.__portName`.
   */
  readonly portName: string;

  /**
   * Lifetime of the adapter for this port.
   * Determines caching behavior: "singleton", "scoped", or "request".
   */
  readonly lifetime: Lifetime;

  /**
   * ID of the scope where resolution is occurring.
   * null for container-level resolutions (singletons resolved from root).
   */
  readonly scopeId: string | null;

  /**
   * The parent port if this is a nested dependency resolution.
   * null for top-level resolutions initiated by user code.
   */
  readonly parentPort: Port<unknown, string> | null;

  /**
   * Whether this resolution will be served from cache.
   * true if instance already exists (singleton/scoped), false for fresh creation.
   */
  readonly isCacheHit: boolean;

  /**
   * Resolution depth in the dependency tree.
   * 0 for top-level resolutions, increments for each level of dependencies.
   */
  readonly depth: number;
}

/**
 * Extended context provided to afterResolve hook after resolution completes.
 *
 * Includes all properties from ResolutionHookContext plus timing and error info.
 *
 * @remarks
 * - `duration` is measured using `Date.now()` for cross-platform compatibility
 * - `error` is null on success, contains the Error instance on failure
 * - The afterResolve hook is always called, even when resolution throws
 *
 * @example
 * ```typescript
 * const hooks: ResolutionHooks = {
 *   afterResolve: (context) => {
 *     if (context.error) {
 *       console.error(`Failed to resolve ${context.portName}:`, context.error);
 *     } else {
 *       console.log(`Resolved ${context.portName} in ${context.duration}ms`);
 *     }
 *   },
 * };
 * ```
 */
export interface ResolutionResultContext extends ResolutionHookContext {
  /**
   * Duration of the resolution in milliseconds.
   * Measured from before adapter lookup to after factory completion.
   * Includes time spent resolving dependencies.
   */
  readonly duration: number;

  /**
   * Error thrown during resolution, or null on success.
   * Can be CircularDependencyError, FactoryError, etc.
   */
  readonly error: Error | null;
}

// =============================================================================
// Resolution Hooks Interface
// =============================================================================

/**
 * Optional lifecycle hooks for resolution instrumentation.
 *
 * Both hooks are optional. When not provided, no overhead is incurred.
 * Hooks are called synchronously during resolution.
 *
 * @remarks
 * - Hooks should not throw errors; doing so will interrupt resolution
 * - Hooks should be fast to avoid impacting resolution performance
 * - Hooks are called for ALL resolutions, including nested dependencies
 * - For tracing, use beforeResolve to start timing and afterResolve to record
 *
 * @example Basic tracing
 * ```typescript
 * const traces: Array<{port: string, duration: number}> = [];
 *
 * const container = createContainer(graph, {
 *   hooks: {
 *     afterResolve: (ctx) => {
 *       traces.push({ port: ctx.portName, duration: ctx.duration });
 *     },
 *   },
 * });
 * ```
 *
 * @example Parent-child tracking
 * ```typescript
 * const hooks: ResolutionHooks = {
 *   beforeResolve: (ctx) => {
 *     if (ctx.parentPort) {
 *       console.log(`${ctx.parentPort.__portName} -> ${ctx.portName}`);
 *     }
 *   },
 * };
 * ```
 */
export interface ResolutionHooks {
  /**
   * Called before each resolution attempt.
   *
   * Invoked after adapter lookup but before cache check and instance creation.
   * Called for both cache hits and misses.
   *
   * @param context - Information about the resolution being attempted
   */
  beforeResolve?: (context: ResolutionHookContext) => void;

  /**
   * Called after each resolution completes (success or failure).
   *
   * Always invoked, even when resolution throws an error.
   * The error property indicates success (null) or failure (Error instance).
   *
   * @param context - Information about the completed resolution
   */
  afterResolve?: (context: ResolutionResultContext) => void;
}

// =============================================================================
// Container Options
// =============================================================================

/**
 * Options for createContainer.
 *
 * All options are optional. When not provided, the container behaves normally
 * with zero overhead from hooks.
 *
 * @example
 * ```typescript
 * const container = createContainer(graph, {
 *   hooks: {
 *     beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *     afterResolve: (ctx) => console.log(`Resolved in ${ctx.duration}ms`),
 *   },
 * });
 * ```
 */
export interface ContainerOptions {
  /**
   * Optional resolution lifecycle hooks.
   *
   * When provided, hooks are called for every resolution including
   * nested dependency resolutions. When not provided, there is zero
   * overhead - the hooks code path is not executed.
   */
  readonly hooks?: ResolutionHooks;
}
