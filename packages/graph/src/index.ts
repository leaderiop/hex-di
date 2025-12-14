/**
 * @hex-di/graph - Dependency Graph Construction and Validation
 *
 * The compile-time validation layer of HexDI.
 * Provides Adapter type, createAdapter function, and GraphBuilder
 * with type-level dependency tracking that produces actionable
 * compile-time error messages when the graph is incomplete.
 *
 * @packageDocumentation
 */

// Re-export types from @hex-di/ports for consumer convenience
export type { Port, InferService, InferPortName } from "@hex-di/ports";
import type { Port, InferService, InferPortName } from "@hex-di/ports";

// =============================================================================
// Brand Symbols
// =============================================================================

/**
 * Unique symbol used for nominal typing of Adapter types.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to enable nominal typing,
 * ensuring that two adapters with different type parameters are
 * type-incompatible even if their runtime structure is similar.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 * This follows the same pattern as `@hex-di/ports` for Port branding.
 */
declare const __adapterBrand: unique symbol;

/**
 * Unique symbol used for nominal typing of GraphBuilder types at the type level.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to enable nominal typing,
 * ensuring GraphBuilder instances are distinct from structurally similar objects.
 *
 * @internal
 */
declare const __graphBuilderBrand: unique symbol;

/**
 * Runtime symbol used as a property key for GraphBuilder branding.
 * This ensures GraphBuilder instances are structurally distinct.
 *
 * @internal
 */
const GRAPH_BUILDER_BRAND = Symbol("GraphBuilder");

// =============================================================================
// Lifetime Type
// =============================================================================

/**
 * Lifetime scope for an adapter's service instance.
 *
 * Determines when a new instance is created vs. reusing an existing one:
 *
 * - `'singleton'`: One instance for the entire application lifetime.
 *   Created once on first resolution and reused for all subsequent requests.
 *   Suitable for stateless services or shared resources.
 *
 * - `'scoped'`: One instance per scope (e.g., per HTTP request in a web app).
 *   Created once per scope and reused within that scope.
 *   Suitable for request-specific state or database connections.
 *
 * - `'request'`: New instance for every resolution request.
 *   Created fresh each time the service is resolved.
 *   Suitable for stateful services or when isolation is required.
 *
 * @example
 * ```typescript
 * // Singleton - shared database connection pool
 * const DatabaseAdapter = createAdapter({
 *   provides: DatabasePort,
 *   requires: [],
 *   lifetime: 'singleton',
 *   factory: () => new DatabasePool()
 * });
 *
 * // Scoped - request-specific user context
 * const UserContextAdapter = createAdapter({
 *   provides: UserContextPort,
 *   requires: [],
 *   lifetime: 'scoped',
 *   factory: () => new UserContext()
 * });
 *
 * // Request - fresh logger for each resolution
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'request',
 *   factory: () => new Logger()
 * });
 * ```
 */
export type Lifetime = "singleton" | "scoped" | "request";

// =============================================================================
// ResolvedDeps Helper Type
// =============================================================================

/**
 * Maps a union of Port types to an object type where:
 * - Each key is the port name (extracted via InferPortName)
 * - Each value is the corresponding service type (extracted via InferService)
 *
 * This type is used to type the dependencies object passed to adapter factory functions.
 *
 * @typeParam TRequires - A union of Port types, or `never` for zero dependencies
 *
 * @returns
 * - When `TRequires` is `never`: `Record<string, unknown>` (accepts any deps object)
 * - Otherwise: An object with port names as keys and service types as values
 *
 * @example
 * ```typescript
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * const DatabasePort = createPort<'Database', Database>('Database');
 *
 * // Single dependency
 * type SingleDep = ResolvedDeps<typeof LoggerPort>;
 * // { Logger: Logger }
 *
 * // Multiple dependencies
 * type MultiDeps = ResolvedDeps<typeof LoggerPort | typeof DatabasePort>;
 * // { Logger: Logger; Database: Database }
 *
 * // No dependencies
 * type NoDeps = ResolvedDeps<never>;
 * // Record<string, unknown>
 * ```
 */
export type ResolvedDeps<TRequires extends Port<unknown, string> | never> =
  [TRequires] extends [never]
    ? Record<string, unknown>
    : {
        [P in TRequires as InferPortName<P>]: InferService<P>;
      };

// =============================================================================
// Adapter Type
// =============================================================================

/**
 * A branded adapter type that captures the complete contract for a service implementation.
 *
 * The Adapter type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. Two adapters are only type-compatible if they have:
 * 1. The same provided port type (TProvides)
 * 2. The same required ports union (TRequires)
 * 3. The same lifetime scope (TLifetime)
 *
 * @typeParam TProvides - The Port this adapter provides/implements (single port, not union)
 * @typeParam TRequires - Union of Ports this adapter depends on, or `never` for zero dependencies
 * @typeParam TLifetime - The lifetime scope literal type ('singleton' | 'scoped' | 'request')
 *
 * @remarks
 * - The `__adapterBrand` property carries all three type parameters in a tuple for nominal typing
 * - The brand property value is undefined at runtime (zero overhead)
 * - The `provides` property exposes the provided port for type inference
 * - The `requires` property is an empty array when TRequires is `never`, otherwise a Port array
 * - The `factory` function receives resolved dependencies and returns the service instance
 *
 * @see {@link createAdapter} - Factory function to create adapter instances
 * @see {@link ResolvedDeps} - Utility type for the factory's dependencies parameter
 * @see {@link Lifetime} - The lifetime scope options
 *
 * @example
 * ```typescript
 * interface Logger { log(msg: string): void; }
 * interface Database { query(sql: string): Promise<unknown>; }
 * interface UserService { getUser(id: string): Promise<User>; }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * const DatabasePort = createPort<'Database', Database>('Database');
 * const UserServicePort = createPort<'UserService', UserService>('UserService');
 *
 * // Adapter with no dependencies
 * type LoggerAdapterType = Adapter<typeof LoggerPort, never, 'singleton'>;
 *
 * // Adapter with dependencies
 * type UserServiceAdapterType = Adapter<
 *   typeof UserServicePort,
 *   typeof LoggerPort | typeof DatabasePort,
 *   'scoped'
 * >;
 * ```
 */
export type Adapter<
  TProvides extends Port<unknown, string>,
  TRequires extends Port<unknown, string> | never,
  TLifetime extends Lifetime,
> = {
  /**
   * Brand property for nominal typing.
   * Contains a tuple of [TProvides, TRequires, TLifetime] at the type level.
   * Value is undefined at runtime.
   */
  readonly [__adapterBrand]: [TProvides, TRequires, TLifetime];

  /**
   * The port this adapter provides/implements.
   */
  readonly provides: TProvides;

  /**
   * The ports this adapter depends on.
   * Empty readonly array when TRequires is never, otherwise an array of Port tokens.
   */
  readonly requires: [TRequires] extends [never]
    ? readonly []
    : readonly Port<unknown, string>[];

  /**
   * The lifetime scope for this adapter's service instances.
   */
  readonly lifetime: TLifetime;

  /**
   * Factory function that creates the service instance.
   * Receives resolved dependencies as an object and returns the service.
   */
  readonly factory: (deps: ResolvedDeps<TRequires>) => InferService<TProvides>;

  /**
   * Optional finalizer function called during disposal.
   * Used for cleanup of resources like closing connections or flushing buffers.
   * Note: Uses method signature syntax for bivariant parameter handling,
   * enabling proper subtyping when adapters are used in GraphBuilder.provide().
   */
  finalizer?(instance: InferService<TProvides>): void | Promise<void>;
};

// =============================================================================
// TupleToUnion Helper Type
// =============================================================================

/**
 * Converts a tuple/array type to a union of its element types.
 *
 * @typeParam T - A tuple or array type
 * @returns Union of all element types, or `never` for empty array
 *
 * @internal
 */
type TupleToUnion<T extends readonly Port<unknown, string>[]> = T extends readonly []
  ? never
  : T[number];

// =============================================================================
// createAdapter Configuration Type
// =============================================================================

/**
 * Configuration object for creating an adapter.
 *
 * @typeParam TProvides - The Port this adapter provides
 * @typeParam TRequires - Tuple of Ports this adapter depends on
 * @typeParam TLifetime - The lifetime scope literal
 *
 * @internal
 */
interface AdapterConfig<
  TProvides extends Port<unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime,
> {
  /**
   * The port this adapter provides/implements.
   */
  provides: TProvides;

  /**
   * Array of port tokens this adapter depends on.
   * Use an empty array `[]` for adapters with no dependencies.
   */
  requires: TRequires;

  /**
   * The lifetime scope for this adapter's service instances.
   */
  lifetime: TLifetime;

  /**
   * Factory function that creates the service instance.
   * Receives resolved dependencies as a typed object.
   */
  factory: (deps: ResolvedDeps<TupleToUnion<TRequires>>) => InferService<TProvides>;

  /**
   * Optional finalizer function called during disposal.
   * Used for cleanup of resources like closing connections or flushing buffers.
   */
  finalizer?: (instance: InferService<TProvides>) => void | Promise<void>;
}

// =============================================================================
// createAdapter Function
// =============================================================================

/**
 * Creates a typed adapter with dependency metadata for registration in a dependency graph.
 *
 * This function creates an immutable adapter object that captures:
 * - Which port the adapter provides (implements)
 * - Which ports the adapter requires (dependencies)
 * - The lifetime scope for service instances
 * - A factory function to create the service
 *
 * All type information is inferred automatically - no explicit type annotations are needed.
 *
 * @typeParam TProvides - The Port this adapter provides (inferred from `provides` property)
 * @typeParam TRequires - Tuple of Ports this adapter depends on (inferred from `requires` array)
 * @typeParam TLifetime - The lifetime scope literal (inferred from `lifetime` property)
 *
 * @param config - Configuration object with provides, requires, lifetime, and factory
 * @param config.provides - The port token this adapter implements
 * @param config.requires - Array of port tokens this adapter depends on (use `[]` for no dependencies)
 * @param config.lifetime - Lifetime scope: `'singleton'`, `'scoped'`, or `'request'`
 * @param config.factory - Function that receives resolved dependencies and returns the service instance
 *
 * @returns A frozen Adapter object with the inferred type parameters
 *
 * @remarks
 * - The returned adapter is frozen via `Object.freeze()` for immutability
 * - The `requires` array is inferred as a tuple type to preserve individual port types
 * - The factory function receives a typed object where each key is a port name
 * - Type inference is complete - consumers never need explicit type annotations
 *
 * @see {@link Adapter} - The branded adapter type returned by this function
 * @see {@link ResolvedDeps} - The type of the dependencies object passed to the factory
 * @see {@link Lifetime} - The available lifetime scope options
 *
 * @example Basic usage - adapter with no dependencies
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * const ConsoleLoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'singleton',
 *   factory: () => ({
 *     log: (msg) => { /* log message *\/ }
 *   })
 * });
 * ```
 *
 * @example Adapter with dependencies
 * ```typescript
 * interface UserService {
 *   getUser(id: string): Promise<User>;
 * }
 *
 * const UserServicePort = createPort<'UserService', UserService>('UserService');
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * const DatabasePort = createPort<'Database', Database>('Database');
 *
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [LoggerPort, DatabasePort],
 *   lifetime: 'scoped',
 *   factory: (deps) => {
 *     // deps is typed as { Logger: Logger; Database: Database }
 *     return {
 *       getUser: async (id) => {
 *         deps.Logger.log(`Fetching user ${id}`);
 *         return deps.Database.query(`SELECT * FROM users WHERE id = ?`, [id]);
 *       }
 *     };
 *   }
 * });
 * ```
 *
 * @example Type inference is automatic
 * ```typescript
 * // No explicit type annotations needed - everything is inferred
 * const adapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [LoggerPort],
 *   lifetime: 'request',
 *   factory: (deps) => {
 *     // TypeScript knows deps.Logger is of type Logger
 *     deps.Logger.log('Creating user service');
 *     return { getUser: async (id) => ({ id, name: 'Test' }) };
 *   }
 * });
 *
 * // typeof adapter is Adapter<typeof UserServicePort, typeof LoggerPort, 'request'>
 * ```
 */
export function createAdapter<
  TProvides extends Port<unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TLifetime extends Lifetime,
>(
  config: AdapterConfig<TProvides, TRequires, TLifetime>
): Adapter<TProvides, TupleToUnion<TRequires>, TLifetime> {
  return Object.freeze({
    provides: config.provides,
    requires: config.requires as unknown as Adapter<TProvides, TupleToUnion<TRequires>, TLifetime>["requires"],
    lifetime: config.lifetime,
    factory: config.factory,
    finalizer: config.finalizer,
  }) as Adapter<TProvides, TupleToUnion<TRequires>, TLifetime>;
}

// =============================================================================
// Adapter Type Inference Utilities
// =============================================================================

/**
 * Extracts the provided port type from an Adapter type.
 *
 * @typeParam A - The Adapter type to extract from
 * @returns The TProvides type parameter, or `never` if A is not an Adapter
 *
 * @example
 * ```typescript
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'singleton',
 *   factory: () => ({ log: () => {} })
 * });
 *
 * type ProvidedPort = InferAdapterProvides<typeof LoggerAdapter>;
 * // typeof LoggerPort
 * ```
 */
export type InferAdapterProvides<A> = A extends Adapter<infer TProvides, infer _TRequires, infer _TLifetime>
  ? TProvides
  : never;

/**
 * Extracts the required ports union from an Adapter type.
 *
 * @typeParam A - The Adapter type to extract from
 * @returns The TRequires type parameter (union of ports), or `never` if A is not an Adapter
 *
 * @example
 * ```typescript
 * const UserServiceAdapter = createAdapter({
 *   provides: UserServicePort,
 *   requires: [LoggerPort, DatabasePort],
 *   lifetime: 'scoped',
 *   factory: (deps) => ({ getUser: async () => ({}) })
 * });
 *
 * type RequiredPorts = InferAdapterRequires<typeof UserServiceAdapter>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 */
export type InferAdapterRequires<A> = A extends Adapter<infer _TProvides, infer TRequires, infer _TLifetime>
  ? TRequires
  : never;

/**
 * Extracts the lifetime literal type from an Adapter type.
 *
 * @typeParam A - The Adapter type to extract from
 * @returns The TLifetime literal type, or `never` if A is not an Adapter
 *
 * @example
 * ```typescript
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'singleton',
 *   factory: () => ({ log: () => {} })
 * });
 *
 * type AdapterLifetime = InferAdapterLifetime<typeof LoggerAdapter>;
 * // 'singleton'
 * ```
 */
export type InferAdapterLifetime<A> = A extends Adapter<infer _TProvides, infer _TRequires, infer TLifetime>
  ? TLifetime
  : never;

// =============================================================================
// GraphBuilder Type Inference Utilities
// =============================================================================

/**
 * Extracts the provided ports union from a GraphBuilder type.
 *
 * @typeParam G - The GraphBuilder type to extract from
 * @returns The TProvides type parameter (union of ports), or `never` if G is not a GraphBuilder
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter);
 *
 * type ProvidedPorts = InferGraphProvides<typeof builder>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 */
export type InferGraphProvides<G> = G extends GraphBuilder<infer TProvides, infer _TRequires>
  ? TProvides
  : never;

/**
 * Extracts the required ports union from a GraphBuilder type.
 *
 * @typeParam G - The GraphBuilder type to extract from
 * @returns The TRequires type parameter (union of ports), or `never` if G is not a GraphBuilder
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(UserServiceAdapter); // requires LoggerPort, DatabasePort
 *
 * type RequiredPorts = InferGraphRequires<typeof builder>;
 * // typeof LoggerPort | typeof DatabasePort
 * ```
 */
export type InferGraphRequires<G> = G extends GraphBuilder<infer _TProvides, infer TRequires>
  ? TRequires
  : never;

// =============================================================================
// Dependency Validation Types
// =============================================================================

/**
 * Computes the unsatisfied (missing) dependencies by subtracting provided ports from required ports.
 *
 * This utility type uses TypeScript's built-in `Exclude` to perform union subtraction:
 * - If all required ports are provided, the result is `never`
 * - If some ports are missing, the result is a union of the missing ports
 *
 * This is the foundation of compile-time dependency validation in HexDI.
 *
 * @typeParam TProvides - Union of Port types that have been provided
 * @typeParam TRequires - Union of Port types that are required
 *
 * @returns Union of Port types that are required but not provided, or `never` if all satisfied
 *
 * @remarks
 * - When `TRequires` is `never`, the result is always `never` (no requirements = nothing missing)
 * - When `TProvides` is `never` but `TRequires` has ports, the result is `TRequires` (all missing)
 * - Uses the `[T] extends [never]` pattern to avoid distributive conditional type issues
 *
 * @see {@link IsSatisfied} - Boolean type predicate for dependency satisfaction
 * @see {@link ValidGraph} - Conditional type for build-time validation
 *
 * @example Basic usage
 * ```typescript
 * type Provided = typeof LoggerPort | typeof DatabasePort;
 * type Required = typeof LoggerPort | typeof DatabasePort | typeof ConfigPort;
 *
 * type Missing = UnsatisfiedDependencies<Provided, Required>;
 * // typeof ConfigPort
 * ```
 *
 * @example All satisfied
 * ```typescript
 * type Provided = typeof LoggerPort | typeof DatabasePort;
 * type Required = typeof LoggerPort;
 *
 * type Missing = UnsatisfiedDependencies<Provided, Required>;
 * // never
 * ```
 *
 * @example With GraphBuilder
 * ```typescript
 * const builder = GraphBuilder.create()
 *   .provide(UserServiceAdapter) // requires Logger, Database
 *   .provide(LoggerAdapter);     // provides Logger
 *
 * type Missing = UnsatisfiedDependencies<
 *   InferGraphProvides<typeof builder>,
 *   InferGraphRequires<typeof builder>
 * >;
 * // typeof DatabasePort
 * ```
 */
export type UnsatisfiedDependencies<
  TProvides extends Port<unknown, string> | never,
  TRequires extends Port<unknown, string> | never,
> = [TRequires] extends [never] ? never : Exclude<TRequires, TProvides>;

/**
 * Type predicate that evaluates to `true` if all required dependencies are satisfied.
 *
 * Returns `true` when `UnsatisfiedDependencies<TProvides, TRequires>` is `never`,
 * meaning all required ports have corresponding providers.
 *
 * @typeParam TProvides - Union of Port types that have been provided
 * @typeParam TRequires - Union of Port types that are required
 *
 * @returns `true` if all dependencies satisfied, `false` otherwise
 *
 * @remarks
 * - Uses the `[T] extends [never]` pattern to correctly handle the `never` type
 * - This pattern avoids issues with distributive conditional types
 * - Empty requirements (`TRequires = never`) always results in `true`
 *
 * @see {@link UnsatisfiedDependencies} - Computes which dependencies are missing
 * @see {@link ValidGraph} - Uses this predicate for graph validation
 *
 * @example Satisfied graph
 * ```typescript
 * type Satisfied = IsSatisfied<
 *   typeof LoggerPort | typeof DatabasePort,
 *   typeof LoggerPort
 * >;
 * // true
 * ```
 *
 * @example Unsatisfied graph
 * ```typescript
 * type Satisfied = IsSatisfied<
 *   typeof LoggerPort,
 *   typeof LoggerPort | typeof DatabasePort
 * >;
 * // false
 * ```
 *
 * @example No requirements
 * ```typescript
 * type Satisfied = IsSatisfied<typeof LoggerPort, never>;
 * // true (no requirements means always satisfied)
 * ```
 */
export type IsSatisfied<
  TProvides extends Port<unknown, string> | never,
  TRequires extends Port<unknown, string> | never,
> = [UnsatisfiedDependencies<TProvides, TRequires>] extends [never] ? true : false;

/**
 * Conditional type that evaluates to a valid graph representation when all dependencies
 * are satisfied, or an error type with missing dependency information when unsatisfied.
 *
 * This type is the foundation for the `.build()` method constraint, ensuring that
 * graphs can only be built when complete.
 *
 * @typeParam TProvides - Union of Port types that have been provided
 * @typeParam TRequires - Union of Port types that are required
 *
 * @returns
 * - When satisfied: `{ __valid: true; provides: TProvides }`
 * - When unsatisfied: `{ __valid: false; __missing: UnsatisfiedDependencies<TProvides, TRequires> }`
 *
 * @remarks
 * - The `__valid` property allows consumers to narrow the type
 * - The `__missing` property on the error type carries the missing port union
 * - This information can be used by Task Group 7 to generate readable error messages
 * - The structure supports both programmatic checks and IDE tooltip display
 *
 * @see {@link IsSatisfied} - Boolean predicate used by this type
 * @see {@link UnsatisfiedDependencies} - Computes the missing dependencies
 *
 * @example Valid graph
 * ```typescript
 * type Result = ValidGraph<
 *   typeof LoggerPort | typeof DatabasePort,
 *   typeof LoggerPort
 * >;
 * // { __valid: true; provides: typeof LoggerPort | typeof DatabasePort }
 * ```
 *
 * @example Invalid graph
 * ```typescript
 * type Result = ValidGraph<
 *   typeof LoggerPort,
 *   typeof LoggerPort | typeof DatabasePort
 * >;
 * // { __valid: false; __missing: typeof DatabasePort }
 * ```
 */
export type ValidGraph<
  TProvides extends Port<unknown, string> | never,
  TRequires extends Port<unknown, string> | never,
> = IsSatisfied<TProvides, TRequires> extends true
  ? { __valid: true; provides: TProvides }
  : { __valid: false; __missing: UnsatisfiedDependencies<TProvides, TRequires> };

// =============================================================================
// Duplicate Detection Types
// =============================================================================

/**
 * Type predicate that evaluates to `true` if there is any overlap between two port types.
 *
 * This utility type is used to detect if an adapter provides a port that is already
 * provided by another adapter in the graph. It checks if the intersection of two
 * port types is non-empty.
 *
 * @typeParam A - First port type or union of ports
 * @typeParam B - Second port type or union of ports
 *
 * @returns `true` if there is any overlap (A & B is not never), `false` otherwise
 *
 * @remarks
 * - Uses the `[T] extends [never]` pattern to correctly handle the `never` type
 * - Returns `false` when either type is `never` (no overlap with nothing)
 * - Works correctly with both single port types and unions
 * - Uses Extract to find common members between the two port unions
 *
 * @see {@link DuplicateProviderError} - Error type produced when overlap is detected
 *
 * @example Same port - overlap detected
 * ```typescript
 * type HasOverlapResult = HasOverlap<typeof LoggerPort, typeof LoggerPort>;
 * // true
 * ```
 *
 * @example Different ports - no overlap
 * ```typescript
 * type NoOverlapResult = HasOverlap<typeof LoggerPort, typeof DatabasePort>;
 * // false
 * ```
 *
 * @example Partial overlap in unions
 * ```typescript
 * type PartialOverlap = HasOverlap<
 *   typeof LoggerPort | typeof DatabasePort,
 *   typeof LoggerPort | typeof ConfigPort
 * >;
 * // true (Logger is in both)
 * ```
 *
 * @example With never
 * ```typescript
 * type WithNever = HasOverlap<never, typeof LoggerPort>;
 * // false
 * ```
 */
export type HasOverlap<
  A extends Port<unknown, string> | never,
  B extends Port<unknown, string> | never,
> = [A] extends [never]
  ? false
  : [B] extends [never]
    ? false
    : [Extract<A, B>] extends [never]
      ? false
      : true;

/**
 * Extracts the overlapping ports between two port types.
 *
 * This utility type finds the intersection of two port types, which represents
 * the ports that would be duplicated if both were provided.
 *
 * @typeParam A - First port type or union of ports
 * @typeParam B - Second port type or union of ports
 *
 * @returns The intersection of A and B (the overlapping ports), or `never` if no overlap
 *
 * @internal
 */
type OverlappingPorts<
  A extends Port<unknown, string> | never,
  B extends Port<unknown, string> | never,
> = Extract<A, B>;

// =============================================================================
// Compile-Time Error Message Types
// =============================================================================

/**
 * Extracts port names from a union of Port types as a string literal union.
 *
 * This utility type maps each Port in a union to its name using `InferPortName`,
 * producing a union of string literal types representing the port names.
 *
 * @typeParam Ports - A union of Port types, or `never`
 *
 * @returns A union of string literal types representing the port names, or `never` if input is `never`
 *
 * @remarks
 * - Uses distributive conditional types to map over each port in the union
 * - Returns `never` when input is `never` (no ports = no names)
 * - The result is suitable for use in template literal types
 *
 * @see {@link InferPortName} - Extracts the name from a single Port
 * @see {@link MissingDependencyError} - Uses this type to build error messages
 *
 * @example Single port
 * ```typescript
 * type Name = ExtractPortNames<typeof LoggerPort>;
 * // 'Logger'
 * ```
 *
 * @example Multiple ports
 * ```typescript
 * type Names = ExtractPortNames<typeof LoggerPort | typeof DatabasePort>;
 * // 'Logger' | 'Database'
 * ```
 *
 * @example Empty case
 * ```typescript
 * type NoNames = ExtractPortNames<never>;
 * // never
 * ```
 */
export type ExtractPortNames<Ports extends Port<unknown, string> | never> =
  [Ports] extends [never]
    ? never
    : Ports extends Port<unknown, string>
      ? InferPortName<Ports>
      : never;

/**
 * A branded error type that produces a readable compile-time error message
 * when dependencies are missing from a graph.
 *
 * This type combines a template literal string message with an error brand
 * to create a type that:
 * 1. Displays a readable message in IDE tooltips
 * 2. Is structurally incompatible with valid graph results
 * 3. Forces the developer to address missing dependencies
 *
 * @typeParam MissingPorts - A union of Port types that are missing
 *
 * @returns A branded error type with:
 * - `__errorBrand: 'MissingDependencyError'` - For type discrimination
 * - `__message: 'Missing dependencies: ${PortNames}'` - Human-readable message
 * - `__missing: MissingPorts` - The actual missing Port types for programmatic access
 *
 * @remarks
 * - Returns `never` when `MissingPorts` is `never` (no missing = no error)
 * - The error brand ensures this type cannot be confused with a valid result
 * - The message is visible in IDE tooltips when hovering over type errors
 * - Uses `ExtractPortNames` to convert Port types to readable names
 *
 * @see {@link ExtractPortNames} - Extracts names from Port union
 * @see {@link DuplicateProviderError} - Similar pattern for duplicate detection
 *
 * @example Single missing dependency
 * ```typescript
 * type Error = MissingDependencyError<typeof LoggerPort>;
 * // {
 * //   __errorBrand: 'MissingDependencyError';
 * //   __message: 'Missing dependencies: Logger';
 * //   __missing: typeof LoggerPort;
 * // }
 * ```
 *
 * @example Multiple missing dependencies
 * ```typescript
 * type Error = MissingDependencyError<typeof LoggerPort | typeof DatabasePort>;
 * // {
 * //   __errorBrand: 'MissingDependencyError';
 * //   __message: 'Missing dependencies: Logger' | 'Missing dependencies: Database';
 * //   __missing: typeof LoggerPort | typeof DatabasePort;
 * // }
 * ```
 */
export type MissingDependencyError<MissingPorts extends Port<unknown, string> | never> =
  [MissingPorts] extends [never]
    ? never
    : {
        readonly __errorBrand: "MissingDependencyError";
        readonly __message: `Missing dependencies: ${ExtractPortNames<MissingPorts>}`;
        readonly __missing: MissingPorts;
      };

/**
 * A branded error type that produces a readable compile-time error message
 * when a duplicate provider is detected for a port.
 *
 * This type is used when `.provide()` is called with an adapter that provides
 * a port that is already provided by another adapter in the graph.
 *
 * @typeParam DuplicatePort - The Port type that has a duplicate provider
 *
 * @returns A branded error type with:
 * - `__errorBrand: 'DuplicateProviderError'` - For type discrimination
 * - `__message: 'Duplicate provider for: ${PortName}'` - Human-readable message
 * - `__duplicate: DuplicatePort` - The duplicate Port type for programmatic access
 *
 * @remarks
 * - The error brand ensures this type cannot be confused with a valid result
 * - The message clearly identifies which port has multiple providers
 * - This helps prevent configuration errors where the same port is provided twice
 *
 * @see {@link MissingDependencyError} - Similar pattern for missing dependencies
 * @see {@link ExtractPortNames} - Used to get readable port names
 *
 * @example
 * ```typescript
 * type Error = DuplicateProviderError<typeof LoggerPort>;
 * // {
 * //   __errorBrand: 'DuplicateProviderError';
 * //   __message: 'Duplicate provider for: Logger';
 * //   __duplicate: typeof LoggerPort;
 * // }
 * ```
 */
export type DuplicateProviderError<DuplicatePort extends Port<unknown, string>> = {
  readonly __errorBrand: "DuplicateProviderError";
  readonly __message: `Duplicate provider for: ${InferPortName<DuplicatePort>}`;
  readonly __duplicate: DuplicatePort;
};

// =============================================================================
// Graph Type (Build Result)
// =============================================================================

/**
 * The validated dependency graph returned by `GraphBuilder.build()`.
 *
 * This type represents a complete, validated graph where all dependencies
 * have been satisfied. It contains the readonly array of adapters that
 * can be used by `@hex-di/runtime` to create a container.
 *
 * @typeParam TProvides - Union of Port types that this graph provides
 *
 * @remarks
 * - The graph is immutable (frozen)
 * - Contains all registered adapters in registration order
 * - The `TProvides` type parameter tracks what services the graph can provide
 * - Designed for consumption by `@hex-di/runtime` for container creation
 *
 * @see {@link GraphBuilder.build} - Method that returns this type
 */
export type Graph<TProvides extends Port<unknown, string> | never> = {
  readonly adapters: readonly Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>[];
  readonly __provides: TProvides;
};

/**
 * The return type of `GraphBuilder.build()`.
 *
 * Conditionally returns either a valid `Graph<TProvides>` or a `MissingDependencyError`
 * based on whether all dependencies are satisfied.
 *
 * @typeParam TProvides - Union of Port types that have been provided
 * @typeParam TRequires - Union of Port types that are required
 *
 * @returns
 * - When satisfied: `Graph<TProvides>`
 * - When unsatisfied: `MissingDependencyError<UnsatisfiedDependencies<TProvides, TRequires>>`
 *
 * @internal
 */
type BuildResult<
  TProvides extends Port<unknown, string> | never,
  TRequires extends Port<unknown, string> | never,
> = IsSatisfied<TProvides, TRequires> extends true
  ? Graph<TProvides>
  : MissingDependencyError<UnsatisfiedDependencies<TProvides, TRequires>>;

/**
 * The return type of `GraphBuilder.provide()` with duplicate detection.
 *
 * Conditionally returns either a new `GraphBuilder` with accumulated types,
 * or a `DuplicateProviderError` if the adapter provides a port that is already provided.
 *
 * @typeParam TProvides - Current union of provided Port types
 * @typeParam TRequires - Current union of required Port types
 * @typeParam A - The Adapter type being provided
 *
 * @returns
 * - When no overlap: `GraphBuilder<TProvides | AdapterProvides, TRequires | AdapterRequires>`
 * - When overlap detected: `DuplicateProviderError<OverlappingPorts>`
 *
 * @internal
 */
type ProvideResult<
  TProvides extends Port<unknown, string> | never,
  TRequires extends Port<unknown, string> | never,
  A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
> = HasOverlap<InferAdapterProvides<A>, TProvides> extends true
  ? DuplicateProviderError<OverlappingPorts<InferAdapterProvides<A>, TProvides>>
  : GraphBuilder<TProvides | InferAdapterProvides<A>, TRequires | InferAdapterRequires<A>>;

// =============================================================================
// GraphBuilder Class
// =============================================================================

/**
 * An immutable builder for constructing dependency graphs with compile-time validation.
 *
 * GraphBuilder uses a fluent, immutable pattern where each `.provide()` call returns
 * a NEW builder instance with updated type parameters. This follows the Effect-TS
 * Layer composition pattern.
 *
 * The type parameters track:
 * - `TProvides`: Union of all ports provided by registered adapters
 * - `TRequires`: Union of all ports required by registered adapters
 *
 * At build time, the builder validates that all required ports are provided,
 * producing compile-time errors with actionable messages when dependencies are missing.
 *
 * @typeParam TProvides - Union of Port types that have been provided (starts as `never`)
 * @typeParam TRequires - Union of Port types that are required (starts as `never`)
 *
 * @remarks
 * - GraphBuilder instances are immutable - each `provide()` returns a new instance
 * - Use the static `GraphBuilder.create()` method to create new builders
 * - The constructor is private to enforce the factory method pattern
 * - Internal adapters array is readonly and the instance is frozen
 *
 * @see {@link Adapter} - The adapter type registered with the builder
 * @see {@link createAdapter} - Factory function to create adapters
 * @see {@link InferGraphProvides} - Utility to extract provided ports from builder
 * @see {@link InferGraphRequires} - Utility to extract required ports from builder
 *
 * @example Basic usage
 * ```typescript
 * const LoggerAdapter = createAdapter({
 *   provides: LoggerPort,
 *   requires: [],
 *   lifetime: 'singleton',
 *   factory: () => ({ log: console.log })
 * });
 *
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter);
 *
 * // builder has type GraphBuilder<typeof LoggerPort, never>
 * ```
 *
 * @example Building a complete graph
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .provide(UserServiceAdapter)
 *   .build();
 * ```
 */
export class GraphBuilder<
  TProvides extends Port<unknown, string> | never = never,
  TRequires extends Port<unknown, string> | never = never,
> {
  /**
   * Type-level brand property for nominal typing.
   * Ensures GraphBuilder types with different type parameters are distinct.
   * This property exists only at the type level for compile-time checking.
   *
   * @internal
   */
  declare private readonly [__graphBuilderBrand]: [TProvides, TRequires];

  /**
   * Runtime brand marker for GraphBuilder instances.
   * Ensures GraphBuilder instances are structurally distinct from other objects.
   *
   * @internal
   */
  private readonly [GRAPH_BUILDER_BRAND] = true as const;

  /**
   * The readonly array of registered adapters.
   *
   * This array contains all adapters that have been provided to the builder.
   * It is frozen and readonly to ensure immutability.
   */
  readonly adapters: readonly Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>[];

  /**
   * Private constructor to enforce factory method pattern.
   *
   * Use `GraphBuilder.create()` to create new builder instances.
   *
   * @param adapters - The array of adapters for this builder
   *
   * @internal
   */
  private constructor(
    adapters: readonly Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>[]
  ) {
    // Freeze the adapters array for deep immutability
    this.adapters = Object.freeze([...adapters]);
    Object.freeze(this);
  }

  /**
   * Creates a new empty GraphBuilder with `TProvides = never` and `TRequires = never`.
   *
   * This is the entry point for building a dependency graph. The returned builder
   * has no adapters and no type constraints.
   *
   * @returns A new frozen GraphBuilder instance with no adapters
   *
   * @example
   * ```typescript
   * const builder = GraphBuilder.create();
   * // builder has type GraphBuilder<never, never>
   *
   * const withLogger = builder.provide(LoggerAdapter);
   * // withLogger has type GraphBuilder<typeof LoggerPort, never>
   * ```
   */
  static create(): GraphBuilder<never, never> {
    return new GraphBuilder([]);
  }

  /**
   * Registers an adapter with the graph, returning a new builder with updated types.
   *
   * This method is immutable - it returns a NEW GraphBuilder instance with updated
   * type parameters. The original builder remains unchanged, enabling immutable
   * composition patterns like branching from a common base.
   *
   * **Type Accumulation Behavior:**
   * - `TProvides` accumulates: `TProvides | InferAdapterProvides<A>`
   * - `TRequires` accumulates: `TRequires | InferAdapterRequires<A>`
   * - When an adapter has no dependencies (`never`), the union `TRequires | never`
   *   correctly simplifies to just `TRequires`
   *
   * **Duplicate Detection:**
   * - If the adapter provides a port that is already provided by another adapter,
   *   a `DuplicateProviderError` type is returned instead of a new builder.
   * - The error message includes the name of the duplicated port.
   *
   * @typeParam A - The adapter type being provided (inferred from the adapter parameter)
   *
   * @param adapter - The adapter to register with the graph
   *
   * @returns A new GraphBuilder with accumulated type parameters, or a DuplicateProviderError
   *   if the adapter provides a port that is already provided.
   *
   * @remarks
   * - The original builder is unchanged after calling provide() (immutability)
   * - Fluent chaining is supported: `builder.provide(A).provide(B).provide(C)`
   * - Type accumulation uses TypeScript union types for compile-time tracking
   * - Adapters with `never` requires don't add to TRequires (union with never = identity)
   * - This follows the Effect-TS Layer.provide immutable composition pattern
   *
   * @see {@link InferAdapterProvides} - Extracts provided port from adapter
   * @see {@link InferAdapterRequires} - Extracts required ports from adapter
   * @see {@link DuplicateProviderError} - Error type for duplicate providers
   *
   * @example Basic immutability demonstration
   * ```typescript
   * const builder1 = GraphBuilder.create();
   * const builder2 = builder1.provide(LoggerAdapter);
   * const builder3 = builder2.provide(DatabaseAdapter);
   *
   * // builder1 is still GraphBuilder<never, never>
   * // builder2 is GraphBuilder<typeof LoggerPort, never>
   * // builder3 is GraphBuilder<typeof LoggerPort | typeof DatabasePort, never>
   * ```
   *
   * @example Fluent chaining
   * ```typescript
   * const graph = GraphBuilder.create()
   *   .provide(LoggerAdapter)     // provides Logger
   *   .provide(DatabaseAdapter)   // provides Database
   *   .provide(CacheAdapter)      // provides Cache, requires Config
   *   .provide(ConfigAdapter)     // provides Config
   *   .provide(UserServiceAdapter) // provides UserService, requires Logger & Database
   *   .build();
   * ```
   *
   * @example Duplicate detection
   * ```typescript
   * const builder = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(AnotherLoggerAdapter); // Error: DuplicateProviderError<typeof LoggerPort>
   * ```
   *
   * @example Branching from a common base
   * ```typescript
   * // Create a base with common infrastructure
   * const base = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter);
   *
   * // Branch A: Add user features
   * const withUsers = base
   *   .provide(UserServiceAdapter);
   *
   * // Branch B: Add order features (base unchanged)
   * const withOrders = base
   *   .provide(OrderServiceAdapter);
   *
   * // Both branches share the same base adapters
   * ```
   */
  provide<A extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>>(
    adapter: A
  ): ProvideResult<TProvides, TRequires, A> {
    return new GraphBuilder([...this.adapters, adapter]) as ProvideResult<TProvides, TRequires, A>;
  }

  /**
   * Builds the dependency graph after validating all dependencies are satisfied.
   *
   * This method validates at compile-time that all required ports have providers.
   * When dependencies are missing, the return type becomes a `MissingDependencyError`
   * that displays a readable error message in IDE tooltips.
   *
   * @returns
   * - When all dependencies satisfied: `Graph<TProvides>` - The validated graph
   * - When dependencies missing: `MissingDependencyError<MissingPorts>` - Error type with message
   *
   * @remarks
   * - The error type is branded and cannot be used as a valid graph
   * - Error messages include the names of missing ports for actionable feedback
   * - The error appears at the `.build()` call site, not deep in type definitions
   * - Empty graphs (no adapters, no requirements) build successfully
   *
   * @see {@link Graph} - The successful return type
   * @see {@link MissingDependencyError} - The error type for missing dependencies
   *
   * @example Complete graph - builds successfully
   * ```typescript
   * const graph = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter)
   *   .provide(UserServiceAdapter)
   *   .build();
   * // graph: Graph<typeof LoggerPort | typeof DatabasePort | typeof UserServicePort>
   * ```
   *
   * @example Incomplete graph - compile error
   * ```typescript
   * const incomplete = GraphBuilder.create()
   *   .provide(UserServiceAdapter) // requires Logger and Database
   *   .build();
   * // Type: MissingDependencyError<typeof LoggerPort | typeof DatabasePort>
   * // IDE shows: { __message: 'Missing dependencies: Logger' | 'Missing dependencies: Database' }
   * ```
   *
   * @example Empty graph - builds successfully
   * ```typescript
   * const empty = GraphBuilder.create().build();
   * // graph: Graph<never>
   * ```
   */
  build(): BuildResult<TProvides, TRequires> {
    return Object.freeze({
      adapters: this.adapters,
      __provides: undefined as unknown as TProvides,
    }) as BuildResult<TProvides, TRequires>;
  }
}
