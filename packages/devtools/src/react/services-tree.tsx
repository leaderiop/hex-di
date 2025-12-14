/**
 * Tree building utilities for Services dependency visualization.
 *
 * Provides data structures and functions to transform flat service lists
 * and edge data into hierarchical tree structures for display.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "@hex-di/graph";
import type { ExportedEdge } from "../types.js";
import type { ServiceInfo } from "./resolved-services.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Extended service information with dependency relationships.
 */
export interface ServiceWithRelations extends ServiceInfo {
  /** Services that this service depends on */
  readonly dependsOn: readonly string[];
  /** Services that depend on this service */
  readonly dependents: readonly string[];
}

/**
 * A node in the service dependency tree.
 *
 * The tree is structured with foundational services (no dependencies) at the root,
 * and services that depend on them as children, recursively.
 */
export interface ServiceTreeNode {
  /** The service information */
  readonly service: ServiceWithRelations;
  /** Child nodes (services that depend on this service) */
  readonly children: readonly ServiceTreeNode[];
  /** Depth in the tree (0 for root nodes) */
  readonly depth: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build a map of port name to its dependents (services that depend on it).
 *
 * @param edges - The dependency edges (from depends on to)
 * @returns Map from port name to array of dependent port names
 */
export function buildDependentsMap(
  edges: readonly ExportedEdge[]
): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>();

  for (const edge of edges) {
    // edge.from depends on edge.to
    // So edge.to has edge.from as a dependent
    const dependents = map.get(edge.to);
    if (dependents !== undefined) {
      dependents.push(edge.from);
    } else {
      map.set(edge.to, [edge.from]);
    }
  }

  // Convert to readonly arrays
  const result = new Map<string, readonly string[]>();
  for (const [key, value] of map) {
    result.set(key, Object.freeze([...value]));
  }

  return result;
}

/**
 * Build a map of port name to its dependencies.
 *
 * @param edges - The dependency edges (from depends on to)
 * @returns Map from port name to array of dependency port names
 */
export function buildDependenciesMap(
  edges: readonly ExportedEdge[]
): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>();

  for (const edge of edges) {
    // edge.from depends on edge.to
    const deps = map.get(edge.from);
    if (deps !== undefined) {
      deps.push(edge.to);
    } else {
      map.set(edge.from, [edge.to]);
    }
  }

  // Convert to readonly arrays
  const result = new Map<string, readonly string[]>();
  for (const [key, value] of map) {
    result.set(key, Object.freeze([...value]));
  }

  return result;
}

/**
 * Enhance services with dependency relationship data.
 *
 * @param services - The base service info list
 * @param edges - The dependency edges
 * @returns Services with dependsOn and dependents arrays populated
 */
export function enrichServicesWithRelations(
  services: readonly ServiceInfo[],
  edges: readonly ExportedEdge[]
): readonly ServiceWithRelations[] {
  const dependentsMap = buildDependentsMap(edges);
  const dependenciesMap = buildDependenciesMap(edges);

  return services.map((service) => ({
    ...service,
    dependsOn: dependenciesMap.get(service.portName) ?? [],
    dependents: dependentsMap.get(service.portName) ?? [],
  }));
}

/**
 * Build a dependency tree from services and edges.
 *
 * The tree structure places foundational services (those with no dependencies)
 * at the root, with services that depend on them as children, recursively.
 *
 * @param services - The service info list
 * @param edges - The dependency edges (from depends on to)
 * @returns Array of root tree nodes
 *
 * @example
 * ```typescript
 * // Given: ChatService depends on Logger, Logger depends on Config
 * // Tree structure:
 * // Config (root - no dependencies)
 * //   └─ Logger (depends on Config)
 * //       └─ ChatService (depends on Logger)
 * ```
 */
export function buildDependencyTree(
  services: readonly ServiceInfo[],
  edges: readonly ExportedEdge[]
): readonly ServiceTreeNode[] {
  const enrichedServices = enrichServicesWithRelations(services, edges);

  // Create a map for quick lookup
  const serviceMap = new Map<string, ServiceWithRelations>();
  for (const service of enrichedServices) {
    serviceMap.set(service.portName, service);
  }

  // Track which services have been added to the tree
  const visited = new Set<string>();

  /**
   * Build a tree node recursively.
   */
  function buildNode(
    portName: string,
    depth: number,
    ancestors: Set<string>
  ): ServiceTreeNode | null {
    // Skip if already in ancestors (cycle detection)
    if (ancestors.has(portName)) {
      return null;
    }

    const service = serviceMap.get(portName);
    if (service === undefined) {
      return null;
    }

    visited.add(portName);

    // Build children (services that depend on this one)
    const newAncestors = new Set(ancestors);
    newAncestors.add(portName);

    const children: ServiceTreeNode[] = [];
    for (const dependentName of service.dependents) {
      if (!visited.has(dependentName)) {
        const childNode = buildNode(dependentName, depth + 1, newAncestors);
        if (childNode !== null) {
          children.push(childNode);
        }
      }
    }

    // Sort children alphabetically
    children.sort((a, b) =>
      a.service.portName.localeCompare(b.service.portName)
    );

    return {
      service,
      children,
      depth,
    };
  }

  // Find root nodes: services with no dependencies
  const rootServices = enrichedServices.filter(
    (service) => service.dependsOn.length === 0
  );

  // Build tree starting from roots
  const rootNodes: ServiceTreeNode[] = [];
  for (const root of rootServices) {
    const node = buildNode(root.portName, 0, new Set());
    if (node !== null) {
      rootNodes.push(node);
    }
  }

  // Add any orphaned services (part of a cycle with no true root)
  for (const service of enrichedServices) {
    if (!visited.has(service.portName)) {
      const node = buildNode(service.portName, 0, new Set());
      if (node !== null) {
        rootNodes.push(node);
      }
    }
  }

  // Sort root nodes alphabetically
  rootNodes.sort((a, b) =>
    a.service.portName.localeCompare(b.service.portName)
  );

  return rootNodes;
}

/**
 * Flatten a tree into a list of visible nodes for keyboard navigation.
 *
 * @param nodes - The tree nodes
 * @param expandedIds - Set of expanded node IDs
 * @returns Array of port names in visible order
 */
export function getVisibleServiceIds(
  nodes: readonly ServiceTreeNode[],
  expandedIds: ReadonlySet<string>
): readonly string[] {
  const result: string[] = [];

  function traverse(nodeList: readonly ServiceTreeNode[]): void {
    for (const node of nodeList) {
      result.push(node.service.portName);
      if (
        expandedIds.has(node.service.portName) &&
        node.children.length > 0
      ) {
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return result;
}

/**
 * Collect all node IDs that have children (for expand all).
 *
 * @param nodes - The tree nodes
 * @returns Array of port names that have children
 */
export function getAllExpandableIds(
  nodes: readonly ServiceTreeNode[]
): readonly string[] {
  const result: string[] = [];

  function traverse(nodeList: readonly ServiceTreeNode[]): void {
    for (const node of nodeList) {
      if (node.children.length > 0) {
        result.push(node.service.portName);
        traverse(node.children);
      }
    }
  }

  traverse(nodes);
  return result;
}

/**
 * Find the parent node ID for a given node.
 *
 * @param targetId - The ID of the node to find parent for
 * @param nodes - The tree nodes
 * @returns Parent ID or null if root
 */
export function findParentServiceId(
  targetId: string,
  nodes: readonly ServiceTreeNode[]
): string | null {
  function search(
    nodeList: readonly ServiceTreeNode[],
    parentId: string | null
  ): string | null {
    for (const node of nodeList) {
      if (node.service.portName === targetId) {
        return parentId;
      }
      const found = search(node.children, node.service.portName);
      if (found !== null) {
        return found;
      }
      // Check if target is a direct child
      for (const child of node.children) {
        if (child.service.portName === targetId) {
          return node.service.portName;
        }
      }
    }
    return null;
  }

  return search(nodes, null);
}

/**
 * Count total nodes in a tree.
 *
 * @param nodes - The tree nodes
 * @returns Total number of nodes
 */
export function countTreeNodes(nodes: readonly ServiceTreeNode[]): number {
  let count = 0;

  function traverse(nodeList: readonly ServiceTreeNode[]): void {
    for (const node of nodeList) {
      count++;
      traverse(node.children);
    }
  }

  traverse(nodes);
  return count;
}
