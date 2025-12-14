/**
 * usePortOptional hook for graceful service resolution.
 *
 * This hook provides a non-throwing variant of usePort that returns undefined
 * instead of throwing when used outside a provider or when resolution fails.
 * Useful for optional dependencies and graceful degradation.
 *
 * @packageDocumentation
 */

import { useContext } from "react";
import type { Port, InferService } from "@hex-di/ports";
import { ResolverContext } from "./context.js";

/**
 * Hook that optionally resolves a service instance from the nearest resolver context.
 *
 * Unlike `usePort`, this hook returns `undefined` instead of throwing when:
 * - Called outside a ContainerProvider tree
 * - Resolution fails for any reason (disposed scope, factory error, etc.)
 *
 * This makes it suitable for optional dependencies and feature detection scenarios.
 *
 * @typeParam TProvides - Union of Port types available for resolution (inferred)
 * @typeParam P - The specific Port being resolved (must extend TProvides)
 *
 * @param port - The port token to resolve
 *
 * @returns The service instance if resolution succeeds, `undefined` otherwise
 *
 * @remarks
 * - Never throws - returns undefined on any failure
 * - Same compile-time constraint `P extends TProvides` as usePort
 * - Useful for optional features that gracefully degrade
 * - Resolution happens on every render - consider memoization for expensive services
 *
 * @example Optional dependency
 * ```tsx
 * function MyComponent() {
 *   const analytics = usePortOptional(AnalyticsPort);
 *
 *   const handleClick = () => {
 *     analytics?.trackEvent('button_clicked');
 *     // ... rest of handler
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 *
 * @example Feature detection
 * ```tsx
 * function FeatureFlag() {
 *   const featureService = usePortOptional(FeatureServicePort);
 *
 *   if (!featureService) {
 *     return <div>Feature service not available</div>;
 *   }
 *
 *   return <div>Features: {featureService.listFeatures().join(', ')}</div>;
 * }
 * ```
 *
 * @example Safe usage outside providers
 * ```tsx
 * // This component can be rendered anywhere, even without a ContainerProvider
 * function SafeComponent() {
 *   const logger = usePortOptional(LoggerPort);
 *   logger?.log('Component rendered'); // No-op if undefined
 *   return <div>Safe rendering</div>;
 * }
 * ```
 */
export function usePortOptional<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  P extends TProvides = TProvides
>(port: P): InferService<P> | undefined {
  const context = useContext(ResolverContext);

  // Return undefined if outside provider
  if (context === null) {
    return undefined;
  }

  // Attempt resolution, catch any errors and return undefined
  try {
    return context.resolver.resolve(port) as InferService<P>;
  } catch {
    return undefined;
  }
}
