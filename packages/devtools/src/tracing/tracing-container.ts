/**
 * TracingContainer - Container wrapper with resolution tracing.
 *
 * This module provides the createTracingContainer function that creates a
 * container with resolution hooks for capturing timing data. The hooks API
 * enables capturing ALL resolutions including nested dependencies, providing
 * proper parent-child hierarchy in trace data.
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import {
  createContainer,
  TRACING_ACCESS,
  type Container,
  type Scope,
  type Lifetime,
  type ResolutionHooks,
  type ResolutionHookContext,
  type ResolutionResultContext,
} from "@hex-di/runtime";
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

// =============================================================================
// Tracing State
// =============================================================================

/**
 * Active trace entry being built during resolution.
 */
interface ActiveTrace {
  /** Unique trace ID */
  readonly traceId: string;
  /** Parent trace ID (null for root resolutions) */
  readonly parentTraceId: string | null;
  /** Start time of resolution */
  readonly startTime: number;
  /** Child trace IDs collected during resolution */
  readonly childTraceIds: string[];
}

/**
 * Internal state for the tracing hooks.
 */
interface TracingState {
  /** The trace collector */
  readonly collector: TraceCollector;
  /** Whether tracing is currently paused */
  isPaused: boolean;
  /** Counter for generating unique trace IDs */
  traceIdCounter: number;
  /** Counter for global resolution order */
  orderCounter: number;
  /** Map from port instance to active trace (for correlation) */
  readonly activeTraces: Map<Port<unknown, string>, ActiveTrace>;
  /** Stack of current trace IDs for parent tracking */
  readonly traceStack: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates a unique trace ID.
 */
function generateTraceId(state: TracingState): string {
  return `trace-${++state.traceIdCounter}`;
}

// =============================================================================
// createTracingContainer Factory
// =============================================================================

/**
 * Creates a tracing-enabled container from a validated graph.
 *
 * The tracing container uses resolution hooks to capture timing data for
 * ALL resolutions, including nested dependency resolutions. This enables
 * proper parent-child hierarchy tracking in trace data.
 *
 * @param graph - The validated Graph from @hex-di/graph
 * @param options - Optional configuration for tracing behavior
 * @returns A container with TRACING_ACCESS Symbol for accessing trace data
 *
 * @remarks
 * - Uses resolution hooks for zero-overhead when tracing is paused
 * - Captures all resolutions including nested dependencies
 * - Parent-child relationships are properly tracked
 * - Use TRACING_ACCESS Symbol to access the TracingAPI
 *
 * @example Basic usage
 * ```typescript
 * import { createTracingContainer } from '@hex-di/devtools/tracing';
 * import { TRACING_ACCESS } from '@hex-di/runtime';
 *
 * const tracingContainer = createTracingContainer(graph);
 * const logger = tracingContainer.resolve(LoggerPort);
 *
 * const tracingAPI = tracingContainer[TRACING_ACCESS];
 * const traces = tracingAPI.getTraces();
 * console.log(`Resolved ${traces.length} services`);
 * ```
 *
 * @example With custom retention policy
 * ```typescript
 * const tracingContainer = createTracingContainer(graph, {
 *   retentionPolicy: { maxTraces: 5000, slowThresholdMs: 50 }
 * });
 * ```
 */
export function createTracingContainer<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>,
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
    traceIdCounter: 0,
    orderCounter: 0,
    activeTraces: new Map(),
    traceStack: [],
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
      // Reset counters for clean slate
      state.traceIdCounter = 0;
      state.orderCounter = 0;
      state.activeTraces.clear();
      state.traceStack.length = 0;
    },

    subscribe(callback: (entry: TraceEntry) => void): () => void {
      return collector.subscribe(callback);
    },

    isPaused(): boolean {
      return state.isPaused;
    },

    pin(traceId: string): void {
      collector.pin?.(traceId);
    },

    unpin(traceId: string): void {
      collector.unpin?.(traceId);
    },
  };

  // Create resolution hooks
  const hooks: ResolutionHooks = {
    beforeResolve: (context: ResolutionHookContext): void => {
      // Skip if paused
      if (state.isPaused) {
        return;
      }

      const traceId = generateTraceId(state);

      // Get parent trace ID from stack
      const parentTraceId =
        state.traceStack.length > 0
          ? state.traceStack[state.traceStack.length - 1] ?? null
          : null;

      // Create active trace entry
      const activeTrace: ActiveTrace = {
        traceId,
        parentTraceId,
        startTime: context.isCacheHit ? Date.now() : Date.now(), // Use same timing for consistency
        childTraceIds: [],
      };

      // Store for correlation in afterResolve
      state.activeTraces.set(context.port, activeTrace);

      // Push onto stack for child tracking
      state.traceStack.push(traceId);

      // If has parent, register as child
      if (parentTraceId !== null) {
        // Find parent's active trace and add this as child
        for (const [, active] of state.activeTraces) {
          if (active.traceId === parentTraceId) {
            active.childTraceIds.push(traceId);
            break;
          }
        }
      }
    },

    afterResolve: (context: ResolutionResultContext): void => {
      // Skip if paused
      if (state.isPaused) {
        return;
      }

      // Get the active trace for this port
      const activeTrace = state.activeTraces.get(context.port);
      if (activeTrace === undefined) {
        // This shouldn't happen, but handle gracefully
        return;
      }

      // Pop from stack
      state.traceStack.pop();

      // Remove from active traces
      state.activeTraces.delete(context.port);

      // Create the trace entry
      const entry: TraceEntry = {
        id: activeTrace.traceId,
        portName: context.portName,
        lifetime: context.lifetime as Lifetime,
        startTime: activeTrace.startTime,
        duration: context.duration,
        isCacheHit: context.isCacheHit,
        parentTraceId: activeTrace.parentTraceId,
        childTraceIds: Object.freeze([...activeTrace.childTraceIds]),
        scopeId: context.scopeId,
        order: ++state.orderCounter,
        isPinned: false,
      };

      // Collect the trace (errors are still traced)
      collector.collect(entry);
    },
  };

  // Create the container with hooks
  const baseContainer = createContainer(graph, { hooks });

  // Create the tracing container wrapper that exposes TRACING_ACCESS
  const tracingContainer = {
    resolve<P extends TProvides>(port: P): InferService<P> {
      return baseContainer.resolve(port);
    },

    createScope(): Scope<TProvides> {
      return baseContainer.createScope();
    },

    dispose(): Promise<void> {
      return baseContainer.dispose();
    },

    get isDisposed(): boolean {
      return baseContainer.isDisposed;
    },

    [TRACING_ACCESS]: tracingAPI,
  };

  return Object.freeze(tracingContainer) as TracingContainer<TProvides>;
}
