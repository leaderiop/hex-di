# @hex-di/testing Package Standards

## Purpose
Testing utilities for explicit composition. This package enables testing through graph manipulation, not global mocks.

## Core Responsibilities
- Build test-specific graphs
- Override ports safely and explicitly
- Provide test container utilities
- Enable isolated test contexts

## Design Philosophy

### Explicit Over Implicit
- No global mock registrations
- Overrides are visible in test code
- Tests mirror production wiring

### Composition Over Mocking
- Build test graphs by composing adapters
- Replace adapters, not mock internals
- Test at architectural boundaries

## Test Graph Building

### Starting Points
- Start from production graph
- Start from empty graph
- Start from partial graph

### Override Mechanism
- `.override(Port, TestAdapter)` replaces adapter
- Type-safe: test adapter must satisfy port interface
- Clear precedence rules for nested overrides

## Mock Adapter Creation

### Lightweight Mocks
- Utilities for creating mock adapters
- Type-checked against port interface
- Minimal boilerplate

### Spy Integration
- Compatible with test framework spies
- Can wrap Vitest/Jest mocks
- Track resolution and calls

## Test Container

### Isolation
- Each test gets fresh container
- No shared state between tests
- Parallel test safe

### Cleanup
- Clear lifecycle hooks
- Dispose pattern for cleanup
- Memory leak prevention

## Success Criteria
- Tests are explicit about dependencies
- Easy to override specific ports
- AI can generate tests from graph structure
- Tests validate architectural boundaries
