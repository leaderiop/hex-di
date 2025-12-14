/**
 * Error classes for @hex-di/react package.
 *
 * React-specific errors extend ContainerError from @hex-di/runtime
 * to maintain consistent error handling patterns across the HexDI ecosystem.
 *
 * @packageDocumentation
 */

import { ContainerError } from "@hex-di/runtime";

// =============================================================================
// MissingProviderError
// =============================================================================

/**
 * Error thrown when a React hook is called outside its required Provider context.
 *
 * This error indicates a programming mistake where a HexDI hook was used
 * without the necessary Provider component in the React component tree.
 *
 * @remarks
 * - This is always a programming error - hooks must be used within Providers
 * - The `hookName` property identifies which hook was misused
 * - The `requiredProvider` property indicates which Provider is needed
 * - Fix by wrapping the component tree with the appropriate Provider
 *
 * @example
 * ```typescript
 * // Incorrect - hook used outside Provider:
 * function MyComponent() {
 *   const logger = usePort(LoggerPort); // Throws MissingProviderError
 *   return <div>{logger.name}</div>;
 * }
 *
 * // Correct - hook used inside Provider:
 * function App() {
 *   return (
 *     <ContainerProvider container={container}>
 *       <MyComponent />
 *     </ContainerProvider>
 *   );
 * }
 * ```
 */
export class MissingProviderError extends ContainerError {
  readonly code = "MISSING_PROVIDER" as const;
  readonly isProgrammingError = true as const;

  /**
   * The name of the hook that was called outside its Provider.
   */
  readonly hookName: string;

  /**
   * The name of the Provider component that is required.
   */
  readonly requiredProvider: string;

  /**
   * Creates a new MissingProviderError.
   *
   * @param hookName - The name of the hook that was called (e.g., "usePort", "useContainer")
   * @param requiredProvider - The name of the required Provider (e.g., "ContainerProvider")
   */
  constructor(hookName: string, requiredProvider: string) {
    super(
      `${hookName} must be used within a ${requiredProvider}. ` +
        `Ensure your component is wrapped in the appropriate Provider component.`
    );

    this.hookName = hookName;
    this.requiredProvider = requiredProvider;
  }
}
