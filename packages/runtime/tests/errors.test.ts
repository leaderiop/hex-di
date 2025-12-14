/**
 * Unit tests for error hierarchy classes.
 *
 * These tests verify:
 * 1. ContainerError base class properties (code, isProgrammingError, message)
 * 2. CircularDependencyError with dependency chain
 * 3. FactoryError wrapping original exception with cause
 * 4. DisposedScopeError with port context
 * 5. ScopeRequiredError with port context
 * 6. Error inheritance hierarchy (instanceof checks)
 */

import { describe, expect, it } from "vitest";
import {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
} from "../src/index.js";

// =============================================================================
// ContainerError Base Class Tests
// =============================================================================

describe("ContainerError base class", () => {
  it("has code and isProgrammingError properties on derived classes", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);

    expect(error.code).toBe("CIRCULAR_DEPENDENCY");
    expect(error.isProgrammingError).toBe(true);
    expect(error.message).toContain("A");
  });

  it("extends Error and has proper name", () => {
    const error = new CircularDependencyError(["A", "B", "A"]);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ContainerError);
    expect(error.name).toBe("CircularDependencyError");
  });
});

// =============================================================================
// CircularDependencyError Tests
// =============================================================================

describe("CircularDependencyError", () => {
  it("has correct code and isProgrammingError", () => {
    const error = new CircularDependencyError(["ServiceA", "ServiceB", "ServiceA"]);

    expect(error.code).toBe("CIRCULAR_DEPENDENCY");
    expect(error.isProgrammingError).toBe(true);
  });

  it("stores dependency chain as readonly array", () => {
    const chain = ["Logger", "Database", "UserService", "Logger"];
    const error = new CircularDependencyError(chain);

    expect(error.dependencyChain).toEqual(chain);
    expect(error.dependencyChain).not.toBe(chain); // Should be a copy
  });

  it("includes formatted dependency chain in message", () => {
    const error = new CircularDependencyError(["A", "B", "C", "A"]);

    expect(error.message).toContain("A -> B -> C -> A");
  });
});

// =============================================================================
// FactoryError Tests
// =============================================================================

describe("FactoryError", () => {
  it("has correct code and isProgrammingError", () => {
    const cause = new Error("Database connection failed");
    const error = new FactoryError("DatabasePort", cause);

    expect(error.code).toBe("FACTORY_FAILED");
    expect(error.isProgrammingError).toBe(false);
  });

  it("stores port name and original cause", () => {
    const cause = new Error("Connection timeout");
    const error = new FactoryError("LoggerPort", cause);

    expect(error.portName).toBe("LoggerPort");
    expect(error.cause).toBe(cause);
  });

  it("includes port name and original error message in message", () => {
    const cause = new Error("Failed to initialize");
    const error = new FactoryError("ConfigPort", cause);

    expect(error.message).toContain("ConfigPort");
    expect(error.message).toContain("Failed to initialize");
  });

  it("handles non-Error cause", () => {
    const cause = "string error";
    const error = new FactoryError("TestPort", cause);

    expect(error.cause).toBe(cause);
    expect(error.message).toContain("TestPort");
  });
});

// =============================================================================
// DisposedScopeError Tests
// =============================================================================

describe("DisposedScopeError", () => {
  it("has correct code and isProgrammingError", () => {
    const error = new DisposedScopeError("UserServicePort");

    expect(error.code).toBe("DISPOSED_SCOPE");
    expect(error.isProgrammingError).toBe(true);
  });

  it("stores port name", () => {
    const error = new DisposedScopeError("LoggerPort");

    expect(error.portName).toBe("LoggerPort");
  });

  it("message indicates resolve attempted on disposed scope", () => {
    const error = new DisposedScopeError("DatabasePort");

    expect(error.message).toContain("DatabasePort");
    expect(error.message.toLowerCase()).toContain("disposed");
  });
});

// =============================================================================
// ScopeRequiredError Tests
// =============================================================================

describe("ScopeRequiredError", () => {
  it("has correct code and isProgrammingError", () => {
    const error = new ScopeRequiredError("SessionPort");

    expect(error.code).toBe("SCOPE_REQUIRED");
    expect(error.isProgrammingError).toBe(true);
  });

  it("stores port name", () => {
    const error = new ScopeRequiredError("RequestContextPort");

    expect(error.portName).toBe("RequestContextPort");
  });

  it("message indicates scoped port resolved from root container", () => {
    const error = new ScopeRequiredError("UserContextPort");

    expect(error.message).toContain("UserContextPort");
    expect(error.message.toLowerCase()).toContain("scope");
  });
});

// =============================================================================
// Error Inheritance Hierarchy Tests
// =============================================================================

describe("Error inheritance hierarchy", () => {
  it("all error classes extend ContainerError", () => {
    const circularError = new CircularDependencyError(["A", "B"]);
    const factoryError = new FactoryError("Port", new Error());
    const disposedError = new DisposedScopeError("Port");
    const scopeRequiredError = new ScopeRequiredError("Port");

    expect(circularError).toBeInstanceOf(ContainerError);
    expect(factoryError).toBeInstanceOf(ContainerError);
    expect(disposedError).toBeInstanceOf(ContainerError);
    expect(scopeRequiredError).toBeInstanceOf(ContainerError);
  });

  it("all error classes extend Error", () => {
    const circularError = new CircularDependencyError(["A", "B"]);
    const factoryError = new FactoryError("Port", new Error());
    const disposedError = new DisposedScopeError("Port");
    const scopeRequiredError = new ScopeRequiredError("Port");

    expect(circularError).toBeInstanceOf(Error);
    expect(factoryError).toBeInstanceOf(Error);
    expect(disposedError).toBeInstanceOf(Error);
    expect(scopeRequiredError).toBeInstanceOf(Error);
  });

  it("each error class has correct name getter", () => {
    const circularError = new CircularDependencyError(["A", "B"]);
    const factoryError = new FactoryError("Port", new Error());
    const disposedError = new DisposedScopeError("Port");
    const scopeRequiredError = new ScopeRequiredError("Port");

    expect(circularError.name).toBe("CircularDependencyError");
    expect(factoryError.name).toBe("FactoryError");
    expect(disposedError.name).toBe("DisposedScopeError");
    expect(scopeRequiredError.name).toBe("ScopeRequiredError");
  });
});
