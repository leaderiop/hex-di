/**
 * Type definitions for Resolution Tracing in @hex-di/devtools.
 *
 * This module defines the core types used for capturing and analyzing
 * dependency injection resolution timing, hierarchy, and statistics.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/graph";

// =============================================================================
// Trace Entry Types
// =============================================================================

/**
 * Represents a single resolution trace entry.
 *
 * Each TraceEntry captures comprehensive data about one service resolution,
 * including timing information, cache status, and dependency hierarchy.
 * Entries form a tree structure through parentTraceId/childTraceIds relationships.
 *
 * @remarks
 * - `id` is unique per trace entry (format: "trace-{counter}")
 * - `startTime` and `duration` use high-resolution performance.now() values
 * - `parentTraceId`/`childTraceIds` establish the dependency resolution tree
 * - `order` provides global ordering across all resolutions in a session
 * - `isPinned` protects slow traces from FIFO eviction
 * - All properties are readonly to enforce immutability
 *
 * @example Basic trace entry
 * ```typescript
 * const entry: TraceEntry = {
 *   id: "trace-1",
 *   portName: "UserService",
 *   lifetime: "scoped",
 *   startTime: 1234.567,
 *   duration: 25.3,
 *   isCacheHit: false,
 *   parentTraceId: null,
 *   childTraceIds: ["trace-2", "trace-3"],
 *   scopeId: "scope-1",
 *   order: 1,
 *   isPinned: false,
 * };
 * ```
 *
 * @example Nested resolution (child trace)
 * ```typescript
 * const childEntry: TraceEntry = {
 *   id: "trace-2",
 *   portName: "Logger",
 *   lifetime: "singleton",
 *   startTime: 1240.0,
 *   duration: 5.2,
 *   isCacheHit: true,  // Served from singleton cache
 *   parentTraceId: "trace-1",  // Part of UserService resolution
 *   childTraceIds: [],
 *   scopeId: "scope-1",
 *   order: 2,
 *   isPinned: false,
 * };
 * ```
 */
export interface TraceEntry {
  /**
   * Unique identifier for this trace entry.
   * Format: "trace-{incrementing counter}"
   */
  readonly id: string;

  /**
   * Name of the port being resolved.
   * Corresponds to the port token's name property.
   */
  readonly portName: string;

  /**
   * Service lifetime of the resolved adapter.
   * Determines caching behavior and scope affinity.
   */
  readonly lifetime: Lifetime;

  /**
   * High-resolution timestamp when resolution started.
   * Value from performance.now() for sub-millisecond precision.
   */
  readonly startTime: number;

  /**
   * Duration of the resolution in milliseconds.
   * Includes time spent resolving child dependencies.
   */
  readonly duration: number;

  /**
   * Whether this resolution was served from cache.
   * True for singleton (after first resolve) and scoped (within same scope) services.
   */
  readonly isCacheHit: boolean;

  /**
   * ID of the parent trace entry, or null for root resolutions.
   * Establishes the dependency chain: this service was resolved as a dependency of parent.
   */
  readonly parentTraceId: string | null;

  /**
   * IDs of child trace entries.
   * Services that were resolved as dependencies of this service.
   */
  readonly childTraceIds: readonly string[];

  /**
   * ID of the scope where resolution occurred, or null for container-level.
   * Matches the scope ID from ScopeInternalState.
   */
  readonly scopeId: string | null;

  /**
   * Global resolution order counter.
   * Increments for each new resolution across all scopes in the session.
   */
  readonly order: number;

  /**
   * Whether this trace is pinned (protected from FIFO eviction).
   * Slow traces (exceeding slowThresholdMs) are auto-pinned.
   * Can also be manually pinned/unpinned via API.
   */
  readonly isPinned: boolean;
}

// =============================================================================
// Trace Retention Policy Types
// =============================================================================

/**
 * Configuration for trace buffer retention and eviction policy.
 *
 * Controls how many traces are kept in memory, when slow traces are pinned,
 * and when old traces expire. All values have sensible defaults aligned
 * with the specification.
 *
 * @remarks
 * - FIFO eviction removes oldest non-pinned traces when maxTraces is exceeded
 * - Slow traces (duration >= slowThresholdMs) are auto-pinned
 * - Pinned traces have their own limit (maxPinnedTraces)
 * - Time expiry (expiryMs) applies to non-pinned traces only
 *
 * @example Default policy values
 * ```typescript
 * const defaultPolicy: TraceRetentionPolicy = {
 *   maxTraces: 1000,
 *   maxPinnedTraces: 100,
 *   slowThresholdMs: 100,
 *   expiryMs: 300000,  // 5 minutes
 * };
 * ```
 *
 * @example Custom policy for high-traffic application
 * ```typescript
 * const highTrafficPolicy: TraceRetentionPolicy = {
 *   maxTraces: 5000,
 *   maxPinnedTraces: 500,
 *   slowThresholdMs: 50,  // More aggressive slow detection
 *   expiryMs: 60000,      // 1 minute expiry
 * };
 * ```
 */
export interface TraceRetentionPolicy {
  /**
   * Maximum number of traces to retain in the buffer.
   * Oldest non-pinned traces are evicted when limit is exceeded.
   * @default 1000
   */
  readonly maxTraces: number;

  /**
   * Maximum number of pinned (slow) traces to retain.
   * Oldest pinned traces are evicted when this limit is exceeded.
   * @default 100
   */
  readonly maxPinnedTraces: number;

  /**
   * Duration threshold in milliseconds for auto-pinning slow traces.
   * Traces with duration >= this value are automatically pinned.
   * @default 100
   */
  readonly slowThresholdMs: number;

  /**
   * Time in milliseconds after which non-pinned traces expire.
   * Expired traces are removed on next getTraces() call.
   * @default 300000 (5 minutes)
   */
  readonly expiryMs: number;
}

/**
 * Default trace retention policy values.
 *
 * These defaults align with the specification requirements:
 * - maxTraces: 1000 traces with FIFO eviction
 * - maxPinnedTraces: 100 slow traces protected from eviction
 * - slowThresholdMs: 100ms threshold for auto-pinning
 * - expiryMs: 5 minutes (300000ms) for non-pinned trace expiry
 */
export const DEFAULT_RETENTION_POLICY: TraceRetentionPolicy = {
  maxTraces: 1000,
  maxPinnedTraces: 100,
  slowThresholdMs: 100,
  expiryMs: 300000,
} as const;

// =============================================================================
// Trace Statistics Types
// =============================================================================

/**
 * Aggregate statistics computed from trace entries.
 *
 * Provides high-level metrics for performance analysis and monitoring.
 * Statistics are lazily computed on demand, not updated on every trace.
 *
 * @remarks
 * - `cacheHitRate` is a ratio from 0 to 1 (multiply by 100 for percentage)
 * - `slowCount` uses the configured slowThresholdMs for classification
 * - `sessionStart` marks when tracing began (first trace or container creation)
 * - All properties are readonly to enforce immutability
 *
 * @example Interpreting trace statistics
 * ```typescript
 * const stats: TraceStats = {
 *   totalResolutions: 150,
 *   averageDuration: 25.5,
 *   cacheHitRate: 0.65,    // 65% cache hit rate
 *   slowCount: 12,         // 12 resolutions exceeded threshold
 *   sessionStart: 1702500000000,
 *   totalDuration: 3825,   // Total ms spent resolving
 * };
 *
 * console.log(`Cache efficiency: ${stats.cacheHitRate * 100}%`);
 * console.log(`Slow resolutions: ${stats.slowCount}/${stats.totalResolutions}`);
 * ```
 */
export interface TraceStats {
  /**
   * Total number of resolution traces recorded.
   * Includes both fresh resolutions and cache hits.
   */
  readonly totalResolutions: number;

  /**
   * Average resolution duration in milliseconds.
   * Computed as totalDuration / totalResolutions.
   * Returns 0 when totalResolutions is 0.
   */
  readonly averageDuration: number;

  /**
   * Ratio of cache hits to total resolutions (0 to 1).
   * Computed as cacheHitCount / totalResolutions.
   * Returns 0 when totalResolutions is 0.
   */
  readonly cacheHitRate: number;

  /**
   * Number of resolutions that exceeded slowThresholdMs.
   * These traces are auto-pinned and protected from FIFO eviction.
   */
  readonly slowCount: number;

  /**
   * Timestamp when the tracing session started.
   * Uses Date.now() epoch milliseconds for session tracking.
   */
  readonly sessionStart: number;

  /**
   * Total cumulative duration of all resolutions in milliseconds.
   * Sum of all trace entry durations.
   */
  readonly totalDuration: number;
}

// =============================================================================
// Trace Filter Types
// =============================================================================

/**
 * Filter criteria for querying trace entries.
 *
 * All properties are optional; multiple criteria are ANDed together.
 * Used with getTraces() to retrieve filtered subsets of trace data.
 *
 * @remarks
 * - String filters (portName) support partial matching
 * - Duration filters (minDuration, maxDuration) are inclusive bounds
 * - Multiple filters narrow the result set (intersection, not union)
 *
 * @example Filter by lifetime and performance
 * ```typescript
 * const slowScopedFilter: TraceFilter = {
 *   lifetime: "scoped",
 *   minDuration: 50,
 * };
 * ```
 *
 * @example Filter for cache misses
 * ```typescript
 * const cacheMissFilter: TraceFilter = {
 *   isCacheHit: false,
 * };
 * ```
 */
export interface TraceFilter {
  /**
   * Filter by port name (partial match, case-insensitive).
   * Matches traces where portName contains this substring.
   */
  readonly portName?: string;

  /**
   * Filter by service lifetime.
   * Matches traces with exactly this lifetime value.
   */
  readonly lifetime?: Lifetime;

  /**
   * Filter by cache hit status.
   * True for cached resolutions, false for fresh resolutions.
   */
  readonly isCacheHit?: boolean;

  /**
   * Minimum duration in milliseconds (inclusive).
   * Matches traces with duration >= this value.
   */
  readonly minDuration?: number;

  /**
   * Maximum duration in milliseconds (inclusive).
   * Matches traces with duration <= this value.
   */
  readonly maxDuration?: number;

  /**
   * Filter by scope ID.
   * Matches traces from this specific scope.
   * Use null to match container-level resolutions.
   */
  readonly scopeId?: string | null;

  /**
   * Filter by pinned status.
   * True for pinned traces, false for non-pinned.
   */
  readonly isPinned?: boolean;
}

// =============================================================================
// Tracing Options Types
// =============================================================================

/**
 * Configuration options for createTracingContainer().
 *
 * All options are optional with sensible defaults.
 * The collector option is defined in Task Group 2 (TraceCollector).
 *
 * @remarks
 * - retentionPolicy accepts partial configuration; missing values use defaults
 * - collector option will be added in Task Group 2
 *
 * @example With partial retention policy
 * ```typescript
 * const options: TracingOptions = {
 *   retentionPolicy: {
 *     maxTraces: 5000,      // Override default
 *     slowThresholdMs: 50,  // Override default
 *     // maxPinnedTraces and expiryMs use defaults
 *   },
 * };
 * ```
 */
export interface TracingOptions {
  /**
   * Custom retention policy configuration.
   * Missing properties use values from DEFAULT_RETENTION_POLICY.
   */
  readonly retentionPolicy?: Partial<TraceRetentionPolicy>;

  // Note: collector option will be added in Task Group 2
  // readonly collector?: TraceCollector;
}

// =============================================================================
// Tracing Access Types
// =============================================================================

/**
 * API exposed via TRACING_ACCESS Symbol on tracing-enabled containers.
 *
 * Provides methods for retrieving trace data, statistics, and controlling
 * the recording state. All methods return frozen/immutable data.
 *
 * @remarks
 * - getTraces() returns a frozen array of TraceEntry objects
 * - getStats() returns a frozen TraceStats object (lazily computed)
 * - subscribe() returns an unsubscribe function
 * - All data is immutable; modifications require new traces
 *
 * @example Using the tracing API
 * ```typescript
 * const tracingAPI = container[TRACING_ACCESS];
 *
 * // Get all traces
 * const allTraces = tracingAPI.getTraces();
 *
 * // Get filtered traces
 * const slowTraces = tracingAPI.getTraces({ minDuration: 100 });
 *
 * // Get aggregate statistics
 * const stats = tracingAPI.getStats();
 *
 * // Control recording
 * tracingAPI.pause();
 * // ... perform operations without tracing overhead
 * tracingAPI.resume();
 *
 * // Subscribe to new traces
 * const unsubscribe = tracingAPI.subscribe((entry) => {
 *   console.log(`Resolved ${entry.portName} in ${entry.duration}ms`);
 * });
 * ```
 */
export interface TracingAPI {
  /**
   * Retrieves trace entries, optionally filtered.
   *
   * @param filter - Optional filter criteria (all properties ANDed)
   * @returns Frozen array of matching TraceEntry objects
   */
  getTraces(filter?: TraceFilter): readonly TraceEntry[];

  /**
   * Computes and returns aggregate trace statistics.
   *
   * Statistics are lazily computed on each call, reflecting
   * current trace buffer state.
   *
   * @returns Frozen TraceStats object
   */
  getStats(): TraceStats;

  /**
   * Pauses trace recording.
   *
   * When paused, resolve() calls are not traced, providing zero overhead.
   * The paused state persists until resume() is called.
   */
  pause(): void;

  /**
   * Resumes trace recording after pause().
   *
   * New resolutions will be traced after resuming.
   */
  resume(): void;

  /**
   * Clears all traces from the buffer.
   *
   * Resets the trace buffer and statistics.
   * Does not affect the recording state (paused/resumed).
   */
  clear(): void;

  /**
   * Subscribes to new trace entries in real-time.
   *
   * The callback is invoked synchronously when each new trace is recorded.
   * Returns an unsubscribe function to stop receiving updates.
   *
   * @param callback - Function called with each new TraceEntry
   * @returns Unsubscribe function
   */
  subscribe(callback: (entry: TraceEntry) => void): () => void;

  /**
   * Returns whether tracing is currently paused.
   *
   * @returns True if paused, false if recording
   */
  isPaused(): boolean;

  /**
   * Manually pins a trace to protect it from FIFO eviction.
   *
   * @param traceId - ID of the trace to pin
   */
  pin(traceId: string): void;

  /**
   * Unpins a trace, making it eligible for FIFO eviction.
   *
   * @param traceId - ID of the trace to unpin
   */
  unpin(traceId: string): void;
}

/**
 * Type guard to check if an object has tracing capabilities.
 *
 * @param container - Object to check
 * @returns True if container has TRACING_ACCESS Symbol
 *
 * @example
 * ```typescript
 * import { TRACING_ACCESS } from '@hex-di/runtime';
 *
 * function logStats(container: unknown) {
 *   if (hasTracingAccess(container)) {
 *     const api = container[TRACING_ACCESS];
 *     console.log('Cache hit rate:', api.getStats().cacheHitRate);
 *   }
 * }
 * ```
 */
export function hasTracingAccess(
  container: unknown
): container is { [key: symbol]: TracingAPI } {
  return (
    typeof container === "object" &&
    container !== null &&
    Symbol.for("hex-di/tracing-access") in container
  );
}
