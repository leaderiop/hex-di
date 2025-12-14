# Task Breakdown: Resolution Tracing

## Overview

This feature enables developers to debug and optimize dependency injection performance by capturing timing data, resolution order, and dependency chains during service resolution, with a rich DevTools UI for visualization and analysis.

**Total Task Groups:** 10
**Estimated Total Sub-tasks:** 62

## Execution Order

The implementation follows dependency order:

1. **Trace Types & Interfaces** (Task Group 1) - Foundation types required by all other groups
2. **TraceCollector Strategy Pattern** (Task Group 2) - Collector implementations depend on types
3. **TracingContainer Wrapper** (Task Group 3) - Container wrapper uses collectors
4. **Trace Limits & Eviction** (Task Group 4) - Eviction logic integrates into MemoryCollector
5. **DevTools Styles Extension** (Task Group 5) - UI styles needed before components
6. **DevTools Tabbed Interface** (Task Group 6) - Container for tracing views
7. **Controls Bar Component** (Task Group 7) - Filtering/controls used by all views
8. **Timeline View Component** (Task Group 8) - First visualization view
9. **Tree View Component** (Task Group 9) - Second visualization view
10. **Summary Stats View** (Task Group 10) - Third visualization view with integration testing

---

## Task List

### Runtime Tracing Layer

#### Task Group 1: Trace Types & Interfaces
**Dependencies:** None

- [x] 1.0 Complete trace type definitions
  - [x] 1.1 Write 4-6 focused tests for TraceEntry and TraceStats types
    - Test TraceEntry interface structure validation
    - Test TraceStats computation accuracy
    - Test TraceRetentionPolicy defaults and validation
    - Test TRACING_ACCESS Symbol cross-realm consistency
  - [x] 1.2 Create TRACING_ACCESS Symbol in `/packages/runtime/src/inspector-symbols.ts`
    - Follow existing INTERNAL_ACCESS pattern: `Symbol.for("hex-di/tracing-access")`
    - Export from module
    - Add JSDoc documentation
  - [x] 1.3 Define TraceEntry interface in `/packages/devtools/src/tracing/types.ts`
    - Fields: id, portName, lifetime, startTime, duration, isCacheHit
    - Fields: parentTraceId, childTraceIds, scopeId, order, isPinned
    - Use high-resolution number types for timing
  - [x] 1.4 Define TraceRetentionPolicy interface
    - maxTraces (default 1000)
    - maxPinnedTraces (default 100)
    - slowThresholdMs (default 100)
    - expiryMs (default 300000 = 5 minutes)
  - [x] 1.5 Define TraceStats interface
    - totalResolutions, averageDuration, cacheHitRate
    - slowCount, sessionStart, totalDuration
  - [x] 1.6 Define TracingOptions interface for createTracingContainer
    - collector?: TraceCollector
    - retentionPolicy?: Partial<TraceRetentionPolicy>
  - [x] 1.7 Ensure type definition tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify TypeScript compilation succeeds

**Acceptance Criteria:**
- All type interfaces compile without errors
- TRACING_ACCESS Symbol exports correctly
- Types support all wireframe data requirements
- Tests verify type structure and defaults

**Files to create/modify:**
- Modify: `/packages/runtime/src/inspector-symbols.ts`
- Create: `/packages/devtools/src/tracing/types.ts`
- Create: `/packages/devtools/src/tracing/index.ts`

---

#### Task Group 2: TraceCollector Strategy Pattern
**Dependencies:** Task Group 1

- [x] 2.0 Complete TraceCollector implementations
  - [x] 2.1 Write 5-7 focused tests for collector implementations
    - Test TraceCollector interface contract
    - Test MemoryCollector collect() and getTraces()
    - Test NoOpCollector zero overhead (no storage)
    - Test CompositeCollector delegation to multiple collectors
    - Test getStats() lazy computation
  - [x] 2.2 Define TraceCollector interface in `/packages/devtools/src/tracing/collector.ts`
    - collect(entry: TraceEntry): void
    - getTraces(filter?: TraceFilter): readonly TraceEntry[]
    - getStats(): TraceStats
    - clear(): void
    - subscribe(callback: (entry: TraceEntry) => void): () => void
  - [x] 2.3 Implement NoOpCollector class
    - All methods are no-ops
    - Zero overhead design (no array allocation)
    - Use for disabled tracing state
  - [x] 2.4 Implement MemoryCollector class (basic version, eviction in Task Group 4)
    - Store traces in internal array
    - Implement collect() with order tracking
    - Implement getTraces() with filter support
    - Implement lazy getStats() computation
    - Implement subscribe() for real-time push
  - [x] 2.5 Implement CompositeCollector class
    - Accept array of TraceCollector instances
    - Delegate all operations to child collectors
    - Aggregate getTraces() from first collector
    - Aggregate getStats() from first collector
  - [x] 2.6 Ensure collector tests pass
    - Run ONLY the 5-7 tests written in 2.1
    - Verify strategy pattern works correctly

**Acceptance Criteria:**
- TraceCollector interface is extensible
- MemoryCollector stores and retrieves traces
- NoOpCollector has measurable zero overhead
- CompositeCollector properly delegates
- Subscribe/unsubscribe pattern works

**Files to create:**
- Create: `/packages/devtools/src/tracing/collector.ts`
- Create: `/packages/devtools/src/tracing/memory-collector.ts`
- Create: `/packages/devtools/src/tracing/noop-collector.ts`
- Create: `/packages/devtools/src/tracing/composite-collector.ts`

---

#### Task Group 3: TracingContainer Wrapper
**Dependencies:** Task Group 1, Task Group 2

- [x] 3.0 Complete TracingContainer wrapper implementation
  - [x] 3.1 Write 5-7 focused tests for createTracingContainer
    - Test wrapper intercepts resolve() calls
    - Test timing capture with performance.now()
    - Test parent/child trace hierarchy for nested resolutions
    - Test TRACING_ACCESS Symbol provides frozen snapshot
    - Test pause/resume recording functionality
    - Test cross-scope trace tracking
  - [x] 3.2 Create createTracingContainer factory in `/packages/devtools/src/tracing/tracing-container.ts`
    - Accept base Container and optional TracingOptions
    - Use Decorator pattern - wrap without mutating base
    - Return enhanced container with TRACING_ACCESS
  - [x] 3.3 Implement resolve() interception
    - Capture startTime before resolution
    - Capture duration after resolution
    - Track isCacheHit from MemoMap metadata
    - Maintain global order counter
  - [x] 3.4 Implement trace hierarchy tracking
    - Use ResolutionContext pattern for parent tracking
    - Generate unique trace IDs
    - Link parentTraceId/childTraceIds for nested resolutions
  - [x] 3.5 Implement TRACING_ACCESS accessor methods
    - getTraces(filter?): readonly TraceEntry[]
    - getStats(): TraceStats
    - pause(): void
    - resume(): void
    - clear(): void
    - subscribe(callback): () => void
    - isPaused(): boolean
  - [x] 3.6 Implement pause/resume with zero overhead
    - When paused, skip all interception logic
    - Clear state indicator for UI
    - Persist state across re-renders
  - [x] 3.7 Ensure TracingContainer tests pass
    - Run ONLY the 5-7 tests written in 3.1
    - Verify timing accuracy within acceptable tolerance

**Acceptance Criteria:**
- createTracingContainer returns valid enhanced container
- All resolve() calls are traced with timing data
- Nested resolutions maintain parent/child hierarchy
- Pause/resume works with zero overhead when paused
- TRACING_ACCESS returns immutable frozen snapshots

**Files to create:**
- Create: `/packages/devtools/src/tracing/tracing-container.ts`
- Modify: `/packages/devtools/src/tracing/index.ts` (add exports)

---

#### Task Group 4: Trace Limits & Eviction
**Dependencies:** Task Group 2 (MemoryCollector)

- [x] 4.0 Complete eviction policy implementation
  - [x] 4.1 Write 5-6 focused tests for eviction logic
    - Test FIFO eviction at maxTraces limit
    - Test slow trace auto-pinning (>100ms)
    - Test pinned traces protected from FIFO eviction
    - Test time-based expiry (5 minutes)
    - Test max pinned traces limit (oldest slow dropped)
    - Test manual pin/unpin API
  - [x] 4.2 Extend MemoryCollector with eviction policy in `/packages/devtools/src/tracing/memory-collector.ts`
    - Accept TraceRetentionPolicy in constructor
    - Apply default values for missing options
  - [x] 4.3 Implement FIFO eviction
    - Check trace count after each collect()
    - Remove oldest non-pinned traces when limit exceeded
    - Maintain order for correct FIFO behavior
  - [x] 4.4 Implement slow trace pinning
    - Auto-pin traces exceeding slowThresholdMs
    - Set isPinned = true on TraceEntry
    - Exclude pinned from FIFO eviction
  - [x] 4.5 Implement pinned trace limit
    - Track count of pinned traces
    - When maxPinnedTraces exceeded, drop oldest pinned
    - Maintain separate ordering for pinned traces
  - [x] 4.6 Implement time-based expiry
    - Check timestamps on getTraces() calls
    - Remove traces older than expiryMs
    - Only expire non-pinned traces
  - [x] 4.7 Implement manual pin/unpin API
    - pin(traceId: string): void
    - unpin(traceId: string): void
    - Expose via TRACING_ACCESS
  - [x] 4.8 Ensure eviction tests pass
    - Run ONLY the 5-6 tests written in 4.1
    - Verify hybrid eviction policy works correctly

**Acceptance Criteria:**
- FIFO eviction respects maxTraces limit
- Slow traces (>100ms) are automatically pinned
- Pinned traces protected from FIFO but respect maxPinnedTraces
- Time expiry cleans up old unpinned traces
- Manual pin/unpin works correctly

**Files to modify:**
- Modify: `/packages/devtools/src/tracing/memory-collector.ts`
- Modify: `/packages/devtools/src/tracing/tracing-container.ts` (add pin/unpin)

---

### DevTools UI Layer

#### Task Group 5: DevTools Styles Extension
**Dependencies:** None (can run in parallel with Task Groups 1-4)

- [x] 5.0 Complete styles extension for tracing UI
  - [x] 5.1 Write 3-4 focused tests for style utilities
    - Test getPerformanceBarStyle() returns correct colors
    - Test getTraceRowStyle() applies correct state styles
    - Test formatDuration() formats all duration ranges
  - [x] 5.2 Add new CSS variables to `/packages/devtools/src/react/styles.ts`
    - --hex-devtools-fast: #a6e3a1 (green)
    - --hex-devtools-medium: #f9e2af (yellow)
    - --hex-devtools-slow: #f38ba8 (red)
    - --hex-devtools-cached: #89dceb (cyan)
    - Add background variants with transparency
    - Add light theme variants
  - [x] 5.3 Create tracingStyles object
    - container, viewToggleContainer, viewToggleTab styles
    - viewToggleTabActive, viewContent styles
  - [x] 5.4 Create timelineStyles object
    - ruler, rulerTick, thresholdLine styles
    - row, rowHover, rowExpanded, rowSlow, rowCached styles
    - bar, barFast, barMedium, barSlow, barCached styles
    - detailsPanel, footer styles
  - [x] 5.5 Create treeViewStyles object
    - node, nodeHover, nodeSelected, nodeSlow, nodeCached styles
    - expandToggle, connectorVertical, connectorHorizontal styles
    - childrenContainer with 24px indentation
  - [x] 5.6 Create summaryStyles object
    - cardsGrid, card, cardLabel, cardValue styles
    - barChart, bar, barFast/Medium/Slow styles
    - sectionHeader styles
  - [x] 5.7 Create controlsStyles object
    - container, row, filterGroup styles
    - thresholdSlider, thresholdTrack, thresholdThumb styles
    - recordingIndicator, recordingDot with pulse animation
    - filterTag, filterTagRemove styles
  - [x] 5.8 Add utility functions
    - getPerformanceBarStyle(duration, threshold, isCacheHit)
    - getTraceRowStyle(isExpanded, isSlow, isCacheHit)
    - formatDuration(ms) with proper formatting

**Acceptance Criteria:**
- All style objects compile and export correctly
- CSS variables follow existing Catppuccin palette
- Utility functions return correct styles
- Dark and light theme support

**Files to modify:**
- Modify: `/packages/devtools/src/react/styles.ts`

---

#### Task Group 6: DevTools Tabbed Interface
**Dependencies:** Task Group 5

- [x] 6.0 Complete tabbed interface for DevTools panel
  - [x] 6.1 Write 4-5 focused tests for tabbed interface
    - Test mode="tabs" renders tab navigation
    - Test mode="sections" preserves CollapsibleSection behavior
    - Test tab switching changes active view
    - Test default tab selection
    - Test backward compatibility with existing props
  - [x] 6.2 Extend DevToolsPanel props in `/packages/devtools/src/react/devtools-panel.tsx`
    - Add mode: "tabs" | "sections" prop (default: "tabs")
    - Add initialTab prop for default active tab
  - [x] 6.3 Create TabNavigation component
    - Tabs: Graph, Services, Tracing, Inspector
    - Active tab styling with bottom border accent
    - Keyboard navigation support
  - [x] 6.4 Implement conditional rendering
    - mode="tabs": render TabNavigation + active view
    - mode="sections": render existing CollapsibleSection layout
  - [x] 6.5 Create ResolutionTracingSection container component in `/packages/devtools/src/react/resolution-tracing-section.tsx`
    - ViewToggleTabs for Timeline/Tree/Summary sub-views
    - TracingControlsBar integration point
    - ViewContainer for active sub-view
  - [x] 6.6 Ensure tabbed interface tests pass
    - Run ONLY the 4-5 tests written in 6.1
    - Verify backward compatibility

**Acceptance Criteria:**
- mode="tabs" shows new tabbed interface
- mode="sections" preserves existing behavior
- Tab switching is smooth and accessible
- ResolutionTracingSection renders sub-view tabs

**Files to create/modify:**
- Modify: `/packages/devtools/src/react/devtools-panel.tsx`
- Create: `/packages/devtools/src/react/resolution-tracing-section.tsx`
- Create: `/packages/devtools/src/react/tab-navigation.tsx`

---

#### Task Group 7: Controls Bar Component
**Dependencies:** Task Group 5, Task Group 6

- [x] 7.0 Complete TracingControlsBar component
  - [x] 7.1 Write 4-6 focused tests for controls bar
    - Test search input with 300ms debounce
    - Test lifetime filter button toggles
    - Test threshold slider value changes
    - Test recording indicator state (recording/paused)
    - Test active filters display and removal
  - [x] 7.2 Create TracingControlsBar component in `/packages/devtools/src/react/tracing-controls-bar.tsx`
    - Reuse searchInput pattern from ResolvedServices
    - Accept onFilterChange, onSortChange, onThresholdChange callbacks
  - [x] 7.3 Implement search input with debounce
    - 300ms debounce delay
    - Case-insensitive partial match on port names
    - Clear button (x) when input has value
  - [x] 7.4 Implement filter button groups
    - Lifetime: All, Singleton, Scoped, Request
    - Status: All, Fresh, Cached
    - Performance: All, Slow Only
    - Use aria-pressed for toggle state
  - [x] 7.5 Implement sort dropdown
    - Options: Chronological, Slowest First, Fastest First, Alphabetical, Resolution Order
    - Follow existing dropdown pattern
  - [x] 7.6 Implement threshold slider
    - Range: 5ms - 500ms, step: 5ms, default: 50ms
    - Gradient track (green-yellow-red)
    - Real-time value label update
  - [x] 7.7 Implement recording indicator
    - Pulsing red dot when recording
    - Gray dot when paused
    - Pause/Resume button integration
    - Live trace count and total time display
  - [x] 7.8 Implement active filters bar
    - Pill-shaped tags for each active filter
    - Clickable [x] to remove filter
    - "Clear filters" button
  - [x] 7.9 Ensure controls bar tests pass
    - Run ONLY the 4-6 tests written in 7.1

**Acceptance Criteria:**
- Search filters traces by port name
- All filter buttons toggle correctly
- Threshold slider updates threshold value
- Recording indicator reflects pause/resume state
- Active filters can be individually removed

**Files to create:**
- Create: `/packages/devtools/src/react/tracing-controls-bar.tsx`

---

#### Task Group 8: Timeline View Component
**Dependencies:** Task Group 5, Task Group 7

- [x] 8.0 Complete TimelineView component
  - [x] 8.1 Write 4-6 focused tests for timeline view
    - Test traces render as horizontal bars
    - Test bar width proportional to duration
    - Test color coding (green/yellow/red/cyan)
    - Test expandable row shows details
    - Test threshold marker renders at correct position
  - [x] 8.2 Create TimelineView component in `/packages/devtools/src/react/timeline-view.tsx`
    - Accept traces: TraceEntry[], threshold: number, filter: TraceFilter
    - Render time ruler at top
    - Render timeline rows for each trace
  - [x] 8.3 Implement time ruler component
    - Auto-scale based on total session duration
    - Major ticks every 25ms, minor ticks every 5ms
    - Threshold marker as red dashed vertical line
  - [x] 8.4 Implement TimelineRow component
    - Order badge (#1, #2, etc.)
    - Port name label
    - Duration bar with proportional width and position
    - Duration label, lifetime badge, status indicators
  - [x] 8.5 Implement bar color coding
    - Green: < 10ms (fast)
    - Yellow: 10ms - threshold (medium)
    - Red: >= threshold (slow)
    - Cyan: cache hit (any duration)
  - [x] 8.6 Implement expandable row details
    - Start time, end time, duration
    - Lifetime, cache status, scope
    - Dependencies list
    - "View in Tree" and "Copy Trace JSON" buttons
  - [x] 8.7 Implement zoom controls
    - [+] [-] [Fit All] [Focus Slow] buttons
    - Horizontal scroll for long timelines
  - [x] 8.8 Implement pinned trace indicator
    - Pin icon for pinned traces
    - Click to pin/unpin
  - [x] 8.9 Ensure timeline view tests pass
    - Run ONLY the 4-6 tests written in 8.1

**Acceptance Criteria:**
- Traces render as horizontal bars on time axis
- Color coding matches performance thresholds
- Expandable rows show trace details
- Zoom controls adjust timeline scale
- Pinned traces show pin indicator

**Files to create:**
- Create: `/packages/devtools/src/react/timeline-view.tsx`
- Create: `/packages/devtools/src/react/timeline-row.tsx`
- Create: `/packages/devtools/src/react/time-ruler.tsx`

---

#### Task Group 9: Tree View Component
**Dependencies:** Task Group 5, Task Group 7

- [x] 9.0 Complete TreeView component
  - [x] 9.1 Write 4-6 focused tests for tree view
    - Test hierarchical rendering of dependency chains
    - Test expand/collapse functionality
    - Test tree connectors render correctly
    - Test keyboard navigation (arrows, Enter, Home/End)
    - Test self-time vs total-time display modes
  - [x] 9.2 Create TreeView component in `/packages/devtools/src/react/tree-view.tsx`
    - Accept traces: TraceEntry[], grouped by root resolution
    - Build tree structure from parentTraceId/childTraceIds
    - Render TreeNode recursively
  - [x] 9.3 Implement TreeNode component
    - Expand toggle ([-] / [+]) for nodes with children
    - Port name, duration display, status indicators
    - Lifetime badge
    - 24px indentation per nesting level
  - [x] 9.4 Implement tree connectors
    - Vertical line (border-left) for parent-child connection
    - Horizontal arm (border-top) for node attachment
    - CSS-based connectors following wireframe pattern
  - [x] 9.5 Implement expand/collapse controls
    - [Expand All] [Collapse All] header buttons
    - Individual node toggle via click or keyboard
    - Persist expanded state
  - [x] 9.6 Implement time display modes
    - Self time: this node's direct execution time
    - Total time: node + all descendants
    - Toggle between modes in header
  - [x] 9.7 Implement visual states
    - Normal, hovered, selected states
    - Cached: cyan tint background
    - Slow: red border and background tint
  - [x] 9.8 Implement keyboard navigation
    - Up/Down: move between visible nodes
    - Left: collapse or move to parent
    - Right: expand or move to first child
    - Enter/Space: toggle expand/collapse
    - Home/End: jump to first/last node
  - [x] 9.9 Ensure tree view tests pass
    - Run ONLY the 4-6 tests written in 9.1

**Acceptance Criteria:**
- Dependency chains render hierarchically
- Expand/collapse works for all nodes
- Tree connectors display correctly
- Keyboard navigation is fully functional
- Self-time vs total-time toggle works

**Files to create:**
- Create: `/packages/devtools/src/react/tree-view.tsx`
- Create: `/packages/devtools/src/react/tree-node.tsx`

---

#### Task Group 10: Summary Stats View & Integration
**Dependencies:** Task Group 5, Task Group 7, Task Groups 1-4 (runtime)

- [x] 10.0 Complete SummaryStatsView component and integration
  - [x] 10.1 Write 4-6 focused tests for summary stats view
    - Test overview cards display correct values
    - Test duration distribution bar chart rendering
    - Test slowest services list ordering
    - Test cache efficiency visualization
    - Test clicking slowest service navigates to trace
  - [x] 10.2 Create SummaryStatsView component in `/packages/devtools/src/react/summary-stats-view.tsx`
    - Accept stats: TraceStats, traces: TraceEntry[]
    - Render overview cards grid
    - Render duration distribution chart
  - [x] 10.3 Implement overview cards grid
    - Total Resolutions, Avg Time, Cache Hit Rate, Slow Count
    - Responsive grid: 4-col > 2-col > 1-col
    - Conditional styling: Slow Count red when > 0, Cache Hit Rate color-coded
  - [x] 10.4 Implement duration distribution bar chart
    - Buckets: 0-10ms, 10-25ms, 25-50ms, 50-100ms, >100ms
    - Horizontal bars with proportional width
    - Color-coded by performance category
  - [x] 10.5 Implement slowest services list
    - Top 5 slowest services
    - Clickable rows navigate to Timeline/Tree view
    - Bar showing relative duration
  - [x] 10.6 Implement lifetime breakdown section
    - Singleton, Scoped, Request categories
    - Count, average time, total time per lifetime
    - Color-coded bars matching lifetime colors
  - [x] 10.7 Implement cache efficiency section
    - Fresh vs Cached stacked bar
    - Estimated time savings calculation
  - [x] 10.8 Wire up data flow integration
    - Connect TracingContainer to ResolutionTracingSection
    - Subscribe to real-time trace updates
    - Pass traces and stats to child views
  - [x] 10.9 Add export functionality
    - Export as JSON, CSV, Copy to Clipboard
    - Follow existing export patterns
  - [x] 10.10 Ensure summary stats tests pass
    - Run ONLY the 4-6 tests written in 10.1

**Acceptance Criteria:**
- Overview cards display accurate statistics
- Duration distribution shows correct buckets
- Slowest services are clickable and navigate correctly
- Lifetime breakdown shows all three lifetimes
- Cache efficiency shows fresh vs cached ratio
- Data flows from TracingContainer to all UI components

**Files to create:**
- Create: `/packages/devtools/src/react/summary-stats-view.tsx`
- Modify: `/packages/devtools/src/react/resolution-tracing-section.tsx` (wire up data flow)

---

### Final Integration

#### Task Group 11: Test Review & Gap Analysis
**Dependencies:** Task Groups 1-10

- [x] 11.0 Review existing tests and fill critical gaps only
  - [x] 11.1 Review tests from Task Groups 1-10
    - Task 1.1: 4-6 tests for trace types
    - Task 2.1: 5-7 tests for collectors
    - Task 3.1: 5-7 tests for TracingContainer
    - Task 4.1: 5-6 tests for eviction
    - Task 5.1: 3-4 tests for styles
    - Task 6.1: 4-5 tests for tabbed interface
    - Task 7.1: 4-6 tests for controls bar
    - Task 8.1: 4-6 tests for timeline view
    - Task 9.1: 4-6 tests for tree view
    - Task 10.1: 4-6 tests for summary stats
    - Total existing tests: approximately 43-59 tests
  - [x] 11.2 Analyze test coverage gaps for resolution tracing feature only
    - Identify critical end-to-end workflows missing coverage
    - Focus ONLY on gaps related to this spec's requirements
    - Prioritize integration tests over additional unit tests
  - [x] 11.3 Write up to 10 additional strategic tests maximum
    - End-to-end: createTracingContainer -> resolve -> UI display
    - Integration: filter changes update all three views
    - Integration: pause/resume affects recording state
    - Integration: pinned traces persist across view switches
    - Integration: export functionality works for all formats
  - [x] 11.4 Run feature-specific tests only
    - Run ONLY tests related to resolution tracing feature
    - Expected total: approximately 53-69 tests maximum
    - Verify all critical workflows pass
  - [x] 11.5 Update package exports
    - Add tracing exports to `/packages/devtools/src/index.ts`
    - Add React component exports to `/packages/devtools/src/react/index.ts`
    - Verify tree-shaking friendly structure

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 53-69 tests total)
- Critical user workflows are covered by integration tests
- No more than 10 additional tests added to fill gaps
- Package exports are complete and tree-shaking friendly
- Documentation comments are complete

**Files to modify:**
- Modify: `/packages/devtools/src/index.ts`
- Modify: `/packages/devtools/src/react/index.ts`
- Create: `/packages/devtools/src/tracing/__tests__/*.test.ts`
- Create: `/packages/devtools/src/react/__tests__/*.test.tsx`

---

## Summary

| Task Group | Description | Sub-tasks | Dependencies |
|------------|-------------|-----------|--------------|
| 1 | Trace Types & Interfaces | 7 | None |
| 2 | TraceCollector Strategy Pattern | 6 | Group 1 |
| 3 | TracingContainer Wrapper | 7 | Groups 1, 2 |
| 4 | Trace Limits & Eviction | 8 | Group 2 |
| 5 | DevTools Styles Extension | 8 | None |
| 6 | DevTools Tabbed Interface | 6 | Group 5 |
| 7 | Controls Bar Component | 9 | Groups 5, 6 |
| 8 | Timeline View Component | 9 | Groups 5, 7 |
| 9 | Tree View Component | 9 | Groups 5, 7 |
| 10 | Summary Stats View & Integration | 10 | Groups 1-4, 5, 7 |
| 11 | Test Review & Gap Analysis | 5 | Groups 1-10 |

**Total Sub-tasks:** 84

## Parallel Execution Opportunities

The following task groups can be executed in parallel:

- **Parallel Track A:** Groups 1-4 (Runtime Tracing Layer)
- **Parallel Track B:** Group 5 (Styles - no dependencies)

After Track A and B complete:
- Groups 6-10 can proceed sequentially or with limited parallelism

Group 11 must wait for all prior groups to complete.
