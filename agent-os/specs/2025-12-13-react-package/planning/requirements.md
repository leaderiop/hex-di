# Spec Requirements: @hex-di/react

## Initial Description

Build the `@hex-di/react` package - the React integration layer for HexDI dependency injection library. This package implements React Provider components, type-safe hooks, and scope management (roadmap items 11-13). It depends on `@hex-di/ports`, `@hex-di/graph`, and `@hex-di/runtime` packages, providing React-idiomatic access to the DI container while maintaining clean architecture boundaries.

## Requirements Discussion

### Design Decisions Made

**Q1:** How should the Provider component accept the container?
**Answer:** Accept Container - ContainerProvider accepts pre-created Container from createContainer(). Container creation stays in Composition Root, respecting Clean Architecture's separation of concerns.

**Q2:** How should type safety be achieved for hooks?
**Answer:** Factory Pattern - `createTypedHooks<TProvides>()` returns typed hooks. Full compile-time safety where usePort rejects invalid ports at compile time.

**Q3:** How should scopes be managed in React?
**Answer:** Both ScopeProvider + useScope - ScopeProvider for declarative boundaries with auto-dispose on unmount, useScope() for imperative control in advanced scenarios.

**Q4:** Should there be an optional resolution hook?
**Answer:** Separate usePortOptional - Clear type signature returning `T | undefined`, explicit intent at call sites.

**Q5:** How should DI errors be handled in React?
**Answer:** Split by Error Type - Programming errors (CircularDependencyError, DisposedScopeError) crash the app. Runtime errors (FactoryError) propagate to Error Boundaries.

**Q6:** What should the primary resolution hook be named?
**Answer:** usePort - Consistent with HexDI 'Port' vocabulary. `usePort(LoggerPort)` returns Logger service.

**Q7:** Should SSR be explicitly supported?
**Answer:** Framework-Agnostic - No global state, context per-request compatible. Works with Next.js, Remix without special handling.

**Q8:** What should be explicitly OUT of scope?
**Answer:** React Server Components, React Native, Suspense Integration, Async Factories (sync-only matches @hex-di/runtime).

### Existing Code to Reference

**Similar Features Identified:**
- Feature: `@hex-di/ports` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/ports`
  - Port<T, TName> branded type and createPort function
  - InferService utility type for type inference

- Feature: `@hex-di/graph` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/graph`
  - GraphBuilder pattern for fluent API
  - InferGraphProvides for extracting port types from graph

- Feature: `@hex-di/runtime` - Path: `/Users/mohammadalmechkor/Projects/hex-di/packages/runtime`
  - Container<TProvides> and Scope<TProvides> types
  - createContainer function
  - ContainerError hierarchy with isProgrammingError classification

**External Reference:**
- React Context API patterns
- React hooks best practices
- Clean Architecture React integration patterns

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - This is a React integration package; API design is code-based.

## Requirements Summary

### Functional Requirements

**Factory Pattern for Type-Safe Hooks:**
- `createTypedHooks<TProvides>()` function returns typed React integration
- Captures TProvides type parameter at creation time
- Returns: ContainerProvider, ScopeProvider, AutoScopeProvider, usePort, usePortOptional, useContainer, useScope
- Full compile-time port validation - usePort rejects ports not in TProvides

**ContainerProvider Component:**
- Props: `{ container: Container<TProvides>; children: ReactNode }`
- Accepts pre-created Container from createContainer()
- Provides container via React Context to descendant components
- Does NOT accept Graph - container creation belongs in Composition Root

**ScopeProvider Component:**
- Props: `{ children: ReactNode }` (automatic) or `{ scope: Scope<TProvides>; children: ReactNode }` (explicit)
- AutoScopeProvider: Creates scope on mount, disposes on unmount automatically
- Manual ScopeProvider: Accepts explicit scope for controlled lifecycle
- Nested scopes supported - creates child scope from parent

**usePort Hook:**
- Signature: `usePort<P extends TProvides>(port: P): InferService<P>`
- Resolves port from nearest Container or Scope context
- Compile-time error if port not in TProvides
- Throws MissingProviderError if called outside provider

**usePortOptional Hook:**
- Signature: `usePortOptional<P extends TProvides>(port: P): InferService<P> | undefined`
- Returns undefined instead of throwing when:
  - Called outside provider
  - Resolution fails
- For optional dependencies and feature detection patterns

**useContainer Hook:**
- Signature: `useContainer(): Container<TProvides>`
- Returns root container for advanced scenarios
- Throws MissingProviderError if outside provider

**useScope Hook:**
- Signature: `useScope(): Scope<TProvides>`
- Creates scope from current resolver (container or parent scope)
- Scope disposed automatically on component unmount
- For imperative scope management

**Error Handling:**
- Programming errors (isProgrammingError: true) propagate as React errors
  - CircularDependencyError - crash the app
  - DisposedScopeError - crash the app
  - ScopeRequiredError - crash the app
- Runtime errors (isProgrammingError: false) go to Error Boundaries
  - FactoryError - can be caught and handled
- Custom MissingProviderError for hooks outside provider

**SSR Compatibility:**
- No global state - context created per-request
- Framework-agnostic - works with Next.js, Remix without special handling
- Context per-request compatible for server-side rendering

### Reusability Opportunities

- Branded type patterns from `@hex-di/ports`
- Test file organization from sibling packages
- Type inference patterns from `@hex-di/runtime`
- Error handling patterns from `@hex-di/runtime`

### Scope Boundaries

**In Scope:**
- `createTypedHooks<TProvides>()` factory function
- ContainerProvider component
- ScopeProvider and AutoScopeProvider components
- usePort hook with compile-time safety
- usePortOptional hook for optional resolution
- useContainer hook for advanced access
- useScope hook for imperative scope management
- MissingProviderError custom error
- TypedReactIntegration type for return value
- Unit tests and type tests
- SSR-compatible design (no global state)

**Out of Scope:**
- **React Server Components** - No 'use server' directives or RSC patterns
- **React Native** - No React Native specific considerations
- **Suspense Integration** - No React Suspense support for async resolution
- **Async Factories** - Factories are sync-only (matches @hex-di/runtime)
- **Global type registry** - Factory pattern used instead of module augmentation
- **Higher-order components** - Hooks are the primary API
- **DevTools** - React DevTools integration deferred to @hex-di/devtools

### Technical Considerations

**Package Dependencies:**
- Depends on `@hex-di/ports` (Port, InferService)
- Depends on `@hex-di/runtime` (Container, Scope, ContainerError, FactoryError)
- Peer dependency on React >=18.0.0
- Zero other external dependencies

**Type-Level Design Patterns:**
- Factory pattern preserves TProvides through typed context
- Constrained generic `<P extends TProvides>` for compile-time validation
- Branded context to prevent structural compatibility issues

**API Design Principles:**
- Hooks as primary API (React-idiomatic)
- Container as escape hatch for advanced use
- Automatic scope lifecycle tied to component lifecycle
- Clear error messages with actionable guidance

**Testing Requirements:**
- Co-located tests (`*.test.ts` next to source)
- Type tests (`*.test-d.ts`) for compile-time behavior
- Use Vitest with `expectTypeOf` for type assertions
- Use @testing-library/react for component/hook tests
- Test provider nesting, scope lifecycle, error scenarios

**Build and Distribution:**
- TypeScript strict mode
- ESM and CJS output (following sibling package pattern)
- Barrel exports via `index.ts`
- kebab-case file naming
- React as peer dependency (not bundled)
