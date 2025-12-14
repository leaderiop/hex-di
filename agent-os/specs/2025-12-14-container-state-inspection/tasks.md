# Task Breakdown: Container State Inspection

## Overview
Total Tasks: 36 sub-tasks across 5 task groups

This feature implements runtime container state inspection for the hex-di dependency injection library. It spans two packages:
- `@hex-di/runtime` - Core inspection API (Symbol-based access, createInspector, snapshots)
- `@hex-di/devtools` - React UI components for visualization (ScopeHierarchy, ResolvedServices)

## Task List

### Runtime Core Layer

#### Task Group 1: MemoMap Metadata Enhancement
**Dependencies:** None

- [x] 1.0 Complete MemoMap metadata enhancement
  - [x] 1.1 Write 4-6 focused tests for MemoMap metadata functionality
    - Test `resolvedAt` timestamp is captured on instance creation
    - Test `resolutionOrder` increments correctly across memoizations
    - Test `entries()` iterator returns all cached entries with metadata
    - Test metadata is preserved through `getOrElseMemoize` calls
    - Test `fork()` resets resolution counter for child MemoMap
  - [x] 1.2 Extend `CreationEntry` interface with metadata fields
    - Add `resolvedAt: number` timestamp field
    - Add `resolutionOrder: number` order tracking field
    - Location: `/packages/runtime/src/memo-map.ts`
  - [x] 1.3 Add resolution counter to MemoMap instance
    - Add private `resolutionCounter: number` initialized to 0
    - Increment on each successful memoization
    - Capture `Date.now()` for `resolvedAt` timestamp
  - [x] 1.4 Implement `entries()` method for snapshot generation
    - Return `Iterable<[Port, EntryMetadata]>` structure
    - Include port, resolvedAt, resolutionOrder for each entry
    - Iterate `creationOrder` array for consistent ordering
  - [x] 1.5 Update `getOrElseMemoize` to capture metadata
    - Store `Date.now()` in `resolvedAt` field
    - Store current `resolutionCounter++` in `resolutionOrder`
    - Preserve backward compatibility with existing behavior
  - [x] 1.6 Ensure MemoMap metadata tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify existing MemoMap tests still pass
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 1.1 pass
- `CreationEntry` includes `resolvedAt` and `resolutionOrder` fields
- `entries()` method iterates all cached entries with metadata
- Resolution order counter increments correctly
- Existing MemoMap behavior is unchanged

---

#### Task Group 2: Symbol-based Access Protocol & Scope ID Generation
**Dependencies:** Task Group 1

- [x] 2.0 Complete Symbol-based access protocol and scope IDs
  - [x] 2.1 Write 4-6 focused tests for internal access protocol
    - Test `INTERNAL_ACCESS` Symbol grants access to container internals
    - Test accessor returns frozen snapshot object (not mutable state)
    - Test disposed container accessor throws descriptive error
    - Test scope ID is generated at scope creation time
    - Test scope IDs are unique and stable across snapshot calls
  - [x] 2.2 Define `INTERNAL_ACCESS` Symbol
    - Create Symbol in new file: `/packages/runtime/src/inspector-symbols.ts`
    - Use `Symbol.for('hex-di/internal-access')` for cross-realm consistency
    - Add JSDoc explaining Symbol-based encapsulation pattern
  - [x] 2.3 Add scope ID generation to ScopeImpl
    - Add `readonly id: string` field to ScopeImpl class
    - Generate incrementing ID at construction: `scope-${counter}`
    - Use module-level counter for unique IDs
    - Location: `/packages/runtime/src/container.ts`
  - [x] 2.4 Implement accessor method on ContainerImpl
    - Add method keyed by `INTERNAL_ACCESS` Symbol
    - Return frozen snapshot of internal state
    - Validate container is not disposed before access
    - Include: singletons, childScopes, disposed flag, adapterMap
  - [x] 2.5 Implement accessor method on ScopeImpl
    - Add method keyed by `INTERNAL_ACCESS` Symbol
    - Return frozen snapshot including scope ID, status, scopedMemo
    - Include reference to child scopes for tree traversal
  - [x] 2.6 Export Symbol and accessor types from runtime package
    - Export `INTERNAL_ACCESS` Symbol from index.ts
    - Define and export `InternalAccessor` interface
    - Define and export `ScopeInternalState` interface
    - Location: `/packages/runtime/src/index.ts`
  - [x] 2.7 Ensure Symbol access protocol tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify accessor returns correct snapshot structure
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 4-6 tests written in 2.1 pass
- `INTERNAL_ACCESS` Symbol is defined and exported
- Container and Scope accessors return frozen snapshots
- Scope IDs are unique and generated at creation time
- Disposed containers throw appropriate errors

---

#### Task Group 3: createInspector Factory & Snapshot Types
**Dependencies:** Task Group 2

- [x] 3.0 Complete createInspector factory and snapshot generation
  - [x] 3.1 Write 6-8 focused tests for inspector functionality
    - Test `createInspector(container)` returns `ContainerInspector` interface
    - Test `snapshot()` returns `ContainerSnapshot` with correct structure
    - Test `listPorts()` returns all registered port names
    - Test `isResolved(portName)` returns correct resolution status
    - Test `getScopeTree()` returns hierarchical `ScopeTree` structure
    - Test inspector creation is O(1) (no iteration during creation)
    - Test snapshot data is deeply frozen (Object.isFrozen checks)
    - Test disposed container operations throw descriptive errors
  - [x] 3.2 Define snapshot type interfaces
    - Create `/packages/runtime/src/inspector-types.ts`
    - Define `ContainerSnapshot`: `isDisposed`, `singletons`, `scopes`
    - Define `SingletonEntry`: `portName`, `lifetime`, `isResolved`, `resolvedAt`, `resolutionOrder`
    - Define `ScopeTree`: `id`, `status`, `resolvedCount`, `totalCount`, `children`
    - All types use `readonly` properties
  - [x] 3.3 Implement `createInspector` factory function
    - Create `/packages/runtime/src/create-inspector.ts`
    - Accept container, store reference for later access
    - Return frozen object implementing `ContainerInspector`
    - Inspector creation must be O(1) (defer iteration to method calls)
  - [x] 3.4 Implement `snapshot()` method
    - Access container internals via `INTERNAL_ACCESS` Symbol
    - Iterate MemoMap entries for singleton data
    - Build scope tree from childScopes relationships
    - Deep freeze entire result with `Object.freeze()`
  - [x] 3.5 Implement `listPorts()` method
    - Return array of all registered port names from adapterMap
    - Sort alphabetically for consistent ordering
    - Return fresh frozen array on each call
  - [x] 3.6 Implement `isResolved(portName)` method
    - Check singleton memo for resolution status
    - Handle scoped ports by returning "scope-required" indicator
    - Throw if port name not registered
  - [x] 3.7 Implement `getScopeTree()` method
    - Build hierarchical tree from container and child scopes
    - Include: id, status, resolvedCount, totalCount, children
    - Recursively traverse childScopes for nested tree
    - Return fresh frozen tree on each call
  - [x] 3.8 Export inspector factory and types from package
    - Export `createInspector` from index.ts
    - Export all snapshot types from index.ts
    - Add JSDoc documentation for public API
  - [x] 3.9 Ensure inspector tests pass
    - Run ONLY the 6-8 tests written in 3.1
    - Verify all inspector methods work correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 3.1 pass
- `createInspector(container)` returns working `ContainerInspector`
- All snapshot data is deeply frozen
- `getScopeTree()` correctly represents scope hierarchy
- Type definitions are complete and exported

---

### DevTools UI Layer

#### Task Group 4: React UI Components
**Dependencies:** Task Group 3

- [x] 4.0 Complete DevTools UI components
  - [x] 4.1 Write 6-8 focused tests for UI components
    - Test `ContainerInspector` renders when container prop provided
    - Test `ScopeHierarchy` displays tree structure with expand/collapse
    - Test scope selection updates `ResolvedServices` context
    - Test `ResolvedServices` displays services with status indicators
    - Test search input filters services with 300ms debounce
    - Test lifetime filter toggles (All/Singleton/Scoped/Request)
    - Test status filter toggles (Resolved/Pending)
    - Test auto-refresh toggle controls polling behavior
  - [x] 4.2 Add new style definitions for inspector components
    - Add `containerInspectorStyles` to `/packages/devtools/src/react/styles.ts`
    - Add `scopeTreeStyles` for tree visualization (lines, connectors)
    - Add `serviceListStyles` for search, filters, list
    - Add `serviceItemStyles` for status indicators (resolved/pending)
    - Add CSS variables: `--hex-devtools-resolved`, `--hex-devtools-pending`, etc.
  - [x] 4.3 Create `ScopeHierarchy` component
    - Create `/packages/devtools/src/react/scope-hierarchy.tsx`
    - Render tree with `[C]` icon for container, `[S]` for scopes
    - Implement expand/collapse with `[+]`/`[-]` controls
    - Show status badges (Active/Disposed), instance counts
    - Use CSS `::before` for tree connector lines
    - Support keyboard navigation (Arrow keys, Enter/Space)
  - [x] 4.4 Create `ScopeTreeNode` recursive component
    - Props: node info, depth, isSelected, onSelect, children
    - Indentation: 24px per depth level
    - Visual: scope ID, resolved count (e.g., "3/5 resolved"), status
    - Click handler for scope selection
  - [x] 4.5 Create `ResolvedServices` component
    - Create `/packages/devtools/src/react/resolved-services.tsx`
    - Props: services list, filters, search query, selected scope context
    - Sub-components: ServiceSearch, ServiceFilters, ServiceList
    - Integrate debounced search (300ms)
  - [x] 4.6 Create `ServiceSearch` component
    - Text input with placeholder "Search services..."
    - Clear button when query is non-empty
    - Debounce handler with 300ms delay
  - [x] 4.7 Create `ServiceFilters` component
    - Horizontal button group for lifetime filters
    - Separate button group for status filters
    - Active state styling for selected filters
  - [x] 4.8 Create `ServiceItem` component
    - Expandable row pattern (reuse from AdapterItem)
    - Status indicator: filled green circle (resolved), empty outline (pending)
    - Port name, lifetime badge (reuse getLifetimeBadgeStyle)
    - Expanded details: timestamp, resolution order, dependencies, cache location
    - Orange border/icon for scoped services in root context
  - [x] 4.9 Create `ContainerInspector` main component
    - Create `/packages/devtools/src/react/container-inspector.tsx`
    - Accept `container` and `graph` props
    - Create inspector once via `useMemo` from runtime package
    - Implement polling refresh (1 second interval, off by default)
    - Auto-refresh toggle in header with manual refresh button
    - Manage selected scope state, pass to child components
  - [x] 4.10 Integrate into DevToolsPanel
    - Add third CollapsibleSection for "Container Inspector"
    - Conditionally render when `container` prop is provided
    - Pass container and exportedGraph to ContainerInspector
    - Update `/packages/devtools/src/react/devtools-panel.tsx`
  - [x] 4.11 Add test IDs for testing
    - Section: `container-inspector-header`, `container-inspector-content`
    - Scope: `scope-node-{id}`, `scope-node-{id}-status`
    - Services: `service-item-{portName}`, `service-filter-{type}`
    - Search: `service-search`, `service-search-clear`
  - [x] 4.12 Ensure UI component tests pass
    - Run ONLY the 6-8 tests written in 4.1
    - Verify components render and interact correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 6-8 tests written in 4.1 pass
- ContainerInspector section appears in DevToolsPanel when container provided
- ScopeHierarchy displays tree with expand/collapse functionality
- ResolvedServices displays filtered, searchable service list
- Visual styling matches existing DevTools aesthetic
- Keyboard navigation works for tree and list components

---

### Integration & Testing

#### Task Group 5: Test Review & Integration Verification
**Dependencies:** Task Groups 1-4

- [x] 5.0 Review existing tests and verify feature integration
  - [x] 5.1 Review tests from Task Groups 1-4
    - Review the 4-6 MemoMap metadata tests (Task 1.1)
    - Review the 4-6 Symbol access protocol tests (Task 2.1)
    - Review the 6-8 inspector factory tests (Task 3.1)
    - Review the 6-8 UI component tests (Task 4.1)
    - Total existing tests: approximately 20-28 tests
  - [x] 5.2 Analyze test coverage gaps for THIS feature only
    - Identify critical integration points lacking coverage
    - Focus on runtime-to-devtools data flow
    - Check snapshot serialization edge cases
    - Verify polling/refresh lifecycle handling
  - [x] 5.3 Write up to 8 additional integration tests
    - Test end-to-end: container creation -> inspection -> UI display
    - Test scope creation/disposal updates tree correctly
    - Test service resolution updates ResolvedServices list
    - Test disposed container shows appropriate error state
    - Test multiple rapid refreshes don't cause race conditions
    - Test snapshot data is serializable (no circular refs)
    - Add maximum of 8 new tests to fill critical gaps
  - [x] 5.4 Run feature-specific tests only
    - Run ONLY tests related to Container State Inspection feature
    - Expected total: approximately 28-36 tests maximum
    - Verify all runtime package inspector tests pass
    - Verify all devtools component tests pass
    - Do NOT run unrelated tests from other features

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 28-36 tests total)
- Critical integration paths have test coverage
- Runtime inspector correctly provides data to DevTools components
- No more than 8 additional tests added when filling gaps
- Feature works end-to-end in development environment

---

## Execution Order

Recommended implementation sequence:

```
1. Task Group 1: MemoMap Metadata Enhancement
   - Foundation for tracking resolution timestamps and order
   - No external dependencies

2. Task Group 2: Symbol-based Access Protocol & Scope ID Generation
   - Builds on MemoMap metadata
   - Establishes encapsulated access pattern

3. Task Group 3: createInspector Factory & Snapshot Types
   - Builds on Symbol access protocol
   - Completes runtime package functionality

4. Task Group 4: React UI Components
   - Consumes runtime inspector API
   - Can begin in parallel with Group 3 using mock data

5. Task Group 5: Test Review & Integration Verification
   - Final verification of all components working together
   - Integration testing of complete feature
```

## File Creation Summary

### New Files (Runtime Package - `/packages/runtime/src/`)
- `inspector-symbols.ts` - INTERNAL_ACCESS Symbol definition
- `inspector-types.ts` - Snapshot and inspector type definitions
- `create-inspector.ts` - createInspector factory implementation

### New Files (DevTools Package - `/packages/devtools/src/react/`)
- `container-inspector.tsx` - Main ContainerInspector component
- `scope-hierarchy.tsx` - ScopeHierarchy and ScopeTreeNode components
- `resolved-services.tsx` - ResolvedServices, ServiceSearch, ServiceFilters, ServiceItem

### Modified Files
- `/packages/runtime/src/memo-map.ts` - Add metadata fields and entries() method
- `/packages/runtime/src/container.ts` - Add scope IDs and Symbol accessor methods
- `/packages/runtime/src/index.ts` - Export new inspector API
- `/packages/devtools/src/react/styles.ts` - Add inspector component styles
- `/packages/devtools/src/react/devtools-panel.tsx` - Integrate ContainerInspector section

## Visual Reference Files
- `planning/visuals/01-container-inspector-overview.txt` - Overall layout
- `planning/visuals/02-resolved-services-detail.txt` - Service list design
- `planning/visuals/03-scope-hierarchy-tree.txt` - Tree structure design
- `planning/visuals/04-lifetime-indicators.txt` - Badge and status styles
- `planning/visuals/05-interaction-patterns.txt` - Keyboard navigation spec
- `planning/visuals/06-component-structure.txt` - React component hierarchy
