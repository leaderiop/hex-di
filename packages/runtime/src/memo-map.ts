/**
 * MemoMap - Internal instance caching for scope/container management.
 *
 * This internal class manages instance caching with:
 * - Port-keyed Map for O(1) lookup
 * - Creation order tracking for LIFO disposal
 * - Parent chain for singleton inheritance in scopes
 * - Finalizer support for resource cleanup
 *
 * @internal This class is not exported from the package - it's an implementation detail.
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";

// =============================================================================
// Types
// =============================================================================

/**
 * Entry tracking creation order and optional finalizer for disposal.
 * @internal
 */
interface CreationEntry {
  /** The port used as cache key */
  readonly port: Port<unknown, string>;
  /** Optional cleanup function called during disposal */
  readonly finalizer: ((instance: unknown) => void | Promise<void>) | undefined;
  /** Timestamp when the instance was resolved (captured via Date.now()) */
  readonly resolvedAt: number;
  /** Sequential order in which this entry was resolved within this MemoMap */
  readonly resolutionOrder: number;
}

/**
 * Metadata about a cached entry for inspection purposes.
 * @internal
 */
export interface EntryMetadata {
  /** Timestamp when the instance was resolved (captured via Date.now()) */
  readonly resolvedAt: number;
  /** Sequential order in which this entry was resolved within this MemoMap */
  readonly resolutionOrder: number;
}

// =============================================================================
// MemoMap Class
// =============================================================================

/**
 * Internal class for managing instance caching with LIFO disposal ordering.
 *
 * MemoMap provides:
 * - Lazy instantiation via getOrElseMemoize
 * - Parent chain lookup for singleton inheritance
 * - Creation order tracking for LIFO disposal
 * - Error aggregation during disposal
 *
 * @internal This class is an implementation detail and should not be exported.
 *
 * @example Internal usage (for container implementation)
 * ```typescript
 * const singletonMemo = new MemoMap();
 *
 * // Cache singleton instance
 * const logger = singletonMemo.getOrElseMemoize(
 *   LoggerPort,
 *   () => new ConsoleLogger(),
 *   (instance) => instance.flush()
 * );
 *
 * // Create child for scope
 * const scopedMemo = singletonMemo.fork();
 *
 * // Dispose in LIFO order
 * await scopedMemo.dispose();
 * await singletonMemo.dispose();
 * ```
 */
export class MemoMap {
  /**
   * Cache storing port -> instance mappings.
   * Uses port reference as key for O(1) lookup.
   */
  private readonly cache: Map<Port<unknown, string>, unknown> = new Map();

  /**
   * Tracks creation order for LIFO disposal.
   * Each entry contains the port and optional finalizer.
   */
  private readonly creationOrder: CreationEntry[] = [];

  /**
   * Optional parent MemoMap for singleton inheritance.
   * When set, parent cache is checked before own cache during lookup.
   */
  private readonly parent: MemoMap | undefined;

  /**
   * Flag indicating whether this MemoMap has been disposed.
   * Once disposed, the cache is cleared and should not be used.
   */
  private disposed: boolean = false;

  /**
   * Counter for tracking resolution order.
   * Incremented on each successful memoization within this MemoMap.
   */
  private resolutionCounter: number = 0;

  /**
   * Creates a new MemoMap instance.
   *
   * @param parent - Optional parent MemoMap for singleton inheritance.
   *   When provided, parent cache is checked first during getOrElseMemoize.
   */
  constructor(parent?: MemoMap) {
    this.parent = parent;
  }

  /**
   * Gets a cached instance or creates and caches a new one.
   *
   * Lookup order:
   * 1. Check parent cache (if parent exists) - for singleton inheritance
   * 2. Check own cache
   * 3. Call factory, cache result, and track creation order
   *
   * @typeParam T - The service type
   * @param port - The port to use as cache key
   * @param factory - Function to create the instance if not cached
   * @param finalizer - Optional cleanup function called during disposal
   * @returns The cached or newly created instance
   *
   * @example
   * ```typescript
   * const logger = memoMap.getOrElseMemoize(
   *   LoggerPort,
   *   () => new ConsoleLogger(),
   *   (instance) => instance.close()
   * );
   * ```
   */
  getOrElseMemoize<T>(
    port: Port<T, string>,
    factory: () => T,
    finalizer?: (instance: T) => void | Promise<void>
  ): T {
    // Check parent cache first (for singleton inheritance)
    if (this.parent !== undefined && this.parent.has(port)) {
      return this.parent.getOrElseMemoize(port, factory, finalizer);
    }

    // Check own cache
    if (this.cache.has(port)) {
      return this.cache.get(port) as T;
    }

    // Create new instance
    const instance = factory();

    // Cache the instance
    this.cache.set(port, instance);

    // Track creation order with finalizer and metadata (cast finalizer to unknown handler)
    this.creationOrder.push({
      port,
      finalizer: finalizer as ((instance: unknown) => void | Promise<void>) | undefined,
      resolvedAt: Date.now(),
      resolutionOrder: this.resolutionCounter++,
    });

    return instance;
  }

  /**
   * Checks if a port has a cached instance.
   *
   * Checks both own cache and parent cache (if parent exists).
   *
   * @param port - The port to check
   * @returns True if the port has a cached instance
   *
   * @example
   * ```typescript
   * if (memoMap.has(LoggerPort)) {
   *   // Instance exists in cache
   * }
   * ```
   */
  has(port: Port<unknown, string>): boolean {
    // Check own cache first
    if (this.cache.has(port)) {
      return true;
    }

    // Check parent cache if exists
    if (this.parent !== undefined) {
      return this.parent.has(port);
    }

    return false;
  }

  /**
   * Iterates all cached entries in this MemoMap with their metadata.
   *
   * Yields entries in creation order (not including parent entries).
   * Each entry includes the port and metadata about when/how it was resolved.
   *
   * @returns An iterable of [port, metadata] tuples
   *
   * @example
   * ```typescript
   * for (const [port, metadata] of memoMap.entries()) {
   *   console.log(`${port.name} resolved at ${metadata.resolvedAt}`);
   * }
   * ```
   */
  *entries(): Iterable<[Port<unknown, string>, EntryMetadata]> {
    for (const entry of this.creationOrder) {
      yield [
        entry.port,
        {
          resolvedAt: entry.resolvedAt,
          resolutionOrder: entry.resolutionOrder,
        },
      ];
    }
  }

  /**
   * Creates a child MemoMap with this instance as parent.
   *
   * The child:
   * - Has its own empty cache
   * - Can see parent's cached instances via getOrElseMemoize
   * - Tracks its own creation order independently
   *
   * @returns A new MemoMap with this as parent
   *
   * @example
   * ```typescript
   * const parentMemo = new MemoMap();
   * const childMemo = parentMemo.fork();
   *
   * // Child inherits parent's singletons
   * // but tracks scoped instances separately
   * ```
   */
  fork(): MemoMap {
    return new MemoMap(this);
  }

  /**
   * Disposes all cached instances in LIFO order.
   *
   * Disposal process:
   * 1. Sets disposed flag
   * 2. Iterates creationOrder in reverse (LIFO)
   * 3. Calls each finalizer, catching and aggregating errors
   * 4. Clears the cache
   * 5. Throws AggregateError if any finalizers failed
   *
   * @returns Promise that resolves when disposal is complete
   * @throws {AggregateError} If one or more finalizers threw errors
   *
   * @example
   * ```typescript
   * try {
   *   await memoMap.dispose();
   * } catch (error) {
   *   if (error instanceof AggregateError) {
   *     console.log(`${error.errors.length} finalizers failed`);
   *   }
   * }
   * ```
   */
  async dispose(): Promise<void> {
    // Mark as disposed early to prevent new entries
    this.disposed = true;

    const errors: unknown[] = [];

    // Iterate in reverse order (LIFO - last created first disposed)
    for (let i = this.creationOrder.length - 1; i >= 0; i--) {
      const entry = this.creationOrder[i];

      // With noUncheckedIndexedAccess, entry can be undefined
      if (entry !== undefined && entry.finalizer !== undefined) {
        const instance = this.cache.get(entry.port);

        try {
          // Await the finalizer (handles both sync and async)
          await entry.finalizer(instance);
        } catch (error) {
          // Collect error but continue disposing
          errors.push(error);
        }
      }
    }

    // Clear cache after disposal
    this.cache.clear();

    // Throw aggregated errors if any
    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `${errors.length} finalizer(s) failed during disposal`
      );
    }
  }

  /**
   * Returns whether this MemoMap has been disposed.
   *
   * @returns True if dispose() has been called
   *
   * @example
   * ```typescript
   * if (memoMap.isDisposed) {
   *   throw new Error('Cannot use disposed MemoMap');
   * }
   * ```
   */
  get isDisposed(): boolean {
    return this.disposed;
  }
}
