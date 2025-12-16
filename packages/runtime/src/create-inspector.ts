/**
 * Container inspector factory for @hex-di/runtime.
 *
 * The inspector provides runtime state inspection capabilities for DevTools
 * and debugging purposes. It uses the INTERNAL_ACCESS Symbol protocol to
 * read container internals without exposing mutable state.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { Container } from "./types.js";
import type {
  ContainerInspector,
  ContainerSnapshot,
  SingletonEntry,
  ScopeTree,
  ContainerInternalState,
  ScopeInternalState,
  AdapterInfo,
  MemoEntrySnapshot,
} from "./inspector-types.js";
import { INTERNAL_ACCESS } from "./inspector-symbols.js";
import { DisposedScopeError } from "./errors.js";

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ContainerInspector, ContainerSnapshot, SingletonEntry, ScopeTree };

// =============================================================================
// Internal Access Helper
// =============================================================================

/**
 * Safely access the internal state accessor from a container.
 *
 * This helper handles the type narrowing for Symbol-indexed properties,
 * providing type-safe access to container internals for DevTools and
 * container wrappers.
 *
 * @param container - The container to access
 * @returns The accessor function that returns frozen internal state
 * @throws Error if the accessor is not found
 *
 * @example
 * ```typescript
 * import { createContainer, getInternalAccessor } from '@hex-di/runtime';
 *
 * const container = createContainer(graph);
 * const accessor = getInternalAccessor(container);
 * const state = accessor(); // ContainerInternalState
 * ```
 */
export function getInternalAccessor(
  container: Container<Port<unknown, string>>
): () => ContainerInternalState {
  // Container type now includes [INTERNAL_ACCESS] property - no cast needed
  const accessor = container[INTERNAL_ACCESS];
  if (typeof accessor !== "function") {
    throw new Error("Container does not expose INTERNAL_ACCESS accessor");
  }
  return accessor;
}

/**
 * Deeply freezes an object and all its nested properties.
 *
 * @param obj - The object to freeze
 * @returns The frozen object
 * @internal
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Freeze the object itself
  Object.freeze(obj);

  // Recursively freeze nested properties
  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj;
}

/**
 * Builds a ScopeTree from scope internal state.
 *
 * @param scopeState - The scope's internal state
 * @param totalCount - Total number of ports in the container
 * @returns A frozen ScopeTree node
 * @internal
 */
function buildScopeTreeNode(
  scopeState: ScopeInternalState,
  totalCount: number
): ScopeTree {
  const children: ScopeTree[] = [];

  for (const childState of scopeState.childScopes) {
    children.push(buildScopeTreeNode(childState, totalCount));
  }

  const node: ScopeTree = {
    id: scopeState.id,
    status: scopeState.disposed ? "disposed" : "active",
    resolvedCount: scopeState.scopedMemo.size,
    totalCount,
    children: Object.freeze(children),
  };

  return Object.freeze(node);
}

// =============================================================================
// createInspector Factory
// =============================================================================

/**
 * Creates a container inspector for runtime state inspection.
 *
 * The inspector provides pure functions that return serializable, frozen data
 * about the container's current state. Inspector creation is O(1) - no iteration
 * happens until methods are called.
 *
 * @param container - The container to inspect
 * @returns A frozen ContainerInspector object
 *
 * @example Basic usage
 * ```typescript
 * const container = createContainer(graph);
 * const inspector = createInspector(container);
 *
 * // Get complete snapshot
 * const snapshot = inspector.snapshot();
 * console.log('Disposed:', snapshot.isDisposed);
 * console.log('Singletons:', snapshot.singletons.length);
 *
 * // List all registered ports
 * const ports = inspector.listPorts();
 * console.log('Ports:', ports);
 *
 * // Check resolution status
 * if (inspector.isResolved('Logger')) {
 *   console.log('Logger has been resolved');
 * }
 *
 * // Get scope hierarchy
 * const tree = inspector.getScopeTree();
 * console.log('Root:', tree.id, 'Children:', tree.children.length);
 * ```
 *
 * @throws {Error} If the container doesn't expose INTERNAL_ACCESS
 */
export function createInspector<TProvides extends Port<unknown, string>>(
  container: Container<TProvides>
): ContainerInspector {
  // Store container reference for later access - O(1) operation
  const containerRef = container;

  // Get accessor once to validate container, but don't call it yet
  const getAccessor = () => getInternalAccessor(containerRef as Container<Port<unknown, string>>);

  /**
   * Implementation of snapshot() method.
   *
   * Access container internals via INTERNAL_ACCESS Symbol,
   * iterate MemoMap entries for singleton data, build scope tree,
   * and deep freeze the entire result.
   */
  function snapshot(): ContainerSnapshot {
    const accessor = getAccessor();
    const state = accessor(); // This throws if disposed

    // Build singleton entries from adapter map
    const singletons: SingletonEntry[] = [];
    const resolvedPortNames = new Set<string>();

    // Build a set of resolved port names from the memo entries
    for (const entry of state.singletonMemo.entries) {
      resolvedPortNames.add(entry.portName);
    }

    // Create a map of port name to memo entry for lookup
    const memoEntryMap = new Map<string, MemoEntrySnapshot>();
    for (const entry of state.singletonMemo.entries) {
      memoEntryMap.set(entry.portName, entry);
    }

    // Build singleton entries from adapter map
    for (const [, adapterInfo] of state.adapterMap) {
      if (adapterInfo.lifetime === "singleton") {
        const memoEntry = memoEntryMap.get(adapterInfo.portName);
        const isResolved = resolvedPortNames.has(adapterInfo.portName);

        singletons.push(
          Object.freeze({
            portName: adapterInfo.portName,
            lifetime: adapterInfo.lifetime,
            isResolved,
            resolvedAt: isResolved && memoEntry ? memoEntry.resolvedAt : undefined,
            resolutionOrder: isResolved && memoEntry ? memoEntry.resolutionOrder : undefined,
          })
        );
      }
    }

    // Build scope tree
    const scopeTree = buildContainerScopeTree(state);

    const result: ContainerSnapshot = {
      isDisposed: state.disposed,
      singletons: Object.freeze(singletons),
      scopes: scopeTree,
    };

    return deepFreeze(result);
  }

  /**
   * Builds the root scope tree from container state.
   */
  function buildContainerScopeTree(state: ContainerInternalState): ScopeTree {
    const totalCount = state.adapterMap.size;

    // Calculate scoped adapter count for child scopes
    // Scopes only cache scoped-lifetime services, so their totalCount
    // should reflect only scoped adapters for semantic consistency
    let scopedAdapterCount = 0;
    for (const adapterInfo of state.adapterMap.values()) {
      if (adapterInfo.lifetime === "scoped") {
        scopedAdapterCount++;
      }
    }

    const children: ScopeTree[] = [];

    for (const childState of state.childScopes) {
      children.push(buildScopeTreeNode(childState, scopedAdapterCount));
    }

    const root: ScopeTree = {
      id: "container",
      status: state.disposed ? "disposed" : "active",
      resolvedCount: state.singletonMemo.size,
      totalCount,
      children: Object.freeze(children),
    };

    return Object.freeze(root);
  }

  /**
   * Implementation of listPorts() method.
   *
   * Returns all registered port names from adapterMap,
   * sorted alphabetically for consistent ordering.
   */
  function listPorts(): readonly string[] {
    const accessor = getAccessor();
    const state = accessor(); // This throws if disposed

    const portNames: string[] = [];
    for (const [, adapterInfo] of state.adapterMap) {
      portNames.push(adapterInfo.portName);
    }

    // Sort alphabetically
    portNames.sort();

    return Object.freeze(portNames);
  }

  /**
   * Implementation of isResolved() method.
   *
   * Checks singleton memo for resolution status.
   * Returns "scope-required" for scoped ports.
   * Throws if port name is not registered.
   */
  function isResolved(portName: string): boolean | "scope-required" {
    const accessor = getAccessor();
    const state = accessor(); // This throws if disposed

    // Find adapter info by port name
    let adapterInfo: AdapterInfo | undefined;
    for (const [, info] of state.adapterMap) {
      if (info.portName === portName) {
        adapterInfo = info;
        break;
      }
    }

    if (adapterInfo === undefined) {
      throw new Error(
        `Port '${portName}' is not registered in this container. ` +
          `Use listPorts() to see available ports.`
      );
    }

    // Handle scoped ports
    if (adapterInfo.lifetime === "scoped") {
      return "scope-required";
    }

    // Check if resolved in singleton memo
    for (const entry of state.singletonMemo.entries) {
      if (entry.portName === portName) {
        return true;
      }
    }

    return false;
  }

  /**
   * Implementation of getScopeTree() method.
   *
   * Builds hierarchical tree from container and child scopes.
   */
  function getScopeTree(): ScopeTree {
    const accessor = getAccessor();
    const state = accessor(); // This throws if disposed

    return buildContainerScopeTree(state);
  }

  // Create and freeze the inspector object
  const inspector: ContainerInspector = {
    snapshot,
    listPorts,
    isResolved,
    getScopeTree,
  };

  return Object.freeze(inspector);
}
