/**
 * TraceCollector Strategy Pattern interface.
 *
 * This module defines the TraceCollector interface for the strategy pattern,
 * allowing different collector implementations to be swapped at runtime.
 *
 * @packageDocumentation
 */

import type { TraceEntry, TraceFilter, TraceStats } from "./types.js";

/**
 * Callback function type for trace subscription.
 *
 * Called synchronously when a new trace entry is collected.
 */
export type TraceSubscriber = (entry: TraceEntry) => void;

/**
 * Function to unsubscribe from trace notifications.
 *
 * Returns void and can be called multiple times safely.
 */
export type Unsubscribe = () => void;

/**
 * Strategy interface for trace collection.
 *
 * Implementations can vary in how they store, filter, and report traces.
 * The strategy pattern allows swapping collectors without changing the
 * tracing container logic.
 *
 * @remarks
 * - `collect()` is called synchronously for each resolution
 * - `getTraces()` supports optional filtering with AND semantics
 * - `getStats()` computes statistics lazily on demand
 * - `subscribe()` enables real-time push notifications
 * - All returned data should be treated as immutable
 *
 * @example Implementing a custom collector
 * ```typescript
 * class LoggingCollector implements TraceCollector {
 *   collect(entry: TraceEntry): void {
 *     console.log(`Resolved ${entry.portName} in ${entry.duration}ms`);
 *   }
 *
 *   getTraces(_filter?: TraceFilter): readonly TraceEntry[] {
 *     return [];
 *   }
 *
 *   getStats(): TraceStats {
 *     return {
 *       totalResolutions: 0,
 *       averageDuration: 0,
 *       cacheHitRate: 0,
 *       slowCount: 0,
 *       sessionStart: Date.now(),
 *       totalDuration: 0,
 *     };
 *   }
 *
 *   clear(): void {
 *     // No-op for logging collector
 *   }
 *
 *   subscribe(_callback: TraceSubscriber): Unsubscribe {
 *     return () => {};
 *   }
 * }
 * ```
 */
export interface TraceCollector {
  /**
   * Collects a new trace entry.
   *
   * Called synchronously during service resolution.
   * Implementations should be fast to minimize overhead.
   *
   * @param entry - The trace entry to collect
   */
  collect(entry: TraceEntry): void;

  /**
   * Retrieves collected traces, optionally filtered.
   *
   * Filter criteria are ANDed together (all must match).
   * Returns a readonly array that should not be mutated.
   *
   * @param filter - Optional filter criteria
   * @returns Readonly array of matching trace entries
   */
  getTraces(filter?: TraceFilter): readonly TraceEntry[];

  /**
   * Computes and returns aggregate statistics.
   *
   * Statistics are computed lazily on each call.
   * Returns a readonly object that should not be mutated.
   *
   * @returns Computed trace statistics
   */
  getStats(): TraceStats;

  /**
   * Clears all collected traces.
   *
   * Does not affect subscriptions or session start time.
   */
  clear(): void;

  /**
   * Subscribes to new trace entries in real-time.
   *
   * The callback is invoked synchronously when each new trace is collected.
   * Returns an unsubscribe function to stop receiving notifications.
   *
   * @param callback - Function called with each new trace entry
   * @returns Unsubscribe function
   */
  subscribe(callback: TraceSubscriber): Unsubscribe;

  /**
   * Manually pins a trace to protect it from FIFO eviction.
   *
   * Optional method - collectors that don't support pinning can omit this.
   *
   * @param traceId - ID of the trace to pin
   */
  pin?(traceId: string): void;

  /**
   * Unpins a trace, making it eligible for FIFO eviction.
   *
   * Optional method - collectors that don't support unpinning can omit this.
   *
   * @param traceId - ID of the trace to unpin
   */
  unpin?(traceId: string): void;
}
