/**
 * @hex-di/devtools/react - React DevTools Components for HexDI
 *
 * This subpath provides React-specific DevTools components for visualizing
 * and inspecting HexDI dependency graphs at runtime. Import from
 * `@hex-di/devtools/react` to access these components.
 *
 * ## Key Components
 *
 * - **DevToolsPanel**: Full panel component for graph visualization and
 *   container inspection. Embed directly in your app layout.
 *
 * - **DevToolsFloating**: Floating toggle button that expands to show
 *   the DevTools panel. Auto-hides in production builds.
 *
 * ## Quick Start
 *
 * @example DevToolsFloating (recommended for development)
 * ```typescript
 * import { DevToolsFloating } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { container } from './container';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating
 *         graph={appGraph}
 *         container={container}
 *         position="bottom-right"
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * @example DevToolsPanel (for embedding in layouts)
 * ```typescript
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DeveloperView() {
 *   return (
 *     <div className="dev-layout">
 *       <MainContent />
 *       <aside className="dev-sidebar">
 *         <DevToolsPanel graph={appGraph} />
 *       </aside>
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Features
 *
 * - **Graph Visualization**: Visual representation of dependency graph
 *   with nodes colored by lifetime (singleton, scoped, request).
 *
 * - **Container Inspection**: Browse registered ports, view adapter
 *   configurations, and inspect dependency relationships.
 *
 * - **Collapsible Sections**: Organize information into collapsible
 *   sections for a clean developer experience.
 *
 * - **Production Safety**: DevToolsFloating automatically returns null
 *   in production mode (NODE_ENV === 'production').
 *
 * - **State Persistence**: DevToolsFloating remembers open/closed state
 *   across page reloads via localStorage.
 *
 * @packageDocumentation
 */

// =============================================================================
// Re-exports from Main Package (for convenience)
// =============================================================================

/**
 * Re-export types from main devtools package for convenience.
 * Consumers can import everything they need from this single entry point.
 */
export type { Graph, Adapter, Lifetime, Container, Scope } from "../index.js";

// =============================================================================
// DevToolsPanel Component (Task Group 7)
// =============================================================================

/**
 * DevToolsPanel component for embedding graph visualization in layouts.
 *
 * Displays an interactive panel with:
 * - Graph view showing all nodes (ports) with lifetime badges
 * - Dependency edges visualization
 * - Container browser with collapsible adapter details
 *
 * Supports two display modes:
 * - "tabs" (default): Modern tabbed interface with Graph, Services, Tracing, Inspector tabs
 * - "sections": Legacy CollapsibleSection layout for backward compatibility
 *
 * @see {@link DevToolsPanelProps} - Component props interface
 * @see {@link DevToolsPanelMode} - Display mode type
 *
 * @example Basic usage (tabs mode)
 * ```typescript
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DeveloperView() {
 *   return (
 *     <aside className="dev-sidebar">
 *       <DevToolsPanel graph={appGraph} />
 *     </aside>
 *   );
 * }
 * ```
 *
 * @example Legacy sections mode
 * ```typescript
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DeveloperView() {
 *   return <DevToolsPanel graph={appGraph} mode="sections" />;
 * }
 * ```
 */
export { DevToolsPanel } from "./devtools-panel.js";
export type { DevToolsPanelProps, DevToolsPanelMode } from "./devtools-panel.js";

// =============================================================================
// DevToolsFloating Component (Task Group 8)
// =============================================================================

/**
 * DevToolsFloating component for toggle-able DevTools overlay.
 *
 * Renders a small floating toggle button that expands to show the full
 * DevToolsPanel when clicked. The open/closed state is persisted in
 * localStorage so it remembers across page reloads.
 *
 * In production mode (when `process.env.NODE_ENV === 'production'`),
 * this component returns `null` to ensure DevTools are not visible
 * in production builds.
 *
 * @see {@link DevToolsFloatingProps} - Component props interface
 * @see {@link DevToolsPosition} - Position type for the toggle button
 *
 * @example Basic usage
 * ```typescript
 * import { DevToolsFloating } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating graph={appGraph} position="bottom-right" />
 *     </>
 *   );
 * }
 * ```
 *
 * @example All corner positions
 * ```typescript
 * // Bottom-right (default)
 * <DevToolsFloating graph={graph} position="bottom-right" />
 *
 * // Bottom-left
 * <DevToolsFloating graph={graph} position="bottom-left" />
 *
 * // Top-right
 * <DevToolsFloating graph={graph} position="top-right" />
 *
 * // Top-left
 * <DevToolsFloating graph={graph} position="top-left" />
 * ```
 */
export { DevToolsFloating } from "./devtools-floating.js";
export type {
  DevToolsFloatingProps,
  DevToolsPosition,
} from "./devtools-floating.js";

// =============================================================================
// Container Inspector Components (Task Group 4)
// =============================================================================

/**
 * ContainerInspector component for runtime container state inspection.
 *
 * Provides a comprehensive view of container state including:
 * - Scope hierarchy tree visualization
 * - Resolved services list with filters and search
 * - Auto-refresh polling support
 *
 * @see {@link ContainerInspectorProps} - Component props interface
 */
export { ContainerInspector } from "./container-inspector.js";
export type { ContainerInspectorProps } from "./container-inspector.js";

/**
 * ScopeHierarchy component for visualizing scope tree structure.
 *
 * @see {@link ScopeHierarchyProps} - Component props interface
 */
export { ScopeHierarchy } from "./scope-hierarchy.js";
export type { ScopeHierarchyProps } from "./scope-hierarchy.js";

/**
 * ResolvedServices component for displaying service resolution status.
 *
 * @see {@link ResolvedServicesProps} - Component props interface
 * @see {@link ServiceInfo} - Service information structure
 * @see {@link ServiceFilters} - Filter state structure
 */
export { ResolvedServices } from "./resolved-services.js";
export type {
  ResolvedServicesProps,
  ServiceInfo,
  ServiceFilters,
} from "./resolved-services.js";

/**
 * EnhancedServicesView component for comprehensive service exploration.
 *
 * Combines list and tree views with search, filters, and view mode toggle.
 * Provides dependency relationships and performance data.
 *
 * @see {@link EnhancedServicesViewProps} - Component props interface
 * @see {@link ServicesViewMode} - View mode type
 */
export { EnhancedServicesView } from "./enhanced-services-view.js";
export type {
  EnhancedServicesViewProps,
  ServicesViewMode,
} from "./enhanced-services-view.js";

/**
 * ServiceDependencyTree component for hierarchical dependency visualization.
 *
 * Displays services in a tree structure based on their dependency relationships.
 *
 * @see {@link ServiceDependencyTreeProps} - Component props interface
 */
export { ServiceDependencyTree } from "./service-dependency-tree.js";
export type { ServiceDependencyTreeProps } from "./service-dependency-tree.js";

/**
 * EnhancedServiceItem component for rich service display.
 *
 * Expandable row showing status, lifetime, dependency counts, and details.
 *
 * @see {@link EnhancedServiceItemProps} - Component props interface
 */
export { EnhancedServiceItem } from "./enhanced-service-item.js";
export type { EnhancedServiceItemProps } from "./enhanced-service-item.js";

/**
 * ServicePerformance components for per-service metrics display.
 *
 * @see {@link ServicePerformanceInfoProps} - Component props interface
 * @see {@link ServicePerformance} - Performance metrics structure
 */
export {
  ServicePerformanceInfo,
  ServicePerformanceDisplay,
  useServicePerformance,
  calculateServicePerformance,
} from "./service-performance.js";
export type {
  ServicePerformanceInfoProps,
  ServicePerformanceDisplayProps,
  ServicePerformance,
} from "./service-performance.js";

/**
 * Service tree building utilities.
 *
 * @see {@link ServiceTreeNode} - Tree node structure
 * @see {@link ServiceWithRelations} - Enhanced service info
 */
export {
  buildDependencyTree,
  enrichServicesWithRelations,
  buildDependentsMap,
  buildDependenciesMap,
  getVisibleServiceIds,
  getAllExpandableIds,
  findParentServiceId,
  countTreeNodes,
} from "./services-tree.js";
export type {
  ServiceTreeNode,
  ServiceWithRelations,
} from "./services-tree.js";

// =============================================================================
// Tabbed Interface Components (Task Group 6)
// =============================================================================

/**
 * TabNavigation component for the DevTools panel tabbed interface.
 *
 * Provides keyboard-accessible tab navigation for switching between
 * Graph, Services, Tracing, and Inspector views.
 *
 * @see {@link TabNavigationProps} - Component props interface
 * @see {@link TabId} - Tab identifier type
 */
export { TabNavigation } from "./tab-navigation.js";
export type { TabNavigationProps, TabId } from "./tab-navigation.js";

/**
 * ResolutionTracingSection component for the Tracing tab.
 *
 * Container component providing sub-view tabs for Timeline, Tree,
 * and Summary views within the tracing feature.
 *
 * @see {@link ResolutionTracingSectionProps} - Component props interface
 * @see {@link TracingViewId} - Tracing view identifier type
 */
export { ResolutionTracingSection } from "./resolution-tracing-section.js";
export type {
  ResolutionTracingSectionProps,
  TracingViewId,
} from "./resolution-tracing-section.js";

// =============================================================================
// Controls Bar Component (Task Group 7)
// =============================================================================

/**
 * TracingControlsBar component for filtering and controlling trace display.
 *
 * Provides search, filter buttons, sort dropdown, threshold slider,
 * recording indicator, and active filters bar.
 *
 * @see {@link TracingControlsBarProps} - Component props interface
 * @see {@link TracingFilters} - Filter state interface
 * @see {@link TracingSortOption} - Sort option type
 * @see {@link TracingStatusFilter} - Cache status filter type
 * @see {@link TracingExportFormat} - Export format type
 */
export { TracingControlsBar } from "./tracing-controls-bar.js";
export type {
  TracingControlsBarProps,
  TracingFilters,
  TracingSortOption,
  TracingStatusFilter,
  TracingExportFormat,
} from "./tracing-controls-bar.js";

// =============================================================================
// Timeline View Components (Task Group 8)
// =============================================================================

/**
 * TimelineView component for horizontal time-axis visualization of traces.
 *
 * Displays resolution events as horizontal bars on a time axis with:
 * - Time ruler with auto-scaling, major/minor ticks, threshold marker
 * - Color-coded bars: green (<10ms), yellow (10ms-threshold), red (>=threshold), cyan (cache hit)
 * - Expandable rows showing trace details
 * - Zoom controls: [+] [-] [Fit All] [Focus Slow]
 * - Pin icon for pinned traces
 * - Footer with summary statistics
 *
 * @see {@link TimelineViewProps} - Component props interface
 */
export { TimelineView } from "./timeline-view.js";
export type { TimelineViewProps } from "./timeline-view.js";

/**
 * TimelineRow component for displaying a single trace in the timeline.
 *
 * Shows order badge, port name, duration bar, lifetime badge, status indicators,
 * and expandable details panel with trace information.
 *
 * @see {@link TimelineRowProps} - Component props interface
 */
export { TimelineRow } from "./timeline-row.js";
export type { TimelineRowProps } from "./timeline-row.js";

/**
 * TimeRuler component for the timeline header.
 *
 * Displays a time ruler with auto-scaling tick intervals,
 * major/minor ticks, time labels, and threshold marker.
 *
 * @see {@link TimeRulerProps} - Component props interface
 */
export { TimeRuler } from "./time-ruler.js";
export type { TimeRulerProps } from "./time-ruler.js";

// =============================================================================
// Tree View Component (Task Group 9)
// =============================================================================

/**
 * TreeView component for hierarchical dependency chain visualization.
 *
 * Displays resolution traces in a tree structure grouped by root resolution,
 * with expand/collapse controls, tree connectors, self/total time display,
 * visual states for cached and slow traces, and keyboard navigation.
 *
 * @see {@link TreeViewProps} - Component props interface
 * @see {@link TimeDisplayMode} - Time display mode type
 */
export { TreeView } from "./tree-view.js";
export type { TreeViewProps, TimeDisplayMode } from "./tree-view.js";

// =============================================================================
// Summary Stats View Component (Task Group 10)
// =============================================================================

/**
 * SummaryStatsView component for aggregate performance metrics.
 *
 * Displays overview cards, duration distribution, slowest services,
 * lifetime breakdown, and cache efficiency visualization.
 *
 * @see {@link SummaryStatsViewProps} - Component props interface
 */
export { SummaryStatsView } from "./summary-stats-view.js";
export type { SummaryStatsViewProps } from "./summary-stats-view.js";

// =============================================================================
// Graph Visualization Components
// =============================================================================

/**
 * DependencyGraph component for interactive visual dependency graph.
 *
 * Renders a visual node-based dependency graph with:
 * - Hierarchical layout using Dagre algorithm
 * - Interactive zoom and pan with D3
 * - Hover highlighting of connected dependencies
 * - Click selection with focus
 * - Tooltips showing node details
 * - Lifetime-based color coding (singleton=green, scoped=blue, request=orange)
 *
 * @see {@link DependencyGraphProps} - Component props interface
 *
 * @example Basic usage
 * ```typescript
 * import { DependencyGraph } from '@hex-di/devtools/react';
 *
 * <DependencyGraph
 *   nodes={[
 *     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 *     { id: 'UserService', label: 'UserService', lifetime: 'scoped' },
 *   ]}
 *   edges={[
 *     { from: 'UserService', to: 'Logger' },
 *   ]}
 *   direction="TB"
 *   onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
 * />
 * ```
 */
export { DependencyGraph } from "./graph-visualization/index.js";
export type { DependencyGraphProps } from "./graph-visualization/index.js";

/**
 * GraphRenderer component for low-level SVG rendering with D3 zoom.
 *
 * Used internally by DependencyGraph but exported for advanced customization.
 */
export { GraphRenderer } from "./graph-visualization/index.js";

/**
 * Layout utilities for computing graph positions.
 *
 * - computeLayout: Computes node positions using Dagre
 * - generateEdgePath: Creates SVG path strings for edges
 * - findConnectedNodes/findConnectedEdges: For highlighting
 */
export {
  computeLayout,
  generateEdgePath,
  findConnectedNodes,
  findConnectedEdges,
} from "./graph-visualization/index.js";
export type {
  LayoutConfig,
  InputNode,
  InputEdge,
} from "./graph-visualization/index.js";

/**
 * Graph visualization types.
 */
export type {
  Point,
  PositionedNode,
  PositionedEdge,
  LayoutResult,
  GraphDirection,
  GraphInteractionState,
  TransformState,
} from "./graph-visualization/index.js";
export { createEdgeKey, DEFAULT_TRANSFORM } from "./graph-visualization/index.js";

/**
 * Graph styling utilities.
 */
export {
  graphContainerStyles,
  graphNodeStyles,
  graphEdgeStyles,
  graphControlsStyles,
  tooltipStyles,
  getLifetimeStrokeVar,
  LIFETIME_COLORS,
} from "./graph-visualization/index.js";
