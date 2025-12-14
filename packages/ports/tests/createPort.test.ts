/**
 * Unit tests for createPort function.
 *
 * These tests verify:
 * 1. createPort returns object with __portName property
 * 2. __portName matches the provided name argument
 * 3. Returned object has minimal structure (no extra properties)
 * 4. Function is callable with generic type parameter
 * 5. Returned port is frozen/immutable
 */

import { describe, expect, it } from "vitest";
import { createPort } from "../src/index.js";

// Sample service interface for testing
interface Logger {
  log(message: string): void;
}

describe("createPort", () => {
  it("returns object with __portName property", () => {
    const port = createPort<"TestPort", Logger>("TestPort");

    expect(port).toHaveProperty("__portName");
  });

  it("__portName matches the provided name argument", () => {
    const port = createPort<"MyService", Logger>("MyService");

    expect(port.__portName).toBe("MyService");
  });

  it("returned object has minimal structure with only __portName exposed", () => {
    const port = createPort<"MinimalPort", Logger>("MinimalPort");

    // Get all enumerable own properties
    const keys = Object.keys(port);

    // Should only have __portName as enumerable property
    expect(keys).toEqual(["__portName"]);
  });

  it("is callable with generic type parameter for service interface", () => {
    interface CustomService {
      doSomething(): Promise<void>;
    }

    const port = createPort<"CustomPort", CustomService>("CustomPort");

    // Verify the port was created successfully
    expect(port.__portName).toBe("CustomPort");
  });

  it("returned port object is frozen and immutable", () => {
    const port = createPort<"FrozenPort", Logger>("FrozenPort");

    // Object should be frozen
    expect(Object.isFrozen(port)).toBe(true);

    // Attempting to modify should either throw or be silently ignored
    expect(() => {
      // @ts-expect-error - intentionally trying to modify readonly property
      port.__portName = "Modified";
    }).toThrow();
  });

  it("creates distinct port objects for each call", () => {
    const port1 = createPort<"Port1", Logger>("Port1");
    const port2 = createPort<"Port2", Logger>("Port2");

    // Should be different objects
    expect(port1).not.toBe(port2);
    expect(port1.__portName).not.toBe(port2.__portName);
  });
});
