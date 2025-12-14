# @hex-di/devtools Package Standards

## Purpose
Inspection, debugging, and learning tools. This optional package provides visibility into the DI system.

## Core Responsibilities
- Visualize dependency graphs
- Inspect runtime container state
- Aid debugging and learning
- Export architectural documentation

## Design Constraints

### Optional Package
- Not required for production use
- Tree-shakeable if imported
- Development dependency typically

### Non-Intrusive
- Observes but doesn't modify behavior
- No performance impact when not used
- Can be stripped in production builds

## Graph Visualization

### Static Analysis
- Generate graph from Graph object
- Show ports and adapters
- Display dependency relationships
- Highlight lifetime scopes

### Export Formats
- JSON for tooling integration
- DOT format for Graphviz
- Mermaid for documentation
- Interactive HTML viewer

## Runtime Inspection

### Container State
- List resolved services
- Show instance lifetimes
- Display scope hierarchy

### Resolution Tracing
- Trace resolution order
- Identify slow factories
- Debug circular dependency issues

## Browser DevTools

### React DevTools Integration
- Optional DevTools panel
- Show container in component tree
- Link services to components using them

### Console Utilities
- Global inspection helpers (dev only)
- Pretty-print container state
- Quick debugging commands

## Documentation Generation
- Generate architecture docs from graph
- List all ports and their adapters
- Document dependency relationships

## Success Criteria
- Developers can visualize architecture
- Debugging is straightforward
- Learning curve is reduced
- AI tools can consume graph data
