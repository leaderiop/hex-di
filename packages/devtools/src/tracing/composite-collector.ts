/**
 * CompositeCollector - Delegates to multiple trace collectors.
 *
 * This collector implements the composite pattern, allowing multiple
 * collectors to receive the same traces. Useful for combining different
 * collection strategies (e.g., memory + logging).
 *
 * @packageDocumentation
 */

import type { TraceCollector, TraceSubscriber, Unsubscribe } from "./collector.js";
import type { TraceEntry, TraceFilter, TraceStats } from "./types.js";

/**
 * Default empty stats for when there are no collectors.
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
 * Singleton empty array for when there are no collectors.
 */
const EMPTY_TRACES: readonly TraceEntry[] = Object.freeze([]);

/**
 * Composite trace collector that delegates to multiple child collectors.
 *
 * Operations are delegated as follows:
 * - `collect()`: Delegated to ALL child collectors
 * - `getTraces()`: Retrieved from FIRST collector only
 * - `getStats()`: Retrieved from FIRST collector only
 * - `clear()`: Delegated to ALL child collectors
 * - `subscribe()`: Delegated to FIRST collector only
 *
 * @remarks
 * - The first collector is the "primary" for reads
 * - All collectors receive writes (collect, clear)
 * - Empty collectors array is handled gracefully
 * - Maintains order of child collectors
 *
 * @example Combining memory and logging collectors
 * ```typescript
 * const memoryCollector = new MemoryCollector();
 * const loggingCollector = new LoggingCollector();
 *
 * const composite = new CompositeCollector([memoryCollector, loggingCollector]);
 *
 * // Both collectors receive the trace
 * composite.collect(traceEntry);
 *
 * // Stats come from memoryCollector (first)
 * const stats = composite.getStats();
 * ```
 */
export class CompositeCollector implements TraceCollector {
  private readonly collectors: readonly TraceCollector[];

  /**
   * Creates a new CompositeCollector instance.
   *
   * @param collectors - Array of child collectors to delegate to.
   *        The first collector is the primary for read operations.
   */
  constructor(collectors: TraceCollector[]) {
    this.collectors = [...collectors];
  }

  /**
   * Collects a new trace entry.
   *
   * Delegates to ALL child collectors.
   *
   * @param entry - The trace entry to collect
   */
  collect(entry: TraceEntry): void {
    for (const collector of this.collectors) {
      collector.collect(entry);
    }
  }

  /**
   * Retrieves collected traces from the FIRST collector.
   *
   * Returns empty array if no collectors are configured.
   *
   * @param filter - Optional filter criteria
   * @returns Readonly array of matching trace entries
   */
  getTraces(filter?: TraceFilter): readonly TraceEntry[] {
    const primary = this.collectors[0];
    if (!primary) {
      return EMPTY_TRACES;
    }
    return primary.getTraces(filter);
  }

  /**
   * Computes and returns aggregate statistics from the FIRST collector.
   *
   * Returns empty stats if no collectors are configured.
   *
   * @returns Computed trace statistics
   */
  getStats(): TraceStats {
    const primary = this.collectors[0];
    if (!primary) {
      return EMPTY_STATS;
    }
    return primary.getStats();
  }

  /**
   * Clears all collected traces.
   *
   * Delegates to ALL child collectors.
   */
  clear(): void {
    for (const collector of this.collectors) {
      collector.clear();
    }
  }

  /**
   * Subscribes to new trace entries from the FIRST collector.
   *
   * Returns no-op unsubscribe if no collectors are configured.
   *
   * @param callback - Function called with each new trace entry
   * @returns Unsubscribe function
   */
  subscribe(callback: TraceSubscriber): Unsubscribe {
    const primary = this.collectors[0];
    if (!primary) {
      return () => {};
    }
    return primary.subscribe(callback);
  }
}
