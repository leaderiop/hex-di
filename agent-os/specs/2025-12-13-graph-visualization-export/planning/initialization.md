# Spec Initialization

## Feature Name
@hex-di/devtools Package

## Description
Full DevTools package following TanStack-style architecture. Includes graph export to JSON, DOT (Graphviz), and Mermaid formats, plus React DevTools panel for interactive graph visualization and container inspection.

## Context
This is roadmap item #17 from the HexDI product roadmap ("Graph Visualization Export"), expanded based on research of TanStack DevTools, Redux DevTools, Angular DevTools, and React DevTools. It follows the completion of the core framework (ports, graph, runtime), React integration, and testing utilities. This feature is part of the developer experience tooling layer.

## Scope Evolution
Originally scoped as simple export functions, expanded to full DevTools package (Option B: Full DevTools Package TanStack-style) based on architecture analysis.

## Phase 1 MVP Components

### 1. Export Functions (Framework-Agnostic Core)
- `toJSON(graph)` - ExportedGraph (nodes/edges structure)
- `toDOT(graph, options?)` - Graphviz DOT format string
- `toMermaid(graph, options?)` - Mermaid diagram string
- Transform utilities: `filterGraph()`, `relabelPorts()`

### 2. React DevTools Panel
- `<DevToolsPanel>` - Embeddable panel component
- `<DevToolsFloating>` - Toggle-able floating overlay (TanStack-style)
- Interactive graph visualization
- Container inspection UI

### 3. Core Inspection (Framework-Agnostic)
- Graph analyzer
- Container inspector
- Basic scope tree view

## Initial Analysis

### Current Graph Type Structure (@hex-di/graph)
- `Graph<TProvides>` contains:
  - `adapters: readonly Adapter[]` - Array of all registered adapters
  - `__provides: TProvides` - Type-level tracking of provided ports

### Adapter Structure
- `provides: Port` - The port this adapter implements
- `requires: Port[]` - Dependencies (other ports needed)
- `lifetime: 'singleton' | 'scoped' | 'request'` - Lifecycle scope
- `factory: Function` - Creates the service instance
- `finalizer?: Function` - Optional cleanup function

### Existing Serialization Pattern (@hex-di/testing)
The `serializeGraph()` function in `graph-snapshot.ts` provides a reference implementation:
- Extracts `port.__portName` for readable names
- Maps `adapter.requires` to dependency names
- Produces deterministic output (sorted alphabetically by default)
- Returns `GraphSnapshot` with `adapters: AdapterSnapshot[]`

### Port Structure (@hex-di/ports)
- `__portName: TName` - The port's string name
- `__brand` - Type-level branding (not runtime)

## Architecture Pattern
- Framework-agnostic core with React adapter (TanStack pattern)
- Auto-excluded from production builds
- Tree-shakeable
