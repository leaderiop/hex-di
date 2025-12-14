/**
 * @hex-di/devtools - Graph Visualization and DevTools for HexDI
 *
 * Provides graph visualization export utilities and React DevTools components
 * for HexDI dependency injection library. Export dependency graphs to JSON,
 * DOT (Graphviz), and Mermaid formats for documentation, and visualize
 * container state with React DevTools components.
 *
 * ## Key Features
 *
 * - **toJSON**: Export dependency graphs to a JSON-serializable format
 *   with nodes (ports) and edges (dependencies).
 *
 * - **toDOT**: Generate Graphviz DOT format for professional graph
 *   visualization with configurable styling and layout direction.
 *
 * - **toMermaid**: Generate Mermaid flowchart syntax for easy embedding
 *   in Markdown documentation and GitHub README files.
 *
 * - **Transform Utilities**: Filter and transform exported graphs with
 *   composable utilities like filterGraph, byLifetime, and relabelPorts.
 *
 * - **React DevTools**: Floating DevTools panel for runtime graph
 *   visualization and container inspection (via @hex-di/devtools/react).
 *
 * ## Quick Start
 *
 * @example Export to JSON format
 * ```typescript
 * import { toJSON } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const exported = toJSON(appGraph);
 * console.log(exported);
 * // {
 * //   nodes: [
 * //     { id: 'Logger', label: 'Logger', lifetime: 'singleton' },
 * //     { id: 'UserService', label: 'UserService', lifetime: 'scoped' }
 * //   ],
 * //   edges: [
 * //     { from: 'UserService', to: 'Logger' }
 * //   ]
 * // }
 * ```
 *
 * @example Export to DOT format
 * ```typescript
 * import { toDOT } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const dot = toDOT(appGraph);
 * console.log(dot);
 * // digraph DependencyGraph {
 * //   rankdir=TB;
 * //   node [shape=box];
 * //   "Logger" [label="Logger\n(singleton)"];
 * //   "UserService" [label="UserService\n(scoped)"];
 * //   "UserService" -> "Logger";
 * // }
 * ```
 *
 * @example Export to Mermaid format
 * ```typescript
 * import { toMermaid } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const mermaid = toMermaid(appGraph);
 * console.log(mermaid);
 * // graph TD
 * //   Logger["Logger (singleton)"]
 * //   UserService["UserService (scoped)"]
 * //   UserService --> Logger
 * ```
 *
 * @example Filter and transform
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, toMermaid } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * // Export only singleton services
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const mermaid = toMermaid(singletons);
 * ```
 *
 * @example React DevTools (see @hex-di/devtools/react)
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
 * @packageDocumentation
 */

// =============================================================================
// Re-exports from Sibling Packages
// =============================================================================

/**
 * Re-export types from @hex-di/ports for consumer convenience.
 *
 * These types are commonly used alongside devtools utilities for
 * working with port tokens and service types.
 */
export type { Port, InferService, InferPortName } from "@hex-di/ports";

/**
 * Re-export types from @hex-di/graph for consumer convenience.
 *
 * These types are commonly used alongside devtools utilities for
 * working with graphs, adapters, and lifetimes.
 */
export type {
  Graph,
  Adapter,
  Lifetime,
  InferAdapterProvides,
  InferAdapterRequires,
  InferAdapterLifetime,
  ResolvedDeps,
} from "@hex-di/graph";

/**
 * Re-export types from @hex-di/runtime for consumer convenience.
 *
 * These types are commonly used alongside devtools utilities for
 * container inspection and scope management.
 */
export type {
  Container,
  Scope,
  ContainerInspector,
  ContainerSnapshot,
  SingletonEntry,
  ScopeTree,
} from "@hex-di/runtime";

/**
 * Re-export createInspector from @hex-di/runtime for container inspection.
 */
export { createInspector } from "@hex-di/runtime";

// =============================================================================
// Core Types (Task Group 2)
// =============================================================================

/**
 * Core types for exported graph data structures.
 *
 * These types define the serializable representation of dependency graphs
 * used by all export functions (toJSON, toDOT, toMermaid) and transform
 * utilities (filterGraph, relabelPorts).
 *
 * @see {@link ExportedNode} - Individual node in the exported graph
 * @see {@link ExportedEdge} - Dependency relationship between nodes
 * @see {@link ExportedGraph} - Complete exported graph structure
 * @see {@link DOTOptions} - Configuration for DOT format export
 * @see {@link MermaidOptions} - Configuration for Mermaid format export
 * @see {@link NodePredicate} - Filter predicate for nodes
 * @see {@link LabelTransform} - Transform function for node labels
 */
export type {
  ExportedNode,
  ExportedEdge,
  ExportedGraph,
  DOTOptions,
  MermaidOptions,
  NodePredicate,
  LabelTransform,
} from "./types.js";

// =============================================================================
// Export Functions (Task Group 3)
// =============================================================================

/**
 * Export toJSON function for converting Graph to ExportedGraph.
 *
 * @see {@link toJSON} - Converts a dependency graph to JSON-serializable format
 */
export { toJSON } from "./to-json.js";

// =============================================================================
// Export Functions (Task Group 4)
// =============================================================================

/**
 * Export toDOT function for converting Graph to Graphviz DOT format.
 *
 * Generates valid Graphviz DOT syntax that can be rendered with Graphviz tools
 * or embedded in documentation. Supports configurable layout direction and
 * visual styling presets.
 *
 * @see {@link toDOT} - Converts a dependency graph to DOT format string
 *
 * @example Basic usage
 * ```typescript
 * import { toDOT } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const dot = toDOT(appGraph);
 * // digraph DependencyGraph {
 * //   rankdir=TB;
 * //   node [shape=box];
 * //   "Logger" [label="Logger\n(singleton)"];
 * //   "UserService" -> "Logger";
 * // }
 * ```
 *
 * @example With styled preset
 * ```typescript
 * const dot = toDOT(appGraph, {
 *   direction: 'LR',
 *   preset: 'styled'
 * });
 * ```
 */
export { toDOT } from "./to-dot.js";

// =============================================================================
// Export Functions (Task Group 5)
// =============================================================================

/**
 * Export toMermaid function for converting Graph to Mermaid flowchart syntax.
 *
 * Produces valid Mermaid syntax suitable for embedding in Markdown documentation,
 * GitHub README files, or any Mermaid-compatible visualization tool.
 *
 * @see {@link toMermaid} - Converts a dependency graph to Mermaid format
 *
 * @example Basic usage
 * ```typescript
 * import { toMermaid } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const mermaid = toMermaid(appGraph);
 * console.log(mermaid);
 * // graph TD
 * //   Logger["Logger (singleton)"]
 * //   UserService["UserService (scoped)"]
 * //   UserService --> Logger
 * ```
 *
 * @example With direction option
 * ```typescript
 * const mermaid = toMermaid(appGraph, { direction: 'LR' });
 * // graph LR
 * //   Logger["Logger (singleton)"]
 * //   ...
 * ```
 *
 * @example With ExportedGraph input (after filtering)
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, toMermaid } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const mermaid = toMermaid(singletons);
 * ```
 */
export { toMermaid } from "./to-mermaid.js";

// =============================================================================
// Transform Utilities (Task Group 6)
// =============================================================================

/**
 * Export filterGraph and filter helper functions for graph transformation.
 *
 * These composable utilities allow filtering exported graphs by various
 * criteria such as lifetime and port name patterns.
 *
 * @see {@link filterGraph} - Filter nodes by predicate, auto-cleans edges
 * @see {@link byLifetime} - Create predicate to filter by lifetime
 * @see {@link byPortName} - Create predicate to filter by port name regex
 *
 * @example Filter to singleton services only
 * ```typescript
 * import { toJSON, filterGraph, byLifetime } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * ```
 *
 * @example Filter by port name pattern
 * ```typescript
 * import { toJSON, filterGraph, byPortName } from '@hex-di/devtools';
 *
 * const services = filterGraph(toJSON(appGraph), byPortName(/Service$/));
 * ```
 *
 * @example Chain multiple filters
 * ```typescript
 * // Filter to scoped services ending with "Service"
 * const scopedServices = filterGraph(
 *   filterGraph(exported, byLifetime('scoped')),
 *   byPortName(/Service$/)
 * );
 * ```
 *
 * @example Combine with custom predicate
 * ```typescript
 * const filtered = filterGraph(exported, (node) =>
 *   node.lifetime === 'singleton' && node.id.startsWith('App.')
 * );
 * ```
 */
export { filterGraph, byLifetime, byPortName } from "./filter-graph.js";

/**
 * Export relabelPorts function for transforming node labels.
 *
 * Transform node labels in exported graphs while preserving node IDs
 * for edge reference integrity. Useful for customizing visualization output.
 *
 * @see {@link relabelPorts} - Transform node labels with custom function
 *
 * @example Add lifetime indicator to labels
 * ```typescript
 * import { toJSON, relabelPorts, toMermaid } from '@hex-di/devtools';
 *
 * const relabeled = relabelPorts(toJSON(appGraph), (node) =>
 *   `${node.label} [${node.lifetime}]`
 * );
 * const mermaid = toMermaid(relabeled);
 * ```
 *
 * @example Strip common prefix from labels
 * ```typescript
 * const cleaned = relabelPorts(exported, (node) =>
 *   node.label.replace('App.Services.', '')
 * );
 * ```
 *
 * @example Chain with filterGraph
 * ```typescript
 * import { toJSON, filterGraph, byLifetime, relabelPorts, toMermaid } from '@hex-di/devtools';
 *
 * const singletons = filterGraph(toJSON(appGraph), byLifetime('singleton'));
 * const relabeled = relabelPorts(singletons, (n) => `[S] ${n.label}`);
 * const mermaid = toMermaid(relabeled);
 * ```
 */
export { relabelPorts } from "./relabel-ports.js";

// =============================================================================
// React DevTools Components
// =============================================================================

/**
 * Export React DevTools components from the package root.
 *
 * These components provide runtime graph visualization and container inspection
 * in React applications.
 *
 * @see {@link DevToolsFloating} - Floating DevTools panel for development
 * @see {@link DevToolsPanel} - Embeddable DevTools panel component
 *
 * @example Basic usage with DevToolsFloating
 * ```typescript
 * import { DevToolsFloating } from '@hex-di/devtools';
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
 */
export { DevToolsFloating, DevToolsPanel } from "./react/index.js";

// =============================================================================
// Tracing
// =============================================================================

/**
 * Export tracing utilities for performance monitoring.
 *
 * @see {@link createTracingContainer} - Wrap a container with tracing capabilities
 * @see {@link TracingAPI} - API for accessing trace data
 * @see {@link TraceEntry} - Individual trace entry data structure
 *
 * @example Enable tracing for DevTools
 * ```typescript
 * import { createContainer } from '@hex-di/runtime';
 * import { DevToolsFloating, createTracingContainer } from '@hex-di/devtools';
 * import { appGraph } from './graph';
 *
 * const baseContainer = createContainer(appGraph);
 * const container = createTracingContainer(baseContainer);
 *
 * function App() {
 *   return (
 *     <>
 *       <MainApp />
 *       <DevToolsFloating graph={appGraph} container={container} />
 *     </>
 *   );
 * }
 * ```
 */
export { createTracingContainer } from "./tracing/index.js";
export type {
  TracingContainer,
  TracingContainerOptions,
  TracingAPI,
  TraceEntry,
  TraceFilter,
  TraceStats,
  TraceCollector,
  TraceRetentionPolicy,
} from "./tracing/index.js";
