/**
 * ContainerInspector React component for runtime container state inspection.
 *
 * Main component that combines ScopeHierarchy and ResolvedServices to provide
 * a comprehensive view of container state. Includes auto-refresh polling and
 * manual refresh controls.
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactElement,
} from "react";
import type { Port } from "@hex-di/ports";
import type { Container } from "@hex-di/runtime";
import { createInspector } from "../index.js";
import type {
  ContainerInspector as InspectorType,
  ContainerSnapshot,
  ScopeTree,
} from "../index.js";
import type { ExportedGraph } from "../types.js";
import type { TracingAPI } from "../tracing/types.js";
import { containerInspectorStyles } from "./styles.js";
import { ScopeHierarchy } from "./scope-hierarchy.js";
import { ResolvedServices, type ServiceInfo } from "./resolved-services.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the ContainerInspector component.
 */
export interface ContainerInspectorProps {
  /** The runtime container to inspect */
  readonly container: Container<Port<unknown, string>>;
  /** The exported dependency graph for metadata */
  readonly exportedGraph: ExportedGraph;
  /** Optional tracing API for request service stats */
  readonly tracingAPI?: TracingAPI | undefined;
}

/**
 * Stats computed from trace data for request-scoped services.
 */
interface RequestServiceStats {
  /** Total number of times the service was resolved */
  readonly callCount: number;
  /** Timestamp of the most recent resolution */
  readonly lastResolvedAt: number;
  /** Average resolution duration in milliseconds */
  readonly averageDuration: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Computes resolution stats for a request-scoped service from trace data.
 *
 * @param portName - The port name to compute stats for
 * @param tracingAPI - The tracing API to query (optional)
 * @returns Stats object or undefined if no tracing data available
 */
function getRequestServiceStats(
  portName: string,
  tracingAPI: TracingAPI | undefined
): RequestServiceStats | undefined {
  if (tracingAPI === undefined) {
    return undefined;
  }

  const traces = tracingAPI.getTraces({ portName });
  const requestTraces = traces.filter((t) => t.lifetime === "request");

  if (requestTraces.length === 0) {
    return undefined;
  }

  const totalDuration = requestTraces.reduce((sum, t) => sum + t.duration, 0);
  const lastResolvedAt = Math.max(...requestTraces.map((t) => t.startTime));

  return {
    callCount: requestTraces.length,
    lastResolvedAt,
    averageDuration: totalDuration / requestTraces.length,
  };
}

/**
 * Builds the service info list from snapshot and graph data.
 *
 * Combines information from:
 * - Container snapshot (resolution status, timestamps)
 * - Exported graph (lifetime, dependencies)
 * - Tracing API (for request service stats)
 *
 * @param snapshot - The container snapshot
 * @param exportedGraph - The exported dependency graph
 * @param selectedScopeId - The currently selected scope ID (null = root)
 * @param inspector - The container inspector instance
 * @param tracingAPI - Optional tracing API for request service stats
 * @returns Array of ServiceInfo for display
 */
function buildServiceList(
  snapshot: ContainerSnapshot,
  exportedGraph: ExportedGraph,
  selectedScopeId: string | null,
  inspector: InspectorType,
  tracingAPI: TracingAPI | undefined
): readonly ServiceInfo[] {
  const services: ServiceInfo[] = [];

  // Build a map of port name to dependencies
  const dependencyMap = new Map<string, readonly string[]>();
  for (const edge of exportedGraph.edges) {
    const deps = dependencyMap.get(edge.from);
    if (deps !== undefined) {
      dependencyMap.set(edge.from, [...deps, edge.to]);
    } else {
      dependencyMap.set(edge.from, [edge.to]);
    }
  }

  // Build a map of singleton entries for lookup
  const singletonMap = new Map<string, (typeof snapshot.singletons)[number]>();
  for (const entry of snapshot.singletons) {
    singletonMap.set(entry.portName, entry);
  }

  // Process all nodes from the graph
  for (const node of exportedGraph.nodes) {
    const dependencies = dependencyMap.get(node.id) ?? [];

    // Determine resolution status
    let isResolved = false;
    let isScopeRequired = false;
    let resolvedAt: number | undefined;
    let resolutionOrder: number | undefined;

    try {
      const status = inspector.isResolved(node.id);
      if (status === "scope-required") {
        isScopeRequired = selectedScopeId === null;
        isResolved = false;
      } else {
        isResolved = status;
      }
    } catch {
      // Port might not be in container if graph was modified
      isResolved = false;
    }

    // Get metadata from singleton entries
    const singletonEntry = singletonMap.get(node.id);
    if (singletonEntry !== undefined) {
      isResolved = singletonEntry.isResolved;
      resolvedAt = singletonEntry.resolvedAt;
      resolutionOrder = singletonEntry.resolutionOrder;
    }

    // Get stats for request-scoped services from tracing data
    let callCount: number | undefined;
    let lastResolvedAt: number | undefined;
    let averageDuration: number | undefined;

    if (node.lifetime === "request") {
      const stats = getRequestServiceStats(node.id, tracingAPI);
      if (stats !== undefined) {
        callCount = stats.callCount;
        lastResolvedAt = stats.lastResolvedAt;
        averageDuration = stats.averageDuration;
      }
    }

    services.push({
      portName: node.id,
      lifetime: node.lifetime,
      isResolved,
      isScopeRequired,
      resolvedAt,
      resolutionOrder,
      dependencies,
      callCount,
      lastResolvedAt,
      averageDuration,
    });
  }

  // Sort by resolution order (resolved first, then by name)
  return services.sort((a, b) => {
    // Resolved services come first
    if (a.isResolved !== b.isResolved) {
      return a.isResolved ? -1 : 1;
    }
    // Then by resolution order (if both resolved)
    if (
      a.isResolved &&
      b.isResolved &&
      a.resolutionOrder !== undefined &&
      b.resolutionOrder !== undefined
    ) {
      return a.resolutionOrder - b.resolutionOrder;
    }
    // Otherwise alphabetically
    return a.portName.localeCompare(b.portName);
  });
}

// =============================================================================
// ContainerInspector Component
// =============================================================================

/**
 * ContainerInspector component for runtime container state inspection.
 *
 * Features:
 * - Scope hierarchy tree visualization
 * - Resolved services list with filters and search
 * - Auto-refresh polling (1 second interval, off by default)
 * - Manual refresh button
 * - Selected scope context for viewing scoped services
 *
 * @param props - The component props
 * @returns A React element containing the container inspector
 *
 * @example
 * ```tsx
 * import { ContainerInspector } from '@hex-di/devtools/react';
 *
 * function InspectorView() {
 *   const exportedGraph = useMemo(() => toJSON(graph), [graph]);
 *   return (
 *     <ContainerInspector
 *       container={container}
 *       exportedGraph={exportedGraph}
 *     />
 *   );
 * }
 * ```
 */
export function ContainerInspector({
  container,
  exportedGraph,
  tracingAPI,
}: ContainerInspectorProps): ReactElement {
  // Create inspector once
  const inspector = useMemo(() => createInspector(container), [container]);

  // State
  const [snapshot, setSnapshot] = useState<ContainerSnapshot | null>(null);
  const [scopeTree, setScopeTree] = useState<ScopeTree | null>(null);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh function
  const refresh = useCallback(() => {
    try {
      const newSnapshot = inspector.snapshot();
      const newTree = inspector.getScopeTree();
      setSnapshot(newSnapshot);
      setScopeTree(newTree);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to inspect container");
      }
    }
  }, [inspector]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 1000);
    } else if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refresh]);

  // Build service list
  const services = useMemo(() => {
    if (snapshot === null) {
      return [];
    }
    return buildServiceList(snapshot, exportedGraph, selectedScopeId, inspector, tracingAPI);
  }, [snapshot, exportedGraph, selectedScopeId, inspector, tracingAPI]);

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  // Error state
  if (error !== null) {
    return (
      <div style={containerInspectorStyles.container}>
        <div style={{ color: "#f38ba8", padding: "16px" }}>
          Error: {error}
        </div>
      </div>
    );
  }

  // Loading state
  if (snapshot === null || scopeTree === null) {
    return (
      <div style={containerInspectorStyles.container}>
        <div style={{ color: "var(--hex-devtools-text-muted)", padding: "16px" }}>
          Loading...
        </div>
      </div>
    );
  }

  const autoRefreshButtonStyle = {
    ...containerInspectorStyles.autoRefreshToggle,
    ...(autoRefresh ? containerInspectorStyles.autoRefreshToggleActive : {}),
  };

  return (
    <div style={containerInspectorStyles.container}>
      {/* Header with controls */}
      <div style={containerInspectorStyles.headerControls}>
        <button
          data-testid="manual-refresh-button"
          style={containerInspectorStyles.refreshButton}
          onClick={refresh}
          type="button"
        >
          Refresh
        </button>
        <button
          data-testid="auto-refresh-toggle"
          style={autoRefreshButtonStyle}
          onClick={handleAutoRefreshToggle}
          type="button"
          aria-pressed={autoRefresh}
        >
          Auto {autoRefresh ? "ON" : "OFF"}
        </button>
      </div>

      {/* Scope Hierarchy */}
      <div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--hex-devtools-text-muted)",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Scope Hierarchy
        </div>
        <ScopeHierarchy
          scopeTree={scopeTree}
          selectedScopeId={selectedScopeId}
          onScopeSelect={setSelectedScopeId}
        />
      </div>

      {/* Resolved Services */}
      <div>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--hex-devtools-text-muted)",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Resolved Services
        </div>
        <ResolvedServices services={services} />
      </div>
    </div>
  );
}
