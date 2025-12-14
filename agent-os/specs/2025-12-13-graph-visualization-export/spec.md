# Specification: @hex-di/devtools Package

## Goal
Create a new `@hex-di/devtools` package following the TanStack DevTools pattern that provides framework-agnostic graph export functions (JSON, DOT, Mermaid), composable transform utilities, and React-based DevTools UI components for graph visualization and container inspection.

## User Stories
- As a developer, I want to export my dependency graph to DOT or Mermaid format so that I can include visual diagrams in my documentation
- As a developer, I want an embedded DevTools panel in my React app so that I can inspect my DI container structure and dependencies during development

## Specific Requirements

**Export Function: toJSON(graph)**
- Returns `ExportedGraph` with explicit `nodes` and `edges` arrays optimized for visualization tools
- Node structure: `{ id: string, label: string, lifetime: Lifetime }`
- Edge structure: `{ from: string, to: string }` where `from` is the dependent and `to` is the required port
- Output is deterministic (sorted by port name for stable output)
- Pure function with no side effects

**Export Function: toDOT(graph, options?)**
- Returns valid Graphviz DOT format string
- Default output uses `digraph` with `rankdir=TB` and `node [shape=box]`
- Node labels include port name and lifetime (e.g., `"Logger\n(singleton)"`)
- Options: `direction?: 'TB' | 'LR'`, `preset?: 'minimal' | 'styled'`
- Styled preset adds visual differentiation by lifetime (colors or shapes)

**Export Function: toMermaid(graph, options?)**
- Returns valid Mermaid flowchart/graph syntax
- Default uses `graph TD` direction
- Node labels formatted as `PortName["PortName (lifetime)"]`
- Edges use `-->` arrow syntax
- Options: `direction?: 'TD' | 'LR'`

**Transform Utility: filterGraph(graph, predicate)**
- Returns a new `ExportedGraph` (not a Graph object) with nodes/edges filtered
- Predicate receives node and returns boolean
- Built-in filter helpers: `byLifetime(lifetime)`, `byPortName(pattern: RegExp)`
- Composable: `toMermaid(filterGraph(toJSON(graph), byLifetime('singleton')))`

**Transform Utility: relabelPorts(exportedGraph, labelFn)**
- Returns new `ExportedGraph` with transformed node labels
- Label function receives node and returns new label string
- Does not modify node IDs, only display labels
- Useful for stripping prefixes or adding custom annotations

**React DevTools Panel Component**
- `<DevToolsPanel graph={graph} container={container} />` - Embeddable panel
- Displays interactive graph visualization with nodes as adapters and edges as dependencies
- Shows container inspection view: list of ports, adapters, and lifetimes
- Visual differentiation by lifetime scope (color-coded or icon-based)
- Collapsible sections for graph view and container browser

**React DevTools Floating Component**
- `<DevToolsFloating graph={graph} container={container} />` - Toggle-able floating overlay
- Follows TanStack DevTools pattern: small toggle button, expands to full panel
- Position configurable: `position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'`
- Remembers open/closed state in localStorage
- Auto-hides in production builds via `process.env.NODE_ENV` check

**Package Architecture**
- New package: `@hex-di/devtools` with dependencies on `@hex-di/graph`, `@hex-di/runtime`, `@hex-di/ports`
- React 18+ as peer dependency (for UI components)
- Framework-agnostic core exports: `toJSON`, `toDOT`, `toMermaid`, `filterGraph`, `relabelPorts`
- React-specific exports: `DevToolsPanel`, `DevToolsFloating`
- Barrel exports following existing package conventions

**Build and Tree-Shaking**
- Mark package with `"sideEffects": false` in package.json
- Export functions are pure and individually importable
- React components conditionally render `null` in production (`process.env.NODE_ENV === 'production'`)
- Consumers can tree-shake unused exports (e.g., import only `toMermaid` without React)

## Visual Design

No visual assets provided. UI components should follow a minimal, developer-focused aesthetic similar to TanStack Query DevTools.

## Existing Code to Leverage

**serializeGraph from @hex-di/testing**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/testing/src/graph-snapshot.ts`
- Demonstrates pattern for extracting graph metadata from adapters
- Shows how to access `adapter.provides.__portName` and `adapter.requires`
- Implements deterministic sorting for stable output
- New `toJSON` should follow similar extraction pattern but output nodes/edges structure

**createTypedHooks factory from @hex-di/react**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/react/src/create-typed-hooks.tsx`
- Demonstrates factory pattern for creating typed React components
- Shows context-based state management pattern
- DevTools components can optionally follow similar factory pattern for type safety

**Package.json conventions from existing packages**
- All packages use `"type": "module"`, `"sideEffects": false`
- Export maps with `import` and `require` conditions
- Peer dependencies with `peerDependenciesMeta` for optional dependencies
- Follow same structure for `@hex-di/devtools` package.json

**Barrel export pattern from @hex-di/testing**
- Located at `/Users/mohammadalmechkor/Projects/hex-di/packages/testing/src/index.ts`
- Shows pattern for re-exporting types from sibling packages for convenience
- Groups exports by feature area with JSDoc section comments
- DevTools should follow same organization pattern

## Out of Scope
- Browser extension (Chrome DevTools panel integration)
- Resolution tracing or performance profiling
- Instance inspection (viewing actual resolved service values at runtime)
- Time-travel debugging
- Real-time watching or hot reload integration
- Import functionality (parsing DOT/Mermaid back to Graph objects)
- SVG or image file export (consumers can use external tools)
- Custom graph layout algorithms (use library defaults)
- Drag-and-drop graph editing
- Persistence of DevTools state beyond open/closed toggle
