# Task Breakdown: @hex-di/react

## Overview
Total Tasks: 46 subtasks across 5 task groups

This package provides React integration for HexDI with type-safe hooks, Provider components, and automatic scope lifecycle management.

## Task List

### Package Infrastructure

#### Task Group 1: Package Setup and Error System
**Dependencies:** None

- [x] 1.0 Complete package infrastructure
  - [x] 1.1 Create package directory structure
    - Create `/packages/react/` directory
    - Create `/packages/react/src/` for source files
    - Create `/packages/react/tests/` for test files
  - [x] 1.2 Create package.json
    - Name: `@hex-di/react`
    - Dependencies: `@hex-di/ports`, `@hex-di/runtime`
    - Peer dependencies: `react` (>=18.0.0), `typescript` (>=5.0 optional)
    - Follow pattern from `/packages/graph/package.json`
    - Add `@testing-library/react` and `@testing-library/react-hooks` as devDependencies
  - [x] 1.3 Create tsconfig.json
    - Extend root tsconfig
    - Set composite: true
    - Include src and tests directories
    - Follow pattern from `/packages/graph/tsconfig.json`
  - [x] 1.4 Create tsconfig.build.json
    - Exclude tests from build output
    - Set outDir to ./dist
  - [x] 1.5 Implement MissingProviderError
    - Create `/packages/react/src/errors.ts`
    - Extend ContainerError from @hex-di/runtime
    - Set code: "MISSING_PROVIDER"
    - Set isProgrammingError: true
    - Include hookName and requiredProvider in error message
    - Follow error pattern from `/packages/runtime/src/errors.ts`
  - [x] 1.6 Write 3 focused tests for MissingProviderError
    - Test error properties (code, isProgrammingError, message format)
    - Test instanceof ContainerError
    - Test error message includes hook name and provider type
  - [x] 1.7 Verify package infrastructure
    - Run TypeScript compilation (tsc --noEmit)
    - Verify MissingProviderError tests pass

**Acceptance Criteria:**
- Package structure matches sibling packages
- package.json has correct dependencies and peer dependencies
- tsconfig.json properly extends root config
- MissingProviderError follows @hex-di/runtime error patterns
- All 3 infrastructure tests pass

---

### Core Context System

#### Task Group 2: React Context and Provider Components
**Dependencies:** Task Group 1

- [x] 2.0 Complete context and provider infrastructure
  - [x] 2.1 Write 6 focused tests for context and providers
    - Test ContainerProvider renders children
    - Test ContainerProvider provides container via context
    - Test ScopeProvider renders children and provides scope
    - Test AutoScopeProvider creates and disposes scope on lifecycle
    - Test nested ContainerProvider throws error
    - Test AutoScopeProvider outside ContainerProvider throws MissingProviderError
  - [x] 2.2 Create internal context types
    - Create `/packages/react/src/context.tsx`
    - Define branded context type to prevent structural compatibility
    - Define ResolverContext type (Container | Scope)
    - Define internal context value structure
  - [x] 2.3 Implement ContainerProvider component
    - Create `/packages/react/src/context.tsx` (combined with context types)
    - Props: `{ container: Container<TProvides>; children: ReactNode }`
    - Create React Context internally (not exported)
    - Detect nested ContainerProvider and throw MissingProviderError
    - Store container in context for descendant access
  - [x] 2.4 Implement ScopeProvider component
    - Create `/packages/react/src/context.tsx` (combined with context types)
    - Props: `{ scope: Scope<TProvides>; children: ReactNode }`
    - Accept externally managed scope (manual lifecycle)
    - Override resolver context for nested components
    - Do NOT dispose scope on unmount (caller owns lifecycle)
  - [x] 2.5 Implement AutoScopeProvider component
    - Create `/packages/react/src/context.tsx` (combined with context types)
    - Props: `{ children: ReactNode }`
    - Create scope from current resolver on mount (useEffect)
    - Dispose scope on unmount via useEffect cleanup
    - Support nested AutoScopeProvider (creates child scope from parent)
    - Throw MissingProviderError if outside ContainerProvider
    - Avoid useLayoutEffect for SSR compatibility
  - [x] 2.6 Verify provider component tests pass
    - Run only the 6 tests written in 2.1

**Acceptance Criteria:**
- All 6 provider tests pass
- ContainerProvider properly provides container via context
- ScopeProvider overrides resolver context without managing lifecycle
- AutoScopeProvider manages scope lifecycle tied to component
- Nested ContainerProvider detection works correctly

---

### Hooks Implementation

#### Task Group 3: React Hooks for Service Resolution
**Dependencies:** Task Group 2

- [x] 3.0 Complete hooks implementation
  - [x] 3.1 Write 8 focused tests for hooks
    - Test usePort resolves service from container
    - Test usePort resolves service from nearest scope
    - Test usePort throws MissingProviderError outside provider
    - Test usePortOptional returns undefined outside provider
    - Test usePortOptional returns service when available
    - Test useContainer returns root container
    - Test useContainer throws outside ContainerProvider
    - Test useScope creates and disposes scope on component lifecycle
  - [x] 3.2 Implement useContainer hook
    - Create `/packages/react/src/use-container.ts`
    - Signature: `useContainer(): Container<TProvides>`
    - Access ContainerContext and return container
    - Throw MissingProviderError if context undefined
    - Include hook name in error message
  - [x] 3.3 Implement usePort hook
    - Create `/packages/react/src/use-port.ts`
    - Signature: `usePort<P extends TProvides>(port: P): InferService<P>`
    - Resolve from nearest resolver (Scope if in ScopeProvider, Container otherwise)
    - Throw MissingProviderError if outside provider tree
    - Let ContainerError subclasses propagate (programming errors and FactoryError)
  - [x] 3.4 Implement usePortOptional hook
    - Create `/packages/react/src/use-port-optional.ts`
    - Signature: `usePortOptional<P extends TProvides>(port: P): InferService<P> | undefined`
    - Return undefined if outside provider
    - Return undefined if resolution fails (catch errors)
    - Same compile-time constraint `P extends TProvides`
  - [x] 3.5 Implement useScope hook
    - Create `/packages/react/src/use-scope.ts`
    - Signature: `useScope(): Scope<TProvides>`
    - Create scope from current resolver using useMemo/useRef pattern
    - Dispose scope on unmount via useEffect cleanup
    - Each call creates new scope (document that useMemo needed for reuse)
    - Throw MissingProviderError if outside provider
  - [x] 3.6 Verify hooks tests pass
    - Run only the 8 tests written in 3.1

**Acceptance Criteria:**
- All 8 hooks tests pass
- usePort provides type-safe resolution with proper error handling
- usePortOptional gracefully returns undefined on failure
- useContainer provides escape hatch to root container
- useScope manages scope lifecycle tied to component

---

### Factory and Types

#### Task Group 4: createTypedHooks Factory and Type Exports
**Dependencies:** Task Group 3

- [x] 4.0 Complete factory function and type exports
  - [x] 4.1 Write 6 focused tests for factory and integration
    - Test createTypedHooks returns all expected components/hooks
    - Test returned hooks are bound to TProvides type
    - Test multiple createTypedHooks calls create isolated contexts
    - Test TypedReactIntegration type matches factory return
    - Test full integration: ContainerProvider + usePort resolution flow
    - Test scope hierarchy: Container -> AutoScope -> nested AutoScope
  - [x] 4.2 Define TypedReactIntegration type
    - Create `/packages/react/src/types.ts`
    - Export interface `TypedReactIntegration<TProvides>`
    - Include: ContainerProvider, ScopeProvider, AutoScopeProvider
    - Include: usePort, usePortOptional, useContainer, useScope
    - Proper generic constraints on each member
  - [x] 4.3 Implement createTypedHooks factory
    - Create `/packages/react/src/create-typed-hooks.tsx`
    - Signature: `createTypedHooks<TProvides extends Port<unknown, string>>(): TypedReactIntegration<TProvides>`
    - Create branded context per factory call (isolation)
    - Return object with all provider components and hooks
    - Capture TProvides type parameter at creation time
    - Ensure no global state (SSR compatible)
  - [x] 4.4 Create barrel export
    - Create `/packages/react/src/index.ts`
    - Export createTypedHooks as primary API
    - Export TypedReactIntegration type
    - Export MissingProviderError
    - Re-export relevant types from @hex-di/ports and @hex-di/runtime
    - Add JSDoc package documentation header
  - [x] 4.5 Verify factory and integration tests pass
    - Run only the 6 tests written in 4.1

**Acceptance Criteria:**
- All 6 factory tests pass
- createTypedHooks returns properly typed integration object
- Multiple factory calls create isolated contexts
- TypedReactIntegration type is accurate and exported
- Barrel exports include all public API

---

### Type Safety and Quality Assurance

#### Task Group 5: Type Tests and Test Gap Analysis
**Dependencies:** Task Group 4

- [x] 5.0 Complete type tests and review test coverage
  - [x] 5.1 Write type tests for compile-time validation
    - Create `/packages/react/tests/types.test-d.ts`
    - Test usePort accepts only ports in TProvides (compile error for invalid ports)
    - Test usePortOptional accepts only ports in TProvides
    - Test InferService correctly extracts service type from usePort return
    - Test TypedReactIntegration type structure
    - Test createTypedHooks preserves TProvides through all hooks
    - Test Container and Scope type parameters flow correctly
    - Use expectTypeOf from Vitest
  - [x] 5.2 Write type tests for error cases
    - Create or extend `/packages/react/tests/types.test-d.ts`
    - Test invalid port causes compile error in usePort
    - Test ContainerProvider requires matching Container type
    - Test ScopeProvider requires matching Scope type
  - [x] 5.3 Review existing tests from Task Groups 1-4
    - Review 3 tests from Task Group 1 (MissingProviderError)
    - Review 6 tests from Task Group 2 (providers)
    - Review 8 tests from Task Group 3 (hooks)
    - Review 6 tests from Task Group 4 (factory)
    - Total existing runtime tests: 23 tests
    - Total type tests: ~9 assertions
  - [x] 5.4 Analyze test coverage gaps for this feature
    - Focus on @hex-di/react feature requirements only
    - Identify any critical workflows lacking coverage
    - Do NOT assess entire monorepo test coverage
    - Prioritize end-to-end React integration scenarios
  - [x] 5.5 Write up to 8 additional strategic tests if needed
    - Fill only critical gaps identified in 5.4
    - Focus on error propagation (FactoryError, CircularDependencyError)
    - Test SSR compatibility (no useLayoutEffect warnings)
    - Test disposal behavior in AutoScopeProvider
    - Test scope resolution priority (nearest scope wins)
    - Maximum 8 new tests
  - [x] 5.6 Run all @hex-di/react tests
    - Run complete test suite for this package only
    - Verify all runtime tests pass (approximately 23-31 tests)
    - Verify all type tests pass
    - Do NOT run tests for other packages
  - [x] 5.7 Final build verification
    - Run `pnpm build` for @hex-di/react
    - Verify dist output contains ESM and types
    - Verify no TypeScript errors

**Acceptance Criteria:**
- All type tests pass with proper compile-time validation
- All runtime tests pass (approximately 23-31 tests total)
- Invalid ports cause compile-time errors (not runtime)
- Package builds successfully with no errors
- Public API matches spec requirements

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Package Setup and Error System**
   - Foundation for all other work
   - No dependencies on other task groups
   - Establishes error patterns and package structure

2. **Task Group 2: React Context and Provider Components**
   - Depends on Task Group 1 (MissingProviderError)
   - Creates context infrastructure that hooks depend on
   - ContainerProvider, ScopeProvider, AutoScopeProvider

3. **Task Group 3: React Hooks for Service Resolution**
   - Depends on Task Group 2 (context system)
   - Implements usePort, usePortOptional, useContainer, useScope
   - Core API that developers will use

4. **Task Group 4: createTypedHooks Factory and Type Exports**
   - Depends on Task Group 3 (all hooks implemented)
   - Ties everything together into the public factory API
   - Creates barrel exports

5. **Task Group 5: Type Tests and Test Gap Analysis**
   - Depends on all previous groups (complete implementation)
   - Validates compile-time type safety
   - Final quality assurance pass

---

## File Structure Reference

```
packages/react/
  package.json
  tsconfig.json
  tsconfig.build.json
  src/
    index.ts                    # Barrel exports
    errors.ts                   # MissingProviderError
    context.ts                  # Internal context types
    types.ts                    # TypedReactIntegration, public types
    create-typed-hooks.tsx      # Factory function
    container-provider.tsx      # ContainerProvider component
    scope-provider.tsx          # ScopeProvider component
    auto-scope-provider.tsx     # AutoScopeProvider component
    use-container.ts            # useContainer hook
    use-port.ts                 # usePort hook
    use-port-optional.ts        # usePortOptional hook
    use-scope.ts                # useScope hook
  tests/
    errors.test.ts              # MissingProviderError tests
    providers.test.tsx          # Provider component tests
    hooks.test.tsx              # Hook tests
    factory.test.tsx            # createTypedHooks tests
    types.test-d.ts             # Type-level tests
```

---

## Key Patterns to Follow

**From @hex-di/ports:**
- Branded types using unique symbols
- InferService utility type pattern

**From @hex-di/runtime:**
- ContainerError base class with code and isProgrammingError
- Container and Scope type definitions
- Error.captureStackTrace for clean stack traces

**From @hex-di/graph:**
- package.json structure and exports configuration
- tsconfig.json setup with composite: true

**Testing Patterns:**
- Vitest for runtime tests
- expectTypeOf for type tests
- @testing-library/react for component/hook testing
- Separate `.test.ts` (runtime) and `.test-d.ts` (type) files
