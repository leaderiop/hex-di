# @hex-di/react Package - Initial Idea

## Description

Build the `@hex-di/react` package - the React integration layer for HexDI dependency injection library. This package provides React Provider components and type-safe hooks for accessing the DI container from React components.

## Key Features

- **createTypedHooks<TProvides>()** - Factory function returning typed React integration
- **ContainerProvider** - Root provider accepting pre-created Container
- **ScopeProvider / AutoScopeProvider** - Scope management with auto-dispose
- **usePort** - Type-safe port resolution with compile-time validation
- **usePortOptional** - Optional resolution returning undefined on failure
- **useContainer / useScope** - Direct container/scope access for advanced use

## Design Decisions

1. **Provider accepts Container** - Not Graph (Composition Root separation)
2. **Factory Pattern** - createTypedHooks<TProvides>() for compile-time safety
3. **Both ScopeProvider + useScope** - Declarative and imperative options
4. **Separate usePortOptional** - Clear type signature for optional resolution
5. **Error Split** - Programming errors crash, runtime errors go to Error Boundaries
6. **usePort naming** - Consistent with HexDI 'Port' vocabulary
7. **Framework-Agnostic SSR** - No global state, works with Next.js/Remix

## Out of Scope

- React Server Components
- React Native
- Suspense Integration
- Async Factories

## Dependencies

- `@hex-di/ports`
- `@hex-di/runtime`
- React >=18.0.0 (peer)
