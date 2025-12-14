# @hex-di/ports

The foundational layer of HexDI providing typed, branded port tokens for service interfaces. This package implements the Port Token System with zero runtime dependencies.

## Installation

```bash
npm install @hex-di/ports
# or
pnpm add @hex-di/ports
# or
yarn add @hex-di/ports
```

## Requirements

- **TypeScript 5.0+** - Required for the `const` type parameter modifier that preserves literal string types
- **Node.js 18.0+** - Minimum supported runtime version

## Quick Start

```typescript
import { createPort, type Port, type InferService } from '@hex-di/ports';

// Define your service interface
interface Logger {
  log(message: string): void;
  error(message: string, error?: Error): void;
}

// Create a typed port token
const LoggerPort = createPort<'Logger', Logger>('Logger');

// Use the port as a value for registration (in your container/graph)
// container.register(LoggerPort, consoleLoggerAdapter);

// Use typeof for type annotations
type LoggerPortType = typeof LoggerPort;

// Extract the service type when needed
type LoggerService = InferService<typeof LoggerPort>;
// LoggerService = Logger
```

## Core Concepts

### What is a Port?

A port is a typed token that represents a service interface contract. Ports serve two purposes:

1. **Runtime Identity** - A minimal object used as a key for dependency registration and resolution
2. **Compile-Time Contract** - A type that carries the service interface as a phantom type parameter

This dual nature enables type-safe dependency injection without runtime type information.

### Branded Types and Nominal Typing

TypeScript uses structural typing by default, meaning two types are compatible if they have the same structure. This creates a problem for dependency injection: two different service interfaces with the same shape would be interchangeable.

`@hex-di/ports` solves this through branded types:

```typescript
interface Logger {
  log(message: string): void;
}

// Same interface, different ports
const ConsoleLoggerPort = createPort<'ConsoleLogger', Logger>('ConsoleLogger');
const FileLoggerPort = createPort<'FileLogger', Logger>('FileLogger');

// These are type-incompatible despite having the same service interface!
// ConsoleLoggerPort !== FileLoggerPort at the type level

declare function resolve<T>(port: Port<T, string>): T;

// Each resolves to the correct implementation
const consoleLogger = resolve(ConsoleLoggerPort); // Logger from ConsoleLogger registration
const fileLogger = resolve(FileLoggerPort);       // Logger from FileLogger registration
```

The brand is achieved through a unique symbol that exists only at the type level, ensuring zero runtime overhead.

### Value-Type Duality Pattern

Ports exhibit value-type duality - they work both as runtime values and as types:

```typescript
// Create as a value
const LoggerPort = createPort<'Logger', Logger>('Logger');

// Use as a value (for registration keys, resolution, etc.)
function registerService(port: Port<unknown, string>, implementation: unknown): void {
  // port is used as a runtime key
}

// Use as a type (via typeof)
function getLogger(port: typeof LoggerPort): Logger {
  // TypeScript knows the return type from the port type
}
```

This pattern eliminates the need for separate type definitions and runtime tokens, reducing boilerplate and ensuring consistency.

### Zero Runtime Overhead

The port object at runtime contains only:

```javascript
{
  __portName: "Logger"  // The string name for debugging/error messages
}
```

The brand symbol (`__brand`) and service type exist purely at the type level. The object is frozen via `Object.freeze()` for immutability, but otherwise has minimal memory footprint.

## API Reference

### `createPort<TName, TService>(name)`

Creates a typed port token for a service interface.

#### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `TName extends string` | The literal string type for the port name. Uses `const` modifier for automatic literal type preservation. |
| `TService` | The service interface type. This is a phantom type that exists only at compile time. |

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `TName` | The unique name for this port. Preserved as a literal type. |

#### Returns

`Port<TService, TName>` - A frozen port object with the `__portName` property set to the provided name.

#### Example

```typescript
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

const UserRepositoryPort = createPort<'UserRepository', UserRepository>('UserRepository');

// Type of UserRepositoryPort: Port<UserRepository, 'UserRepository'>
// Runtime value: { __portName: 'UserRepository' }
```

### `Port<T, TName>`

The branded port type that serves as a compile-time contract.

#### Type Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `T` | - | The service interface type (phantom type) |
| `TName extends string` | `string` | The literal string type for the port name |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `__portName` | `TName` | The port name, exposed for debugging and error messages |
| `[__brand]` | `[T, TName]` | Internal brand for nominal typing (type-level only) |

#### Example

```typescript
// Direct type usage (less common)
type LoggerPort = Port<Logger, 'Logger'>;

// Via typeof (recommended)
const LoggerPort = createPort<'Logger', Logger>('Logger');
type LoggerPortType = typeof LoggerPort;
```

### `InferService<P>`

Extracts the service interface type from a Port type.

#### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `P` | The Port type to extract the service from |

#### Returns

- The service interface type `T` if `P` is a valid Port
- `never` if `P` is not a Port

#### Example

```typescript
const LoggerPort = createPort<'Logger', Logger>('Logger');

type LoggerService = InferService<typeof LoggerPort>;
// LoggerService = Logger

type Invalid = InferService<string>;
// Invalid = never
```

### `InferPortName<P>`

Extracts the port name literal type from a Port type.

#### Type Parameters

| Parameter | Description |
|-----------|-------------|
| `P` | The Port type to extract the name from |

#### Returns

- The port name literal type `TName` if `P` is a valid Port
- `never` if `P` is not a Port

#### Example

```typescript
const LoggerPort = createPort<'Logger', Logger>('Logger');

type PortName = InferPortName<typeof LoggerPort>;
// PortName = 'Logger'

type Invalid = InferPortName<number>;
// Invalid = never
```

## Advanced Patterns

### Generic Functions with Ports

```typescript
import { createPort, type Port, type InferService } from '@hex-di/ports';

// A generic resolver function
function resolve<P extends Port<unknown, string>>(
  port: P,
  registry: Map<string, unknown>
): InferService<P> {
  const service = registry.get(port.__portName);
  if (!service) {
    throw new Error(`No implementation registered for port: ${port.__portName}`);
  }
  return service as InferService<P>;
}

// Usage
const logger = resolve(LoggerPort, registry);
// TypeScript infers: logger is Logger
```

### Conditional Port Types

```typescript
import { type Port, type InferService } from '@hex-di/ports';

// Extract service only if it matches a constraint
type AsyncService<P> = InferService<P> extends { execute(): Promise<infer R> }
  ? InferService<P>
  : never;

interface Command {
  execute(): Promise<void>;
}

const CommandPort = createPort<'Command', Command>('Command');

type ExtractedCommand = AsyncService<typeof CommandPort>;
// ExtractedCommand = Command (matches the constraint)
```

### Port Collections

```typescript
const ports = {
  logger: createPort<'Logger', Logger>('Logger'),
  config: createPort<'Config', Config>('Config'),
  database: createPort<'Database', Database>('Database'),
} as const;

// Type-safe port access
type PortKeys = keyof typeof ports;
// PortKeys = 'logger' | 'config' | 'database'
```

## Why Branded Types?

Without branded types, TypeScript's structural typing would allow this dangerous scenario:

```typescript
// Without branding (hypothetical unsafe implementation)
interface UnsafePort<T> {
  name: string;
}

const AuthService: UnsafePort<AuthService> = { name: 'AuthService' };
const PaymentService: UnsafePort<PaymentService> = { name: 'PaymentService' };

// DANGER: These would be assignable to each other if PaymentService
// has the same structure as AuthService!
```

With `@hex-di/ports`, each port carries a unique brand that includes both the service type and the port name, making accidental substitution impossible at compile time.

## Integration with HexDI

This package is the foundation of the HexDI ecosystem. Other packages build on top of ports:

- **@hex-di/graph** - Dependency graph construction using ports as nodes
- **@hex-di/runtime** - Container implementation that resolves ports to implementations
- **@hex-di/react** - React bindings for port-based dependency injection

## License

MIT
