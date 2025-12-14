/**
 * DevToolsPanel React component for HexDI graph visualization.
 *
 * Provides an embeddable panel component for visualizing dependency graphs
 * and inspecting container state. Displays nodes (ports/adapters), edges
 * (dependencies), and allows drilling into adapter details.
 *
 * Supports two display modes:
 * - "tabs" (default): Modern tabbed interface with Graph, Services, Tracing, Inspector tabs
 * - "sections": Legacy CollapsibleSection layout for backward compatibility
 *
 * @packageDocumentation
 */

import React, {
  useState,
  useMemo,
  useCallback,
  type ReactElement,
} from "react";
import type { Port } from "@hex-di/ports";
import type { Graph } from "@hex-di/graph";
import type { Container } from "@hex-di/runtime";
import { TRACING_ACCESS } from "@hex-di/runtime";
import { toJSON } from "../to-json.js";
import type { TracingAPI } from "../tracing/types.js";
import type { ExportedGraph, ExportedNode } from "../types.js";
import {
  panelStyles,
  sectionStyles,
  adapterStyles,
  emptyStyles,
  getLifetimeBadgeStyle,
  getLifetimeClassName,
} from "./styles.js";
import { ContainerInspector } from "./container-inspector.js";
import { TabNavigation, type TabId } from "./tab-navigation.js";
import { ResolutionTracingSection } from "./resolution-tracing-section.js";
import { DependencyGraph } from "./graph-visualization/index.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Display mode for the DevTools panel.
 *
 * - "tabs": Modern tabbed interface with Graph, Services, Tracing, Inspector tabs
 * - "sections": Legacy CollapsibleSection layout for backward compatibility
 */
export type DevToolsPanelMode = "tabs" | "sections";

/**
 * Props for the DevToolsPanel component.
 *
 * @remarks
 * - `graph` is required and provides the dependency graph data
 * - `container` is optional and enables additional runtime inspection features
 * - `mode` controls the display mode (tabs or sections), default is "tabs"
 * - `initialTab` sets the initial active tab when mode is "tabs"
 *
 * @example Basic usage with graph only (tabs mode, default)
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DevView() {
 *   return <DevToolsPanel graph={appGraph} />;
 * }
 * ```
 *
 * @example With container for runtime inspection
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { container } from './container';
 *
 * function DevView() {
 *   return <DevToolsPanel graph={appGraph} container={container} />;
 * }
 * ```
 *
 * @example Legacy sections mode for backward compatibility
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DevView() {
 *   return <DevToolsPanel graph={appGraph} mode="sections" />;
 * }
 * ```
 *
 * @example With initial tab selection
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function DevView() {
 *   return <DevToolsPanel graph={appGraph} mode="tabs" initialTab="tracing" />;
 * }
 * ```
 */
export interface DevToolsPanelProps {
  /** The dependency graph to visualize */
  readonly graph: Graph<Port<unknown, string>>;
  /** Optional container for runtime inspection */
  readonly container?: Container<Port<unknown, string>>;
  /**
   * Display mode for the panel.
   * - "tabs" (default): Modern tabbed interface
   * - "sections": Legacy CollapsibleSection layout
   */
  readonly mode?: DevToolsPanelMode;
  /**
   * Initial active tab when mode is "tabs".
   * @default "graph"
   */
  readonly initialTab?: TabId;
}

// =============================================================================
// Internal Components
// =============================================================================

/**
 * Collapsible section component.
 */
interface CollapsibleSectionProps {
  readonly title: string;
  readonly testIdPrefix: string;
  readonly defaultExpanded?: boolean;
  readonly children: React.ReactNode;
}

function CollapsibleSection({
  title,
  testIdPrefix,
  defaultExpanded = false,
  children,
}: CollapsibleSectionProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div>
      <div
        data-testid={`${testIdPrefix}-header`}
        style={sectionStyles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <span style={sectionStyles.title}>{title}</span>
        <span
          style={{
            ...sectionStyles.chevron,
            ...(isExpanded ? sectionStyles.chevronExpanded : {}),
          }}
        >
          {">"}
        </span>
      </div>
      {isExpanded && (
        <div
          data-testid={`${testIdPrefix}-content`}
          style={sectionStyles.content}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Lifetime badge component with visual differentiation.
 */
interface LifetimeBadgeProps {
  readonly lifetime: string;
  readonly portName: string;
}

function LifetimeBadge({
  lifetime,
  portName,
}: LifetimeBadgeProps): ReactElement {
  return (
    <span
      data-testid={`lifetime-badge-${portName}`}
      className={getLifetimeClassName(lifetime)}
      style={getLifetimeBadgeStyle(lifetime)}
    >
      {lifetime}
    </span>
  );
}

/**
 * Graph view section showing visual dependency graph.
 */
interface GraphViewProps {
  readonly exportedGraph: ExportedGraph;
}

function GraphView({ exportedGraph }: GraphViewProps): ReactElement {
  if (exportedGraph.nodes.length === 0) {
    return (
      <div style={emptyStyles.container}>
        No adapters registered in this graph.
      </div>
    );
  }

  // Transform nodes to include lifetime property required by DependencyGraph
  const graphNodes = exportedGraph.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    lifetime: node.lifetime as "singleton" | "scoped" | "request",
  }));

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <DependencyGraph
        nodes={graphNodes}
        edges={exportedGraph.edges}
        direction="TB"
        showControls={true}
      />
    </div>
  );
}

/**
 * Adapter detail item in container browser.
 */
interface AdapterItemProps {
  readonly node: ExportedNode;
  readonly dependencies: readonly string[];
}

function AdapterItem({ node, dependencies }: AdapterItemProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div data-testid={`adapter-${node.id}`} style={adapterStyles.container}>
      <div
        style={{
          ...adapterStyles.header,
          ...(isExpanded ? adapterStyles.headerExpanded : {}),
        }}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <span style={adapterStyles.portName}>{node.id}</span>
        <LifetimeBadge
          lifetime={node.lifetime}
          portName={`detail-${node.id}`}
        />
      </div>
      {isExpanded && (
        <div style={adapterStyles.details}>
          <div style={adapterStyles.detailRow}>
            <span style={adapterStyles.detailLabel}>Lifetime:</span>
            <span style={adapterStyles.detailValue}>{node.lifetime}</span>
          </div>
          <div style={adapterStyles.detailRow}>
            <span style={adapterStyles.detailLabel}>Dependencies:</span>
            <span
              data-testid={`dependency-list-${node.id}`}
              style={adapterStyles.detailValue}
            >
              {dependencies.length === 0 ? (
                "None"
              ) : (
                <ul style={adapterStyles.dependencyList}>
                  {dependencies.map((dep) => (
                    <li
                      key={dep}
                      data-testid={`dependency-${node.id}-${dep}`}
                      style={adapterStyles.dependencyItem}
                    >
                      {dep}
                    </li>
                  ))}
                </ul>
              )}
            </span>
          </div>
          <div style={adapterStyles.detailRow}>
            <span style={adapterStyles.detailLabel}>Dep Count:</span>
            <span style={adapterStyles.detailValue}>{dependencies.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Container browser section showing adapter details.
 */
interface ContainerBrowserProps {
  readonly exportedGraph: ExportedGraph;
}

function ContainerBrowser({
  exportedGraph,
}: ContainerBrowserProps): ReactElement {
  // Build a map of node id -> dependencies
  const dependencyMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const node of exportedGraph.nodes) {
      map.set(node.id, []);
    }
    for (const edge of exportedGraph.edges) {
      const deps = map.get(edge.from);
      if (deps) {
        deps.push(edge.to);
      }
    }
    return map;
  }, [exportedGraph]);

  if (exportedGraph.nodes.length === 0) {
    return (
      <div style={emptyStyles.container}>
        No adapters registered in this graph.
      </div>
    );
  }

  return (
    <div>
      {exportedGraph.nodes.map((node) => (
        <AdapterItem
          key={node.id}
          node={node}
          dependencies={dependencyMap.get(node.id) ?? []}
        />
      ))}
    </div>
  );
}

// =============================================================================
// DevToolsPanel Component
// =============================================================================

/**
 * DevToolsPanel component for visualizing HexDI dependency graphs.
 *
 * Displays an interactive panel with:
 * - **Graph View**: Visual list of all nodes (ports) with lifetime badges
 *   and dependency edges
 * - **Container Browser**: Collapsible adapter details with port name,
 *   lifetime, and dependency information
 *
 * Supports two display modes:
 * - **Tabs Mode** (default): Modern tabbed interface with Graph, Services,
 *   Tracing, and Inspector tabs
 * - **Sections Mode**: Legacy CollapsibleSection layout for backward compatibility
 *
 * Nodes are visually differentiated by lifetime:
 * - **Singleton**: Green badge
 * - **Scoped**: Blue badge
 * - **Request**: Orange badge
 *
 * @param props - The component props
 * @returns A React element containing the DevTools panel
 *
 * @example Basic usage (tabs mode, default)
 * ```tsx
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
 * @example With container inspection
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 * import { container } from './container';
 *
 * function App() {
 *   return (
 *     <DevToolsPanel
 *       graph={appGraph}
 *       container={container}
 *     />
 *   );
 * }
 * ```
 *
 * @example Legacy sections mode
 * ```tsx
 * import { DevToolsPanel } from '@hex-di/devtools/react';
 * import { appGraph } from './graph';
 *
 * function App() {
 *   return <DevToolsPanel graph={appGraph} mode="sections" />;
 * }
 * ```
 */
export function DevToolsPanel({
  graph,
  container,
  mode = "tabs",
  initialTab = "graph",
}: DevToolsPanelProps): ReactElement {
  // Convert graph to exported format for visualization
  const exportedGraph = useMemo(() => toJSON(graph), [graph]);

  // State for active tab (only used in tabs mode)
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Callback for tab change
  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  // Determine if Inspector tab should be shown
  const showInspector = container !== undefined;

  // Extract tracingAPI from container if it has TRACING_ACCESS
  // This enables the ResolutionTracingSection to display trace data
  const tracingAPI = useMemo((): TracingAPI | undefined => {
    if (container === undefined) {
      return undefined;
    }
    // Access TRACING_ACCESS symbol from the container
    const containerWithTracing = container as { [TRACING_ACCESS]?: TracingAPI };
    return containerWithTracing[TRACING_ACCESS];
  }, [container]);

  // Render sections mode (legacy layout)
  if (mode === "sections") {
    return (
      <div data-testid="devtools-panel" style={panelStyles.container}>
        <div style={panelStyles.header}>HexDI DevTools</div>

        {/* Graph View Section */}
        <CollapsibleSection
          title="Graph View"
          testIdPrefix="graph-view"
          defaultExpanded={true}
        >
          <GraphView exportedGraph={exportedGraph} />
        </CollapsibleSection>

        {/* Container Browser Section */}
        <CollapsibleSection
          title="Container Browser"
          testIdPrefix="container-browser"
          defaultExpanded={false}
        >
          <ContainerBrowser exportedGraph={exportedGraph} />
        </CollapsibleSection>

        {/* Container Inspector Section - Only shown when container is provided */}
        {container !== undefined && (
          <CollapsibleSection
            title="Container Inspector"
            testIdPrefix="container-inspector"
            defaultExpanded={false}
          >
            <ContainerInspector
              container={container}
              exportedGraph={exportedGraph}
            />
          </CollapsibleSection>
        )}

        {/* Resolution Tracing Section */}
        <CollapsibleSection
          title="Resolution Tracing"
          testIdPrefix="resolution-tracing"
          defaultExpanded={false}
        >
          <ResolutionTracingSection
            {...(tracingAPI !== undefined ? { tracingAPI } : {})}
          />
        </CollapsibleSection>
      </div>
    );
  }

  // Render tabs mode (default, new layout)
  return (
    <div data-testid="devtools-panel" style={panelStyles.container}>
      <div style={panelStyles.header}>HexDI DevTools</div>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showInspector={showInspector}
      />

      {/* Tab Content */}
      <div style={panelStyles.content}>
        {activeTab === "graph" && (
          <div
            data-testid="tab-content-graph"
            id="tabpanel-graph"
            role="tabpanel"
            aria-labelledby="tab-graph"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <GraphView exportedGraph={exportedGraph} />
          </div>
        )}

        {activeTab === "services" && (
          <div
            data-testid="tab-content-services"
            id="tabpanel-services"
            role="tabpanel"
            aria-labelledby="tab-services"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <ContainerBrowser exportedGraph={exportedGraph} />
          </div>
        )}

        {activeTab === "tracing" && (
          <div
            data-testid="tab-content-tracing"
            id="tabpanel-tracing"
            role="tabpanel"
            aria-labelledby="tab-tracing"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <ResolutionTracingSection
              {...(tracingAPI !== undefined ? { tracingAPI } : {})}
            />
          </div>
        )}

        {activeTab === "inspector" && container !== undefined && (
          <div
            data-testid="tab-content-inspector"
            id="tabpanel-inspector"
            role="tabpanel"
            aria-labelledby="tab-inspector"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <ContainerInspector
              container={container}
              exportedGraph={exportedGraph}
            />
          </div>
        )}
      </div>
    </div>
  );
}
