/**
 * useContainer hook for accessing the root DI container.
 *
 * This hook provides direct access to the Container instance, which is useful
 * for advanced scenarios like creating manual scopes or accessing container-level
 * operations.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { Port } from "@hex-di/ports";
import type { Container } from "@hex-di/runtime";
import { ContainerContext } from "./context.js";
import { MissingProviderError } from "./errors.js";

/**
 * Hook that returns the root Container from the nearest ContainerProvider.
 *
 * Use this hook when you need direct access to the container for advanced
 * operations like creating manual scopes, accessing the dispose method,
 * or other container-level functionality.
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 *
 * @returns The Container instance from the ContainerProvider
 *
 * @throws {MissingProviderError} If called outside a ContainerProvider.
 *   This indicates a programming error - components using useContainer
 *   must be descendants of a ContainerProvider.
 *
 * @remarks
 * - For service resolution, prefer `usePort` instead
 * - The returned container is the same reference across renders
 * - This is an escape hatch - most code should use `usePort`
 *
 * @example Basic usage
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
export function useContainer<
  TProvides extends Port<unknown, string> = Port<unknown, string>
>(): Container<TProvides> {
  const context = useContext(ContainerContext);

  if (context === null) {
    throw new MissingProviderError("useContainer", "ContainerProvider");
  }

  return context.container as Container<TProvides>;
}
