# Spec Initialization

## Feature Name
@hex-di/react - React Integration Package

## Initial Description
Build the `@hex-di/react` package - the React integration layer for HexDI that provides idiomatic React bindings for the dependency injection system.

Based on roadmap items 11-13:
- Item 11: React Provider Component - Implement `ContainerProvider` component that provides container via React context with support for nested scoped providers
- Item 12: usePort Hook - Implement `usePort(PortToken)` hook that returns typed service instances with proper error handling for missing providers
- Item 13: useContainer Hook - Implement `useContainer()` hook for advanced use cases requiring direct container access for dynamic resolution

## Context
This package sits on top of `@hex-di/runtime` and provides first-class React integration. It needs to:
- Accept Container/Scope from @hex-di/runtime
- Provide type-safe hooks for service resolution
- Support SSR (Server-Side Rendering)
- Handle scope lifecycle with React components
- Maintain the compile-time validation philosophy

## Dependencies
- @hex-di/runtime (direct dependency)
- React 18+ (peer dependency)
