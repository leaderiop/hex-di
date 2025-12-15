/**
 * Graph assertion utilities for testing HexDI dependency graphs.
 *
 * These functions provide runtime validation for dependency graphs,
 * allowing tests to verify graph completeness, port presence, and
 * adapter lifetime configuration.
 *
 * @packageDocumentation
 */

import type { Port, InferPortName } from "@hex-di/ports";
import type { Graph, Adapter, Lifetime } from "@hex-di/graph";

// Type augmentation for V8-specific Error.captureStackTrace
declare global {
  interface ErrorConstructor {
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
  }
}

// =============================================================================
// GraphAssertionError Class
// =============================================================================

/**
 * Custom error class for graph assertion failures.
 *
 * This error is thrown by all graph assertion functions when validation fails.
 * It provides structured information about the failure, including relevant
 * port names and a stable error code for programmatic handling.
 *
 * @remarks
 * - The error code is stable and can be used for programmatic error handling
 * - The `portNames` property contains the relevant port names for the assertion
 * - This class follows the error pattern from `@hex-di/runtime`
 *
 * @example Catching assertion errors
 * ```typescript
 * try {
 *   assertGraphComplete(graph);
 * } catch (error) {
 *   if (error instanceof GraphAssertionError) {
 *     console.log(`Failed ports: ${error.portNames.join(', ')}`);
 *     console.log(`Error code: ${error.code}`);
 *   }
 * }
 * ```
 */
export class GraphAssertionError extends Error {
  /**
   * Stable error code for programmatic error handling.
   */
  readonly code = "GRAPH_ASSERTION_FAILED" as const;

  /**
   * The port names relevant to this assertion failure.
   * For missing dependencies, this contains the missing port names.
   * For port presence checks, this contains the checked port name.
   * For lifetime checks, this contains the port with the lifetime mismatch.
   */
  readonly portNames: readonly string[];

  /**
   * Creates a new GraphAssertionError.
   *
   * @param message - The error message describing the assertion failure
   * @param portNames - Array of port names relevant to the failure
   */
  constructor(message: string, portNames: readonly string[]) {
    super(message);

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Store a defensive copy of the port names
    this.portNames = Object.freeze([...portNames]);

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
    return "GraphAssertionError";
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the port name from a port token.
 *
 * @param port - The port token to get the name from
 * @returns The port name string
 *
 * @internal
 */
function getPortName(port: Port<unknown, string>): string {
  return port.__portName;
}

/**
 * Finds an adapter in the graph that provides the given port.
 *
 * @param graph - The graph to search in
 * @param port - The port to find an adapter for
 * @returns The adapter if found, undefined otherwise
 *
 * @internal
 */
function findAdapterForPort(
  graph: Graph<Port<unknown, string>>,
  port: Port<unknown, string>
): Adapter<Port<unknown, string>, Port<unknown, string> | never, Lifetime> | undefined {
  const portName = getPortName(port);
  return graph.adapters.find((adapter) => getPortName(adapter.provides) === portName);
}

/**
 * Gets the set of all provided port names in the graph.
 *
 * @param graph - The graph to analyze
 * @returns Set of port names that have providers
 *
 * @internal
 */
function getProvidedPortNames(graph: Graph<Port<unknown, string>>): Set<string> {
  const provided = new Set<string>();
  for (const adapter of graph.adapters) {
    provided.add(getPortName(adapter.provides));
  }
  return provided;
}

/**
 * Gets the set of all required port names in the graph.
 *
 * @param graph - The graph to analyze
 * @returns Set of port names that are required by adapters
 *
 * @internal
 */
function getRequiredPortNames(graph: Graph<Port<unknown, string>>): Set<string> {
  const required = new Set<string>();
  for (const adapter of graph.adapters) {
    for (const requiredPort of adapter.requires) {
      required.add(getPortName(requiredPort));
    }
  }
  return required;
}

// =============================================================================
// Assertion Functions
// =============================================================================

/**
 * Asserts that all dependencies in the graph are satisfied.
 *
 * This function performs runtime validation that all ports required by adapters
 * in the graph have corresponding providers. If any dependencies are missing,
 * a {@link GraphAssertionError} is thrown with a descriptive message listing
 * all missing port names.
 *
 * @param graph - The dependency graph to validate
 *
 * @throws {@link GraphAssertionError} If the graph has missing dependencies.
 *   The error message includes all missing port names.
 *
 * @remarks
 * - This is a runtime check, complementing compile-time validation
 * - Use this in tests to verify graph configuration is correct
 * - The error message format is: `"Graph incomplete. Missing ports: Logger, Database"`
 *
 * @example
 * ```typescript
 * import { assertGraphComplete } from '@hex-di/testing';
 *
 * describe('Application Graph', () => {
 *   it('should have all dependencies satisfied', () => {
 *     const graph = GraphBuilder.create()
 *       .provide(LoggerAdapter)
 *       .provide(DatabaseAdapter)
 *       .provide(UserServiceAdapter)
 *       .build();
 *
 *     assertGraphComplete(graph); // Throws if dependencies missing
 *   });
 * });
 * ```
 */
export function assertGraphComplete(graph: Graph<Port<unknown, string>>): void {
  const providedPorts = getProvidedPortNames(graph);
  const requiredPorts = getRequiredPortNames(graph);

  const missingPorts: string[] = [];
  for (const required of requiredPorts) {
    if (!providedPorts.has(required)) {
      missingPorts.push(required);
    }
  }

  if (missingPorts.length > 0) {
    // Sort for deterministic error messages
    missingPorts.sort();
    throw new GraphAssertionError(
      `Graph incomplete. Missing ports: ${missingPorts.join(", ")}`,
      missingPorts
    );
  }
}

/**
 * Asserts that a specific port has an adapter in the graph.
 *
 * This function checks if the given port is provided by any adapter in the graph.
 * If the port is not provided, a {@link GraphAssertionError} is thrown.
 *
 * @typeParam P - The port type being checked
 *
 * @param graph - The dependency graph to check
 * @param port - The port to verify is provided
 *
 * @throws {@link GraphAssertionError} If the port is not provided in the graph.
 *   Error message format: `"Port 'Logger' is not provided in graph"`
 *
 * @example
 * ```typescript
 * import { assertPortProvided } from '@hex-di/testing';
 *
 * describe('Graph Configuration', () => {
 *   it('should provide a logger', () => {
 *     const graph = GraphBuilder.create()
 *       .provide(LoggerAdapter)
 *       .build();
 *
 *     assertPortProvided(graph, LoggerPort); // Passes
 *     assertPortProvided(graph, DatabasePort); // Throws
 *   });
 * });
 * ```
 */
export function assertPortProvided<P extends Port<unknown, string>>(
  graph: Graph<Port<unknown, string>>,
  port: P
): void {
  const portName = getPortName(port);
  const adapter = findAdapterForPort(graph, port);

  if (!adapter) {
    throw new GraphAssertionError(
      `Port '${portName}' is not provided in graph`,
      [portName]
    );
  }
}

/**
 * Asserts that an adapter for a port has the expected lifetime.
 *
 * This function validates that the adapter providing the given port has the
 * expected lifetime configuration. It first checks that the port is provided,
 * then verifies the lifetime matches.
 *
 * @typeParam P - The port type being checked
 *
 * @param graph - The dependency graph to check
 * @param port - The port whose adapter lifetime to validate
 * @param expectedLifetime - The expected lifetime value ('singleton', 'scoped', or 'request')
 *
 * @throws {@link GraphAssertionError} If the port is not in the graph or if the
 *   lifetime does not match the expected value.
 *   - If port missing: `"Port 'Logger' is not provided in graph"`
 *   - If lifetime mismatch: `"Port 'Logger' has lifetime 'request', expected 'singleton'"`
 *
 * @example
 * ```typescript
 * import { assertLifetime } from '@hex-di/testing';
 *
 * describe('Adapter Lifetimes', () => {
 *   it('should have correct lifetimes configured', () => {
 *     const graph = GraphBuilder.create()
 *       .provide(LoggerAdapter) // singleton
 *       .provide(DatabaseAdapter) // scoped
 *       .build();
 *
 *     assertLifetime(graph, LoggerPort, 'singleton'); // Passes
 *     assertLifetime(graph, DatabasePort, 'scoped'); // Passes
 *     assertLifetime(graph, LoggerPort, 'request'); // Throws
 *   });
 * });
 * ```
 */
export function assertLifetime<P extends Port<unknown, string>>(
  graph: Graph<Port<unknown, string>>,
  port: P,
  expectedLifetime: Lifetime
): void {
  const portName = getPortName(port);
  const adapter = findAdapterForPort(graph, port);

  if (!adapter) {
    throw new GraphAssertionError(
      `Port '${portName}' is not provided in graph`,
      [portName]
    );
  }

  if (adapter.lifetime !== expectedLifetime) {
    throw new GraphAssertionError(
      `Port '${portName}' has lifetime '${adapter.lifetime}', expected '${expectedLifetime}'`,
      [portName]
    );
  }
}
