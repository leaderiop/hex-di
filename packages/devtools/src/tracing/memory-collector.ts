/**
 * MemoryCollector - In-memory trace storage with hybrid eviction policy.
 *
 * This collector stores traces in memory and provides filtering, statistics,
 * subscription capabilities, and a configurable eviction policy.
 *
 * @packageDocumentation
 */

import type { TraceCollector, TraceSubscriber, Unsubscribe } from "./collector.js";
import type {
  TraceEntry,
  TraceFilter,
  TraceStats,
  TraceRetentionPolicy,
} from "./types.js";
import { DEFAULT_RETENTION_POLICY } from "./types.js";

/**
 * Internal wrapper for trace entries with collection timestamp.
 *
 * Used to track when each trace was collected for time-based expiry.
 */
interface StoredTrace {
  /** The trace entry (may be mutated for isPinned) */
  entry: TraceEntry;
  /** Timestamp when the trace was collected (Date.now()) */
  collectedAt: number;
}

/**
 * In-memory trace collector with hybrid eviction policy.
 *
 * Stores traces in an internal array and provides:
 * - Filter support for getTraces() queries
 * - Lazy statistics computation
 * - Real-time subscription notifications
 * - FIFO eviction at maxTraces limit (protects pinned traces)
 * - Slow trace auto-pinning (traces >= slowThresholdMs)
 * - Pinned trace limit (maxPinnedTraces)
 * - Time-based expiry for non-pinned traces
 * - Manual pin/unpin API
 *
 * @remarks
 * - Traces are stored in insertion order
 * - Filter criteria use AND semantics (all must match)
 * - Statistics are computed on demand, not cached
 * - Auto-pinning occurs during collect() for slow traces
 * - FIFO eviction removes oldest non-pinned traces first
 * - Pinned traces have their own limit (oldest pinned dropped)
 * - Time expiry only affects non-pinned traces
 *
 * @example Basic usage
 * ```typescript
 * const collector = new MemoryCollector({
 *   maxTraces: 1000,
 *   maxPinnedTraces: 100,
 *   slowThresholdMs: 100,
 *   expiryMs: 300000,
 * });
 *
 * collector.collect({
 *   id: "trace-1",
 *   portName: "UserService",
 *   lifetime: "scoped",
 *   startTime: performance.now(),
 *   duration: 25.5,
 *   isCacheHit: false,
 *   parentTraceId: null,
 *   childTraceIds: [],
 *   scopeId: null,
 *   order: 1,
 *   isPinned: false,
 * });
 *
 * const traces = collector.getTraces({ lifetime: "scoped" });
 * const stats = collector.getStats();
 * ```
 *
 * @example Manual pinning
 * ```typescript
 * collector.collect(trace);
 * collector.pin("trace-1");    // Protect from FIFO eviction
 * collector.unpin("trace-1");  // Allow FIFO eviction again
 * ```
 */
export class MemoryCollector implements TraceCollector {
  private readonly storedTraces: StoredTrace[] = [];
  private readonly subscribers: Set<TraceSubscriber> = new Set();
  private readonly sessionStart: number;
  private readonly retentionPolicy: TraceRetentionPolicy;

  /**
   * Creates a new MemoryCollector instance.
   *
   * @param retentionPolicy - Optional retention policy configuration.
   *        Missing properties use DEFAULT_RETENTION_POLICY values.
   */
  constructor(retentionPolicy?: Partial<TraceRetentionPolicy>) {
    this.sessionStart = Date.now();
    this.retentionPolicy = {
      ...DEFAULT_RETENTION_POLICY,
      ...retentionPolicy,
    };
  }

  /**
   * Collects a new trace entry.
   *
   * Applies the following eviction policy:
   * 1. Auto-pins slow traces (duration >= slowThresholdMs)
   * 2. Enforces maxPinnedTraces limit (drops oldest pinned)
   * 3. Enforces maxTraces limit (FIFO, drops oldest non-pinned first)
   * 4. Notifies all subscribers synchronously
   *
   * @param entry - The trace entry to collect
   */
  collect(entry: TraceEntry): void {
    const now = Date.now();

    // Apply auto-pinning for slow traces
    const processedEntry = this.applyAutoPinning(entry);

    // Store the trace with collection timestamp
    this.storedTraces.push({
      entry: processedEntry,
      collectedAt: now,
    });

    // Enforce pinned trace limit first (before FIFO to avoid over-eviction)
    this.enforcePinnedLimit();

    // Then enforce total trace limit via FIFO (excluding pinned)
    this.enforceFIFOLimit();

    // Notify subscribers with the processed entry
    this.notifySubscribers(processedEntry);
  }

  /**
   * Retrieves collected traces, optionally filtered.
   *
   * Also applies time-based expiry for non-pinned traces before filtering.
   *
   * Filter criteria:
   * - `portName`: Case-insensitive partial match
   * - `lifetime`: Exact match
   * - `isCacheHit`: Exact match
   * - `minDuration`: Inclusive lower bound
   * - `maxDuration`: Inclusive upper bound
   * - `scopeId`: Exact match (null matches container-level)
   * - `isPinned`: Exact match
   *
   * All criteria are ANDed together.
   *
   * @param filter - Optional filter criteria
   * @returns Readonly array of matching trace entries
   */
  getTraces(filter?: TraceFilter): readonly TraceEntry[] {
    // Apply time-based expiry before returning traces
    this.applyTimeExpiry();

    const entries = this.storedTraces.map((st) => st.entry);

    if (!filter) {
      return [...entries];
    }

    return entries.filter((trace) => this.matchesFilter(trace, filter));
  }

  /**
   * Computes and returns aggregate statistics.
   *
   * Statistics are computed lazily from the current trace buffer.
   * Uses the retention policy's slowThresholdMs for slow count.
   *
   * @returns Computed trace statistics
   */
  getStats(): TraceStats {
    // Apply time-based expiry before computing stats
    this.applyTimeExpiry();

    const totalResolutions = this.storedTraces.length;

    if (totalResolutions === 0) {
      return {
        totalResolutions: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        slowCount: 0,
        sessionStart: this.sessionStart,
        totalDuration: 0,
      };
    }

    let totalDuration = 0;
    let cacheHitCount = 0;
    let slowCount = 0;

    for (const { entry: trace } of this.storedTraces) {
      totalDuration += trace.duration;
      if (trace.isCacheHit) {
        cacheHitCount++;
      }
      if (trace.duration >= this.retentionPolicy.slowThresholdMs) {
        slowCount++;
      }
    }

    return {
      totalResolutions,
      averageDuration: totalDuration / totalResolutions,
      cacheHitRate: cacheHitCount / totalResolutions,
      slowCount,
      sessionStart: this.sessionStart,
      totalDuration,
    };
  }

  /**
   * Clears all collected traces.
   *
   * Does not affect subscriptions or session start time.
   */
  clear(): void {
    this.storedTraces.length = 0;
  }

  /**
   * Subscribes to new trace entries in real-time.
   *
   * The callback is invoked synchronously when each new trace is collected.
   * Returns an unsubscribe function to stop receiving notifications.
   *
   * @param callback - Function called with each new trace entry
   * @returns Unsubscribe function
   */
  subscribe(callback: TraceSubscriber): Unsubscribe {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Returns the current retention policy.
   *
   * Useful for external inspection of eviction configuration.
   */
  getRetentionPolicy(): TraceRetentionPolicy {
    return this.retentionPolicy;
  }

  /**
   * Manually pins a trace to protect it from FIFO eviction.
   *
   * Pinned traces are only subject to:
   * - maxPinnedTraces limit (oldest pinned dropped when exceeded)
   * - Manual unpinning via unpin()
   *
   * @param traceId - ID of the trace to pin
   */
  pin(traceId: string): void {
    const stored = this.storedTraces.find((st) => st.entry.id === traceId);
    if (stored && !stored.entry.isPinned) {
      stored.entry = { ...stored.entry, isPinned: true };
      // Enforce pinned limit after manual pinning
      this.enforcePinnedLimit();
    }
  }

  /**
   * Unpins a trace, making it eligible for FIFO eviction and time expiry.
   *
   * @param traceId - ID of the trace to unpin
   */
  unpin(traceId: string): void {
    const stored = this.storedTraces.find((st) => st.entry.id === traceId);
    if (stored && stored.entry.isPinned) {
      stored.entry = { ...stored.entry, isPinned: false };
    }
  }

  /**
   * Applies auto-pinning for slow traces.
   *
   * Traces with duration >= slowThresholdMs are automatically pinned.
   *
   * @param entry - Original trace entry
   * @returns Entry with isPinned set appropriately
   */
  private applyAutoPinning(entry: TraceEntry): TraceEntry {
    if (entry.duration >= this.retentionPolicy.slowThresholdMs) {
      return { ...entry, isPinned: true };
    }
    return entry;
  }

  /**
   * Enforces the maxPinnedTraces limit.
   *
   * When the number of pinned traces exceeds maxPinnedTraces,
   * the oldest pinned traces are dropped (converted to unpinned and
   * immediately evicted if over maxTraces limit).
   */
  private enforcePinnedLimit(): void {
    const { maxPinnedTraces } = this.retentionPolicy;

    // Find indices of all pinned traces (in order)
    const pinnedIndices: number[] = [];
    for (let i = 0; i < this.storedTraces.length; i++) {
      const trace = this.storedTraces[i];
      if (trace !== undefined && trace.entry.isPinned) {
        pinnedIndices.push(i);
      }
    }

    // If over limit, drop oldest pinned traces
    const excess = pinnedIndices.length - maxPinnedTraces;
    if (excess > 0) {
      // Remove oldest pinned traces (lower indices = older traces)
      // Process in reverse order to maintain correct indices during removal
      const indicesToRemove = pinnedIndices.slice(0, excess);
      for (let i = indicesToRemove.length - 1; i >= 0; i--) {
        const indexToRemove = indicesToRemove[i];
        if (indexToRemove !== undefined) {
          this.storedTraces.splice(indexToRemove, 1);
        }
      }
    }
  }

  /**
   * Enforces the maxTraces limit using FIFO eviction.
   *
   * When the total number of traces exceeds maxTraces,
   * the oldest non-pinned traces are dropped first.
   */
  private enforceFIFOLimit(): void {
    const { maxTraces } = this.retentionPolicy;

    while (this.storedTraces.length > maxTraces) {
      // Find the oldest non-pinned trace
      const indexToRemove = this.storedTraces.findIndex((st) => !st.entry.isPinned);

      if (indexToRemove === -1) {
        // All traces are pinned, cannot evict via FIFO
        // This is handled by enforcePinnedLimit
        break;
      }

      this.storedTraces.splice(indexToRemove, 1);
    }
  }

  /**
   * Applies time-based expiry to non-pinned traces.
   *
   * Removes traces that are older than expiryMs and not pinned.
   * Called during getTraces() and getStats() to clean up expired traces.
   */
  private applyTimeExpiry(): void {
    const now = Date.now();
    const { expiryMs } = this.retentionPolicy;

    // Remove expired non-pinned traces
    // Iterate backwards to safely remove during iteration
    for (let i = this.storedTraces.length - 1; i >= 0; i--) {
      const stored = this.storedTraces[i];
      if (stored === undefined) {
        continue;
      }
      const age = now - stored.collectedAt;

      if (age > expiryMs && !stored.entry.isPinned) {
        this.storedTraces.splice(i, 1);
      }
    }
  }

  /**
   * Checks if a trace matches all filter criteria.
   *
   * @param trace - Trace entry to check
   * @param filter - Filter criteria
   * @returns True if trace matches all criteria
   */
  private matchesFilter(trace: TraceEntry, filter: TraceFilter): boolean {
    // Port name filter (case-insensitive partial match)
    if (filter.portName !== undefined) {
      const searchTerm = filter.portName.toLowerCase();
      const portName = trace.portName.toLowerCase();
      if (!portName.includes(searchTerm)) {
        return false;
      }
    }

    // Lifetime filter (exact match)
    if (filter.lifetime !== undefined && trace.lifetime !== filter.lifetime) {
      return false;
    }

    // Cache hit filter (exact match)
    if (filter.isCacheHit !== undefined && trace.isCacheHit !== filter.isCacheHit) {
      return false;
    }

    // Min duration filter (inclusive)
    if (filter.minDuration !== undefined && trace.duration < filter.minDuration) {
      return false;
    }

    // Max duration filter (inclusive)
    if (filter.maxDuration !== undefined && trace.duration > filter.maxDuration) {
      return false;
    }

    // Scope ID filter (exact match, including null)
    if (filter.scopeId !== undefined && trace.scopeId !== filter.scopeId) {
      return false;
    }

    // Pinned filter (exact match)
    if (filter.isPinned !== undefined && trace.isPinned !== filter.isPinned) {
      return false;
    }

    return true;
  }

  /**
   * Notifies all subscribers of a new trace entry.
   *
   * @param entry - The new trace entry
   */
  private notifySubscribers(entry: TraceEntry): void {
    for (const subscriber of this.subscribers) {
      subscriber(entry);
    }
  }
}
