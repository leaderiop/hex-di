/**
 * @hex-di/ports - Port Token System
 *
 * The foundational layer of HexDI with zero dependencies.
 * Provides typed, branded port tokens for service interfaces.
 *
 * @packageDocumentation
 */

// =============================================================================
// Brand Symbol
// =============================================================================

/**
 * Unique symbol used for nominal typing of Port types.
 *
 * This symbol is declared but never assigned a runtime value.
 * It exists purely at the type level to enable nominal typing,
 * ensuring that two ports with different names are type-incompatible
 * even if their service interfaces are structurally identical.
 *
 * @remarks
 * The `unique symbol` type guarantees that this brand cannot be
 * accidentally recreated elsewhere, providing true nominal typing.
 */
declare const __brand: unique symbol;

// =============================================================================
// Port Type
// =============================================================================

/**
 * A branded port type that serves as a compile-time contract for a service interface.
 *
 * The Port type uses TypeScript's structural typing with a branded property
 * to achieve nominal typing. Two ports are only compatible if they have:
 * 1. The same service interface type `T`
 * 2. The same port name `TName`
 *
 * @typeParam T - The service interface type (phantom type - exists only at compile time)
 * @typeParam TName - The literal string type for the port name (defaults to `string`)
 *
 * @remarks
 * - The `__brand` property carries both the service type and name in a tuple
 * - The `__portName` property exposes the name for debugging and error messages
 * - Both properties are readonly to prevent modification
 * - The brand symbol value is `undefined` at runtime (zero overhead)
 *
 * @see {@link createPort} - Factory function to create port tokens
 * @see {@link InferService} - Utility to extract the service type from a port
 * @see {@link InferPortName} - Utility to extract the name type from a port
 *
 * @example Direct type usage
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create typed port tokens
 * type ConsoleLoggerPort = Port<Logger, 'ConsoleLogger'>;
 * type FileLoggerPort = Port<Logger, 'FileLogger'>;
 *
 * // These are type-incompatible despite same interface
 * declare const consolePort: ConsoleLoggerPort;
 * declare const filePort: FileLoggerPort;
 * // consolePort = filePort; // Type error!
 * ```
 *
 * @example With createPort (recommended)
 * ```typescript
 * // Use createPort for value + type duality
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type LoggerPortType = typeof LoggerPort;
 * ```
 */
export type Port<T, TName extends string = string> = {
  /**
   * Brand property for nominal typing.
   * Contains a tuple of [ServiceType, PortName] at the type level.
   * Value is undefined at runtime.
   */
  readonly [__brand]: [T, TName];

  /**
   * The port name, exposed for debugging and error messages.
   */
  readonly __portName: TName;
};

// =============================================================================
// createPort Function
// =============================================================================

/**
 * Creates a typed port token for a service interface.
 *
 * This function creates a minimal runtime object that serves as a unique
 * identifier for a service interface. The port can be used both as a value
 * (for registration in containers/graphs) and as a type (via `typeof`).
 *
 * @typeParam TName - The literal string type for the port name.
 *   Uses `const` modifier to preserve literal types without explicit annotation.
 * @typeParam TService - The service interface type (phantom type).
 *   This type exists only at compile time and is not used at runtime.
 *
 * @param name - The unique name for this port. Will be preserved as a literal type.
 *
 * @returns A frozen Port object with the `__portName` property set to the provided name.
 *   The returned object is immutable and has minimal runtime footprint.
 *
 * @remarks
 * - The `TService` type parameter is a phantom type - it only exists at compile time
 * - The returned object is frozen via `Object.freeze()` for immutability
 * - The brand property exists only at the type level (zero runtime overhead)
 * - Use `typeof PortName` to get the Port type for type annotations
 *
 * @see {@link Port} - The branded port type returned by this function
 * @see {@link InferService} - Utility to extract the service type from a port
 * @see {@link InferPortName} - Utility to extract the name type from a port
 *
 * @example Basic usage
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * // Create a port token (value + type duality)
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 *
 * // Use as value for registration
 * container.register(LoggerPort, consoleLoggerAdapter);
 *
 * // Use typeof for type annotations
 * type LoggerPortType = typeof LoggerPort;
 * function getLogger(port: LoggerPortType): Logger { ... }
 * ```
 *
 * @example Multiple ports for same interface
 * ```typescript
 * // Different adapters for the same service interface
 * const ConsoleLoggerPort = createPort<'ConsoleLogger', Logger>('ConsoleLogger');
 * const FileLoggerPort = createPort<'FileLogger', Logger>('FileLogger');
 *
 * // These are type-incompatible despite same service interface
 * // ConsoleLoggerPort !== FileLoggerPort at the type level
 * ```
 */
export function createPort<const TName extends string, TService>(
  name: TName
): Port<TService, TName> {
  return Object.freeze({
    __portName: name,
  }) as Port<TService, TName>;
}

// =============================================================================
// Type-Level Utilities
// =============================================================================

/**
 * Extracts the service interface type from a Port type.
 *
 * This utility type uses conditional type inference to extract the phantom
 * type parameter `T` from a `Port<T, TName>`. If the provided type is not
 * a valid Port, it returns `never`.
 *
 * @typeParam P - The Port type to extract the service from
 * @returns The service interface type `T`, or `never` if P is not a Port
 *
 * @see {@link Port} - The port type this utility extracts from
 * @see {@link InferPortName} - Companion utility to extract the port name
 * @see {@link createPort} - Factory function to create port tokens
 *
 * @example
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type LoggerService = InferService<typeof LoggerPort>;
 * // LoggerService = Logger
 *
 * type Invalid = InferService<string>;
 * // Invalid = never
 * ```
 */
export type InferService<P> = P extends Port<infer T, infer _TName> ? T : never;

/**
 * Extracts the port name literal type from a Port type.
 *
 * This utility type uses conditional type inference to extract the name
 * type parameter `TName` from a `Port<T, TName>`. If the provided type is not
 * a valid Port, it returns `never`.
 *
 * @typeParam P - The Port type to extract the name from
 * @returns The port name literal type `TName`, or `never` if P is not a Port
 *
 * @see {@link Port} - The port type this utility extracts from
 * @see {@link InferService} - Companion utility to extract the service type
 * @see {@link createPort} - Factory function to create port tokens
 *
 * @example
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * const LoggerPort = createPort<'Logger', Logger>('Logger');
 * type PortName = InferPortName<typeof LoggerPort>;
 * // PortName = 'Logger'
 *
 * type Invalid = InferPortName<number>;
 * // Invalid = never
 * ```
 */
export type InferPortName<P> = P extends Port<infer _T, infer TName>
  ? TName
  : never;

