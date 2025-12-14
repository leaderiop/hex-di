/**
 * useScope hook for imperative scope management.
 *
 * This hook creates a scope from the current resolver and automatically
 * disposes it when the component unmounts. Useful for components that
 * need to create and manage their own scope lifecycle.
 *
 * @packageDocumentation
 */

import { useContext, useRef, useEffect } from "react";
import type { Port } from "@hex-di/ports";
import type { Scope } from "@hex-di/runtime";
import { ResolverContext } from "./context.js";
import { MissingProviderError } from "./errors.js";

/**
 * Hook that creates a scope and ties its lifecycle to the component.
 *
 * This hook creates a new scope from the current resolver (Container or parent Scope)
 * and automatically disposes it when the component unmounts. The scope is created
 * once on initial render and preserved across re-renders.
 *
 * @typeParam TProvides - Union of Port types that the scope can resolve
 *
 * @returns A Scope instance that is disposed when the component unmounts
 *
 * @throws {MissingProviderError} If called outside a ContainerProvider tree.
 *   This indicates a programming error - components using useScope must be
 *   descendants of a ContainerProvider.
 *
 * @remarks
 * - The scope is created lazily on first access
 * - Each component instance gets its own scope (not shared between instances)
 * - The scope is disposed on unmount via useEffect cleanup
 * - If you need to share a scope between multiple components, use ScopeProvider instead
 * - If you want the scope to be created fresh each render, don't use this hook -
 *   use `useContainer().createScope()` directly
 *
 * @example Imperative scope management
 * ```tsx
 * function RequestHandler() {
 *   const scope = useScope();
 *
 *   // Use scope to resolve scoped services
 *   const requestContext = scope.resolve(RequestContextPort);
 *
 *   return <div>{requestContext.id}</div>;
 * }
 * ```
 *
 * @example Combined with ScopeProvider
 * ```tsx
 * function ScopedSection() {
 *   const scope = useScope();
 *
 *   // Provide scope to children
 *   return (
 *     <ScopeProvider scope={scope}>
 *       <ChildComponents />
 *     </ScopeProvider>
 *   );
 * }
 * ```
 *
 * @example Note on reuse
 * ```tsx
 * // Each call creates a new scope - scope is NOT reused across components
 * function Component1() {
 *   const scope1 = useScope(); // Scope A
 *   return <div>A</div>;
 * }
 *
 * function Component2() {
 *   const scope2 = useScope(); // Scope B (different from Scope A)
 *   return <div>B</div>;
 * }
 *
 * // If you need to reuse a scope, use useMemo in the parent and pass it down
 * function Parent() {
 *   const scope = useScope();
 *   return (
 *     <ScopeProvider scope={scope}>
 *       <Child1 />
 *       <Child2 />
 *     </ScopeProvider>
 *   );
 * }
 * ```
 */
export function useScope<
  TProvides extends Port<unknown, string> = Port<unknown, string>
>(): Scope<TProvides> {
  const context = useContext(ResolverContext);

  if (context === null) {
    throw new MissingProviderError("useScope", "ContainerProvider");
  }

  // Use ref to create scope lazily and preserve across renders
  // This pattern ensures the scope is created only once and not recreated on re-render
  const scopeRef = useRef<Scope<TProvides> | null>(null);

  // Lazily initialize the scope
  if (scopeRef.current === null) {
    scopeRef.current = context.resolver.createScope() as Scope<TProvides>;
  }

  // Dispose scope on unmount
  useEffect(() => {
    const scope = scopeRef.current;
    return () => {
      if (scope !== null) {
        // Note: dispose is async but we don't await in cleanup
        // This is intentional - React cleanup functions should be sync
        void scope.dispose();
      }
    };
  }, []);

  return scopeRef.current;
}
