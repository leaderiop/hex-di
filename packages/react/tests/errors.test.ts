/**
 * Unit tests for MissingProviderError.
 *
 * These tests verify:
 * 1. Error properties (code, isProgrammingError, message format)
 * 2. Error inherits from ContainerError
 * 3. Error message includes hook name and provider type
 */

import { describe, expect, it } from "vitest";
import { ContainerError } from "@hex-di/runtime";
import { MissingProviderError } from "../src/index.js";

// =============================================================================
// MissingProviderError Tests
// =============================================================================

describe("MissingProviderError", () => {
  it("has correct code and isProgrammingError properties", () => {
    const error = new MissingProviderError("usePort", "ContainerProvider");

    expect(error.code).toBe("MISSING_PROVIDER");
    expect(error.isProgrammingError).toBe(true);
  });

  it("extends ContainerError and Error", () => {
    const error = new MissingProviderError("useContainer", "ContainerProvider");

    expect(error).toBeInstanceOf(ContainerError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("MissingProviderError");
  });

  it("includes hook name and provider type in error message", () => {
    const error = new MissingProviderError("useScope", "ContainerProvider");

    expect(error.hookName).toBe("useScope");
    expect(error.requiredProvider).toBe("ContainerProvider");
    expect(error.message).toContain("useScope");
    expect(error.message).toContain("ContainerProvider");
  });
});
