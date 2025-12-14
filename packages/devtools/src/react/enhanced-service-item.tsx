/**
 * EnhancedServiceItem React component for rich service display.
 *
 * An expandable service row showing status, lifetime, dependency counts,
 * and detailed information including dependencies, dependents, resolution
 * status, and performance metrics.
 *
 * @packageDocumentation
 */

import React, { useState, type ReactElement, type CSSProperties } from "react";
import type { TracingAPI } from "../tracing/types.js";
import type { ServiceWithRelations } from "./services-tree.js";
import { serviceItemStyles, getLifetimeBadgeStyle } from "./styles.js";
import {
  ServicePerformanceDisplay,
  useServicePerformance,
} from "./service-performance.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for the EnhancedServiceItem component.
 */
export interface EnhancedServiceItemProps {
  /** The service information with relationships */
  readonly service: ServiceWithRelations;
  /** Optional tracing API for performance data */
  readonly tracingAPI?: TracingAPI | undefined;
  /** Callback when a dependency is clicked */
  readonly onDependencyClick?: ((portName: string) => void) | undefined;
  /** Depth in tree (for indentation) - 0 for flat list */
  readonly depth?: number | undefined;
  /** Whether item is in tree view mode */
  readonly isTreeMode?: boolean | undefined;
}

// =============================================================================
// Styles
// =============================================================================

const enhancedStyles: {
  readonly container: CSSProperties;
  readonly header: CSSProperties;
  readonly headerExpanded: CSSProperties;
  readonly depCountBadge: CSSProperties;
  readonly details: CSSProperties;
  readonly section: CSSProperties;
  readonly sectionHeader: CSSProperties;
  readonly listContainer: CSSProperties;
  readonly listItem: CSSProperties;
  readonly listItemClickable: CSSProperties;
  readonly emptyText: CSSProperties;
  readonly statusRow: CSSProperties;
  readonly statusLabel: CSSProperties;
  readonly statusValue: CSSProperties;
  readonly timestamp: CSSProperties;
} = {
  container: {
    ...serviceItemStyles.container,
    marginBottom: "4px",
  },
  header: {
    ...serviceItemStyles.header,
    flexWrap: "wrap",
  },
  headerExpanded: {
    ...serviceItemStyles.header,
    ...serviceItemStyles.headerExpanded,
  },
  depCountBadge: {
    fontSize: "10px",
    padding: "2px 6px",
    borderRadius: "10px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    fontWeight: 500,
  },
  details: {
    ...serviceItemStyles.details,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  sectionHeader: {
    fontSize: "10px",
    fontWeight: 600,
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "4px",
  },
  listContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  listItem: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
    backgroundColor: "var(--hex-devtools-bg, #1e1e2e)",
    color: "var(--hex-devtools-accent, #89b4fa)",
  },
  listItemClickable: {
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  emptyText: {
    fontSize: "11px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
    fontStyle: "italic",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
  },
  statusLabel: {
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
  statusValue: {
    color: "var(--hex-devtools-text, #cdd6f4)",
    fontWeight: 500,
  },
  timestamp: {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "var(--hex-devtools-text-muted, #a6adc8)",
  },
};

// =============================================================================
// Helper Components
// =============================================================================

interface DependencyListProps {
  readonly items: readonly string[];
  readonly onItemClick?: ((name: string) => void) | undefined;
  readonly emptyText: string;
}

function DependencyList({
  items,
  onItemClick,
  emptyText,
}: DependencyListProps): ReactElement {
  if (items.length === 0) {
    return <span style={enhancedStyles.emptyText}>{emptyText}</span>;
  }

  return (
    <div style={enhancedStyles.listContainer}>
      {items.map((name) => (
        <span
          key={name}
          style={{
            ...enhancedStyles.listItem,
            ...(onItemClick !== undefined
              ? enhancedStyles.listItemClickable
              : {}),
          }}
          onClick={
            onItemClick !== undefined ? () => onItemClick(name) : undefined
          }
          onKeyDown={
            onItemClick !== undefined
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onItemClick(name);
                  }
                }
              : undefined
          }
          role={onItemClick !== undefined ? "button" : undefined}
          tabIndex={onItemClick !== undefined ? 0 : undefined}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Enhanced service item with rich details and performance metrics.
 *
 * Features:
 * - Status indicator (resolved/pending/scope-required)
 * - Port name with lifetime badge
 * - Dependency count badge
 * - Expandable details showing:
 *   - Dependencies list (clickable)
 *   - Dependents list (clickable)
 *   - Resolution status with timestamp
 *   - Performance metrics (if tracing available)
 *
 * @param props - The component props
 * @returns A React element containing the service item
 *
 * @example
 * ```tsx
 * <EnhancedServiceItem
 *   service={serviceWithRelations}
 *   tracingAPI={tracingAPI}
 *   onDependencyClick={(name) => highlightService(name)}
 * />
 * ```
 */
export function EnhancedServiceItem({
  service,
  tracingAPI,
  onDependencyClick,
  depth = 0,
  isTreeMode = false,
}: EnhancedServiceItemProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const performance = useServicePerformance(
    service.portName,
    tracingAPI,
    100
  );

  const headerStyle = isExpanded
    ? enhancedStyles.headerExpanded
    : enhancedStyles.header;

  const containerStyle: CSSProperties = {
    ...enhancedStyles.container,
    marginLeft: isTreeMode ? `${depth * 24}px` : 0,
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

  const getStatusText = (): string => {
    if (service.isScopeRequired) {
      return "Requires scope";
    }
    if (service.isResolved) {
      return "Resolved (cached)";
    }
    return "Not resolved";
  };

  const totalDeps = service.dependsOn.length;
  const totalDependents = service.dependents.length;

  return (
    <div
      data-testid={`enhanced-service-item-${service.portName}`}
      style={containerStyle}
    >
      <div
        style={headerStyle}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <span style={serviceItemStyles.serviceName}>{service.portName}</span>

        {/* Dependency count badge */}
        {totalDeps > 0 && (
          <span
            style={enhancedStyles.depCountBadge}
            title={`${totalDeps} dependenc${totalDeps === 1 ? "y" : "ies"}`}
          >
            {totalDeps} dep{totalDeps !== 1 ? "s" : ""}
          </span>
        )}

        {/* Dependents count badge */}
        {totalDependents > 0 && (
          <span
            style={{
              ...enhancedStyles.depCountBadge,
              backgroundColor: "var(--hex-devtools-scoped, #89b4fa)",
              color: "#1e1e2e",
            }}
            title={`Used by ${totalDependents} service${totalDependents === 1 ? "" : "s"}`}
          >
            {totalDependents} user{totalDependents !== 1 ? "s" : ""}
          </span>
        )}

        <span style={getLifetimeBadgeStyle(service.lifetime)}>
          {service.lifetime}
        </span>
      </div>

      {isExpanded && (
        <div
          data-testid={`enhanced-service-item-${service.portName}-details`}
          style={enhancedStyles.details}
        >
          {/* Status Section */}
          <div style={enhancedStyles.section}>
            <div style={enhancedStyles.sectionHeader}>Status</div>
            <div style={enhancedStyles.statusRow}>
              <span style={enhancedStyles.statusLabel}>State:</span>
              <span style={enhancedStyles.statusValue}>{getStatusText()}</span>
            </div>
            <div style={enhancedStyles.statusRow}>
              <span style={enhancedStyles.statusLabel}>Lifetime:</span>
              <span style={enhancedStyles.statusValue}>{service.lifetime}</span>
            </div>
            {service.isResolved && service.resolvedAt !== undefined && (
              <div style={enhancedStyles.statusRow}>
                <span style={enhancedStyles.statusLabel}>Created At:</span>
                <span style={enhancedStyles.timestamp}>
                  {formatTimestamp(service.resolvedAt)}
                </span>
              </div>
            )}
            {service.isResolved && service.resolutionOrder !== undefined && (
              <div style={enhancedStyles.statusRow}>
                <span style={enhancedStyles.statusLabel}>Resolution #:</span>
                <span style={enhancedStyles.statusValue}>
                  {service.resolutionOrder}
                </span>
              </div>
            )}
          </div>

          {/* Dependencies Section */}
          <div style={enhancedStyles.section}>
            <div style={enhancedStyles.sectionHeader}>
              Dependencies ({service.dependsOn.length})
            </div>
            <DependencyList
              items={service.dependsOn}
              onItemClick={onDependencyClick}
              emptyText="No dependencies"
            />
          </div>

          {/* Dependents Section */}
          <div style={enhancedStyles.section}>
            <div style={enhancedStyles.sectionHeader}>
              Used By ({service.dependents.length})
            </div>
            <DependencyList
              items={service.dependents}
              onItemClick={onDependencyClick}
              emptyText="No services depend on this"
            />
          </div>

          {/* Performance Section */}
          {performance !== null && (
            <div style={enhancedStyles.section}>
              <div style={enhancedStyles.sectionHeader}>Performance</div>
              <ServicePerformanceDisplay performance={performance} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
