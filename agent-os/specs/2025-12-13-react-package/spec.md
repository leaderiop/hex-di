# Specification: @hex-di/react

## Goal
Provide a type-safe React integration layer for HexDI that enables React-idiomatic dependency injection via Provider components, typed hooks, and automatic scope lifecycle management while maintaining clean architecture boundaries.

## User Stories
- As a React developer, I want to resolve typed services via hooks so that I get compile-time safety and IDE autocompletion when accessing dependencies.
- As a clean architecture practitioner, I want container creation separated from Provider usage so that composition root remains in application code, not in React components.

## Specific Requirements

**createTypedHooks Factory Function**
- `createTypedHooks<TProvides>()` captures TProvides type at creation time
- Returns object containing: ContainerProvider, ScopeProvider, AutoScopeProvider, usePort, usePortOptional, useContainer, useScope
- Generic constraint `<P extends TProvides>` on hooks enforces compile-time port validation
- Return type exported as `TypedReactIntegration<TProvides>` for explicit typing scenarios
- Factory pattern avoids global type registry (no module augmentation)

**ContainerProvider Component**
- Props: `{ container: Container<TProvides>; children: ReactNode }`
- Accepts pre-created Container from `createContainer()` - does NOT accept Graph
- Creates React Context internally to provide container to descendants
- Context branded to prevent structural compatibility issues between different createTypedHooks calls
- Throws MissingProviderError if nested ContainerProvider detected (single container per tree)

**ScopeProvider Component (Manual)**
- Props: `{ scope: Scope<TProvides>; children: ReactNode }`
- Accepts externally managed scope for controlled lifecycle scenarios
- Does NOT dispose scope on unmount - caller owns lifecycle
- Provides scope via context, overriding container for nested usePort calls

**AutoScopeProvider Component (Automatic)**
- Props: `{ children: ReactNode }`
- Creates new scope from current resolver (container or parent scope) on mount
- Automatically disposes scope on unmount via useEffect cleanup
- Supports nested scopes - child AutoScopeProvider creates scope from parent scope
- Must be inside ContainerProvider; throws MissingProviderError otherwise

**usePort Hook**
- Signature: `usePort<P extends TProvides>(port: P): InferService<P>`
- Resolves from nearest resolver context (Scope if inside ScopeProvider, Container otherwise)
- Compile-time error if port not in TProvides union
- Throws MissingProviderError (isProgrammingError: true) if outside provider tree
- Programming errors (CircularDependencyError, DisposedScopeError) propagate as React errors
- Runtime errors (FactoryError) propagate to Error Boundaries

**usePortOptional Hook**
- Signature: `usePortOptional<P extends TProvides>(port: P): InferService<P> | undefined`
- Returns undefined instead of throwing when outside provider or resolution fails
- Same compile-time constraint `P extends TProvides` for type safety
- Use case: optional dependencies, feature detection, graceful degradation

**useContainer Hook**
- Signature: `useContainer(): Container<TProvides>`
- Returns root container for advanced scenarios (creating manual scopes, accessing dispose)
- Throws MissingProviderError if outside ContainerProvider
- Escape hatch when hooks need direct container access

**useScope Hook**
- Signature: `useScope(): Scope<TProvides>`
- Creates scope from current resolver and ties lifecycle to component unmount
- Scope disposed automatically via useEffect cleanup
- For imperative scope management within component logic
- Each call creates new scope; use useMemo pattern if scope reuse needed

**MissingProviderError**
- Extends ContainerError with code `"MISSING_PROVIDER"` and isProgrammingError: true
- Thrown by hooks when called outside appropriate provider context
- Message includes which hook was called and required provider type
- Follows error pattern from @hex-di/runtime

**SSR Compatibility**
- No global state - each createTypedHooks call creates isolated context
- Context per-request compatible - container passed to Provider on each render
- Works with Next.js App Router, Remix, and other SSR frameworks without special handling
- No useLayoutEffect usage to avoid SSR hydration warnings

## Visual Design
No visual assets provided - this is a programmatic React integration package.

## Existing Code to Leverage

**@hex-di/ports Port and InferService**
- `Port<T, TName>` branded type provides phantom service type
- `InferService<P>` extracts service type from port for hook return types
- Use same branded type pattern for React context to prevent structural compatibility

**@hex-di/runtime Container and Scope Types**
- `Container<TProvides>` and `Scope<TProvides>` define resolver interfaces
- Both have `resolve<P extends TProvides>(port: P): InferService<P>` method
- `createScope()` method on both for nested scope creation
- `dispose(): Promise<void>` for cleanup

**@hex-di/runtime Error Hierarchy**
- `ContainerError` base class with `code` and `isProgrammingError` properties
- CircularDependencyError, DisposedScopeError, ScopeRequiredError have isProgrammingError: true
- FactoryError has isProgrammingError: false (runtime error)
- Follow same pattern for MissingProviderError

**Test Organization Pattern**
- Runtime tests in `/packages/*/tests/` directory with `.test.ts` and `.test-d.ts` files
- Type tests use `expectTypeOf` from Vitest
- Runtime tests use standard Vitest assertions
- Add @testing-library/react for component/hook testing

**Package Export Pattern**
- Barrel exports via `index.ts` with type re-exports
- JSDoc comments on all public exports
- Separate type-only exports from value exports

## Out of Scope
- React Server Components - no 'use server' directives or RSC-specific patterns
- React Native - no React Native platform considerations
- Suspense Integration - no React.Suspense support for async resolution
- Async Factories - factories are sync-only matching @hex-di/runtime constraint
- Higher-Order Components - hooks are the exclusive public API
- DevTools Integration - React DevTools integration deferred to @hex-di/devtools package
- Global Type Registry - factory pattern used instead of module augmentation
- Container Creation - Provider accepts Container, does not create from Graph
- Multiple Containers per tree - single ContainerProvider per React tree enforced
- useReducer/useState for resolution - hooks resolve synchronously on each call
