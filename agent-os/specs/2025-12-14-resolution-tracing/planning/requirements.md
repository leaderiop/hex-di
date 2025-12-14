# Spec Requirements: Resolution Tracing

## Initial Description

Resolution Tracing is the final remaining item on the HexDI roadmap (item #19). Per the roadmap: "Implement resolution tracing for debugging that shows resolution order and identifies slow factories."

This feature enables developers to understand and debug the runtime behavior of their dependency injection container by capturing timing data, resolution order, and dependency chains during service resolution.

## Requirements Discussion

### First Round Questions

**Q1:** I assume the primary use case is debugging slow startup times by showing which factories take the longest to execute. Is that correct, or is the main goal something else (e.g., understanding dependency order, debugging unexpected resolution behavior)?
**Answer:** Expert guidance confirms the primary use cases are:
- Debugging slow startup times and identifying slow factories
- Understanding resolution order and dependency chains
- Performance optimization through cache efficiency analysis

**Q2:** I'm thinking Resolution Tracing should be opt-in (disabled by default) to avoid any performance overhead in production. Should we allow tracing to be enabled at container creation time via an options parameter, dynamically at runtime (turn on/off), or both?
**Answer:** Architecture recommendation: Use Decorator/Wrapper pattern with `createTracingContainer()` that wraps base container. Tracing is opt-in by using the tracing wrapper. The pattern supports:
- Container creation time enablement (via wrapper)
- Zero overhead when disabled through separate subpath export

**Q3:** The roadmap mentions "shows resolution order and identifies slow factories." What metrics should be captured?
**Answer:** Capture the following per the wireframes and architecture guidance:
- Timing data: Duration of each factory call (via `performance.now()`)
- Resolution order: Sequential resolution number (1, 2, 3...)
- Dependency chain: Full path from root resolution to nested dependencies
- Cache hits/misses: Whether resolution was served from cache
- Scope context: Which scope the resolution occurred in
- Start/end timestamps: High-resolution timestamps for timeline visualization

**Q4:** I assume tracing data should be accessible via the existing inspector API. Should it also support console logging or event emission?
**Answer:** Architecture guidance specifies hybrid push/pull data flow:
- Push: TraceCollector interface for real-time event subscription
- Pull: `getTraces()` method for batch retrieval via inspector
- Strategy pattern for collectors: MemoryCollector, NoOpCollector, CompositeCollector

**Q5:** For the trace data structure, what should be captured?
**Answer:** Based on wireframes, the TraceEvent interface:
```typescript
interface TraceEvent {
  id: string;                    // Unique trace ID
  portName: string;              // Service/port being resolved
  lifetime: Lifetime;            // singleton | scoped | request
  startTime: number;             // High-resolution timestamp (performance.now())
  duration: number;              // Time in milliseconds
  isCacheHit: boolean;           // Was this served from cache?
  parentTraceId: string | null;  // Parent resolution (for dependency chains)
  childTraceIds: string[];       // Child resolutions triggered
  scopeId: string | null;        // Which scope context
  order: number;                 // Global resolution order (1, 2, 3...)
  isPinned: boolean;             // Protected from FIFO eviction (slow traces)
}
```

**Q6:** Should Resolution Tracing integrate with the existing DevTools React panel?
**Answer:** Yes - detailed wireframes provided for integration:
- New tabbed interface with [Graph] [Services] [Tracing] [Inspector] tabs
- Backward compatibility via `mode="tabs" | "sections"` prop
- Three view tabs within Tracing: Timeline View, Tree View, Summary Stats
- Controls bar with filtering, sorting, and threshold slider
- Follows existing DevTools styling patterns

**Q7:** For identifying "slow factories," how should threshold filtering work?
**Answer:** Per wireframes:
- Configurable threshold slider (5-500ms range, default 50ms)
- Color coding: Green (<10ms), Yellow (10ms-threshold), Red (>=threshold), Cyan (cache hit)
- Filter option to show "Slow Only"
- Summary stats highlighting slowest services

**Q8:** What should be excluded from this initial implementation?
**Answer:** Based on architecture guidance, exclude:
- Async factory tracing (factories are synchronous)
- Integration with external tools (OpenTelemetry, Chrome DevTools Performance API)
- Trace persistence to files/localStorage
- Detailed memory profiling

### Follow-up Questions

**Follow-up 1:** Trace Limits - The MemoryCollector should have configurable limits. What eviction strategy?
**Answer:** Hybrid approach approved:
- FIFO with max 1000 traces (oldest dropped first)
- Slow trace pinning: traces >100ms auto-pinned, protected from FIFO eviction
- Time-based expiry: 5 minutes
- Max 100 pinned slow traces (oldest slow traces dropped when limit reached)

**Follow-up 2:** Pause/Resume Recording - What should happen when paused?
**Answer:** Stop capturing entirely approved:
- Zero overhead when paused (no interception)
- Clear visual indicator: pulsing red dot = recording, gray dot = paused
- Follows existing auto-refresh toggle pattern from ContainerInspector

**Follow-up 3:** Cross-Scope Tracing - How to display resolutions spanning multiple scopes?
**Answer:** Progressive disclosure approved:
- Collapsed view: Show "initiating scope -> resolving scope" with badge
- Expanded view: Full scope chain with timing breakdown per scope
- Matches existing ScopeHierarchy expand/collapse pattern

**Follow-up 4:** DevTools Panel Placement - How to integrate into existing panel?
**Answer:** Tabbed interface approved:
- Tabs: [Graph] [Services] [Tracing] [Inspector]
- New `mode="tabs" | "sections"` prop for DevToolsPanel
- Default: "tabs" for new users
- "sections" mode preserves current CollapsibleSection behavior for backward compatibility

**Follow-up 5:** Package Location - Where should tracing code live?
**Answer:** Split location approved:
- Runtime tracing logic: `@hex-di/devtools/tracing/` (no React dependencies)
- React UI components: `@hex-di/devtools/react/` (extends existing components)
- Clean separation with correct dependency direction (React depends on tracing, not vice versa)

### Existing Code to Reference

**Similar Features Identified:**
- Feature: Container Inspector - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/create-inspector.ts`
- Feature: Inspector Types - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/inspector-types.ts`
- Feature: INTERNAL_ACCESS Symbol pattern - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/inspector-symbols.js`
- Feature: ResolutionContext (tracks resolution path) - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/resolution-context.ts`
- Feature: MemoMap (tracks resolution order/timestamps) - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime/src/memo-map.ts`
- Feature: DevTools React components - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/`
- Feature: DevTools styles - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/styles.ts`
- Feature: ResolvedServices component (search/filter patterns) - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/resolved-services.js`
- Feature: ContainerInspector component - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/container-inspector.js`
- Feature: ScopeHierarchy component (expand/collapse pattern) - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/devtools/src/react/scope-hierarchy.js`

**Architectural Patterns to Follow:**
- INTERNAL_ACCESS Symbol for internal state access (new TRACING_ACCESS)
- Frozen/immutable snapshot pattern for inspection data
- Decorator/Wrapper pattern for TracingContainer
- Strategy pattern for collectors (Memory, NoOp, Composite)

## Visual Assets

### Files Provided:
- `01-resolution-tracing-overview.txt`: Overall section layout showing integration into DevToolsPanel, component hierarchy, design tokens, data model (TraceEvent/TraceSession), empty/loading states, accessibility considerations
- `02-timeline-view-detail.txt`: Timeline view with horizontal time-axis bars, time ruler with threshold marker, expanded row details, zoom controls, legend, responsive behavior
- `03-tree-view-detail.txt`: Hierarchical dependency tree view with expand/collapse, tree connectors, node states (normal/hovered/selected/cached/slow), keyboard navigation
- `04-filter-controls-bar.txt`: Complete controls bar with search, lifetime filters, status filters, performance filters, sort dropdown, threshold slider, recording indicator, active filters display
- `05-summary-stats-view.txt`: Overview cards (total resolutions, avg time, cache hit rate, slow count), duration distribution chart, slowest services list, lifetime breakdown, cache efficiency, insights panel
- `06-style-guide-and-integration.txt`: New style definitions for tracing container, timeline, tree view, summary, controls; new CSS variables for performance colors; utility functions; integration checklist

### Visual Insights:
- Color scheme: Green (fast <10ms), Yellow (medium), Red (slow >=threshold), Cyan (cache hit)
- Three main views: Timeline (horizontal bars), Tree (hierarchical), Summary (stats/charts)
- Threshold slider: 5-500ms range with gradient track
- Follows existing DevTools dark theme with Catppuccin color palette
- Accessibility: keyboard navigation, aria labels, color-blind friendly indicators
- Recording indicator: pulsing red (active), gray (paused)
- Fidelity level: Low-fidelity text wireframes providing layout and component structure

## Requirements Summary

### Functional Requirements

**Core Tracing (DevTools Package - tracing/):**
- Capture trace events during service resolution with timing data
- Track resolution order, dependency chains, and cache status
- Support push (events) and pull (batch retrieval) data access patterns
- Zero overhead when tracing is disabled via separate subpath export
- New `TRACING_ACCESS` Symbol following existing pattern
- Lazy stats computation and configurable filtering

**Trace Limits and Eviction:**
- Default max 1000 traces with FIFO eviction
- Slow trace pinning: traces >100ms auto-pinned (protected from FIFO)
- Max 100 pinned slow traces
- Time-based expiry: 5 minutes for unpinned traces
- Manual pin/unpin capability in UI

**Collector Strategies:**
- MemoryCollector: Stores traces with hybrid eviction (FIFO + pinning + time-based)
- NoOpCollector: Disabled tracing with zero overhead
- CompositeCollector: Combines multiple collectors

**Pause/Resume Recording:**
- Stop capturing entirely when paused (zero overhead)
- Visual indicator: pulsing red dot = recording, gray dot = paused
- Follows existing auto-refresh toggle pattern

**Container Wrapper:**
- `createTracingContainer()` function wrapping base container
- Intercepts resolve calls to capture timing
- Maintains trace hierarchy for nested resolutions
- Tracks cross-scope resolution chains

**DevTools Integration (React Package):**
- New tabbed interface: [Graph] [Services] [Tracing] [Inspector]
- `mode="tabs" | "sections"` prop for backward compatibility
- Three sub-views within Tracing: Timeline, Tree, Summary Stats
- Controls bar with search, filters, sorting, threshold slider
- Recording indicator with pause/resume toggle
- Export functionality (JSON, CSV, Clipboard)

**Cross-Scope Tracing Display:**
- Collapsed: "initiating scope -> resolving scope" with badge
- Expanded: Full scope chain with timing breakdown
- Follows ScopeHierarchy expand/collapse pattern

**Timeline View:**
- Horizontal time-axis with duration bars
- Time ruler with threshold marker
- Expandable rows with detail panels
- Color-coded by performance (green/yellow/red) and cache status (cyan)
- Zoom and scroll controls
- Pinned trace indicators

**Tree View:**
- Hierarchical dependency chain visualization
- Expand/collapse with keyboard navigation
- Self-time vs total-time display options
- Visual connectors between parent/child nodes
- Scope chain visualization on expand

**Summary Stats View:**
- Overview cards: Total resolutions, Avg time, Cache hit rate, Slow count
- Duration distribution bar chart
- Slowest services list (top 5)
- Lifetime breakdown section
- Cache efficiency visualization
- Pinned traces count

### Reusability Opportunities
- Extend existing `createInspector()` pattern for trace access
- Reuse `INTERNAL_ACCESS` Symbol approach with new `TRACING_ACCESS`
- Leverage existing DevTools styles and components (filter buttons, search input)
- Follow ResolvedServices component patterns for filtering/search
- Follow ScopeHierarchy pattern for expand/collapse and scope display
- Extend existing MemoMap metadata (already tracks resolvedAt, resolutionOrder)
- Reuse auto-refresh toggle pattern for pause/resume

### Scope Boundaries

**In Scope:**
- TraceEvent and TraceSession data structures with pinning support
- TraceCollector interface with Memory/NoOp/Composite strategies
- Hybrid eviction: FIFO + slow trace pinning + time-based expiry
- `createTracingContainer()` wrapper function
- `TRACING_ACCESS` Symbol for internal state access
- Pause/resume recording with zero overhead when paused
- Cross-scope tracing with progressive disclosure
- Tabbed DevToolsPanel interface with backward-compatible sections mode
- Timeline View React component
- Tree View React component
- Summary Stats View React component
- Controls bar with filters, sorting, threshold slider
- Export functionality (JSON, CSV, Copy)
- New CSS variables and style definitions
- Package split: tracing logic in devtools/tracing/, UI in devtools/react/

**Out of Scope:**
- Async factory tracing (factories are synchronous in current design)
- Integration with external profiling tools (OpenTelemetry, Chrome DevTools)
- Trace persistence to files or localStorage
- Memory profiling beyond trace counts
- React DevTools extension integration
- Server-side tracing considerations

### Technical Considerations
- TracingContainer uses Decorator/Wrapper pattern preserving base container immutability
- High-resolution timing via `performance.now()`
- Lazy statistics computation to minimize overhead
- Virtual scrolling for large trace lists in DevTools
- Frozen/immutable snapshots for all inspection data
- Strategy pattern allows custom collector implementations
- Tree-shaking friendly with separate exports
- Clean package separation: tracing logic has no React dependency
- Backward compatibility via `mode` prop on DevToolsPanel
