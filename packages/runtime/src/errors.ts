/**
 * Container error hierarchy for @hex-di/runtime.
 *
 * All container-related errors extend the abstract ContainerError base class,
 * providing consistent error structure with:
 * - `code`: Stable string constant for programmatic handling
 * - `isProgrammingError`: Boolean indicating if error is a programming mistake
 * - Contextual information specific to each error type
 *
 * @packageDocumentation
 */

// Type augmentation for V8-specific Error.captureStackTrace
declare global {
  interface ErrorConstructor {
    captureStackTrace?(targetObject: object, constructorOpt?: Function): void;
  }
}

// =============================================================================
// ContainerError Abstract Base Class
// =============================================================================

/**
 * Abstract base class for all container-related errors.
 *
 * Provides a consistent structure for error handling with:
 * - `code`: A stable string constant for programmatic error identification
 * - `isProgrammingError`: Indicates whether this error represents a programming
 *   mistake (true) or a runtime condition (false)
 *
 * @remarks
 * - All concrete error classes must extend this base class
 * - The `name` getter returns the concrete class name for stack traces
 * - Uses `Error.captureStackTrace` when available for cleaner stack traces
 *
 * @example
 * ```typescript
 * try {
 *   container.resolve(SomePort);
 * } catch (error) {
 *   if (error instanceof ContainerError) {
 *     console.log(`Error code: ${error.code}`);
 *     if (error.isProgrammingError) {
 *       // This is a bug in the application code
 *     }
 *   }
 * }
 * ```
 */
export abstract class ContainerError extends Error {
  /**
   * A stable string constant identifying the error type.
   * Suitable for programmatic error handling and logging.
   */
  abstract readonly code: string;

  /**
   * Indicates whether this error represents a programming mistake.
   *
   * - `true`: The error is caused by incorrect usage (e.g., circular dependency,
   *   resolving from disposed scope, missing scope). These should be fixed in code.
   * - `false`: The error is caused by runtime conditions (e.g., factory threw).
   *   These may be recoverable or require operational handling.
   */
  abstract readonly isProgrammingError: boolean;

  /**
   * Creates a new ContainerError instance.
   *
   * @param message - The error message describing what went wrong
   */
  constructor(message: string) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace excluding this constructor for cleaner traces
    // Note: captureStackTrace is V8-specific (Node.js, Chrome)
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, new.target);
    }
  }

  /**
   * Returns the concrete class name for this error.
   * Used in stack traces and error logging.
   */
  override get name(): string {
    return this.constructor.name;
  }
}

// =============================================================================
// CircularDependencyError
// =============================================================================

/**
 * Error thrown when a circular dependency is detected during resolution.
 *
 * Circular dependencies occur when Service A depends on Service B,
 * and Service B (directly or indirectly) depends back on Service A.
 *
 * @remarks
 * - This is always a programming error - the dependency graph must be acyclic
 * - The `dependencyChain` property shows the full cycle for debugging
 * - Detection occurs lazily at resolution time, not at container creation
 *
 * @example
 * ```typescript
 * // If UserService -> AuthService -> UserService exists:
 * try {
 *   container.resolve(UserServicePort);
 * } catch (error) {
 *   if (error instanceof CircularDependencyError) {
 *     console.log(error.dependencyChain);
 *     // ['UserService', 'AuthService', 'UserService']
 *   }
 * }
 * ```
 */
export class CircularDependencyError extends ContainerError {
  readonly code = "CIRCULAR_DEPENDENCY" as const;
  readonly isProgrammingError = true as const;

  /**
   * The chain of dependencies that form the cycle.
   * The first and last elements are the same, showing where the cycle closes.
   */
  readonly dependencyChain: readonly string[];

  /**
   * Creates a new CircularDependencyError.
   *
   * @param dependencyChain - Array of port names forming the cycle.
   *   The first and last elements should be identical to show the cycle.
   */
  constructor(dependencyChain: readonly string[]) {
    const formattedChain = dependencyChain.join(" -> ");
    super(`Circular dependency detected: ${formattedChain}`);

    // Store a defensive copy of the chain
    this.dependencyChain = Object.freeze([...dependencyChain]);
  }
}

// =============================================================================
// FactoryError
// =============================================================================

/**
 * Error thrown when an adapter's factory function throws during instance creation.
 *
 * This error wraps the original exception thrown by the factory, providing
 * context about which port's factory failed.
 *
 * @remarks
 * - This is NOT a programming error - factory failures are runtime conditions
 * - The `cause` property contains the original exception for investigation
 * - The error message includes both the port name and original error message
 *
 * @example
 * ```typescript
 * try {
 *   container.resolve(DatabasePort);
 * } catch (error) {
 *   if (error instanceof FactoryError) {
 *     console.log(`Factory for ${error.portName} failed`);
 *     console.log('Original error:', error.cause);
 *   }
 * }
 * ```
 */
export class FactoryError extends ContainerError {
  readonly code = "FACTORY_FAILED" as const;
  readonly isProgrammingError = false as const;

  /**
   * The name of the port whose factory failed.
   */
  readonly portName: string;

  /**
   * The original exception thrown by the factory function.
   * Can be any value since JavaScript allows throwing non-Error values.
   */
  readonly cause: unknown;

  /**
   * Creates a new FactoryError.
   *
   * @param portName - The name of the port whose factory threw
   * @param cause - The original exception thrown by the factory
   */
  constructor(portName: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(`Factory for port '${portName}' threw: ${causeMessage}`);

    this.portName = portName;
    this.cause = cause;
  }
}

// =============================================================================
// DisposedScopeError
// =============================================================================

/**
 * Error thrown when attempting to resolve a service from a disposed scope or container.
 *
 * Once a scope or container is disposed, it cannot be used to resolve services.
 * This prevents use-after-dispose bugs and resource leaks.
 *
 * @remarks
 * - This is a programming error - code should not use disposed containers
 * - Typically occurs when scope lifetime is not properly managed
 * - Check your scope lifecycle management if this error occurs
 *
 * @example
 * ```typescript
 * const scope = container.createScope();
 * await scope.dispose();
 *
 * // This will throw DisposedScopeError:
 * scope.resolve(UserServicePort);
 * ```
 */
export class DisposedScopeError extends ContainerError {
  readonly code = "DISPOSED_SCOPE" as const;
  readonly isProgrammingError = true as const;

  /**
   * The name of the port that was attempted to be resolved.
   */
  readonly portName: string;

  /**
   * Creates a new DisposedScopeError.
   *
   * @param portName - The name of the port that was attempted to be resolved
   */
  constructor(portName: string) {
    super(
      `Cannot resolve port '${portName}' from a disposed scope. ` +
        `The scope has already been disposed and cannot be used for resolution.`
    );

    this.portName = portName;
  }
}

// =============================================================================
// ScopeRequiredError
// =============================================================================

/**
 * Error thrown when attempting to resolve a scoped port from the root container.
 *
 * Scoped ports have a lifetime tied to a specific scope. They cannot be resolved
 * from the root container because there is no scope to own their lifetime.
 *
 * @remarks
 * - This is a programming error - use createScope() for scoped dependencies
 * - Indicates that the code is trying to resolve scoped services incorrectly
 * - The solution is to create a scope and resolve from there
 *
 * @example
 * ```typescript
 * // UserContextPort is configured with 'scoped' lifetime
 *
 * // This will throw ScopeRequiredError:
 * container.resolve(UserContextPort);
 *
 * // Correct usage:
 * const scope = container.createScope();
 * const userContext = scope.resolve(UserContextPort);
 * ```
 */
export class ScopeRequiredError extends ContainerError {
  readonly code = "SCOPE_REQUIRED" as const;
  readonly isProgrammingError = true as const;

  /**
   * The name of the scoped port that was attempted to be resolved.
   */
  readonly portName: string;

  /**
   * Creates a new ScopeRequiredError.
   *
   * @param portName - The name of the scoped port that was attempted to be resolved
   */
  constructor(portName: string) {
    super(
      `Cannot resolve scoped port '${portName}' from the root container. ` +
        `Scoped ports must be resolved from a scope created via createScope().`
    );

    this.portName = portName;
  }
}
