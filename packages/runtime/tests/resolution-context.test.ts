/**
 * ResolutionContext unit tests.
 *
 * Tests for the internal ResolutionContext class that tracks the resolution path
 * during dependency resolution and detects circular dependencies.
 *
 * These tests verify:
 * 1. Path starts empty for new resolution
 * 2. Path tracks ports during resolution chain
 * 3. Circular detection throws CircularDependencyError
 * 4. Path is cleared after successful resolution (via exit)
 * 5. Error includes full dependency chain
 */

import { describe, test, expect } from "vitest";
import { ResolutionContext } from "../src/resolution-context.js";
import { CircularDependencyError } from "../src/errors.js";

// =============================================================================
// Initial State Tests
// =============================================================================

describe("ResolutionContext initial state", () => {
  test("path starts empty for new context", () => {
    const context = new ResolutionContext();

    const path = context.getPath();

    expect(path).toEqual([]);
    expect(path).toHaveLength(0);
  });
});

// =============================================================================
// Path Tracking Tests
// =============================================================================

describe("ResolutionContext.enter and path tracking", () => {
  test("path tracks ports during resolution chain", () => {
    const context = new ResolutionContext();

    context.enter("ServiceA");
    expect(context.getPath()).toEqual(["ServiceA"]);

    context.enter("ServiceB");
    expect(context.getPath()).toEqual(["ServiceA", "ServiceB"]);

    context.enter("ServiceC");
    expect(context.getPath()).toEqual(["ServiceA", "ServiceB", "ServiceC"]);
  });

  test("circular detection throws CircularDependencyError", () => {
    const context = new ResolutionContext();

    context.enter("ServiceA");
    context.enter("ServiceB");

    expect(() => context.enter("ServiceA")).toThrow(CircularDependencyError);
  });

  test("error includes full dependency chain when circular detected", () => {
    const context = new ResolutionContext();

    context.enter("UserService");
    context.enter("AuthService");
    context.enter("SessionService");

    try {
      context.enter("UserService");
      expect.fail("Expected CircularDependencyError to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CircularDependencyError);
      const circularError = error as CircularDependencyError;

      // Chain should show: UserService -> AuthService -> SessionService -> UserService
      expect(circularError.dependencyChain).toEqual([
        "UserService",
        "AuthService",
        "SessionService",
        "UserService",
      ]);
    }
  });
});

// =============================================================================
// Exit and Path Clearing Tests
// =============================================================================

describe("ResolutionContext.exit", () => {
  test("path is cleared after successful resolution via exit", () => {
    const context = new ResolutionContext();

    context.enter("ServiceA");
    context.enter("ServiceB");
    context.enter("ServiceC");

    expect(context.getPath()).toEqual(["ServiceA", "ServiceB", "ServiceC"]);

    context.exit("ServiceC");
    expect(context.getPath()).toEqual(["ServiceA", "ServiceB"]);

    context.exit("ServiceB");
    expect(context.getPath()).toEqual(["ServiceA"]);

    context.exit("ServiceA");
    expect(context.getPath()).toEqual([]);
  });

  test("exit removes port from tracking allowing re-entry", () => {
    const context = new ResolutionContext();

    // First resolution chain
    context.enter("ServiceA");
    context.exit("ServiceA");

    // Should be able to enter ServiceA again after exiting
    expect(() => context.enter("ServiceA")).not.toThrow();
    expect(context.getPath()).toEqual(["ServiceA"]);
  });
});

// =============================================================================
// getPath Immutability Tests
// =============================================================================

describe("ResolutionContext.getPath", () => {
  test("returns a copy of the path array", () => {
    const context = new ResolutionContext();

    context.enter("ServiceA");
    context.enter("ServiceB");

    const path1 = context.getPath();
    const path2 = context.getPath();

    // Should return different array instances
    expect(path1).not.toBe(path2);

    // But with same contents
    expect(path1).toEqual(path2);
    expect(path1).toEqual(["ServiceA", "ServiceB"]);
  });
});
