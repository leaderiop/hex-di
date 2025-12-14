/**
 * TracingContainer - Decorator wrapper for resolution tracing.
 *
 * This module provides the createTracingContainer function that wraps a base
 * container with tracing capabilities using the Decorator pattern. The wrapper
 * intercepts resolve() calls to capture timing data without mutating the base
 * container.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Container, Scope, Lifetime } from "@hex-di/runtime";
import { INTERNAL_ACCESS, TRACING_ACCESS } from "@hex-di/runtime";
import type { TraceCollector } from "./collector.js";
import type {
  TraceEntry,
  TraceFilter,
  TraceStats,
  TracingAPI,
  TraceRetentionPolicy,
} from "./types.js";
import { DEFAULT_RETENTION_POLICY } from "./types.js";
import { MemoryCollector } from "./memory-collector.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for createTracingContainer.
 */
export interface TracingContainerOptions {
  /**
   * Custom trace collector implementation.
   * Defaults to MemoryCollector with default retention policy.
   */
  readonly collector?: TraceCollector;

  /**
   * Custom retention policy when using default MemoryCollector.
   * Ignored if custom collector is provided.
   */
  readonly retentionPolicy?: Partial<TraceRetentionPolicy>;
}

/**
 * Extended container type with tracing capabilities.
 */
export type TracingContainer<TProvides extends Port<unknown, string>> = Container<TProvides> & {
  readonly [TRACING_ACCESS]: TracingAPI;
};

/**
 * Extended scope type with tracing capabilities.
 */
type TracingScope<TProvides extends Port<unknown, string>> = Scope<TProvides>;

// =============================================================================
// Resolution Context for Trace Hierarchy
// =============================================================================

/**
 * Tracks the current resolution context for building trace hierarchy.
 * Uses a stack to track nested resolutions.
 */
interface ResolutionTraceContext {
  /** Stack of trace IDs for tracking parent-child relationships */
  readonly traceStack: string[];
  /** Counter for generating unique trace IDs */
  traceIdCounter: number;
  /** Counter for global resolution order */
  orderCounter: number;
}

// =============================================================================
// Tracing State
// =============================================================================

/**
 * Internal state for the tracing wrapper.
 */
interface TracingState {
  /** The trace collector */
  readonly collector: TraceCollector;
  /** Whether tracing is currently paused */
  isPaused: boolean;
  /** The resolution context for hierarchy tracking */
  readonly context: ResolutionTraceContext;
  /** Map of trace ID to its child trace IDs (for updating after child resolves) */
  readonly childTraceMap: Map<string, string[]>;
}

// =============================================================================
// Internal Access Types
// =============================================================================

/**
 * Internal state accessor type for containers.
 */
interface ContainerInternalAccessor {
  readonly singletonMemo: {
    readonly size: number;
  };
  readonly adapterMap: ReadonlyMap<Port<unknown, string>, {
    readonly portName: string;
    readonly lifetime: Lifetime;
  }>;
}

/**
 * Internal state accessor type for scopes.
 */
interface ScopeInternalAccessor {
  readonly id: string;
  readonly scopedMemo: {
    readonly size: number;
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique trace ID.
 */
function generateTraceId(context: ResolutionTraceContext): string {
  return `trace-${++context.traceIdCounter}`;
}

/**
 * Gets the current parent trace ID from the stack, or null if at root.
 */
function getCurrentParentTraceId(context: ResolutionTraceContext): string | null {
  const stack = context.traceStack;
  return stack.length > 0 ? stack[stack.length - 1] ?? null : null;
}

/**
 * Checks if a service was already cached before resolution.
 * This requires checking if the instance exists in the memoization map
 * before the factory would be called.
 */
function checkCacheHit(
  baseContainer: Container<Port<unknown, string>>,
  scope: Scope<Port<unknown, string>> | null,
  portName: string,
  lifetime: Lifetime
): boolean {
  try {
    if (lifetime === "request") {
      // Request lifetime is never cached
      return false;
    }

    if (scope !== null) {
      // Check scope's internal state
      const scopeAccessor = scope as unknown as { [key: symbol]: () => ScopeInternalAccessor };
      const scopeState = scopeAccessor[INTERNAL_ACCESS]?.();

      if (lifetime === "singleton") {
        // For singletons, check the container's singleton memo
        const containerAccessor = baseContainer as unknown as { [key: symbol]: () => ContainerInternalAccessor };
        const containerState = containerAccessor[INTERNAL_ACCESS]?.();
        if (containerState !== undefined) {
          // Check if there's an entry for this port
          for (const [port] of containerState.adapterMap) {
            if (port.__portName === portName) {
              // We need to check if the singleton was already resolved
              // by checking the memo size before vs after
              return false; // We'll detect cache hits differently
            }
          }
        }
      }
    }
  } catch {
    // If we can't access internal state, assume no cache hit
  }

  return false;
}

/**
 * Gets adapter info for a port from the container.
 */
function getAdapterInfo(
  baseContainer: Container<Port<unknown, string>>,
  port: Port<unknown, string>
): { lifetime: Lifetime } | undefined {
  try {
    const accessor = baseContainer as unknown as { [key: symbol]: () => ContainerInternalAccessor };
    const state = accessor[INTERNAL_ACCESS]?.();
    if (state !== undefined) {
      const adapterInfo = state.adapterMap.get(port);
      if (adapterInfo !== undefined) {
        return { lifetime: adapterInfo.lifetime };
      }
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

// =============================================================================
// Tracing Resolution Logic
// =============================================================================

/**
 * Wraps a resolve call with tracing.
 */
function traceResolve<P extends Port<unknown, string>>(
  state: TracingState,
  baseContainer: Container<Port<unknown, string>>,
  scope: Scope<Port<unknown, string>> | null,
  port: P,
  resolveImpl: () => InferService<P>,
  scopeId: string | null
): InferService<P> {
  // Skip tracing if paused (zero overhead)
  if (state.isPaused) {
    return resolveImpl();
  }

  const portName = port.__portName;
  const traceId = generateTraceId(state.context);
  const parentTraceId = getCurrentParentTraceId(state.context);
  const order = ++state.context.orderCounter;

  // Get lifetime info
  const adapterInfo = getAdapterInfo(baseContainer, port);
  const lifetime: Lifetime = adapterInfo?.lifetime ?? "singleton";

  // Check if this will be a cache hit before resolving
  // We track this by checking if the resolve actually calls the factory
  // For now, we'll track it by checking singleton/scoped resolution counts
  const preResolveCheckResult = getCacheHitStatus(state, baseContainer, scope, port, lifetime);

  // Push this trace onto the stack for hierarchy tracking
  state.context.traceStack.push(traceId);

  // Initialize child trace array for this trace
  state.childTraceMap.set(traceId, []);

  // If we have a parent, register ourselves as a child of the parent
  if (parentTraceId !== null) {
    const parentChildren = state.childTraceMap.get(parentTraceId);
    if (parentChildren !== undefined) {
      parentChildren.push(traceId);
    }
  }

  const startTime = performance.now();

  try {
    const result = resolveImpl();
    const duration = performance.now() - startTime;

    // Determine cache hit - if duration is very fast and it's a cached lifetime, likely a cache hit
    // Better approach: track resolution count changes
    const isCacheHit = preResolveCheckResult;

    // Get child trace IDs
    const childTraceIds = state.childTraceMap.get(traceId) ?? [];

    // Create trace entry
    const entry: TraceEntry = {
      id: traceId,
      portName,
      lifetime,
      startTime,
      duration,
      isCacheHit,
      parentTraceId,
      childTraceIds: Object.freeze([...childTraceIds]),
      scopeId,
      order,
      isPinned: false,
    };

    // Collect the trace
    state.collector.collect(entry);

    return result;
  } finally {
    // Pop this trace from the stack
    state.context.traceStack.pop();

    // Clean up child map entry (we've already collected, so we don't need it)
    // Keep it for potential future reference
  }
}

/**
 * Determines if the upcoming resolve will be a cache hit.
 * This is a heuristic based on checking if we've already traced this port.
 */
function getCacheHitStatus(
  state: TracingState,
  baseContainer: Container<Port<unknown, string>>,
  scope: Scope<Port<unknown, string>> | null,
  port: Port<unknown, string>,
  lifetime: Lifetime
): boolean {
  // Request lifetime is never cached
  if (lifetime === "request") {
    return false;
  }

  // Check existing traces to see if this port has been resolved before
  const portName = port.__portName;
  const traces = state.collector.getTraces();

  if (lifetime === "singleton") {
    // For singleton, check if any trace exists for this port
    return traces.some((t) => t.portName === portName && !t.isCacheHit);
  }

  if (lifetime === "scoped" && scope !== null) {
    // For scoped, check if this port was resolved in the same scope
    try {
      const scopeAccessor = scope as unknown as { [key: symbol]: () => ScopeInternalAccessor };
      const scopeState = scopeAccessor[INTERNAL_ACCESS]?.();
      if (scopeState !== undefined) {
        const currentScopeId = scopeState.id;
        return traces.some(
          (t) => t.portName === portName && t.scopeId === currentScopeId && !t.isCacheHit
        );
      }
    } catch {
      // Fall through
    }
  }

  return false;
}

// =============================================================================
// createTracingContainer Factory
// =============================================================================

/**
 * Creates a tracing-enabled container by wrapping a base container.
 *
 * The tracing container uses the Decorator pattern to intercept resolve() calls
 * and capture timing data without mutating the base container. All original
 * container functionality is preserved.
 *
 * @param baseContainer - The container to wrap with tracing capabilities
 * @param options - Optional configuration for tracing behavior
 * @returns A new container with TRACING_ACCESS Symbol for accessing trace data
 *
 * @remarks
 * - The base container is not modified
 * - Scopes created from the tracing container also trace resolutions
 * - Use TRACING_ACCESS Symbol to access the TracingAPI
 * - Traces are collected by the configured collector (defaults to MemoryCollector)
 *
 * @example Basic usage
 * ```typescript
 * import { createTracingContainer } from '@hex-di/devtools/tracing';
 * import { TRACING_ACCESS } from '@hex-di/runtime';
 *
 * const tracingContainer = createTracingContainer(container);
 * const logger = tracingContainer.resolve(LoggerPort);
 *
 * const tracingAPI = tracingContainer[TRACING_ACCESS];
 * const traces = tracingAPI.getTraces();
 * console.log(`Resolved ${traces.length} services`);
 * ```
 *
 * @example With custom collector
 * ```typescript
 * const collector = new MemoryCollector({ maxTraces: 5000 });
 * const tracingContainer = createTracingContainer(container, { collector });
 * ```
 */
export function createTracingContainer<TProvides extends Port<unknown, string>>(
  baseContainer: Container<TProvides>,
  options?: TracingContainerOptions
): TracingContainer<TProvides> {
  // Create or use provided collector
  const collector: TraceCollector =
    options?.collector ??
    new MemoryCollector({
      ...DEFAULT_RETENTION_POLICY,
      ...options?.retentionPolicy,
    });

  // Initialize tracing state
  const state: TracingState = {
    collector,
    isPaused: false,
    context: {
      traceStack: [],
      traceIdCounter: 0,
      orderCounter: 0,
    },
    childTraceMap: new Map(),
  };

  // Create the TracingAPI
  const tracingAPI: TracingAPI = {
    getTraces(filter?: TraceFilter): readonly TraceEntry[] {
      return collector.getTraces(filter);
    },

    getStats(): TraceStats {
      return collector.getStats();
    },

    pause(): void {
      state.isPaused = true;
    },

    resume(): void {
      state.isPaused = false;
    },

    clear(): void {
      collector.clear();
    },

    subscribe(callback: (entry: TraceEntry) => void): () => void {
      return collector.subscribe(callback);
    },

    isPaused(): boolean {
      return state.isPaused;
    },

    pin(traceId: string): void {
      // Pinning will be implemented in Task Group 4
      // For now, this is a no-op placeholder
      void traceId;
    },

    unpin(traceId: string): void {
      // Unpinning will be implemented in Task Group 4
      // For now, this is a no-op placeholder
      void traceId;
    },
  };

  // Create tracing scope wrapper
  function wrapScope(baseScope: Scope<TProvides>, scopeId: string): TracingScope<TProvides> {
    const wrappedScope: TracingScope<TProvides> = {
      resolve<P extends TProvides>(port: P): InferService<P> {
        return traceResolve(
          state,
          baseContainer as Container<Port<unknown, string>>,
          baseScope as Scope<Port<unknown, string>>,
          port as Port<unknown, string>,
          () => baseScope.resolve(port),
          scopeId
        ) as InferService<P>;
      },

      createScope(): Scope<TProvides> {
        const newBaseScope = baseScope.createScope();
        const newScopeId = getScopeId(newBaseScope);
        return wrapScope(newBaseScope, newScopeId);
      },

      dispose(): Promise<void> {
        return baseScope.dispose();
      },

      // Forward isDisposed from baseScope - required for React StrictMode compatibility
      // AutoScopeProvider checks this to detect disposed scopes and recreate them
      get isDisposed(): boolean {
        return baseScope.isDisposed;
      },
    } as TracingScope<TProvides>;

    return Object.freeze(wrappedScope) as TracingScope<TProvides>;
  }

  // Helper to get scope ID from a scope
  function getScopeId(scope: Scope<TProvides>): string {
    try {
      const accessor = scope as unknown as { [key: symbol]: () => ScopeInternalAccessor };
      const scopeState = accessor[INTERNAL_ACCESS]?.();
      return scopeState?.id ?? `scope-${Date.now()}`;
    } catch {
      return `scope-${Date.now()}`;
    }
  }

  // Create the tracing container wrapper
  const tracingContainer = {
    resolve<P extends TProvides>(port: P): InferService<P> {
      return traceResolve(
        state,
        baseContainer as Container<Port<unknown, string>>,
        null,
        port as Port<unknown, string>,
        () => baseContainer.resolve(port),
        null
      ) as InferService<P>;
    },

    createScope(): Scope<TProvides> {
      const baseScope = baseContainer.createScope();
      const scopeId = getScopeId(baseScope);
      return wrapScope(baseScope, scopeId);
    },

    dispose(): Promise<void> {
      return baseContainer.dispose();
    },

    // Forward isDisposed from baseContainer
    get isDisposed(): boolean {
      return baseContainer.isDisposed;
    },

    [TRACING_ACCESS]: tracingAPI,
  };

  return Object.freeze(tracingContainer) as TracingContainer<TProvides>;
}
