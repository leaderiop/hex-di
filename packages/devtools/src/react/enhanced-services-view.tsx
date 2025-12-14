/**
 * EnhancedServicesView React component for the Services tab.
 *
 * Main orchestrating component that combines list and tree views with
 * search, filters, and view mode toggle. Provides comprehensive service
 * exploration with dependency relationships and performance data.
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
  type CSSProperties,
} from "react";
import type { Lifetime } from "@hex-di/graph";
import type { TracingAPI } from "../tracing/types.js";
import type { ExportedGraph } from "../types.js";
import type { ServiceInfo } from "./resolved-services.js";
import {
  enrichServicesWithRelations,
  buildDependencyTree,
  type ServiceWithRelations,
} from "./services-tree.js";
import { EnhancedServiceItem } from "./enhanced-service-item.js";
import { ServiceDependencyTree } from "./service-dependency-tree.js";
import { serviceListStyles } from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * View mode for the services display.
 */
export type ServicesViewMode = "list" | "tree";

/**
 * Filter state for the service list.
 */
export interface ServiceFilters {
  /** Lifetime filter (null = all) */
  readonly lifetime: Lifetime | null;
  /** Resolution status filter (null = all) */
  readonly resolved: boolean | null;
}

/**
 * Props for the EnhancedServicesView component.
 */
export interface EnhancedServicesViewProps {
  /** Services to display */
  readonly services: readonly ServiceInfo[];
  /** The exported dependency graph */
  readonly exportedGraph: ExportedGraph;
  /** Optional tracing API for performance data */
  readonly tracingAPI?: TracingAPI | undefined;
  /** Initial view mode */
  readonly initialViewMode?: ServicesViewMode | undefined;
  /** Callback when search query changes */
  readonly onSearchChange?: ((query: string) => void) | undefined;
}

// =============================================================================
// Styles
// =============================================================================

const viewStyles: {
  readonly container: CSSProperties;
  readonly viewModeContainer: CSSProperties;
  readonly viewModeLabel: CSSProperties;
  readonly viewModeButton: CSSProperties;
  readonly viewModeButtonActive: CSSProperties;
  readonly listContainer: CSSProperties;
  readonly treeContainer: CSSProperties;
} = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    height: "100%",
  },
  viewModeContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--hex-devtools-border, #45475a)",
  },
  viewModeLabel: {
    fontSize: "10px",
    fontWeight: 500,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  viewModeButton: {
    padding: "4px 10px",
    fontSize: "10px",
    fontWeight: 600,
    backgroundColor: "transparent",
    border: "1px solid var(--hex-devtools-border, #45475a)",
    borderRadius: "4px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    cursor: "pointer",
    transition:
      "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
  },
  viewModeButtonActive: {
    backgroundColor: "var(--hex-devtools-accent, #89b4fa)",
    border: "1px solid var(--hex-devtools-accent, #89b4fa)",
    color: "#1e1e2e",
  },
  listContainer: {
    flex: 1,
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  treeContainer: {
    flex: 1,
    overflow: "auto",
  },
};

// =============================================================================
// Sub-Components
// =============================================================================

interface ServiceSearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
}

function ServiceSearch({
  value,
  onChange,
  onClear,
}: ServiceSearchProps): ReactElement {
  return (
    <div style={serviceListStyles.searchContainer}>
      <input
        data-testid="service-search"
        type="text"
        placeholder="Search services..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={serviceListStyles.searchInput}
        aria-label="Search services"
      />
      {value.length > 0 && (
        <button
          data-testid="service-search-clear"
          style={serviceListStyles.searchClearButton}
          onClick={onClear}
          aria-label="Clear search"
          type="button"
        >
          x
        </button>
      )}
    </div>
  );
}

interface ServiceFiltersComponentProps {
  readonly filters: ServiceFilters;
  readonly onFiltersChange: (filters: ServiceFilters) => void;
}

function ServiceFiltersComponent({
  filters,
  onFiltersChange,
}: ServiceFiltersComponentProps): ReactElement {
  const handleLifetimeFilter = (lifetime: Lifetime | null): void => {
    onFiltersChange({ ...filters, lifetime });
  };

  const handleResolvedFilter = (resolved: boolean | null): void => {
    onFiltersChange({ ...filters, resolved });
  };

  const getFilterButtonStyle = (isActive: boolean): CSSProperties => ({
    ...serviceListStyles.filterButton,
    ...(isActive ? serviceListStyles.filterButtonActive : {}),
  });

  return (
    <div style={serviceListStyles.filterContainer}>
      {/* Lifetime filters */}
      <div style={serviceListStyles.filterGroup}>
        <button
          data-testid="service-filter-all"
          style={getFilterButtonStyle(filters.lifetime === null)}
          onClick={() => handleLifetimeFilter(null)}
          type="button"
          aria-pressed={filters.lifetime === null}
        >
          All
        </button>
        <button
          data-testid="service-filter-singleton"
          style={getFilterButtonStyle(filters.lifetime === "singleton")}
          onClick={() => handleLifetimeFilter("singleton")}
          type="button"
          aria-pressed={filters.lifetime === "singleton"}
        >
          Singleton
        </button>
        <button
          data-testid="service-filter-scoped"
          style={getFilterButtonStyle(filters.lifetime === "scoped")}
          onClick={() => handleLifetimeFilter("scoped")}
          type="button"
          aria-pressed={filters.lifetime === "scoped"}
        >
          Scoped
        </button>
        <button
          data-testid="service-filter-request"
          style={getFilterButtonStyle(filters.lifetime === "request")}
          onClick={() => handleLifetimeFilter("request")}
          type="button"
          aria-pressed={filters.lifetime === "request"}
        >
          Request
        </button>
      </div>

      {/* Status filters */}
      <div style={serviceListStyles.filterGroup}>
        <button
          data-testid="service-filter-resolved"
          style={getFilterButtonStyle(filters.resolved === true)}
          onClick={() =>
            handleResolvedFilter(filters.resolved === true ? null : true)
          }
          type="button"
          aria-pressed={filters.resolved === true}
        >
          Resolved
        </button>
        <button
          data-testid="service-filter-pending"
          style={getFilterButtonStyle(filters.resolved === false)}
          onClick={() =>
            handleResolvedFilter(filters.resolved === false ? null : false)
          }
          type="button"
          aria-pressed={filters.resolved === false}
        >
          Pending
        </button>
      </div>
    </div>
  );
}

interface ViewModeSelectorProps {
  readonly viewMode: ServicesViewMode;
  readonly onViewModeChange: (mode: ServicesViewMode) => void;
}

function ViewModeSelector({
  viewMode,
  onViewModeChange,
}: ViewModeSelectorProps): ReactElement {
  const getButtonStyle = (mode: ServicesViewMode): CSSProperties => ({
    ...viewStyles.viewModeButton,
    ...(viewMode === mode ? viewStyles.viewModeButtonActive : {}),
  });

  return (
    <div style={viewStyles.viewModeContainer}>
      <span style={viewStyles.viewModeLabel}>View:</span>
      <button
        data-testid="view-mode-list"
        style={getButtonStyle("list")}
        onClick={() => onViewModeChange("list")}
        type="button"
        aria-pressed={viewMode === "list"}
      >
        List
      </button>
      <button
        data-testid="view-mode-tree"
        style={getButtonStyle("tree")}
        onClick={() => onViewModeChange("tree")}
        type="button"
        aria-pressed={viewMode === "tree"}
      >
        Tree
      </button>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * EnhancedServicesView component for comprehensive service exploration.
 *
 * Features:
 * - Search input with 300ms debounce
 * - Lifetime filters (All/Singleton/Scoped/Request)
 * - Status filters (Resolved/Pending)
 * - View mode toggle (List/Tree)
 * - List view: Flat list with enhanced service items
 * - Tree view: Hierarchical dependency tree
 * - Performance data when tracing is available
 *
 * @param props - The component props
 * @returns A React element containing the enhanced services view
 *
 * @example
 * ```tsx
 * <EnhancedServicesView
 *   services={services}
 *   exportedGraph={exportedGraph}
 *   tracingAPI={tracingAPI}
 *   initialViewMode="tree"
 * />
 * ```
 */
export function EnhancedServicesView({
  services,
  exportedGraph,
  tracingAPI,
  initialViewMode = "list",
  onSearchChange,
}: EnhancedServicesViewProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<ServiceFilters>({
    lifetime: null,
    resolved: null,
  });
  const [viewMode, setViewMode] = useState<ServicesViewMode>(initialViewMode);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      onSearchChange?.(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, onSearchChange]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    onSearchChange?.("");
  }, [onSearchChange]);

  // Enrich services with dependency relationships
  const enrichedServices = useMemo(
    () => enrichServicesWithRelations(services, exportedGraph.edges),
    [services, exportedGraph.edges]
  );

  // Filter services based on search and filters
  const filteredServices = useMemo(() => {
    return enrichedServices.filter((service) => {
      // Search filter (case-insensitive partial match)
      if (debouncedQuery.length > 0) {
        const query = debouncedQuery.toLowerCase();
        if (!service.portName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Lifetime filter
      if (filters.lifetime !== null && service.lifetime !== filters.lifetime) {
        return false;
      }

      // Resolution status filter
      if (filters.resolved !== null) {
        const isEffectivelyResolved =
          service.isResolved && !service.isScopeRequired;
        if (filters.resolved !== isEffectivelyResolved) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedServices, debouncedQuery, filters]);

  // Build tree from filtered services
  const treeNodes = useMemo(() => {
    // Convert back to ServiceInfo for tree building
    const serviceInfos: ServiceInfo[] = filteredServices.map((s) => ({
      portName: s.portName,
      lifetime: s.lifetime,
      isResolved: s.isResolved,
      isScopeRequired: s.isScopeRequired,
      resolvedAt: s.resolvedAt,
      resolutionOrder: s.resolutionOrder,
      dependencies: s.dependsOn,
    }));

    // Filter edges to only include filtered services
    const filteredPortNames = new Set(filteredServices.map((s) => s.portName));
    const filteredEdges = exportedGraph.edges.filter(
      (edge) =>
        filteredPortNames.has(edge.from) && filteredPortNames.has(edge.to)
    );

    return buildDependencyTree(serviceInfos, filteredEdges);
  }, [filteredServices, exportedGraph.edges]);

  // Handle service selection (e.g., scroll to in list view)
  const handleServiceSelect = useCallback((portName: string) => {
    // Could scroll to service in list view, or highlight it
    console.log("Selected service:", portName);
  }, []);

  // Handle dependency click in list view
  const handleDependencyClick = useCallback(
    (portName: string) => {
      // Set search to the dependency name
      setSearchQuery(portName);
      setDebouncedQuery(portName);
    },
    []
  );

  return (
    <div data-testid="enhanced-services-view" style={viewStyles.container}>
      {/* Search */}
      <ServiceSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={handleClearSearch}
      />

      {/* Filters */}
      <ServiceFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* View Mode Toggle */}
      <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />

      {/* Content */}
      {filteredServices.length === 0 ? (
        <div style={serviceListStyles.emptyState}>
          {services.length === 0
            ? "No services registered."
            : "No services match the current filters."}
        </div>
      ) : viewMode === "list" ? (
        <div style={viewStyles.listContainer}>
          {filteredServices.map((service) => (
            <EnhancedServiceItem
              key={service.portName}
              service={service}
              tracingAPI={tracingAPI}
              onDependencyClick={handleDependencyClick}
            />
          ))}
        </div>
      ) : (
        <div style={viewStyles.treeContainer}>
          <ServiceDependencyTree
            treeNodes={treeNodes}
            tracingAPI={tracingAPI}
            onServiceSelect={handleServiceSelect}
          />
        </div>
      )}
    </div>
  );
}
