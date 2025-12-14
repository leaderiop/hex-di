/**
 * NoOpCollector - Zero overhead collector for disabled tracing.
 *
 * This collector implements the TraceCollector interface with no-op methods.
 * It is designed for production environments where tracing overhead must be zero.
 *
 * @packageDocumentation
 */

import type { TraceCollector, TraceSubscriber, Unsubscribe } from "./collector.js";
import type { TraceEntry, TraceFilter, TraceStats } from "./types.js";

/**
 * Singleton empty array to avoid allocations.
 * Frozen to prevent accidental mutation.
 */
const EMPTY_TRACES: readonly TraceEntry[] = Object.freeze([]);

/**
 * Singleton empty stats object to avoid allocations.
 * The sessionStart is set to 0 as there is no real session.
 */
const EMPTY_STATS: TraceStats = Object.freeze({
  totalResolutions: 0,
  averageDuration: 0,
  cacheHitRate: 0,
  slowCount: 0,
  sessionStart: 0,
  totalDuration: 0,
});

/**
 * Singleton no-op unsubscribe function.
 */
const NOOP_UNSUBSCRIBE: Unsubscribe = () => {};

/**
 * Zero-overhead trace collector that discards all traces.
 *
 * Use this collector when tracing is disabled to ensure:
 * - No memory allocation for trace storage
 * - No computation overhead for statistics
 * - No callback invocations for subscriptions
 *
 * @remarks
 * - All methods are constant-time O(1) no-ops
 * - Returns singleton frozen objects to avoid allocations
 * - Safe to use in production without performance impact
 *
 * @example Using NoOpCollector for disabled tracing
 * ```typescript
 * const collector = process.env.NODE_ENV === 'production'
 *   ? new NoOpCollector()
 *   : new MemoryCollector();
 *
 * const tracingContainer = createTracingContainer(container, { collector });
 * ```
 */
export class NoOpCollector implements TraceCollector {
  /**
   * No-op collect - discards the trace entry.
   *
   * @param _entry - Trace entry (ignored)
   */
  collect(_entry: TraceEntry): void {
    // Intentionally empty - zero overhead
  }

  /**
   * Returns empty array without allocation.
   *
   * @param _filter - Filter criteria (ignored)
   * @returns Singleton frozen empty array
   */
  getTraces(_filter?: TraceFilter): readonly TraceEntry[] {
    return EMPTY_TRACES;
  }

  /**
   * Returns zero-value stats without computation.
   *
   * @returns Singleton frozen empty stats object
   */
  getStats(): TraceStats {
    return EMPTY_STATS;
  }

  /**
   * No-op clear - nothing to clear.
   */
  clear(): void {
    // Intentionally empty - nothing to clear
  }

  /**
   * Returns no-op unsubscribe function.
   *
   * Callbacks are never invoked since traces are never stored.
   *
   * @param _callback - Subscriber callback (ignored)
   * @returns Singleton no-op unsubscribe function
   */
  subscribe(_callback: TraceSubscriber): Unsubscribe {
    return NOOP_UNSUBSCRIBE;
  }
}
