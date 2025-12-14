/**
 * ResolutionContext - Internal class for tracking resolution path.
 *
 * This class tracks the current resolution path during dependency resolution
 * and detects circular dependencies. It is an internal implementation detail
 * and should NOT be exported from the public API.
 *
 * @remarks
 * - Uses Set<string> for O(1) cycle detection lookup
 * - Uses array for maintaining order for error messages
 * - Thread-safe within a single synchronous resolution call
 *
 * @internal
 */

import { CircularDependencyError } from "./errors.js";

/**
 * Internal class for tracking the resolution path and detecting circular dependencies.
 *
 * The ResolutionContext maintains both a Set and an Array of port names:
 * - Set provides O(1) lookup for cycle detection
 * - Array preserves insertion order for error message formatting
 *
 * @internal
 */
export class ResolutionContext {
  /**
   * Set of port names currently in the resolution path for O(1) cycle detection.
   */
  private readonly path: Set<string> = new Set();

  /**
   * Array of port names in resolution order for error message formatting.
   */
  private readonly pathArray: string[] = [];

  /**
   * Enters a port into the resolution path.
   *
   * This method should be called at the start of resolving each port.
   * If the port is already in the current resolution path, a circular
   * dependency is detected and CircularDependencyError is thrown.
   *
   * @param portName - The name of the port being resolved
   * @throws CircularDependencyError if the port is already in the resolution path
   */
  enter(portName: string): void {
    if (this.path.has(portName)) {
      // Circular dependency detected - build the full chain for the error
      const chain = [...this.pathArray, portName];
      throw new CircularDependencyError(chain);
    }

    this.path.add(portName);
    this.pathArray.push(portName);
  }

  /**
   * Exits a port from the resolution path.
   *
   * This method should be called after successfully resolving a port
   * and all its dependencies. It removes the port from tracking,
   * allowing it to be resolved again in a different resolution chain.
   *
   * @param portName - The name of the port that finished resolving
   */
  exit(portName: string): void {
    this.path.delete(portName);
    this.pathArray.pop();
  }

  /**
   * Returns a copy of the current resolution path.
   *
   * The returned array is a defensive copy that can be safely used
   * for error messages without affecting the internal state.
   *
   * @returns A readonly copy of the current resolution path as an array of port names
   */
  getPath(): readonly string[] {
    return [...this.pathArray];
  }
}
