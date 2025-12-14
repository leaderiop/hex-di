# Specification: Container State Inspection

## Goal
Enable developers to inspect runtime container state through a dedicated inspector API in `@hex-di/runtime` and a visual UI in `@hex-di/devtools`, showing resolved services, instance lifetimes, and scope hierarchy without exposing internal implementation details.

## User Stories
- As a developer, I want to see which services have been resolved in my container so that I can understand runtime behavior and debug initialization issues.
- As a developer, I want to visualize the scope hierarchy (parent-child relationships) so that I can verify scoped service isolation and understand instance sharing.

## Specific Requirements

**Symbol-based Internal Access Protocol**
- Define a `INTERNAL_ACCESS` Symbol in `@hex-di/runtime` that grants controlled access to container internals
- The Symbol-based protocol ensures encapsulation while allowing DevTools to read internal state
- Container and Scope implementations expose an accessor method keyed by this Symbol
- The accessor returns a frozen snapshot object, never the mutable internal state
- Export the Symbol and snapshot types from `@hex-di/runtime` for DevTools consumption

**createInspector Factory Function**
- Implement `createInspector(container)` factory in `@hex-di/runtime` that returns a `ContainerInspector` interface
- Inspector provides pure functions: `snapshot()`, `listPorts()`, `isResolved(portName)`, `getScopeTree()`
- Each method returns fresh, serializable, frozen data (no instance references, no methods on data)
- Inspector creation is O(1); snapshot generation iterates internal structures
- Validate container is not disposed before operations; throw descriptive error if disposed

**ContainerSnapshot Data Structure**
- `snapshot()` returns `ContainerSnapshot` with: `isDisposed`, `singletons` map, `scopes` tree
- Singleton entries include: `portName`, `lifetime`, `isResolved`, `resolvedAt` timestamp, `resolutionOrder`
- All data is plain objects with readonly properties; use `Object.freeze()` deeply
- Timestamps use `Date.now()` captured at resolution time (requires MemoMap enhancement)
- No reactive patterns - consumers must call `snapshot()` again for fresh data

**Scope Tree Structure**
- `getScopeTree()` returns hierarchical `ScopeTree` with root container and nested child scopes
- Each scope node includes: `id` (generated UUID or incremental), `status` (active/disposed), `resolvedCount`, `totalCount`, `children`
- Scope ID generation happens at scope creation time (requires ScopeImpl enhancement)
- Tree structure mirrors actual parent-child relationships from `childScopes` Set
- Disposed scopes remain in tree with `status: 'disposed'` until parent is disposed

**MemoMap Metadata Enhancement**
- Extend `CreationEntry` in MemoMap to track `resolvedAt: number` timestamp
- Track resolution order via incrementing counter in MemoMap instance
- Add method to iterate entries for snapshot generation: `entries(): Iterable<[Port, EntryMetadata]>`
- Preserve existing behavior; metadata is additive, not breaking

**ContainerInspector React Component**
- Create `ContainerInspector` component in `@hex-di/devtools/react` that uses the runtime inspector
- Component accepts `container` and `graph` props; creates inspector once via `useMemo`
- Implements polling-based refresh (1 second interval) with auto-refresh toggle (default: OFF)
- Contains two sub-sections: `ScopeHierarchy` and `ResolvedServices`
- Collapsed by default within DevToolsPanel (consistent with Container Browser)

**ScopeHierarchy Component**
- Renders tree visualization of container and all scopes with expand/collapse per node
- Root container shows: status badge (Active), singleton count (e.g., "3/5 resolved"), age
- Child scopes show: scope ID, scoped instance count, status, depth indicator
- Clicking a scope selects it and updates ResolvedServices to show that scope's context
- Tree connectors use CSS `::before` pseudo-elements with `var(--hex-devtools-border)` color

**ResolvedServices Component**
- Lists all services for currently selected scope with resolution status indicators
- Each service row shows: status indicator (filled/empty circle), port name, lifetime badge
- Expandable rows reveal: creation timestamp, resolution order, dependencies, cache location
- Search input with 300ms debounce filters by port name (case-insensitive, partial match)
- Filter toggles for lifetime (All/Singleton/Scoped/Request) and status (Resolved/Pending)

**Visual Status Indicators**
- Resolved: Filled green circle (`#a6e3a1`) indicating cached instance exists
- Not Resolved: Empty circle outline with muted color indicating pending resolution
- Scope Required Warning: Orange border/icon for scoped services viewed from root context
- Use color + shape combinations for accessibility (filled vs outline conveys meaning)
- Lifetime badges reuse existing `getLifetimeBadgeStyle()` from styles.ts

## Visual Design

**`planning/visuals/01-container-inspector-overview.txt`**
- Container Inspector appears as third collapsible section after Graph View and Container Browser
- Section header shows "Container Inspector" with expand/collapse chevron
- When expanded, displays Scope Hierarchy sub-section followed by Resolved Services sub-section
- Dark theme styling consistent with existing DevToolsPanel aesthetic

**`planning/visuals/02-resolved-services-detail.txt`**
- Search input at top with placeholder text and clear button
- Filter buttons arranged horizontally: lifetime filters then status filters
- Service list with compact rows showing status indicator, name, and lifetime badge
- Expanded service detail shows status, lifetime, scope, timestamps, dependencies, and instance info

**`planning/visuals/03-scope-hierarchy-tree.txt`**
- Tree structure with `[C]` icon for root container and `[S]` icon for scopes
- Expand/collapse controls `[+]`/`[-]` for nodes with children
- Status badges: Active (green), Disposed (red), Disposing (orange with pulse)
- Indentation per tree level (24px) with vertical connector lines

**`planning/visuals/04-lifetime-indicators.txt`**
- Singleton badge: green (`#a6e3a1`) background with dark text, uppercase label
- Scoped badge: blue (`#89b4fa`) background with dark text, uppercase label
- Request badge: orange (`#fab387`) background with dark text, uppercase label
- Resolution status uses 10px diameter circles with fill/outline distinction

**`planning/visuals/05-interaction-patterns.txt`**
- Keyboard navigation: Tab order through sections, Arrow keys for tree/list navigation
- Enter/Space toggles expand/collapse; Escape clears search/selection
- Scope selection updates ResolvedServices context with visual breadcrumb indicator
- Auto-refresh toggle in section header with manual refresh button

**`planning/visuals/06-component-structure.txt`**
- Component hierarchy: DevToolsPanel > CollapsibleSection > ContainerInspector > (ScopeHierarchy, ResolvedServices)
- Test ID conventions: `scope-node-{id}`, `service-item-{portName}`, `service-filter-{type}`
- Data flow: Inspector created once, polling triggers snapshot refresh, state flows down
- Style extensions for tree lines, status indicators, and scope icons

## Existing Code to Leverage

**`/packages/runtime/src/container.ts` - ContainerImpl and ScopeImpl classes**
- Internal `singletonMemo` and `scopedMemo` MemoMap instances hold cached instances
- `childScopes` Set tracks parent-child scope relationships for tree construction
- `disposed` flag indicates scope/container status; `getSingletonMemo()` provides memo access
- Pattern of wrapper functions (`createScopeWrapper`) for frozen public API can be extended

**`/packages/runtime/src/memo-map.ts` - MemoMap class**
- `cache` Map and `creationOrder` array provide access to resolved instances and order
- `has(port)` method checks resolution status; can be exposed via Symbol accessor
- Extend `CreationEntry` interface to include `resolvedAt` timestamp for metadata
- `fork()` pattern for scope inheritance informs how scope tree reflects memo relationships

**`/packages/devtools/src/react/devtools-panel.tsx` - DevToolsPanel and CollapsibleSection**
- `CollapsibleSection` component pattern for consistent expandable sections
- `AdapterItem` pattern for expandable list items with details drawer
- `useMemo` for graph conversion; same pattern applies to inspector creation
- Container prop already defined in `DevToolsPanelProps` interface

**`/packages/devtools/src/react/styles.ts` - Style definitions and CSS variables**
- `panelStyles`, `sectionStyles`, `adapterStyles` provide consistent styling patterns
- `getLifetimeBadgeStyle()` and `getLifetimeClassName()` for lifetime badge rendering
- CSS variables (`--hex-devtools-singleton`, etc.) for theming support
- Extend with new style definitions for tree lines, status indicators, scope icons

**`/packages/devtools/src/types.ts` - ExportedGraph and related types**
- Pattern of readonly, serializable data structures for graph representation
- `ExportedNode` with `id`, `label`, `lifetime` informs `ServiceInfo` structure
- Naming conventions and JSDoc patterns to follow for new snapshot types

## Out of Scope
- Resolution tracing and performance metrics (roadmap item #19 - separate feature)
- Instance value inspection (showing actual service data, properties, or method signatures)
- Memory usage estimation or instance size calculation
- Real-time event streaming or WebSocket-based updates (polling only)
- Reactive patterns or observable subscriptions for state changes
- Modification of container state through DevTools (read-only inspection)
- Persisting inspection snapshots to localStorage or exporting to files
- Scope disposal actions from DevTools UI (view-only, no control actions)
- Custom scope naming or labeling (auto-generated IDs only)
- Filtering by dependency relationships or graph traversal queries
