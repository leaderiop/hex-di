# @hex-di/react Package Standards

## Purpose
React integration as an adapter layer. This package provides React-idiomatic access to the DI container.

## Core Responsibilities
- Provide container via React context
- Enable type-safe access to ports via hooks
- Integrate with React component lifecycle

## Design Constraints

### React as Peer Dependency
- React is peer dependency, not bundled
- Support React 18+
- Compatible with concurrent features

### No Core Leakage
- React concepts don't leak into core packages
- This is an adapter, not the primary API
- Core works without React

## Provider Component

### Container Provision
- Single provider at app root
- Container passed as prop
- Children access via hooks

### Scope Management
- Optional scoped providers for sub-trees
- Nested providers create nested scopes
- Clear scope boundaries

## Hook API

### `usePort(PortToken)`
- Primary hook for accessing services
- Returns typed service instance
- Throws if provider missing (dev error)

### `useContainer()`
- Access raw container (advanced use)
- For dynamic resolution scenarios
- Prefer `usePort` for normal cases

## Naming Convention
- Use "Port" terminology, not "Service"
- `usePort`, not `useService` or `useInject`
- Consistent with HexDI vocabulary

## SSR Considerations
- Container must be serialization-safe or recreated per request
- Document SSR patterns
- No global singleton containers

## Success Criteria
- Type-safe hook usage
- Compile-time errors for missing providers
- Clean integration with React patterns
- No React leakage into core
