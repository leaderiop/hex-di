/**
 * Captive Dependency Prevention Types for @hex-di/runtime.
 *
 * Captive dependency is a DI anti-pattern where a longer-lived service
 * (e.g., singleton) depends on a shorter-lived service (e.g., scoped/request).
 * This causes the shorter-lived service to be "captured" and held beyond
 * its intended lifetime, leading to stale data and memory leaks.
 *
 * These types provide compile-time validation to prevent captive dependencies
 * with zero runtime cost. All validation is performed at the type level.
 *
 * Lifetime hierarchy (lower level = longer lived):
 * - Singleton (1): lives for entire application lifetime
 * - Scoped (2): lives for duration of a scope
 * - Request (3): created fresh for each resolution
 *
 * Rule: An adapter can only depend on adapters with the same or LOWER
 * (longer-lived) lifetime level. Depending on HIGHER (shorter-lived)
 * adapters creates a captive dependency.
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/ports";
import type { Adapter, Lifetime, InferAdapterLifetime, InferAdapterProvides } from "@hex-di/graph";

// =============================================================================
// LifetimeLevel Phantom Type
// =============================================================================

/**
 * Maps a Lifetime string literal to its numeric level for comparison.
 *
 * The numeric levels represent the lifetime hierarchy:
 * - Singleton = 1 (longest lived)
 * - Scoped = 2 (medium lived)
 * - Request = 3 (shortest lived)
 *
 * Lower numbers indicate longer lifetimes. An adapter can only depend on
 * adapters with the same or lower (longer-lived) level.
 *
 * @typeParam L - The Lifetime literal type ('singleton' | 'scoped' | 'request')
 *
 * @returns The numeric level: 1, 2, or 3
 *
 * @remarks
 * This type exists purely at the compile-time level. The numeric values
 * are phantom types and do not exist at runtime. They enable type-level
 * comparison of lifetimes for captive dependency validation.
 *
 * @see {@link Lifetime} - The lifetime string literal type from @hex-di/graph
 * @see {@link ValidateCaptiveDependency} - Uses this type for validation
 *
 * @example
 * ```typescript
 * type SingletonLevel = LifetimeLevel<'singleton'>; // 1
 * type ScopedLevel = LifetimeLevel<'scoped'>;       // 2
 * type RequestLevel = LifetimeLevel<'request'>;    // 3
 * ```
 */
export type LifetimeLevel<L extends Lifetime> = L extends "singleton"
  ? 1
  : L extends "scoped"
    ? 2
    : L extends "request"
      ? 3
      : never;

// =============================================================================
// Type-Level Comparison Utilities
// =============================================================================

/**
 * Type-level "greater than" comparison for lifetime levels.
 *
 * Returns true if level A is greater than level B.
 * Greater level means shorter lifetime, which can cause captive dependency
 * when a longer-lived adapter depends on a shorter-lived one.
 *
 * @typeParam A - First lifetime level (1, 2, or 3)
 * @typeParam B - Second lifetime level (1, 2, or 3)
 *
 * @returns `true` if A > B, `false` otherwise
 *
 * @internal
 */
type IsGreaterThan<A extends number, B extends number> = A extends 1
  ? false // 1 is never greater than anything (lowest)
  : A extends 2
    ? B extends 1
      ? true // 2 > 1
      : false // 2 <= 2, 2 <= 3
    : A extends 3
      ? B extends 1 | 2
        ? true // 3 > 1, 3 > 2
        : false // 3 <= 3
      : false;

/**
 * Checks if the dependency lifetime level is greater (shorter-lived) than
 * the dependent's lifetime level, which would create a captive dependency.
 *
 * @typeParam DependentLevel - The lifetime level of the adapter that has the dependency
 * @typeParam DependencyLevel - The lifetime level of the required adapter
 *
 * @returns `true` if this creates a captive dependency, `false` otherwise
 *
 * @internal
 */
type IsCaptive<
  DependentLevel extends number,
  DependencyLevel extends number,
> = IsGreaterThan<DependencyLevel, DependentLevel>;

// =============================================================================
// Lifetime Name Extraction for Error Messages
// =============================================================================

/**
 * Converts a lifetime level back to its string name for error messages.
 *
 * @typeParam Level - The numeric lifetime level (1, 2, or 3)
 *
 * @returns The lifetime name as a string literal
 *
 * @internal
 */
type LifetimeName<Level extends number> = Level extends 1
  ? "Singleton"
  : Level extends 2
    ? "Scoped"
    : Level extends 3
      ? "Request"
      : "Unknown";

// =============================================================================
// CaptiveDependencyError Type
// =============================================================================

/**
 * A branded error type that produces a readable compile-time error message
 * when a captive dependency is detected.
 *
 * This type is returned by `ValidateCaptiveDependency` when an adapter
 * attempts to depend on an adapter with a shorter lifetime. The error
 * message clearly explains which adapter, which dependency, and their
 * respective lifetimes to help developers fix the issue.
 *
 * @typeParam TMessage - The descriptive error message as a string literal type
 *
 * @returns A branded error type with:
 * - `__errorBrand: 'CaptiveDependencyError'` - For type discrimination
 * - `__message: TMessage` - The descriptive error message
 *
 * @remarks
 * - The error brand ensures this type cannot be confused with valid results
 * - The message is visible in IDE tooltips when hovering over type errors
 * - This type has zero runtime cost - it exists only at the type level
 *
 * @see {@link ValidateCaptiveDependency} - The type that produces this error
 * @see {@link MissingDependencyError} - Similar error pattern in @hex-di/graph
 *
 * @example
 * ```typescript
 * type Error = CaptiveDependencyError<"Singleton 'UserService' cannot depend on Scoped 'Database'">;
 * // {
 * //   __errorBrand: 'CaptiveDependencyError';
 * //   __message: "Singleton 'UserService' cannot depend on Scoped 'Database'";
 * // }
 * ```
 */
export type CaptiveDependencyError<TMessage extends string> = {
  readonly __errorBrand: "CaptiveDependencyError";
  readonly __message: TMessage;
};

// =============================================================================
// ValidateCaptiveDependency Type
// =============================================================================

/**
 * Validates that an adapter does not have a captive dependency on another adapter.
 *
 * This type performs compile-time validation by comparing the lifetime levels
 * of the dependent adapter (TAdapter) and its required adapter (TRequiredAdapter).
 *
 * **Valid scenarios (returns TAdapter):**
 * - Singleton depending on Singleton (level 1 <= 1)
 * - Scoped depending on Singleton (level 2 > 1, dependency has lower level - OK)
 * - Scoped depending on Scoped (level 2 <= 2)
 * - Request depending on anything (level 3 >= all, dependency has lower/equal level - OK)
 *
 * **Invalid scenarios (returns CaptiveDependencyError):**
 * - Singleton depending on Scoped (level 1 < 2, dependency has higher level - CAPTIVE!)
 * - Singleton depending on Request (level 1 < 3, dependency has higher level - CAPTIVE!)
 * - Scoped depending on Request (level 2 < 3, dependency has higher level - CAPTIVE!)
 *
 * @typeParam TAdapter - The adapter type that has the dependency
 * @typeParam TRequiredAdapter - The adapter type being depended upon
 *
 * @returns
 * - `TAdapter` if the dependency is valid (no captive dependency)
 * - `CaptiveDependencyError<...>` if the dependency creates a captive dependency
 *
 * @remarks
 * - All validation is performed at compile-time with zero runtime cost
 * - Error messages include the adapter names and their lifetime scopes
 * - This type is designed to be used in graph construction validation
 *
 * @see {@link LifetimeLevel} - Maps lifetime strings to numeric levels
 * @see {@link CaptiveDependencyError} - The error type returned on violation
 *
 * @example Valid dependency - singleton on singleton
 * ```typescript
 * type Result = ValidateCaptiveDependency<
 *   typeof UserServiceSingletonAdapter, // singleton
 *   typeof LoggerSingletonAdapter        // singleton
 * >;
 * // Result = typeof UserServiceSingletonAdapter (valid)
 * ```
 *
 * @example Invalid captive dependency - singleton on scoped
 * ```typescript
 * type Result = ValidateCaptiveDependency<
 *   typeof UserServiceSingletonAdapter, // singleton
 *   typeof DatabaseScopedAdapter         // scoped
 * >;
 * // Result = CaptiveDependencyError<"Singleton 'UserService' cannot depend on Scoped 'Database'">
 * ```
 */
export type ValidateCaptiveDependency<
  TAdapter extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
  TRequiredAdapter extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
> = IsCaptive<
  LifetimeLevel<InferAdapterLifetime<TAdapter>>,
  LifetimeLevel<InferAdapterLifetime<TRequiredAdapter>>
> extends true
  ? CaptiveDependencyError<
      `${LifetimeName<LifetimeLevel<InferAdapterLifetime<TAdapter>>>} '${InferPortName<InferAdapterProvides<TAdapter>>}' cannot depend on ${LifetimeName<LifetimeLevel<InferAdapterLifetime<TRequiredAdapter>>>} '${InferPortName<InferAdapterProvides<TRequiredAdapter>>}'`
    >
  : TAdapter;

// =============================================================================
// Batch Validation Type
// =============================================================================

/**
 * Validates all dependencies of an adapter against captive dependency rules.
 *
 * This type is designed to be used when an adapter has multiple dependencies.
 * It returns the adapter if ALL dependencies are valid, or the first
 * CaptiveDependencyError encountered.
 *
 * @typeParam TAdapter - The adapter type to validate
 * @typeParam TAdapters - A union or tuple of all adapters that provide the dependencies
 *
 * @returns
 * - `TAdapter` if all dependencies are valid
 * - `CaptiveDependencyError<...>` if any dependency creates a captive dependency
 *
 * @remarks
 * This type is intended for integration with the Graph validation system.
 * The actual implementation may vary based on how the graph stores adapter
 * information.
 *
 * @see {@link ValidateCaptiveDependency} - Single dependency validation
 */
export type ValidateAllDependencies<
  TAdapter extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
  TAdapters extends readonly Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>[],
> = TAdapters extends readonly [
  infer First extends Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>,
  ...infer Rest extends readonly Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime>[],
]
  ? ValidateCaptiveDependency<TAdapter, First> extends TAdapter
    ? ValidateAllDependencies<TAdapter, Rest>
    : ValidateCaptiveDependency<TAdapter, First>
  : TAdapter;

// =============================================================================
// Integration Documentation
// =============================================================================

/**
 * ## Integration with @hex-di/graph
 *
 * Captive dependency validation should ideally occur during graph construction
 * in the `GraphBuilder.provide()` method. This provides immediate feedback
 * when an invalid dependency is added.
 *
 * ### Option 1: Validation in @hex-di/graph (Recommended)
 *
 * The `GraphBuilder.provide()` method could be enhanced to check captive
 * dependencies. When a new adapter is added, validate its dependencies
 * against existing adapters in the graph:
 *
 * ```typescript
 * // In @hex-di/graph GraphBuilder
 * provide<A extends Adapter<...>>(adapter: A): ProvideResult<...> {
 *   // Existing duplicate check...
 *
 *   // NEW: Captive dependency check
 *   type CaptiveCheck = ValidateCaptiveDependenciesInGraph<A, ExistingAdapters>;
 *   // Return error type if captive dependency detected
 * }
 * ```
 *
 * ### Option 2: Validation in @hex-di/runtime
 *
 * Alternatively, captive dependency validation can be performed when
 * creating a container from a graph. This is less ideal as the error
 * appears later in the workflow:
 *
 * ```typescript
 * // In @hex-di/runtime createContainer
 * createContainer<TProvides>(graph: Graph<TProvides>): ValidatedContainer<TProvides> {
 *   // Validate all adapter dependencies...
 * }
 * ```
 *
 * ### Current Implementation Status
 *
 * This module provides the foundational types for captive dependency detection:
 * - `LifetimeLevel<L>` - Maps lifetime strings to numeric levels
 * - `ValidateCaptiveDependency<A, B>` - Validates a single dependency relationship
 * - `CaptiveDependencyError<M>` - Branded error type with descriptive message
 * - `ValidateAllDependencies<A, As>` - Validates multiple dependencies
 *
 * Integration with GraphBuilder requires modifications to @hex-di/graph.
 * The types are exported from @hex-di/runtime for use in either package.
 *
 * ### Limitation Note
 *
 * Full integration requires knowing WHICH adapter provides each required port.
 * The current Graph/GraphBuilder tracks ports but the adapter lookup for
 * lifetime checking requires additional type-level machinery or runtime support.
 *
 * A practical integration approach:
 * 1. Export these types from @hex-di/runtime
 * 2. @hex-di/graph can import and use them in GraphBuilder.provide()
 * 3. The provide() method would need to track adapters (not just ports) to
 *    enable lifetime comparison
 */
