# Raw Idea

## Feature: Resolution Tracing

**Roadmap Item #19:** Implement resolution tracing for debugging that shows resolution order and identifies slow factories.

### Problem Statement

Developers using HexDI need visibility into the runtime behavior of their dependency injection container. Currently, there's no way to:
- Identify which service factories are slow and impacting startup time
- Understand the order in which services are resolved
- Visualize dependency chains and how resolutions cascade
- Measure cache efficiency (singleton/scoped hit rates)

### Proposed Solution

Add opt-in resolution tracing that captures timing data, resolution order, and dependency relationships during service resolution. Expose this data through:

1. **Runtime API** - `createTracingContainer()` wrapper that intercepts resolutions
2. **Inspector Extension** - `getTraces()` method for programmatic access
3. **DevTools UI** - New panel section with Timeline, Tree, and Summary views

### Key Requirements

- Zero overhead when disabled (separate subpath export for tree-shaking)
- Capture: duration, resolution order, dependency chain, cache status, scope
- Push/pull data access (events for real-time, batch for snapshots)
- Configurable "slow" threshold (default 50ms)
- Visual indicators: green (fast), yellow (medium), red (slow), cyan (cached)

### Prior Art

- ResolutionContext already tracks resolution path for circular dependency detection
- MemoMap already tracks resolvedAt timestamps and resolution order
- ContainerInspector provides the pattern for internal state access
