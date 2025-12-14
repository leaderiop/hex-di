/**
 * Tests for @hex-di/runtime public API exports.
 *
 * This test file verifies that:
 * 1. All public API exports are accessible
 * 2. Internal implementation classes are NOT exported
 * 3. Exports have the expected types
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import * as RuntimeExports from "../src/index.js";

// =============================================================================
// Public API Export Tests
// =============================================================================

describe("@hex-di/runtime exports", () => {
  describe("createContainer function", () => {
    it("should export createContainer as a function", () => {
      expect(typeof RuntimeExports.createContainer).toBe("function");
    });
  });

  describe("Error classes", () => {
    it("should export ContainerError as a class", () => {
      expect(RuntimeExports.ContainerError).toBeDefined();
      expect(typeof RuntimeExports.ContainerError).toBe("function");
    });

    it("should export CircularDependencyError as a class", () => {
      expect(RuntimeExports.CircularDependencyError).toBeDefined();
      expect(typeof RuntimeExports.CircularDependencyError).toBe("function");
    });

    it("should export FactoryError as a class", () => {
      expect(RuntimeExports.FactoryError).toBeDefined();
      expect(typeof RuntimeExports.FactoryError).toBe("function");
    });

    it("should export DisposedScopeError as a class", () => {
      expect(RuntimeExports.DisposedScopeError).toBeDefined();
      expect(typeof RuntimeExports.DisposedScopeError).toBe("function");
    });

    it("should export ScopeRequiredError as a class", () => {
      expect(RuntimeExports.ScopeRequiredError).toBeDefined();
      expect(typeof RuntimeExports.ScopeRequiredError).toBe("function");
    });

    it("should have CircularDependencyError extend ContainerError", () => {
      const error = new RuntimeExports.CircularDependencyError(["A", "B", "A"]);
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should have FactoryError extend ContainerError", () => {
      const error = new RuntimeExports.FactoryError("TestPort", new Error("test"));
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should have DisposedScopeError extend ContainerError", () => {
      const error = new RuntimeExports.DisposedScopeError("TestPort");
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should have ScopeRequiredError extend ContainerError", () => {
      const error = new RuntimeExports.ScopeRequiredError("TestPort");
      expect(error).toBeInstanceOf(RuntimeExports.ContainerError);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("Internal classes should NOT be exported", () => {
    it("should NOT export MemoMap", () => {
      expect((RuntimeExports as Record<string, unknown>)["MemoMap"]).toBeUndefined();
    });

    it("should NOT export ResolutionContext", () => {
      expect(
        (RuntimeExports as Record<string, unknown>)["ResolutionContext"]
      ).toBeUndefined();
    });

    it("should NOT export ContainerImpl", () => {
      expect(
        (RuntimeExports as Record<string, unknown>)["ContainerImpl"]
      ).toBeUndefined();
    });

    it("should NOT export ScopeImpl", () => {
      expect((RuntimeExports as Record<string, unknown>)["ScopeImpl"]).toBeUndefined();
    });
  });

  describe("Expected export count", () => {
    it("should have the expected runtime exports", () => {
      // List of expected runtime value exports (not type-only exports)
      const expectedRuntimeExports = [
        "createContainer",
        "createInspector",
        "ContainerError",
        "CircularDependencyError",
        "FactoryError",
        "DisposedScopeError",
        "ScopeRequiredError",
        "INTERNAL_ACCESS",
        "TRACING_ACCESS",
      ];

      // Verify all expected exports exist
      for (const exportName of expectedRuntimeExports) {
        expect(
          RuntimeExports[exportName as keyof typeof RuntimeExports],
          `Expected export '${exportName}' to exist`
        ).toBeDefined();
      }

      // Get all actual runtime exports (excluding type-only exports)
      const actualExports = Object.keys(RuntimeExports);

      // Verify we have exactly the expected number of runtime exports
      expect(actualExports.sort()).toEqual(expectedRuntimeExports.sort());
    });
  });
});

// =============================================================================
// Type Export Tests
// =============================================================================

describe("Type exports (compile-time verification)", () => {
  /**
   * These tests verify that type exports are accessible at the type level.
   * They use TypeScript's type system to verify exports exist.
   * If any type is not exported, these will cause compile errors.
   */

  it("should export Container type", () => {
    // Type-level verification - this compiles only if Container is exported
    type _Container = RuntimeExports.Container<never>;
    expect(true).toBe(true);
  });

  it("should export Scope type", () => {
    // Type-level verification - this compiles only if Scope is exported
    type _Scope = RuntimeExports.Scope<never>;
    expect(true).toBe(true);
  });

  it("should export InferContainerProvides type", () => {
    // Type-level verification
    type _InferContainerProvides = RuntimeExports.InferContainerProvides<never>;
    expect(true).toBe(true);
  });

  it("should export InferScopeProvides type", () => {
    // Type-level verification
    type _InferScopeProvides = RuntimeExports.InferScopeProvides<never>;
    expect(true).toBe(true);
  });

  it("should export IsResolvable type", () => {
    // Type-level verification
    type _IsResolvable = RuntimeExports.IsResolvable<never, never>;
    expect(true).toBe(true);
  });

  it("should export ServiceFromContainer type", () => {
    // Type-level verification
    type _ServiceFromContainer = RuntimeExports.ServiceFromContainer<never, never>;
    expect(true).toBe(true);
  });

  it("should export LifetimeLevel type", () => {
    // Type-level verification
    type _LifetimeLevel = RuntimeExports.LifetimeLevel<"singleton">;
    expect(true).toBe(true);
  });

  it("should export CaptiveDependencyError type", () => {
    // Type-level verification
    type _CaptiveDependencyError = RuntimeExports.CaptiveDependencyError<"test">;
    expect(true).toBe(true);
  });

  it("should export ValidateCaptiveDependency type", () => {
    // Type-level verification - uses 'any' to bypass complex type requirements
    type _ValidateCaptiveDependency = RuntimeExports.ValidateCaptiveDependency<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >;
    expect(true).toBe(true);
  });

  it("should export ValidateAllDependencies type", () => {
    // Type-level verification - uses 'any' to bypass complex type requirements
    type _ValidateAllDependencies = RuntimeExports.ValidateAllDependencies<
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
      []
    >;
    expect(true).toBe(true);
  });

  // Re-exports from @hex-di/ports
  it("should re-export Port type from @hex-di/ports", () => {
    type _Port = RuntimeExports.Port<string, "test">;
    expect(true).toBe(true);
  });

  it("should re-export InferService type from @hex-di/ports", () => {
    type _InferService = RuntimeExports.InferService<never>;
    expect(true).toBe(true);
  });

  it("should re-export InferPortName type from @hex-di/ports", () => {
    type _InferPortName = RuntimeExports.InferPortName<never>;
    expect(true).toBe(true);
  });

  // Re-exports from @hex-di/graph
  it("should re-export Graph type from @hex-di/graph", () => {
    type _Graph = RuntimeExports.Graph<never>;
    expect(true).toBe(true);
  });

  it("should re-export Adapter type from @hex-di/graph", () => {
    type _Adapter = RuntimeExports.Adapter<never, never, "singleton">;
    expect(true).toBe(true);
  });

  it("should re-export Lifetime type from @hex-di/graph", () => {
    type _Lifetime = RuntimeExports.Lifetime;
    expect(true).toBe(true);
  });

  it("should re-export InferAdapterProvides type from @hex-di/graph", () => {
    type _InferAdapterProvides = RuntimeExports.InferAdapterProvides<never>;
    expect(true).toBe(true);
  });

  it("should re-export InferAdapterRequires type from @hex-di/graph", () => {
    type _InferAdapterRequires = RuntimeExports.InferAdapterRequires<never>;
    expect(true).toBe(true);
  });

  it("should re-export InferAdapterLifetime type from @hex-di/graph", () => {
    type _InferAdapterLifetime = RuntimeExports.InferAdapterLifetime<never>;
    expect(true).toBe(true);
  });

  it("should re-export ResolvedDeps type from @hex-di/graph", () => {
    type _ResolvedDeps = RuntimeExports.ResolvedDeps<never>;
    expect(true).toBe(true);
  });
});
