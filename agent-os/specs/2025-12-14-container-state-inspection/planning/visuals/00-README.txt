================================================================================
CONTAINER STATE INSPECTION - UI WIREFRAMES
================================================================================
Version: 1.0
Date: 2025-12-14
Author: Claude Code (hex-di DevTools Design)

================================================================================
OVERVIEW
================================================================================

This directory contains ASCII/text-based wireframes and UI mockups for the
"Container State Inspection" feature to be added to the HexDI DevTools panel.

The feature enables developers to:
  1. View which services have been resolved (instantiated) vs registered-only
  2. See visual indicators for instance lifetimes (singleton/scoped/request)
  3. Navigate scope hierarchy (parent-child relationships)
  4. Inspect cached instances and their creation order

================================================================================
FILE INDEX
================================================================================

01-container-inspector-overview.txt
  - Overall layout showing how Container Inspector integrates into DevToolsPanel
  - Full panel structure with all sections
  - Styling notes and color coding reference

02-resolved-services-detail.txt
  - Detailed wireframes for the Resolved Services section
  - Item states: collapsed, expanded, with dependencies
  - Filter controls and search functionality
  - Visual states for resolved vs not-yet-resolved

03-scope-hierarchy-tree.txt
  - Scope hierarchy tree visualization
  - Container and scope node designs
  - Expanded details for root container and child scopes
  - Disposed scope representation
  - Tree connector line styling

04-lifetime-indicators.txt
  - Lifetime badge designs (singleton/scoped/request)
  - Resolution status indicators (resolved/pending/warning)
  - Cache location indicators
  - Creation order visualization
  - Instance sharing visualization
  - Disposal status states
  - Color-blind accessible alternatives

05-interaction-patterns.txt
  - Default states on load
  - Expansion/collapse behavior
  - Keyboard navigation
  - Search functionality
  - Filter interactions
  - Scope selection and context switching
  - Real-time updates
  - Error states
  - Tooltips and copy functionality

06-component-structure.txt
  - Proposed React component hierarchy
  - TypeScript interfaces for components and data
  - Style extension definitions
  - CSS variable additions
  - Data flow considerations
  - Integration points with existing DevToolsPanel
  - Test ID conventions

================================================================================
DESIGN PRINCIPLES
================================================================================

1. CONSISTENCY
   - Follows existing DevToolsPanel styling patterns
   - Uses same color coding for lifetimes (green/blue/orange)
   - Matches CollapsibleSection and AdapterItem patterns
   - Same dark theme aesthetic as TanStack DevTools

2. ACCESSIBILITY
   - Color + shape combinations for status indicators
   - Full keyboard navigation support
   - ARIA attributes for screen readers
   - Sufficient color contrast

3. INFORMATION HIERARCHY
   - Most important info (status, name) always visible
   - Details available on demand (expand/collapse)
   - Clear visual separation between sections
   - Progressive disclosure of complexity

4. PERFORMANCE
   - Auto-refresh is OFF by default
   - Large lists use virtual scrolling (implementation detail)
   - Debounced search input
   - Lazy expansion of scope details

================================================================================
IMPLEMENTATION NOTES
================================================================================

The Container Inspector requires runtime introspection capabilities that
may not currently exist in @hex-di/runtime. Implementation will need:

1. Either expose DevTools-specific inspection methods on Container/Scope
2. Or implement an observation/event system for state changes
3. Or use a separate inspection adapter pattern

See 06-component-structure.txt for detailed data flow proposals.

================================================================================
NEXT STEPS
================================================================================

1. Review wireframes with stakeholders
2. Finalize runtime introspection API design
3. Implement ScopeHierarchy component
4. Implement ResolvedServices component
5. Add Container Inspector to DevToolsPanel
6. Write comprehensive tests
7. Update documentation

================================================================================
