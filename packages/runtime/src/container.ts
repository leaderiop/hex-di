/**
 * Container implementation for @hex-di/runtime.
 *
 * Provides the createContainer factory function that creates immutable
 * containers from validated graphs. Containers provide type-safe service
 * resolution with lifetime management and circular dependency detection.
 *
 * @packageDocumentation
 */

import type { Port, InferService, InferPortName } from "@hex-di/ports";
import type { Graph, Adapter, Lifetime } from "@hex-di/graph";
import { ContainerBrand, ScopeBrand } from "./types.js";
import type { Container, Scope } from "./types.js";
import type {
  ContainerInternalState,
  ScopeInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
  AdapterInfo,
} from "./inspector-types.js";
import { MemoMap } from "./memo-map.js";
import { ResolutionContext } from "./resolution-context.js";
import { INTERNAL_ACCESS } from "./inspector-symbols.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  FactoryError,
} from "./errors.js";

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal adapter type with runtime-accessible properties.
 * @internal
 */
type RuntimeAdapter = Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>;

// =============================================================================
// Scope ID Generation
// =============================================================================

/**
 * Module-level counter for generating unique scope IDs.
 * Incremented on each scope creation to ensure uniqueness.
 * @internal
 */
let scopeIdCounter = 0;

/**
 * Generates a unique scope ID.
 * @returns A unique scope ID in the format "scope-{number}"
 * @internal
 */
function generateScopeId(): string {
  return `scope-${scopeIdCounter++}`;
}

// =============================================================================
// ScopeImpl Class (Task Group 8: Scope Hierarchy)
// =============================================================================

/**
 * Internal Scope implementation class.
 *
 * Manages scope-level service resolution with:
 * - Singleton inheritance from root container (shared reference)
 * - Scoped instance isolation (unique per scope, not shared with parent/siblings)
 * - Child scope tracking for cascade disposal
 * - LIFO disposal ordering via MemoMap
 *
 * @internal
 */
class ScopeImpl<TProvides extends Port<unknown, string>> {
  /**
   * Unique identifier for this scope.
   * Generated at construction time using the module-level counter.
   */
  readonly id: string;

  /**
   * Reference to the root container for adapter lookup and singleton resolution.
   */
  private readonly container: ContainerImpl<TProvides>;

  /**
   * MemoMap for caching scoped instances.
   * Forked from container's singleton memo to inherit singletons but not scoped.
   */
  private readonly scopedMemo: MemoMap;

  /**
   * Flag indicating whether this scope has been disposed.
   */
  private disposed: boolean = false;

  /**
   * Set of child scopes created from this scope.
   * Used for cascade disposal - children must be disposed before parent.
   */
  private readonly childScopes: Set<ScopeImpl<TProvides>> = new Set();

  /**
   * Reference to parent scope (if this is a nested scope).
   * Used to remove self from parent's childScopes on disposal.
   */
  private readonly parentScope: ScopeImpl<TProvides> | null;

  /**
   * Creates a new ScopeImpl instance.
   *
   * @param container - Reference to the root container for resolution logic
   * @param singletonMemo - The container's singleton memo (for forking)
   * @param parentScope - The parent scope (null for scopes created directly from container)
   */
  constructor(
    container: ContainerImpl<TProvides>,
    singletonMemo: MemoMap,
    parentScope: ScopeImpl<TProvides> | null = null
  ) {
    this.id = generateScopeId();
    this.container = container;
    // Fork from singleton memo to inherit singletons but have fresh scoped cache
    // Note: Each scope forks from singleton memo, NOT from parent scope's memo
    // This ensures scoped instances are NOT shared between parent and child scopes
    this.scopedMemo = singletonMemo.fork();
    this.parentScope = parentScope;
  }

  /**
   * Resolves a service instance for the given port within this scope.
   *
   * Lifetime handling:
   * - singleton: Delegates to container's singleton memo (shared globally)
   * - scoped: Uses this scope's scopedMemo (unique to this scope)
   * - request: Creates new instance (no caching)
   *
   * @param port - The port to resolve
   * @returns The service instance
   * @throws DisposedScopeError if scope is disposed
   */
  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    return this.container.resolveInternal(port, this.scopedMemo);
  }

  /**
   * Creates a child scope from this scope.
   *
   * The child scope:
   * - Shares singletons with container (and all other scopes)
   * - Has its own scoped instance cache (NOT shared with this scope)
   * - Is tracked for cascade disposal
   *
   * @returns A frozen Scope interface wrapping the child ScopeImpl
   */
  createScope(): Scope<TProvides> {
    // Child scope forks from container's singleton memo, NOT this scope's scopedMemo
    // This ensures scoped instances are isolated per scope
    const child = new ScopeImpl(
      this.container,
      this.container.getSingletonMemo(),
      this
    );
    this.childScopes.add(child);
    return createScopeWrapper(child);
  }

  /**
   * Disposes this scope and all its resources.
   *
   * Disposal order:
   * 1. Mark as disposed (prevents new resolutions)
   * 2. Dispose all child scopes recursively (cascade)
   * 3. Dispose scopedMemo (LIFO finalizer calls)
   * 4. Remove self from parent's childScopes tracking
   *
   * @returns Promise that resolves when disposal is complete
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose all child scopes first (cascade disposal)
    for (const child of this.childScopes) {
      await child.dispose();
    }
    this.childScopes.clear();

    // Dispose scoped instances in LIFO order
    await this.scopedMemo.dispose();

    // Remove self from parent's child tracking
    if (this.parentScope !== null) {
      this.parentScope.childScopes.delete(this);
    }
  }

  /**
   * Returns whether this scope has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Returns a frozen snapshot of the scope's internal state.
   *
   * This accessor is keyed by the INTERNAL_ACCESS Symbol and is used by
   * DevTools to inspect scope state without exposing mutable internals.
   *
   * @returns A frozen ScopeInternalState snapshot
   * @throws DisposedScopeError if scope has been disposed
   * @internal
   */
  getInternalState(): ScopeInternalState {
    if (this.disposed) {
      throw new DisposedScopeError(`scope:${this.id}`);
    }

    // Build child scope snapshots recursively
    const childSnapshots: ScopeInternalState[] = [];
    for (const child of this.childScopes) {
      try {
        childSnapshots.push(child.getInternalState());
      } catch {
        // Skip disposed children
      }
    }

    const state: ScopeInternalState = {
      id: this.id,
      disposed: this.disposed,
      scopedMemo: createMemoMapSnapshot(this.scopedMemo),
      childScopes: Object.freeze(childSnapshots),
    };

    return Object.freeze(state);
  }
}

/**
 * Creates a frozen snapshot of a MemoMap for inspection.
 *
 * @param memo - The MemoMap to snapshot
 * @returns A frozen MemoMapSnapshot
 * @internal
 */
function createMemoMapSnapshot(memo: MemoMap): MemoMapSnapshot {
  const entries: MemoEntrySnapshot[] = [];

  for (const [port, metadata] of memo.entries()) {
    entries.push(
      Object.freeze({
        port,
        portName: port.__portName,
        resolvedAt: metadata.resolvedAt,
        resolutionOrder: metadata.resolutionOrder,
      })
    );
  }

  return Object.freeze({
    size: entries.length,
    entries: Object.freeze(entries),
  });
}

/**
 * Creates a frozen Scope wrapper object around a ScopeImpl.
 *
 * This pattern separates the mutable internal state from the frozen public API,
 * allowing disposal to modify internal flags while the wrapper remains immutable.
 *
 * @param impl - The ScopeImpl to wrap
 * @returns A frozen Scope interface
 * @internal
 */
function createScopeWrapper<TProvides extends Port<unknown, string>>(
  impl: ScopeImpl<TProvides>
): Scope<TProvides> {
  const scope = {
    resolve: <P extends TProvides>(port: P): InferService<P> => impl.resolve(port),
    createScope: (): Scope<TProvides> => impl.createScope(),
    dispose: (): Promise<void> => impl.dispose(),
    get isDisposed(): boolean {
      return impl.isDisposed;
    },
    [INTERNAL_ACCESS]: (): ScopeInternalState => impl.getInternalState(),
    get [ScopeBrand](): { provides: TProvides } {
      return undefined as never;
    },
  };
  return Object.freeze(scope) as Scope<TProvides>;
}

// =============================================================================
// ContainerImpl Class
// =============================================================================

/**
 * Internal Container implementation class.
 *
 * Manages service resolution, lifetime handling, and circular dependency detection.
 * This class is internal and should not be exported from the package.
 *
 * @internal
 */
class ContainerImpl<TProvides extends Port<unknown, string>> {
  /**
   * The validated graph containing all adapters.
   */
  private readonly graph: Graph<TProvides>;

  /**
   * MemoMap for caching singleton instances.
   */
  private readonly singletonMemo: MemoMap;

  /**
   * Flag indicating whether the container has been disposed.
   */
  private disposed: boolean = false;

  /**
   * Whether the container has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * This property can be used to check if the container is still usable.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Resolution context for tracking resolution path and detecting circular dependencies.
   */
  private readonly resolutionContext: ResolutionContext;

  /**
   * Map for O(1) adapter lookup by port reference.
   */
  private readonly adapterMap: Map<Port<unknown, string>, RuntimeAdapter>;

  /**
   * Set of child scopes for disposal propagation.
   */
  private readonly childScopes: Set<ScopeImpl<TProvides>> = new Set();

  constructor(graph: Graph<TProvides>) {
    this.graph = graph;
    this.singletonMemo = new MemoMap();
    this.resolutionContext = new ResolutionContext();

    // Build adapter lookup map for O(1) access
    this.adapterMap = new Map();
    for (const adapter of graph.adapters) {
      this.adapterMap.set(adapter.provides, adapter);
    }
  }

  /**
   * Resolves a service instance for the given port.
   *
   * @param port - The port to resolve
   * @returns The service instance
   * @throws DisposedScopeError if container is disposed
   * @throws ScopeRequiredError if resolving scoped port from root container
   * @throws CircularDependencyError if circular dependency detected
   * @throws FactoryError if factory throws
   */
  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    // Check disposed flag
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    // Lookup adapter
    const adapter = this.adapterMap.get(port as Port<unknown, string>);
    if (adapter === undefined) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    // Check for scoped lifetime - cannot resolve from root container
    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }

    return this.resolveWithAdapter(port, adapter, this.singletonMemo);
  }

  /**
   * Internal resolve method that can use a specific MemoMap.
   * Used by ScopeImpl for scoped resolution.
   *
   * @internal
   */
  resolveInternal<P extends TProvides>(port: P, scopedMemo: MemoMap): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    // Lookup adapter
    const adapter = this.adapterMap.get(port as Port<unknown, string>);
    if (adapter === undefined) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    return this.resolveWithAdapter(port, adapter, scopedMemo);
  }

  /**
   * Core resolution logic with adapter and memo context.
   */
  private resolveWithAdapter<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    // Handle based on lifetime
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          port as Port<unknown, string>,
          () => this.createInstance(port, adapter, scopedMemo),
          adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined
        ) as InferService<P>;

      case "scoped":
        return scopedMemo.getOrElseMemoize(
          port as Port<unknown, string>,
          () => this.createInstance(port, adapter, scopedMemo),
          adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined
        ) as InferService<P>;

      case "request":
        // Request lifetime: always create new instance
        return this.createInstance(port, adapter, scopedMemo) as InferService<P>;

      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  /**
   * Creates a new instance using the adapter's factory.
   * Handles resolution context entry/exit and dependency resolution.
   */
  private createInstance<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): unknown {
    const portName = (port as Port<unknown, string>).__portName;

    // Enter resolution context (circular check)
    this.resolutionContext.enter(portName);

    try {
      // Resolve dependencies
      const deps = this.resolveDependencies(adapter, scopedMemo);

      // Call factory with resolved deps
      try {
        const instance = adapter.factory(deps);
        return instance;
      } catch (error) {
        throw new FactoryError(portName, error);
      }
    } finally {
      // Exit resolution context
      this.resolutionContext.exit(portName);
    }
  }

  /**
   * Resolves all dependencies for an adapter.
   */
  private resolveDependencies(
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): Record<string, unknown> {
    const deps: Record<string, unknown> = {};

    for (const requiredPort of adapter.requires) {
      const requiredPortName = (requiredPort as Port<unknown, string>).__portName;
      const requiredAdapter = this.adapterMap.get(requiredPort);

      if (requiredAdapter === undefined) {
        throw new Error(`No adapter registered for dependency port '${requiredPortName}'`);
      }

      deps[requiredPortName] = this.resolveWithAdapter(
        requiredPort as TProvides,
        requiredAdapter,
        scopedMemo
      );
    }

    return deps;
  }

  /**
   * Returns the singleton memo for child scopes to fork from.
   * This allows scopes to inherit singleton instances while having
   * their own scoped instance cache.
   *
   * @internal
   */
  getSingletonMemo(): MemoMap {
    return this.singletonMemo;
  }

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * The returned scope:
   * - Inherits singleton instances from this container (shared reference)
   * - Has its own scoped instance cache (not shared with other scopes)
   * - Is tracked for cascade disposal when container is disposed
   *
   * @returns A frozen Scope interface
   */
  createScope(): Scope<TProvides> {
    const scope = new ScopeImpl(this, this.singletonMemo, null);
    this.childScopes.add(scope);
    return createScopeWrapper(scope);
  }

  /**
   * Disposes the container and all singleton instances.
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose all child scopes first
    for (const child of this.childScopes) {
      await child.dispose();
    }
    this.childScopes.clear();

    // Dispose singleton instances
    await this.singletonMemo.dispose();
  }

  /**
   * Returns a frozen snapshot of the container's internal state.
   *
   * This accessor is keyed by the INTERNAL_ACCESS Symbol and is used by
   * DevTools to inspect container state without exposing mutable internals.
   *
   * @returns A frozen ContainerInternalState snapshot
   * @throws DisposedScopeError if container has been disposed
   * @internal
   */
  getInternalState(): ContainerInternalState {
    if (this.disposed) {
      throw new DisposedScopeError("container");
    }

    // Build child scope snapshots
    const childSnapshots: ScopeInternalState[] = [];
    for (const child of this.childScopes) {
      try {
        childSnapshots.push(child.getInternalState());
      } catch {
        // Skip disposed children
      }
    }

    // Build adapter info map
    const adapterInfoMap = new Map<Port<unknown, string>, AdapterInfo>();
    for (const [port, adapter] of this.adapterMap) {
      const dependencyNames = adapter.requires.map(
        (p) => (p as Port<unknown, string>).__portName
      );
      adapterInfoMap.set(
        port,
        Object.freeze({
          portName: port.__portName,
          lifetime: adapter.lifetime,
          dependencyCount: adapter.requires.length,
          dependencyNames: Object.freeze(dependencyNames),
        })
      );
    }

    const state: ContainerInternalState = {
      disposed: this.disposed,
      singletonMemo: createMemoMapSnapshot(this.singletonMemo),
      childScopes: Object.freeze(childSnapshots),
      adapterMap: adapterInfoMap,
    };

    return Object.freeze(state);
  }
}

// =============================================================================
// createContainer Function
// =============================================================================

/**
 * Creates an immutable container from a validated graph.
 *
 * The container provides type-safe service resolution with:
 * - Singleton, scoped, and request lifetime management
 * - Circular dependency detection at resolution time
 * - LIFO disposal ordering with finalizer support
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 * @param graph - A validated Graph from @hex-di/graph
 * @returns A frozen Container instance
 *
 * @remarks
 * - The container is immutable (frozen) - no dynamic registration after creation
 * - Resolution is synchronous - all factory functions must be sync
 * - Scoped ports cannot be resolved from the root container - use createScope()
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 *
 * const logger = container.resolve(LoggerPort);
 * logger.log('Hello, world!');
 *
 * // Don't forget to dispose when done
 * await container.dispose();
 * ```
 *
 * @example Using scopes
 * ```typescript
 * const container = createContainer(graph);
 *
 * // Create a scope for request-scoped services
 * const scope = container.createScope();
 *
 * try {
 *   const userContext = scope.resolve(UserContextPort);
 *   // ... handle request
 * } finally {
 *   await scope.dispose();
 * }
 * ```
 */
export function createContainer<TProvides extends Port<unknown, string>>(
  graph: Graph<TProvides>
): Container<TProvides> {
  const impl = new ContainerImpl(graph);

  // Create the container object with the public API
  const container = {
    resolve: <P extends TProvides>(port: P): InferService<P> => impl.resolve(port),
    createScope: (): Scope<TProvides> => impl.createScope(),
    dispose: (): Promise<void> => impl.dispose(),
    get isDisposed(): boolean {
      return impl.isDisposed;
    },
    [INTERNAL_ACCESS]: (): ContainerInternalState => impl.getInternalState(),
    get [ContainerBrand](): { provides: TProvides } {
      return undefined as never;
    },
  };

  // Freeze and return as Container<TProvides>
  return Object.freeze(container) as Container<TProvides>;
}
