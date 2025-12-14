/**
 * Type-level tests for Port type and brand symbol.
 *
 * These tests verify:
 * 1. Port type captures service interface as phantom type
 * 2. Port type captures name as literal string type
 * 3. Nominal typing - different names produce incompatible types
 * 4. Compatible ports with same name and interface
 * 5. Brand symbol is not accessible at value level
 */

import { describe, expectTypeOf, it } from "vitest";
import {
  createPort,
  InferPortName,
  InferService,
  Port,
} from "../src/index.js";

// Sample service interfaces for testing
interface Logger {
  log(message: string): void;
}

interface AnotherLogger {
  log(message: string): void;
}

describe("Port type", () => {
  it("captures service interface as phantom type parameter", () => {
    type LoggerPort = Port<Logger, "Logger">;

    // The port type should exist and have the expected structure
    expectTypeOf<LoggerPort>().toHaveProperty("__portName");
    expectTypeOf<LoggerPort["__portName"]>().toEqualTypeOf<"Logger">();
  });

  it("captures name as literal string type", () => {
    type ConsoleLoggerPort = Port<Logger, "ConsoleLogger">;
    type FileLoggerPort = Port<Logger, "FileLogger">;

    // Port names should be preserved as literal types, not widened to string
    expectTypeOf<ConsoleLoggerPort["__portName"]>().toEqualTypeOf<"ConsoleLogger">();
    expectTypeOf<FileLoggerPort["__portName"]>().toEqualTypeOf<"FileLogger">();

    // Verify they are NOT just `string`
    expectTypeOf<ConsoleLoggerPort["__portName"]>().not.toEqualTypeOf<string>();
  });

  it("produces incompatible types for different names even with same interface", () => {
    type ConsoleLoggerPort = Port<Logger, "ConsoleLogger">;
    type FileLoggerPort = Port<Logger, "FileLogger">;

    // These should NOT be assignable to each other due to nominal typing
    // The brand includes the name, so different names = different types
    expectTypeOf<ConsoleLoggerPort>().not.toEqualTypeOf<FileLoggerPort>();

    // Verify they cannot be assigned to each other
    expectTypeOf<ConsoleLoggerPort>().not.toMatchTypeOf<FileLoggerPort>();
    expectTypeOf<FileLoggerPort>().not.toMatchTypeOf<ConsoleLoggerPort>();
  });

  it("produces compatible types for same name and interface", () => {
    type LoggerPort1 = Port<Logger, "Logger">;
    type LoggerPort2 = Port<Logger, "Logger">;

    // Same name + same interface = same type
    expectTypeOf<LoggerPort1>().toEqualTypeOf<LoggerPort2>();
  });

  it("produces incompatible types for same name but different interfaces", () => {
    interface ServiceA {
      methodA(): void;
    }
    interface ServiceB {
      methodB(): void;
    }

    type PortA = Port<ServiceA, "SharedName">;
    type PortB = Port<ServiceB, "SharedName">;

    // Different service interfaces should produce different types
    // even with the same name (due to phantom type in brand)
    expectTypeOf<PortA>().not.toEqualTypeOf<PortB>();
  });

  it("achieves nominal typing through internal branding", () => {
    // Nominal typing is achieved through an internal brand symbol
    // We verify the behavior (incompatible types) rather than the implementation
    type PortA = Port<Logger, "A">;
    type PortB = Port<Logger, "B">;

    // The brand ensures these are nominally distinct despite structural similarity
    expectTypeOf<PortA>().not.toMatchTypeOf<PortB>();
    expectTypeOf<PortB>().not.toMatchTypeOf<PortA>();

    // Verify that structurally similar objects cannot be assigned to Port
    // (this is the key benefit of nominal typing via branding)
    type FakePort = { readonly __portName: "A" };
    expectTypeOf<FakePort>().not.toMatchTypeOf<PortA>();
  });
});

describe("Port brand structure", () => {
  it("brand captures both service type and name", () => {
    type TestPort = Port<Logger, "TestLogger">;

    // The brand captures both service type and name
    // We verify this through the utility types that extract these components
    type ExtractedService = InferService<TestPort>;
    type ExtractedName = InferPortName<TestPort>;

    expectTypeOf<ExtractedService>().toEqualTypeOf<Logger>();
    expectTypeOf<ExtractedName>().toEqualTypeOf<"TestLogger">();
  });

  it("supports default name type parameter", () => {
    // When TName is not specified, it defaults to string
    type GenericPort = Port<Logger>;

    expectTypeOf<GenericPort["__portName"]>().toEqualTypeOf<string>();
  });
});

describe("createPort function", () => {
  it("returns Port type with correct name literal type", () => {
    const LoggerPort = createPort<"Logger", Logger>("Logger");

    // The returned port should have the literal type preserved
    expectTypeOf(LoggerPort.__portName).toEqualTypeOf<"Logger">();

    // Should NOT widen to string
    expectTypeOf(LoggerPort.__portName).not.toEqualTypeOf<string>();
  });

  it("preserves name as literal type via const type parameter", () => {
    // The const modifier on TName ensures literal preservation
    const port = createPort<"LiteralName", Logger>("LiteralName");

    type PortNameType = (typeof port)["__portName"];
    expectTypeOf<PortNameType>().toEqualTypeOf<"LiteralName">();
  });

  it("returns correctly typed Port matching Port<TService, TName>", () => {
    const port = createPort<"TypedPort", Logger>("TypedPort");

    // The returned type should match Port<Logger, "TypedPort">
    expectTypeOf(port).toMatchTypeOf<Port<Logger, "TypedPort">>();
  });

  it("enables value-type duality pattern", () => {
    // Create port as value
    const LoggerPort = createPort<"Logger", Logger>("Logger");

    // Use typeof for type annotations
    type LoggerPortType = typeof LoggerPort;

    // These should be equivalent
    expectTypeOf<LoggerPortType>().toMatchTypeOf<Port<Logger, "Logger">>();
  });

  it("produces nominally distinct ports for different names", () => {
    const ConsolePort = createPort<"Console", Logger>("Console");
    const FilePort = createPort<"File", Logger>("File");

    // Even with same service interface, different names = different types
    expectTypeOf(ConsolePort).not.toEqualTypeOf(FilePort);
  });
});

// =============================================================================
// Type Utility Tests
// =============================================================================

describe("InferService utility type", () => {
  it("extracts service type from Port", () => {
    type LoggerPort = Port<Logger, "Logger">;

    // InferService should extract the Logger interface from the Port
    type ExtractedService = InferService<LoggerPort>;
    expectTypeOf<ExtractedService>().toEqualTypeOf<Logger>();
  });

  it("works with any Port type", () => {
    interface CustomService {
      execute(): Promise<void>;
      getStatus(): string;
    }

    type CustomPort = Port<CustomService, "CustomService">;
    type ExtractedService = InferService<CustomPort>;

    expectTypeOf<ExtractedService>().toEqualTypeOf<CustomService>();
  });

  it("produces never for non-Port types", () => {
    // Non-Port types should result in never
    type FromString = InferService<string>;
    type FromNumber = InferService<number>;
    type FromObject = InferService<{ foo: string }>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
  });
});

describe("InferPortName utility type", () => {
  it("extracts name type from Port", () => {
    type LoggerPort = Port<Logger, "Logger">;

    // InferPortName should extract the literal string type "Logger"
    type ExtractedName = InferPortName<LoggerPort>;
    expectTypeOf<ExtractedName>().toEqualTypeOf<"Logger">();
  });

  it("works with any Port type", () => {
    type CustomPort = Port<Logger, "MyCustomPortName">;
    type ExtractedName = InferPortName<CustomPort>;

    expectTypeOf<ExtractedName>().toEqualTypeOf<"MyCustomPortName">();
  });

  it("produces never for non-Port types", () => {
    // Non-Port types should result in never
    type FromString = InferPortName<string>;
    type FromNumber = InferPortName<number>;
    type FromObject = InferPortName<{ __portName: "fake" }>;

    expectTypeOf<FromString>().toBeNever();
    expectTypeOf<FromNumber>().toBeNever();
    expectTypeOf<FromObject>().toBeNever();
  });
});

describe("Utility types work together", () => {
  it("can reconstruct Port type from inferred components", () => {
    const originalPort = createPort<"ReconstructTest", Logger>("ReconstructTest");
    type OriginalPortType = typeof originalPort;

    // Extract both components
    type ExtractedService = InferService<OriginalPortType>;
    type ExtractedName = InferPortName<OriginalPortType>;

    // Reconstruct should produce equivalent type
    type ReconstructedPort = Port<ExtractedService, ExtractedName>;
    expectTypeOf<ReconstructedPort>().toEqualTypeOf<OriginalPortType>();
  });
});
