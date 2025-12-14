/**
 * ResolvedServices React component for displaying service resolution status.
 *
 * Shows a searchable, filterable list of services with their resolution status,
 * lifetime badges, and expandable details.
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactElement,
} from "react";
import type { Lifetime } from "@hex-di/graph";
import {
  serviceListStyles,
  serviceItemStyles,
  getLifetimeBadgeStyle,
  getLifetimeClassName,
  getStatusIndicatorStyle,
} from "./styles.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Service information for display in the list.
 */
export interface ServiceInfo {
  /** Port name / service ID */
  readonly portName: string;
  /** Service lifetime */
  readonly lifetime: Lifetime;
  /** Whether the service has been resolved (has cached instance) */
  readonly isResolved: boolean;
  /** Whether the service requires a scope to resolve */
  readonly isScopeRequired: boolean;
  /** Resolution timestamp (undefined if not resolved) */
  readonly resolvedAt: number | undefined;
  /** Resolution order (undefined if not resolved) */
  readonly resolutionOrder: number | undefined;
  /** Dependency port names */
  readonly dependencies: readonly string[];
}

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
 * Props for the ResolvedServices component.
 */
export interface ResolvedServicesProps {
  /** Services to display */
  readonly services: readonly ServiceInfo[];
  /** Callback when search query changes (debounced) */
  readonly onSearchChange?: (query: string) => void;
}

// =============================================================================
// ServiceSearch Component
// =============================================================================

interface ServiceSearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
}

/**
 * Search input component with clear button.
 */
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

// =============================================================================
// ServiceFilters Component
// =============================================================================

interface ServiceFiltersProps {
  readonly filters: ServiceFilters;
  readonly onFiltersChange: (filters: ServiceFilters) => void;
}

/**
 * Filter buttons for lifetime and resolution status.
 */
function ServiceFiltersComponent({
  filters,
  onFiltersChange,
}: ServiceFiltersProps): ReactElement {
  const handleLifetimeFilter = (lifetime: Lifetime | null): void => {
    onFiltersChange({ ...filters, lifetime });
  };

  const handleResolvedFilter = (resolved: boolean | null): void => {
    onFiltersChange({ ...filters, resolved });
  };

  const getFilterButtonStyle = (isActive: boolean) => ({
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

// =============================================================================
// ServiceItem Component
// =============================================================================

interface ServiceItemProps {
  readonly service: ServiceInfo;
}

/**
 * Expandable service item row.
 *
 * Shows status indicator, port name, lifetime badge.
 * Expands to show resolution details.
 */
function ServiceItem({ service }: ServiceItemProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusStyle = getStatusIndicatorStyle(
    service.isResolved,
    service.isScopeRequired
  );

  const headerStyle = {
    ...serviceItemStyles.header,
    ...(isExpanded ? serviceItemStyles.headerExpanded : {}),
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div
      data-testid={`service-item-${service.portName}`}
      style={serviceItemStyles.container}
    >
      <div
        style={headerStyle}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <span style={statusStyle} aria-label={service.isResolved ? "Resolved" : "Pending"} />
        <span style={serviceItemStyles.serviceName}>{service.portName}</span>
        <span
          className={getLifetimeClassName(service.lifetime)}
          style={getLifetimeBadgeStyle(service.lifetime)}
        >
          {service.lifetime}
        </span>
      </div>

      {isExpanded && (
        <div
          data-testid={`service-item-${service.portName}-details`}
          style={serviceItemStyles.details}
        >
          <div style={serviceItemStyles.detailRow}>
            <span style={serviceItemStyles.detailLabel}>Status:</span>
            <span style={serviceItemStyles.detailValue}>
              {service.isScopeRequired
                ? "Requires scope"
                : service.isResolved
                  ? "Resolved (cached)"
                  : "Not resolved"}
            </span>
          </div>
          <div style={serviceItemStyles.detailRow}>
            <span style={serviceItemStyles.detailLabel}>Lifetime:</span>
            <span style={serviceItemStyles.detailValue}>{service.lifetime}</span>
          </div>
          {service.isResolved && service.resolvedAt !== undefined && (
            <div style={serviceItemStyles.detailRow}>
              <span style={serviceItemStyles.detailLabel}>Created At:</span>
              <span style={serviceItemStyles.detailValue}>
                {formatTimestamp(service.resolvedAt)}
              </span>
            </div>
          )}
          {service.isResolved && service.resolutionOrder !== undefined && (
            <div style={serviceItemStyles.detailRow}>
              <span style={serviceItemStyles.detailLabel}>Resolution #:</span>
              <span style={serviceItemStyles.detailValue}>
                {service.resolutionOrder}
              </span>
            </div>
          )}
          <div style={serviceItemStyles.detailRow}>
            <span style={serviceItemStyles.detailLabel}>Dependencies:</span>
            <span style={serviceItemStyles.detailValue}>
              {service.dependencies.length === 0
                ? "None"
                : service.dependencies.join(", ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ResolvedServices Component
// =============================================================================

/**
 * ResolvedServices component for displaying service resolution status.
 *
 * Features:
 * - Search input with 300ms debounce
 * - Lifetime filters (All/Singleton/Scoped/Request)
 * - Status filters (Resolved/Pending)
 * - Expandable service items with details
 * - Visual status indicators (filled/empty circles)
 *
 * @param props - The component props
 * @returns A React element containing the services list
 *
 * @example
 * ```tsx
 * const services = buildServiceList(snapshot, exportedGraph);
 *
 * <ResolvedServices services={services} />
 * ```
 */
export function ResolvedServices({
  services,
  onSearchChange,
}: ResolvedServicesProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<ServiceFilters>({
    lifetime: null,
    resolved: null,
  });
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

  // Filter services based on search and filters
  const filteredServices = services.filter((service) => {
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
      // For scoped services viewed from root, they are considered "pending"
      const isEffectivelyResolved = service.isResolved && !service.isScopeRequired;
      if (filters.resolved !== isEffectivelyResolved) {
        return false;
      }
    }

    return true;
  });

  return (
    <div data-testid="resolved-services" style={serviceListStyles.container}>
      <ServiceSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={handleClearSearch}
      />

      <ServiceFiltersComponent filters={filters} onFiltersChange={setFilters} />

      <div data-testid="service-list" style={serviceListStyles.listContainer}>
        {filteredServices.length === 0 ? (
          <div style={serviceListStyles.emptyState}>
            {services.length === 0
              ? "No services registered."
              : "No services match the current filters."}
          </div>
        ) : (
          filteredServices.map((service) => (
            <ServiceItem key={service.portName} service={service} />
          ))
        )}
      </div>
    </div>
  );
}
