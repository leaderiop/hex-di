/**
 * Factory function for creating typed React integration.
 *
 * The createTypedHooks factory creates an isolated set of React components
 * and hooks bound to a specific TProvides type parameter. This enables
 * type-safe port resolution with compile-time validation.
 *
 * @packageDocumentation
 */

import {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  type ReactElement,
  type ReactNode,
  type Context,
} from "react";
import type { Port, InferService } from "@hex-di/ports";
import type { Container, Scope } from "@hex-di/runtime";
import type {
  TypedReactIntegration,
  ContainerProviderProps,
  ScopeProviderProps,
  AutoScopeProviderProps,
} from "./types.js";
import { MissingProviderError } from "./errors.js";

// =============================================================================
// Internal Context Types
// =============================================================================

/**
 * Resolver type representing either a Container or Scope.
 * @internal
 */
type Resolver<TProvides extends Port<unknown, string>> =
  | Container<TProvides>
  | Scope<TProvides>;

/**
 * Internal context value for the container context.
 * @internal
 */
interface ContainerContextValue<TProvides extends Port<unknown, string>> {
  readonly container: Container<TProvides>;
}

/**
 * Internal context value for the resolver context.
 *
 * Uses a getter function pattern to ensure React StrictMode compatibility.
 * Children call getResolver() at resolution time, not at render capture time,
 * ensuring they always get the current (non-disposed) scope.
 *
 * @internal
 */
interface ResolverContextValue<TProvides extends Port<unknown, string>> {
  /**
   * Returns the current resolver (Container or Scope).
   * Called at resolution time to ensure freshness after StrictMode remounts.
   */
  readonly getResolver: () => Resolver<TProvides>;
}

// =============================================================================
// createTypedHooks Factory
// =============================================================================

/**
 * Creates a typed React integration with components and hooks bound to TProvides.
 *
 * This factory function creates an isolated set of React context, provider
 * components, and hooks that are bound to the TProvides type parameter.
 * Each call to createTypedHooks creates a new, independent context, ensuring
 * that multiple integrations can coexist in the same application.
 *
 * @typeParam TProvides - Union of Port types available for resolution.
 *   This type is captured at factory creation time and used to constrain
 *   the usePort and usePortOptional hooks.
 *
 * @returns A TypedReactIntegration object containing all provider components and hooks
 *
 * @remarks
 * - Each call creates a new, isolated context (no global state)
 * - Multiple integrations can coexist without interference
 * - SSR compatible - no global state or singleton patterns
 * - TProvides type is captured at creation time, not runtime
 *
 * @see {@link TypedReactIntegration} - Return type definition
 *
 * @example Basic usage
 * ```typescript
 * import { createTypedHooks } from '@hex-di/react';
 *
 * // Define your port union type
 * type AppPorts = typeof LoggerPort | typeof DatabasePort;
 *
 * // Create typed integration
 * const { ContainerProvider, usePort } = createTypedHooks<AppPorts>();
 *
 * // Use in your React app
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <MyComponent />
 *     </ContainerProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const logger = usePort(LoggerPort); // Type-safe!
 *   return <div>{logger.name}</div>;
 * }
 * ```
 *
 * @example Multiple isolated integrations
 * ```typescript
 * // Create separate integrations for different parts of your app
 * const AppIntegration = createTypedHooks<AppPorts>();
 * const AdminIntegration = createTypedHooks<AdminPorts>();
 *
 * // They are completely isolated - no context leakage
 * ```
 */
export function createTypedHooks<
  TProvides extends Port<unknown, string>
>(): TypedReactIntegration<TProvides> {
  // ==========================================================================
  // Create isolated contexts for this factory instance
  // ==========================================================================

  /**
   * Context for the root container.
   * Created fresh for each createTypedHooks call to ensure isolation.
   */
  const ContainerContext: Context<ContainerContextValue<TProvides> | null> =
    createContext<ContainerContextValue<TProvides> | null>(null);
  ContainerContext.displayName = "HexDI.ContainerContext";

  /**
   * Context for the current resolver (Container or Scope).
   * Created fresh for each createTypedHooks call to ensure isolation.
   */
  const ResolverContext: Context<ResolverContextValue<TProvides> | null> =
    createContext<ResolverContextValue<TProvides> | null>(null);
  ResolverContext.displayName = "HexDI.ResolverContext";

  // ==========================================================================
  // Provider Components
  // ==========================================================================

  /**
   * ContainerProvider implementation for this typed integration.
   */
  function ContainerProvider({
    container,
    children,
  }: ContainerProviderProps<TProvides>): ReactElement {
    // Detect nested ContainerProvider - this is a programming error
    const existingContext = useContext(ContainerContext);
    if (existingContext !== null) {
      throw new MissingProviderError(
        "ContainerProvider",
        "ContainerProvider (nested providers not allowed)"
      );
    }

    // Create context values
    const containerContextValue: ContainerContextValue<TProvides> = {
      container,
    };

    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => container,
    };

    return (
      <ContainerContext.Provider value={containerContextValue}>
        <ResolverContext.Provider value={resolverContextValue}>
          {children}
        </ResolverContext.Provider>
      </ContainerContext.Provider>
    );
  }

  /**
   * ScopeProvider implementation for this typed integration.
   */
  function ScopeProvider({
    scope,
    children,
  }: ScopeProviderProps<TProvides>): ReactElement {
    // Create resolver context value with the provided scope
    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => scope,
    };

    return (
      <ResolverContext.Provider value={resolverContextValue}>
        {children}
      </ResolverContext.Provider>
    );
  }

  /**
   * AutoScopeProvider implementation for this typed integration.
   *
   * Uses useRef instead of useState to handle React StrictMode correctly.
   * In StrictMode, components mount/unmount/remount, but useState caches
   * the scope while useEffect cleanup disposes it. Using useRef with
   * isDisposed check allows recreation of disposed scopes.
   */
  function AutoScopeProvider({
    children,
  }: AutoScopeProviderProps): ReactElement {
    // Get current resolver context - must be inside ContainerProvider
    const resolverContext = useContext(ResolverContext);

    if (resolverContext === null) {
      throw new MissingProviderError("AutoScopeProvider", "ContainerProvider");
    }

    // Use ref to track the scope - allows recreation if disposed (StrictMode)
    const scopeRef = useRef<Scope<TProvides> | null>(null);

    // Create or recreate scope if needed during initial render
    // This handles StrictMode where scope may have been disposed during unmount
    if (scopeRef.current === null || scopeRef.current.isDisposed) {
      scopeRef.current = resolverContext.getResolver().createScope();
    }

    // Dispose scope on unmount using useEffect (SSR compatible)
    useEffect(() => {
      return () => {
        // Only dispose if scope exists and not already disposed
        if (scopeRef.current !== null && !scopeRef.current.isDisposed) {
          // Note: dispose is async but we don't await in cleanup
          // This is intentional - React cleanup functions should be sync
          void scopeRef.current.dispose();
        }
      };
    }, []);

    // CRITICAL: Getter function always returns current scope from ref
    // Children call getResolver() at resolution time (not render time),
    // ensuring they always get the CURRENT scope after StrictMode remounts
    const resolverContextValue: ResolverContextValue<TProvides> = {
      getResolver: () => {
        // Recreate scope if it was disposed (StrictMode unmount/remount)
        if (scopeRef.current === null || scopeRef.current.isDisposed) {
          scopeRef.current = resolverContext.getResolver().createScope();
        }
        return scopeRef.current;
      },
    };

    return (
      <ResolverContext.Provider value={resolverContextValue}>
        {children}
      </ResolverContext.Provider>
    );
  }

  // ==========================================================================
  // Hooks
  // ==========================================================================

  /**
   * useContainer hook implementation for this typed integration.
   */
  function useContainer(): Container<TProvides> {
    const context = useContext(ContainerContext);

    if (context === null) {
      throw new MissingProviderError("useContainer", "ContainerProvider");
    }

    return context.container;
  }

  /**
   * usePort hook implementation for this typed integration.
   */
  function usePort<P extends TProvides>(port: P): InferService<P> {
    const context = useContext(ResolverContext);

    if (context === null) {
      throw new MissingProviderError("usePort", "ContainerProvider");
    }

    // Call getResolver() to get CURRENT scope at resolution time
    // This ensures StrictMode remounts get the fresh scope, not a stale reference
    return context.getResolver().resolve(port) as InferService<P>;
  }

  /**
   * usePortOptional hook implementation for this typed integration.
   */
  function usePortOptional<P extends TProvides>(
    port: P
  ): InferService<P> | undefined {
    const context = useContext(ResolverContext);

    // Return undefined if outside provider
    if (context === null) {
      return undefined;
    }

    // Attempt resolution, catch any errors and return undefined
    try {
      // Call getResolver() to get CURRENT scope at resolution time
      return context.getResolver().resolve(port) as InferService<P>;
    } catch {
      return undefined;
    }
  }

  /**
   * useScope hook implementation for this typed integration.
   *
   * Handles React StrictMode by checking isDisposed and recreating
   * the scope if it was disposed during the unmount phase.
   */
  function useScope(): Scope<TProvides> {
    const context = useContext(ResolverContext);

    if (context === null) {
      throw new MissingProviderError("useScope", "ContainerProvider");
    }

    // Use ref to create scope lazily and preserve across renders
    const scopeRef = useRef<Scope<TProvides> | null>(null);

    // Create or recreate scope if needed (handles StrictMode)
    if (scopeRef.current === null || scopeRef.current.isDisposed) {
      // Call getResolver() to get CURRENT resolver at creation time
      scopeRef.current = context.getResolver().createScope();
    }

    // Dispose scope on unmount
    useEffect(() => {
      return () => {
        // Only dispose if scope exists and not already disposed
        if (scopeRef.current !== null && !scopeRef.current.isDisposed) {
          // Note: dispose is async but we don't await in cleanup
          void scopeRef.current.dispose();
        }
      };
    }, []);

    return scopeRef.current;
  }

  // ==========================================================================
  // Return the typed integration object
  // ==========================================================================

  return {
    ContainerProvider,
    ScopeProvider,
    AutoScopeProvider,
    usePort,
    usePortOptional,
    useContainer,
    useScope,
  };
}
