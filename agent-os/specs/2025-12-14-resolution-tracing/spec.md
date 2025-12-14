# Specification: Resolution Tracing

## Goal

Enable developers to debug and optimize dependency injection performance by capturing timing data, resolution order, and dependency chains during service resolution, with a rich DevTools UI for visualization and analysis.

## User Stories

- As a developer, I want to identify slow-resolving services so that I can optimize application startup time
- As a developer, I want to visualize dependency chains so that I can understand resolution order and debug unexpected behavior
- As a developer, I want to see cache hit/miss statistics so that I can verify my lifetime configuration is optimal

## Specific Requirements

**TracingContainer Wrapper Pattern**
- Create `createTracingContainer()` function that wraps a base container using Decorator pattern
- Intercept all `resolve()` calls to capture timing via `performance.now()`
- Maintain trace hierarchy for nested resolutions using parent/child trace IDs
- Preserve base container immutability; wrapper adds tracing layer without mutation
- New `TRACING_ACCESS` Symbol following existing `INTERNAL_ACCESS` pattern for internal state access
- Zero overhead when tracing disabled via separate subpath export (`@hex-di/devtools/tracing`)

**TraceEntry Data Structure**
- Unique `id` (string) for each trace event
- `portName` (string) identifying the resolved service
- `lifetime` (Lifetime) of the service (singleton/scoped/request)
- `startTime` and `duration` (numbers) using high-resolution `performance.now()`
- `isCacheHit` (boolean) indicating if served from cache
- `parentTraceId` (string | null) for dependency chain tracking
- `childTraceIds` (string[]) for nested resolution references
- `scopeId` (string | null) for scope context
- `order` (number) for global resolution sequence
- `isPinned` (boolean) for slow trace protection from eviction

**TraceCollector Strategy Pattern**
- Define `TraceCollector` interface with `collect()`, `getTraces()`, `getStats()`, `clear()` methods
- `MemoryCollector`: stores traces in memory with hybrid eviction policy
- `NoOpCollector`: disabled tracing with zero overhead (no interception)
- `CompositeCollector`: combines multiple collectors for extensibility
- Strategy pattern allows custom collector implementations

**Trace Limits and Eviction Policy**
- Default max 1000 traces with FIFO eviction (oldest dropped first)
- Slow trace pinning: traces exceeding 100ms auto-pinned, protected from FIFO eviction
- Max 100 pinned slow traces (oldest slow traces dropped when limit reached)
- Time-based expiry: 5 minutes for unpinned traces
- Manual pin/unpin capability via UI and API
- Configurable limits via `TraceRetentionPolicy` options

**Runtime API**
- `createTracingContainer(container, options?)` returns wrapped container with tracing
- `container[TRACING_ACCESS].getTraces(filter?)` for batch trace retrieval
- `container[TRACING_ACCESS].getStats()` for aggregate statistics (lazy computation)
- `container[TRACING_ACCESS].pause()` / `resume()` for recording control
- `container[TRACING_ACCESS].clear()` to reset trace buffer
- `container[TRACING_ACCESS].subscribe(callback)` for real-time event push

**Pause/Resume Recording**
- Stop capturing entirely when paused (zero overhead via no interception)
- Clear visual indicator: pulsing red dot = recording, gray dot = paused
- State persists across component re-renders
- Follows existing auto-refresh toggle pattern from ContainerInspector

**Cross-Scope Tracing**
- Track resolutions spanning multiple scopes with full scope chain
- Progressive disclosure: collapsed shows "initiating scope -> resolving scope" with badge
- Expanded view: full scope chain with timing breakdown per scope
- Match existing ScopeHierarchy expand/collapse pattern

**DevTools Tabbed Interface**
- New tabbed interface: [Graph] [Services] [Tracing] [Inspector]
- Add `mode="tabs" | "sections"` prop to DevToolsPanel for backward compatibility
- Default: "tabs" for new users; "sections" preserves current CollapsibleSection behavior
- Three sub-views within Tracing tab: Timeline, Tree, Summary Stats

**Timeline View Component**
- Horizontal time-axis with duration bars proportional to resolution time
- Time ruler with auto-scaling, major/minor ticks, threshold marker (dashed red line)
- Color-coded bars: green (<10ms), yellow (10ms-threshold), red (>=threshold), cyan (cache hit)
- Expandable rows showing trace details (start/end time, dependencies, scope)
- Zoom controls: [+] [-] [Fit All] [Focus Slow]
- Virtual scrolling for large trace lists
- Pinned trace indicators (pin icon)

**Tree View Component**
- Hierarchical dependency chain visualization grouped by root resolution
- Recursive TreeNode with expand/collapse controls
- Unicode box-drawing connectors for parent/child relationships
- Self-time vs total-time display toggle
- Node states: normal, hovered, selected, cached (cyan tint), slow (red border)
- Keyboard navigation: Arrow keys, Enter/Space to toggle, Home/End
- 24px indentation per nesting level

**Summary Stats View Component**
- Overview cards grid: Total Resolutions, Avg Time, Cache Hit Rate, Slow Count
- Duration distribution bar chart (buckets: 0-10ms, 10-25ms, 25-50ms, 50-100ms, >100ms)
- Slowest services list (top 5) with clickable rows navigating to Timeline/Tree
- Lifetime breakdown section (Singleton/Scoped/Request with count, avg, total)
- Cache efficiency visualization (Fresh vs Cached stacked bar, estimated savings)
- Pinned traces count display

**Controls Bar Component**
- Search input with 300ms debounce, case-insensitive partial match on port names
- Lifetime filter buttons: [All] [SINGLETON] [SCOPED] [REQUEST]
- Status filter buttons: [All] [Fresh] [Cached]
- Performance filter: [All] [Slow Only]
- Sort dropdown: Chronological, Slowest First, Fastest First, Alphabetical, Resolution Order
- Threshold slider: 5-500ms range, 5ms step, default 50ms, gradient track (green-yellow-red)
- Recording indicator with pause/resume toggle
- Active filters display with removable tags
- Export dropdown: JSON, CSV, Copy to Clipboard

## Visual Design

**`planning/visuals/01-resolution-tracing-overview.txt`**
- Resolution Tracing as CollapsibleSection within DevToolsPanel
- Component hierarchy: ResolutionTracingSection > TracingControlsBar + ViewToggleTabs + ViewContainer
- ViewToggleTabs for Timeline/Tree/Summary switching
- Empty state: "No resolution traces recorded" with guidance text
- Loading state: "Recording traces..." indicator

**`planning/visuals/02-timeline-view-detail.txt`**
- Time ruler at top with major ticks (every 25ms) and minor ticks (every 5ms)
- Threshold marker as red dashed vertical line
- Timeline rows: #order badge, port name, duration bar, duration label, lifetime badge, status indicators
- Expanded row detail panel with Start Time, End Time, Duration, Scope, Dependencies
- Footer summary: Total time, resolution count, cache hit rate, slowest trace
- Legend: color coding explanation (Fast/Medium/Slow/Cache)

**`planning/visuals/03-tree-view-detail.txt`**
- Nested tree structure with [-]/[+] expand toggles
- Tree connectors using CSS border-left and border-top
- Node content: port name, self duration, status indicators ([*] cached, [!] slow), lifetime badge
- Expanded node detail panel with Resolution Order, timestamps, self vs total time, performance bar
- Header controls: [Expand All] [Collapse All], Group by dropdown, Show time mode toggles

**`planning/visuals/04-filter-controls-bar.txt`**
- Three-row layout: Search + Actions, Filters, Sort + Threshold
- Threshold slider with gradient track from green through yellow to red
- Recording indicator: pulsing red dot with "Recording..." text, live count, total time
- Active filters bar with pill-shaped removable tags
- Compact mode for narrow panels with dropdown menus

**`planning/visuals/05-summary-stats-view.txt`**
- Four overview cards in responsive grid (4-col > 2-col > 1-col based on width)
- Slow Count card turns red background when count > 0
- Cache Hit Rate card color-coded: green >50%, yellow 25-50%, red <25%
- Horizontal bar charts with proportional widths
- Slowest services rows are clickable to navigate to trace detail

**`planning/visuals/06-style-guide-and-integration.txt`**
- New CSS variables: --hex-devtools-fast, --hex-devtools-medium, --hex-devtools-slow, --hex-devtools-cached
- Background variants with transparency for row highlighting
- Keyframe animations: pulse (recording dot), slideDown (panel expansion)
- Style objects: tracingStyles, timelineStyles, treeViewStyles, summaryStyles, controlsStyles
- Utility functions: getPerformanceBarStyle(), getTraceRowStyle(), formatDuration()

## Existing Code to Leverage

**INTERNAL_ACCESS Symbol Pattern (`/packages/runtime/src/inspector-symbols.ts`)**
- Use `Symbol.for("hex-di/tracing-access")` for new TRACING_ACCESS Symbol
- Cross-realm consistency via Symbol.for() global registry
- Accessor method keyed by Symbol returns frozen snapshot, never mutable state
- Follow same documentation and export pattern

**createInspector Factory (`/packages/runtime/src/create-inspector.ts`)**
- Follow O(1) creation pattern: store container reference, validate on call
- Use `deepFreeze()` utility for immutable snapshots
- Method pattern: snapshot(), getTraces(), getStats() returning frozen data
- Error handling for disposed containers

**MemoMap Metadata (`/packages/runtime/src/memo-map.ts`)**
- Already tracks `resolvedAt` timestamp and `resolutionOrder`
- Extend pattern to capture additional trace data (duration, cache status)
- LIFO disposal ordering pattern for understanding resolution cleanup

**ResolvedServices Component (`/packages/devtools/src/react/resolved-services.tsx`)**
- Reuse search input with 300ms debounce pattern
- Reuse filter button group pattern with aria-pressed
- Reuse expandable item pattern with ServiceItem
- Follow ServiceFilters state management approach

**styles.ts DevTools Styles (`/packages/devtools/src/react/styles.ts`)**
- Extend cssVariables with new performance color definitions
- Follow existing style object pattern (TracingStyleDef, TimelineStyleDef, etc.)
- Reuse nodeStyles.badge pattern for lifetime badges
- Reuse serviceListStyles for search/filter UI components

## Out of Scope

- Async factory tracing (factories are synchronous in current design)
- Integration with external profiling tools (OpenTelemetry, Chrome DevTools Performance API)
- Trace persistence to files or localStorage
- Memory profiling beyond trace counts
- React DevTools extension integration
- Server-side tracing considerations
- Trace export to external monitoring services
- Aggregate tracing across multiple containers
- Historical trend analysis across sessions
- Automated performance regression detection
