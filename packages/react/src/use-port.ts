/**
 * usePort hook for type-safe service resolution.
 *
 * This is the primary hook for resolving services from the DI container
 * in React components. It provides compile-time type safety and resolves
 * from the nearest resolver (Scope or Container).
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { Port, InferService } from "@hex-di/ports";
import { ResolverContext } from "./context.js";
import { MissingProviderError } from "./errors.js";

/**
 * Hook that resolves a service instance from the nearest resolver context.
 *
 * This hook provides type-safe service resolution with compile-time validation
 * that the requested port is in the TProvides union. It resolves from the
 * nearest resolver - either a Scope (if inside ScopeProvider or AutoScopeProvider)
 * or the Container (if directly inside ContainerProvider).
 *
 * @typeParam TProvides - Union of Port types available for resolution (inferred)
 * @typeParam P - The specific Port being resolved (must extend TProvides)
 *
 * @param port - The port token to resolve
 *
 * @returns The service instance with the correct type inferred from the port
 *
 * @throws {MissingProviderError} If called outside a ContainerProvider tree.
 *   This indicates a programming error - components using usePort must be
 *   descendants of a ContainerProvider.
 * @throws {DisposedScopeError} If the container or scope has been disposed
 * @throws {ScopeRequiredError} If resolving a scoped port from root container
 * @throws {CircularDependencyError} If a circular dependency is detected
 * @throws {FactoryError} If the adapter's factory function throws
 *
 * @remarks
 * - Resolution happens on every render - consider memoization for expensive services
 * - Programming errors (CircularDependencyError, DisposedScopeError) propagate as React errors
 * - Runtime errors (FactoryError) propagate to Error Boundaries
 * - The port must be in TProvides for compile-time safety
 *
 * @example Basic usage
 * ```tsx
 * function MyComponent() {
 *   const logger = usePort(LoggerPort);
 *   logger.log('Component rendered');
 *   return <div>Hello</div>;
 * }
 * ```
 *
 * @example With scope
 * ```tsx
 * function UserPage() {
 *   // Inside AutoScopeProvider, resolves from scope
 *   const userContext = usePort(UserContextPort);
 *   return <div>{userContext.username}</div>;
 * }
 *
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <AutoScopeProvider>
 *         <UserPage />
 *       </AutoScopeProvider>
 *     </ContainerProvider>
 *   );
 * }
 * ```
 */
export function usePort<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  P extends TProvides = TProvides
>(port: P): InferService<P> {
  const context = useContext(ResolverContext);

  if (context === null) {
    throw new MissingProviderError("usePort", "ContainerProvider");
  }

  // Resolve from the nearest resolver (Scope or Container)
  // Let ContainerError subclasses propagate - they are programming errors or factory errors
  return context.resolver.resolve(port) as InferService<P>;
}
