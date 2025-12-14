/**
 * Container and Scope branded types for @hex-di/runtime.
 *
 * These types define the core container and scope interfaces with nominal typing
 * via unique symbol brands. This ensures that:
 * - Containers and Scopes cannot be confused with structurally similar objects
 * - Different TProvides type parameters produce incompatible types
 * - Container and Scope are distinct types (not interchangeable)
 *
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Unique symbol used for nominal typing of Container types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that Container instances
 * are distinct from structurally similar objects.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Port and Adapter branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ContainerBrand: unique symbol = Symbol("hex-di.Container");

/**
 * Unique symbol used for nominal typing of Scope types.
 *
 * This symbol is exported for use in the container implementation.
 * It provides true nominal typing, ensuring that Scope instances
 * are distinct from structurally similar objects and from Container instances.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as Port and Adapter branding.
 *
 * @internal - Exported for implementation use only, not for external consumers.
 */
export const ScopeBrand: unique symbol = Symbol("hex-di.Scope");

// =============================================================================
// Container Type
// =============================================================================

/**
 * A branded container type that provides type-safe service resolution.
 *
 * The Container type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. This ensures that:
 * - Containers cannot be confused with structurally similar objects
 * - Different TProvides type parameters produce incompatible types
 * - Only valid ports (in TProvides) can be resolved
 *
 * @typeParam TProvides - Union of Port types that this container can resolve.
 *   The resolve method is constrained to only accept ports in this union.
 *
 * @remarks
 * - The brand property carries the TProvides type for nominal typing
 * - The resolve method is generic to preserve the specific port type being resolved
 * - createScope returns a Scope with the same TProvides for consistent type safety
 * - dispose returns a Promise to support async cleanup of resources
 *
 * @see {@link Scope} - Child scope type with identical API but separate brand
 * @see {@link createContainer} - Factory function to create container instances
 *
 * @example Basic usage
 * ```typescript
 * // Container type is parameterized by the ports it can resolve
 * type AppContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 *
 * // The resolve method is type-safe
 * declare const container: AppContainer;
 * const logger = container.resolve(LoggerPort);  // Logger
 * const db = container.resolve(DatabasePort);    // Database
 *
 * // TypeScript error: UserServicePort is not in TProvides
 * // container.resolve(UserServicePort);
 * ```
 *
 * @example Creating scopes
 * ```typescript
 * const scope = container.createScope();
 * // scope has type Scope<typeof LoggerPort | typeof DatabasePort>
 *
 * const logger = scope.resolve(LoggerPort);  // Still type-safe
 * await scope.dispose();  // Clean up scope resources
 * ```
 */
export type Container<TProvides extends Port<unknown, string>> = {
  /**
   * Resolves a service instance for the given port.
   *
   * The port must be in the TProvides union, enforced at compile time.
   * The return type is inferred from the port's phantom service type.
   *
   * @typeParam P - The specific port type being resolved (must extend TProvides)
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   *
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {ScopeRequiredError} If resolving a scoped port from root container
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {FactoryError} If the adapter's factory function throws
   */
  resolve<P extends TProvides>(port: P): InferService<P>;

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * Scoped services are created once per scope and shared within that scope.
   * The returned scope has the same TProvides type parameter as the container.
   *
   * @returns A new Scope instance
   */
  createScope(): Scope<TProvides>;

  /**
   * Disposes the container and all singleton instances.
   *
   * After disposal, the container cannot be used to resolve services.
   * Finalizers are called in LIFO order (last created first disposed).
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the container has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * This property can be used to check if the container is still usable.
   */
  readonly isDisposed: boolean;

  /**
   * Brand property for nominal typing.
   * Contains the TProvides type parameter at the type level.
   * Value is undefined at runtime.
   */
  readonly [ContainerBrand]: { provides: TProvides };
};

// =============================================================================
// Scope Type
// =============================================================================

/**
 * A branded scope type that provides type-safe service resolution with scoped lifetimes.
 *
 * The Scope type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. This ensures that:
 * - Scopes cannot be confused with structurally similar objects
 * - Scopes are distinct from Containers (not interchangeable)
 * - Different TProvides type parameters produce incompatible types
 *
 * @typeParam TProvides - Union of Port types that this scope can resolve.
 *   The resolve method is constrained to only accept ports in this union.
 *
 * @remarks
 * - The brand property carries the TProvides type for nominal typing
 * - Scopes inherit singleton instances from the parent container
 * - Scoped instances are created once per scope and not shared with siblings
 * - Request instances are created fresh on every resolve call
 *
 * @see {@link Container} - Parent container type with identical API but separate brand
 * @see {@link Container.createScope} - Method that creates Scope instances
 *
 * @example Basic usage
 * ```typescript
 * // Scope type is parameterized by the ports it can resolve
 * type AppScope = Scope<typeof LoggerPort | typeof UserContextPort>;
 *
 * // The resolve method is type-safe
 * declare const scope: AppScope;
 * const logger = scope.resolve(LoggerPort);        // Singleton (shared)
 * const context = scope.resolve(UserContextPort);  // Scoped (per-scope)
 * ```
 *
 * @example Nested scopes
 * ```typescript
 * const parentScope = container.createScope();
 * const childScope = parentScope.createScope();
 *
 * // Child scope can resolve the same ports
 * const logger = childScope.resolve(LoggerPort);
 *
 * // Disposing child does not affect parent
 * await childScope.dispose();
 * // parentScope is still usable
 * ```
 */
export type Scope<TProvides extends Port<unknown, string>> = {
  /**
   * Resolves a service instance for the given port.
   *
   * The port must be in the TProvides union, enforced at compile time.
   * The return type is inferred from the port's phantom service type.
   *
   * @typeParam P - The specific port type being resolved (must extend TProvides)
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   *
   * @throws {DisposedScopeError} If the scope has been disposed
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {FactoryError} If the adapter's factory function throws
   */
  resolve<P extends TProvides>(port: P): InferService<P>;

  /**
   * Creates a child scope for managing nested scoped service lifetimes.
   *
   * The returned scope inherits singletons from the root container
   * and scoped instances from this scope (if configured).
   *
   * @returns A new Scope instance
   */
  createScope(): Scope<TProvides>;

  /**
   * Disposes the scope and all scoped instances.
   *
   * After disposal, the scope cannot be used to resolve services.
   * Child scopes are disposed before this scope's instances.
   * Finalizers are called in LIFO order (last created first disposed).
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the scope has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * This property is useful for checking scope validity before resolution,
   * especially in React StrictMode where scopes may be disposed and recreated.
   */
  readonly isDisposed: boolean;

  /**
   * Brand property for nominal typing.
   * Contains the TProvides type parameter at the type level.
   * Value is undefined at runtime.
   */
  readonly [ScopeBrand]: { provides: TProvides };
};

// =============================================================================
// Type Utility Functions
// =============================================================================

/**
 * Extracts the TProvides type parameter from a Container type.
 *
 * Uses conditional type inference to extract the port union from Container.
 * Returns `never` if the input type is not a Container.
 *
 * @typeParam T - The type to extract TProvides from
 *
 * @returns The TProvides type parameter, or `never` if T is not a Container
 *
 * @remarks
 * This utility is useful for:
 * - Generic functions that need to work with Container types
 * - Type-level validation that a container provides certain ports
 * - Extracting the available ports from an existing container type
 *
 * @see {@link InferScopeProvides} - Similar utility for Scope types
 * @see {@link Container} - The Container type this utility extracts from
 *
 * @example Basic extraction
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 * type Provides = InferContainerProvides<MyContainer>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 *
 * @example Non-container type returns never
 * ```typescript
 * type NotContainer = { foo: string };
 * type Provides = InferContainerProvides<NotContainer>;
 * // never
 * ```
 */
export type InferContainerProvides<T> = T extends Container<infer P> ? P : never;

/**
 * Extracts the TProvides type parameter from a Scope type.
 *
 * Uses conditional type inference to extract the port union from Scope.
 * Returns `never` if the input type is not a Scope.
 *
 * @typeParam T - The type to extract TProvides from
 *
 * @returns The TProvides type parameter, or `never` if T is not a Scope
 *
 * @remarks
 * This utility is useful for:
 * - Generic functions that need to work with Scope types
 * - Type-level validation that a scope provides certain ports
 * - Extracting the available ports from an existing scope type
 *
 * @see {@link InferContainerProvides} - Similar utility for Container types
 * @see {@link Scope} - The Scope type this utility extracts from
 *
 * @example Basic extraction
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort | typeof DatabasePort>;
 * type Provides = InferScopeProvides<MyScope>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 *
 * @example Non-scope type returns never
 * ```typescript
 * type NotScope = { foo: string };
 * type Provides = InferScopeProvides<NotScope>;
 * // never
 * ```
 */
export type InferScopeProvides<T> = T extends Scope<infer P> ? P : never;

/**
 * Type predicate that returns `true` if a port is resolvable from a container or scope.
 *
 * Checks whether TPort extends the TProvides of the given container or scope type.
 * Works with both Container and Scope types.
 *
 * @typeParam TContainer - A Container or Scope type to check against
 * @typeParam TPort - The port type to check for resolvability
 *
 * @returns `true` if TPort is in TContainer's TProvides, `false` otherwise
 *
 * @remarks
 * This utility uses a union of InferContainerProvides and InferScopeProvides
 * to work with both Container and Scope types seamlessly.
 *
 * @see {@link InferContainerProvides} - Extracts TProvides from Container
 * @see {@link InferScopeProvides} - Extracts TProvides from Scope
 * @see {@link ServiceFromContainer} - Extracts service type if resolvable
 *
 * @example Container with resolvable port
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort | typeof DatabasePort>;
 *
 * type CanResolveLogger = IsResolvable<MyContainer, typeof LoggerPort>;
 * // true
 *
 * type CanResolveConfig = IsResolvable<MyContainer, typeof ConfigPort>;
 * // false
 * ```
 *
 * @example Works with Scope types
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort>;
 *
 * type CanResolveLogger = IsResolvable<MyScope, typeof LoggerPort>;
 * // true
 * ```
 */
export type IsResolvable<TContainer, TPort extends Port<unknown, string>> =
  TPort extends (InferContainerProvides<TContainer> | InferScopeProvides<TContainer>)
    ? true
    : false;

/**
 * Extracts the service type for a given port from a container or scope.
 *
 * Returns the service type (via InferService) if the port is resolvable,
 * or `never` if the port is not in the container's or scope's TProvides.
 *
 * @typeParam TContainer - A Container or Scope type to extract from
 * @typeParam TPort - The port type to get the service type for
 *
 * @returns The service type if TPort is resolvable, `never` otherwise
 *
 * @remarks
 * This utility combines IsResolvable and InferService to provide a safe way
 * to extract service types. It works with both Container and Scope types.
 *
 * @see {@link IsResolvable} - Checks if port is in TProvides
 * @see {@link InferService} - Extracts service type from port
 * @see {@link InferContainerProvides} - Extracts TProvides from Container
 * @see {@link InferScopeProvides} - Extracts TProvides from Scope
 *
 * @example Resolvable port returns service type
 * ```typescript
 * interface Logger { log(msg: string): void; }
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * type MyContainer = Container<typeof LoggerPort>;
 * type LoggerService = ServiceFromContainer<MyContainer, typeof LoggerPort>;
 * // Logger
 * ```
 *
 * @example Non-resolvable port returns never
 * ```typescript
 * type MyContainer = Container<typeof LoggerPort>;
 * type ConfigService = ServiceFromContainer<MyContainer, typeof ConfigPort>;
 * // never
 * ```
 *
 * @example Works with Scope types
 * ```typescript
 * type MyScope = Scope<typeof LoggerPort>;
 * type LoggerService = ServiceFromContainer<MyScope, typeof LoggerPort>;
 * // Logger
 * ```
 */
export type ServiceFromContainer<TContainer, TPort extends Port<unknown, string>> =
  IsResolvable<TContainer, TPort> extends true
    ? InferService<TPort>
    : never;
