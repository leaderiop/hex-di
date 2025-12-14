/**
 * Internal React Context infrastructure for @hex-di/react.
 *
 * This module provides the context system that enables React components
 * to access the DI container and scopes. The context is branded to prevent
 * structural compatibility issues between different createTypedHooks calls.
 *
 * @remarks
 * - Context is internal and not exported from the package barrel
 * - ContainerProvider, ScopeProvider, and AutoScopeProvider are re-exported
 * - The branded context pattern ensures type safety across factory boundaries
 *
 * @packageDocumentation
 */

import { createContext, useState, useEffect, useContext, type ReactNode } from "react";
import type { Port } from "@hex-di/ports";
import type { Container, Scope } from "@hex-di/runtime";
import { MissingProviderError } from "./errors.js";

// =============================================================================
// Brand Symbol for Context
// =============================================================================

/**
 * Unique symbol used for branding context values.
 *
 * This symbol ensures that context values from different createTypedHooks
 * calls are not structurally compatible, preventing accidental mixing of
 * different container trees.
 *
 * @internal
 */
declare const ContextBrand: unique symbol;

// =============================================================================
// Internal Context Value Types
// =============================================================================

/**
 * Resolver type representing either a Container or Scope.
 *
 * Both Container and Scope have the same `resolve` and `createScope` methods,
 * allowing them to be used interchangeably for service resolution.
 *
 * @typeParam TProvides - Union of Port types that can be resolved
 *
 * @internal
 */
export type Resolver<TProvides extends Port<unknown, string>> =
  | Container<TProvides>
  | Scope<TProvides>;

/**
 * Internal context value structure for the container context.
 *
 * This stores the root container reference, which is needed for:
 * - Creating new scopes via `useScope` hook
 * - Detecting nested ContainerProvider (single container per tree)
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 *
 * @internal
 */
export interface ContainerContextValue<TProvides extends Port<unknown, string>> {
  /**
   * The root container provided by ContainerProvider.
   */
  readonly container: Container<TProvides>;

  /**
   * Brand property for nominal typing.
   * Prevents structural compatibility between different createTypedHooks contexts.
   */
  readonly [ContextBrand]: { provides: TProvides };
}

/**
 * Internal context value structure for the resolver context.
 *
 * This stores the current resolver (Container or Scope), which may differ
 * from the root container when inside a ScopeProvider or AutoScopeProvider.
 *
 * @typeParam TProvides - Union of Port types that can be resolved
 *
 * @internal
 */
export interface ResolverContextValue<TProvides extends Port<unknown, string>> {
  /**
   * The current resolver - either the root container or a scope.
   */
  readonly resolver: Resolver<TProvides>;

  /**
   * Brand property for nominal typing.
   * Prevents structural compatibility between different createTypedHooks contexts.
   */
  readonly [ContextBrand]: { provides: TProvides };
}

// =============================================================================
// React Contexts
// =============================================================================

/**
 * React Context for the root container.
 *
 * This context stores the root container and is used to:
 * - Detect nested ContainerProvider (which is an error)
 * - Access the container for scope creation via useContainer
 *
 * @remarks
 * The context value is null when outside a ContainerProvider.
 * Hooks should check for null and throw MissingProviderError.
 *
 * @internal
 */
export const ContainerContext = createContext<ContainerContextValue<Port<unknown, string>> | null>(null);
ContainerContext.displayName = "HexDI.ContainerContext";

/**
 * React Context for the current resolver (Container or Scope).
 *
 * This context stores the nearest resolver and is used by:
 * - usePort hook for service resolution
 * - AutoScopeProvider for creating child scopes
 *
 * @remarks
 * The resolver context is separate from the container context so that
 * ScopeProvider and AutoScopeProvider can override the resolver while
 * preserving access to the root container.
 *
 * @internal
 */
export const ResolverContext = createContext<ResolverContextValue<Port<unknown, string>> | null>(null);
ResolverContext.displayName = "HexDI.ResolverContext";

// =============================================================================
// ContainerProvider Component
// =============================================================================

/**
 * Props for the ContainerProvider component.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 */
export interface ContainerProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The pre-created Container instance to provide to the React tree.
   *
   * @remarks
   * The container must be created externally using `createContainer` from
   * `@hex-di/runtime`. The Provider does not create or manage the container's
   * lifecycle - the caller is responsible for disposal.
   */
  readonly container: Container<TProvides>;

  /**
   * React children that will have access to the container via hooks.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that makes a DI container available to React components.
 *
 * ContainerProvider establishes the root of a DI tree in React. All hooks
 * (usePort, useContainer, etc.) require a ContainerProvider ancestor.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 *
 * @param props - The provider props including container and children
 *
 * @throws {MissingProviderError} If nested inside another ContainerProvider.
 *   Only one ContainerProvider is allowed per React tree.
 *
 * @remarks
 * - Only one ContainerProvider per React tree (nested providers throw)
 * - The container prop should come from `createContainer()` in @hex-di/runtime
 * - Provider does NOT manage container lifecycle - caller owns disposal
 * - Children can access container via useContainer hook
 * - Children can resolve services via usePort hook
 *
 * @example Basic usage
 * ```tsx
 * import { createContainer } from '@hex-di/runtime';
 * import { ContainerProvider, usePort } from '@hex-di/react';
 *
 * const container = createContainer(graph);
 *
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <MyComponent />
 *     </ContainerProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const logger = usePort(LoggerPort);
 *   return <div>{logger.name}</div>;
 * }
 * ```
 */
export function ContainerProvider<TProvides extends Port<unknown, string>>({
  container,
  children,
}: ContainerProviderProps<TProvides>): React.ReactElement {
  // Detect nested ContainerProvider - this is a programming error
  const existingContext = useContext(ContainerContext);
  if (existingContext !== null) {
    throw new MissingProviderError(
      "ContainerProvider",
      "ContainerProvider (nested providers not allowed)"
    );
  }

  // Create context values with proper typing
  // Note: We cast to the general type since contexts are typed as Port<unknown, string>
  const containerContextValue: ContainerContextValue<Port<unknown, string>> = {
    container: container as Container<Port<unknown, string>>,
  } as ContainerContextValue<Port<unknown, string>>;

  const resolverContextValue: ResolverContextValue<Port<unknown, string>> = {
    resolver: container as Container<Port<unknown, string>>,
  } as ResolverContextValue<Port<unknown, string>>;

  return (
    <ContainerContext.Provider value={containerContextValue}>
      <ResolverContext.Provider value={resolverContextValue}>
        {children}
      </ResolverContext.Provider>
    </ContainerContext.Provider>
  );
}

// =============================================================================
// ScopeProvider Component
// =============================================================================

/**
 * Props for the ScopeProvider component.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 */
export interface ScopeProviderProps<TProvides extends Port<unknown, string>> {
  /**
   * The externally managed Scope instance to provide to the React tree.
   *
   * @remarks
   * The scope must be created externally using `container.createScope()` or
   * `scope.createScope()`. The Provider does NOT manage the scope's lifecycle -
   * the caller is responsible for disposal.
   */
  readonly scope: Scope<TProvides>;

  /**
   * React children that will resolve services from this scope.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that overrides the resolver context with a manual scope.
 *
 * ScopeProvider allows you to inject an externally managed scope into the
 * React tree. This is useful when you need manual control over scope lifecycle.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 *
 * @param props - The provider props including scope and children
 *
 * @remarks
 * - Does NOT dispose scope on unmount - caller owns the scope lifecycle
 * - Nested components use this scope for service resolution
 * - Does not require ContainerProvider parent (but useContainer won't work without one)
 * - For automatic scope lifecycle, use AutoScopeProvider instead
 *
 * @example Manual scope management
 * ```tsx
 * function RequestHandler() {
 *   const container = useContainer();
 *   const [scope] = useState(() => container.createScope());
 *
 *   useEffect(() => {
 *     return () => { scope.dispose(); };
 *   }, [scope]);
 *
 *   return (
 *     <ScopeProvider scope={scope}>
 *       <RequestContent />
 *     </ScopeProvider>
 *   );
 * }
 * ```
 */
export function ScopeProvider<TProvides extends Port<unknown, string>>({
  scope,
  children,
}: ScopeProviderProps<TProvides>): React.ReactElement {
  // Create resolver context value with the provided scope
  const resolverContextValue: ResolverContextValue<Port<unknown, string>> = {
    resolver: scope as Scope<Port<unknown, string>>,
  } as ResolverContextValue<Port<unknown, string>>;

  return (
    <ResolverContext.Provider value={resolverContextValue}>
      {children}
    </ResolverContext.Provider>
  );
}

// =============================================================================
// AutoScopeProvider Component
// =============================================================================

/**
 * Props for the AutoScopeProvider component.
 */
export interface AutoScopeProviderProps {
  /**
   * React children that will resolve services from the auto-managed scope.
   */
  readonly children: ReactNode;
}

/**
 * Provider component that automatically manages scope lifecycle.
 *
 * AutoScopeProvider creates a new scope on mount and disposes it on unmount,
 * tying the scope lifecycle to the React component lifecycle.
 *
 * @param props - The provider props containing children
 *
 * @throws {MissingProviderError} If used outside a ContainerProvider.
 *   AutoScopeProvider requires a container to create scopes from.
 *
 * @remarks
 * - Creates scope from current resolver (container or parent scope) on mount
 * - Automatically disposes scope on unmount via useEffect cleanup
 * - Supports nesting - child AutoScopeProvider creates scope from parent scope
 * - Uses useEffect (not useLayoutEffect) for SSR compatibility
 * - Renders children immediately with the new scope context
 *
 * @example Automatic scope for a page
 * ```tsx
 * function UserPage() {
 *   return (
 *     <AutoScopeProvider>
 *       <UserProfile />
 *       <UserSettings />
 *     </AutoScopeProvider>
 *   );
 * }
 * ```
 *
 * @example Nested scopes
 * ```tsx
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <AutoScopeProvider>
 *         <AutoScopeProvider>
 *           <Component />
 *         </AutoScopeProvider>
 *       </AutoScopeProvider>
 *     </ContainerProvider>
 *   );
 * }
 * ```
 */
export function AutoScopeProvider({
  children,
}: AutoScopeProviderProps): React.ReactElement {
  // Get current resolver context - must be inside ContainerProvider
  const resolverContext = useContext(ResolverContext);

  if (resolverContext === null) {
    throw new MissingProviderError("AutoScopeProvider", "ContainerProvider");
  }

  // Create scope from current resolver
  // useState ensures scope is created once and preserved across re-renders
  const [scope] = useState<Scope<Port<unknown, string>>>(() =>
    resolverContext.resolver.createScope()
  );

  // Dispose scope on unmount using useEffect (SSR compatible)
  useEffect(() => {
    return () => {
      // Note: dispose is async but we don't await in cleanup
      // This is intentional - React cleanup functions should be sync
      void scope.dispose();
    };
  }, [scope]);

  // Create resolver context value with the new scope
  const resolverContextValue: ResolverContextValue<Port<unknown, string>> = {
    resolver: scope,
  } as ResolverContextValue<Port<unknown, string>>;

  return (
    <ResolverContext.Provider value={resolverContextValue}>
      {children}
    </ResolverContext.Provider>
  );
}
