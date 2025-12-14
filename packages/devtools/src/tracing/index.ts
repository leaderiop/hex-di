/**
 * Resolution Tracing for @hex-di/devtools.
 *
 * This module provides types and utilities for capturing and analyzing
 * dependency injection resolution timing, hierarchy, and statistics.
 *
 * ## Key Features
 *
 * - **TraceEntry**: Captures timing, cache status, and hierarchy for each resolution
 * - **TraceStats**: Aggregate statistics (total resolutions, cache hit rate, slow count)
 * - **TraceRetentionPolicy**: Configurable limits and eviction policy
 * - **TracingAPI**: Interface for accessing trace data via TRACING_ACCESS Symbol
 *
 * ## Quick Start
 *
 * @example Accessing tracing data
 * ```typescript
 * import { TRACING_ACCESS } from '@hex-di/runtime';
 * import { createTracingContainer } from '@hex-di/devtools/tracing';
 *
 * const tracingContainer = createTracingContainer(container);
 * const api = tracingContainer[TRACING_ACCESS];
 *
 * // Get all traces
 * const traces = api.getTraces();
 *
 * // Get statistics
 * const stats = api.getStats();
 * console.log(`Cache hit rate: ${stats.cacheHitRate * 100}%`);
 *
 * // Subscribe to new traces
 * const unsubscribe = api.subscribe((entry) => {
 *   if (entry.duration > 100) {
 *     console.warn(`Slow resolution: ${entry.portName} (${entry.duration}ms)`);
 *   }
 * });
 * ```
 *
 * @packageDocumentation
 */

// =============================================================================
// Type Exports
// =============================================================================

/**
 * Core tracing types.
 *
 * @see {@link TraceEntry} - Individual trace entry data
 * @see {@link TraceStats} - Aggregate statistics
 * @see {@link TraceRetentionPolicy} - Eviction and retention configuration
 * @see {@link TraceFilter} - Filter criteria for trace queries
 * @see {@link TracingOptions} - Configuration for createTracingContainer
 * @see {@link TracingAPI} - API interface via TRACING_ACCESS Symbol
 */
export type {
  TraceEntry,
  TraceStats,
  TraceRetentionPolicy,
  TraceFilter,
  TracingOptions,
  TracingAPI,
} from "./types.js";

/**
 * Default retention policy values.
 *
 * @see {@link DEFAULT_RETENTION_POLICY} - Default values for TraceRetentionPolicy
 */
export { DEFAULT_RETENTION_POLICY, hasTracingAccess } from "./types.js";

// =============================================================================
// Collector Exports
// =============================================================================

/**
 * TraceCollector strategy pattern interface and types.
 *
 * @see {@link TraceCollector} - Strategy interface for trace collection
 * @see {@link TraceSubscriber} - Callback type for subscriptions
 * @see {@link Unsubscribe} - Unsubscribe function type
 */
export type {
  TraceCollector,
  TraceSubscriber,
  Unsubscribe,
} from "./collector.js";

/**
 * Collector implementations.
 *
 * @see {@link MemoryCollector} - In-memory storage with filtering
 * @see {@link NoOpCollector} - Zero overhead disabled collector
 * @see {@link CompositeCollector} - Delegates to multiple collectors
 */
export { MemoryCollector } from "./memory-collector.js";
export { NoOpCollector } from "./noop-collector.js";
export { CompositeCollector } from "./composite-collector.js";

// =============================================================================
// TracingContainer Exports
// =============================================================================

/**
 * TracingContainer factory and types.
 *
 * @see {@link createTracingContainer} - Factory to wrap container with tracing
 * @see {@link TracingContainer} - Container type with TRACING_ACCESS
 * @see {@link TracingContainerOptions} - Configuration options
 */
export {
  createTracingContainer,
  type TracingContainer,
  type TracingContainerOptions,
} from "./tracing-container.js";
