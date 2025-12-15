# @hex-di/ports API Reference

The foundational layer of HexDI with zero dependencies. Provides typed, branded port tokens for service interfaces.

## Installation

```bash
pnpm add @hex-di/ports
```

## Overview

`@hex-di/ports` provides:
- `Port<T, TName>` - Branded port type
- `createPort()` - Factory to create port tokens
- Type utilities for extracting port information

## Types

### Port<T, TName>

A branded port type that serves as a compile-time contract for a service interface.

```typescript
type Port<T, TName extends string = string> = {
  readonly [__brand]: [T, TName];
  readonly __portName: TName;
};
```

**Type Parameters:**
- `T` - The service interface type (phantom type)
- `TName` - The literal string type for the port name

**Properties:**
- `__portName` - The port name for debugging and error messages

**Example:**

```typescript
interface Logger {
  log(message: string): void;
}

// Port type with explicit parameters
type LoggerPort = Port<Logger, 'Logger'>;

// Usually created via createPort()
const LoggerPort = createPort<'Logger', Logger>('Logger');
```

### InferService<P>

Extracts the service interface type from a Port type.

```typescript
type InferService<P> = P extends Port<infer T, infer _TName> ? T : never;
```

**Example:**

```typescript
const LoggerPort = createPort<'Logger', Logger>('Logger');

type LoggerService = InferService<typeof LoggerPort>;
// LoggerService = Logger
```

### InferPortName<P>

Extracts the port name literal type from a Port type.

```typescript
type InferPortName<P> = P extends Port<infer _T, infer TName> ? TName : never;
```

**Example:**

```typescript
const LoggerPort = createPort<'Logger', Logger>('Logger');

type Name = InferPortName<typeof LoggerPort>;
// Name = 'Logger'
```

## Functions

### createPort

Creates a typed port token for a service interface.

```typescript
function createPort<const TName extends string, TService>(
  name: TName
): Port<TService, TName>
```

**Type Parameters:**
- `TName` - The literal string type for the port name (inferred with `const`)
- `TService` - The service interface type (phantom type)

**Parameters:**
- `name` - The unique name for this port

**Returns:**
- A frozen `Port` object with the `__portName` property

**Example:**

```typescript
interface Logger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// Create a port (type parameters in order: Name, Service)
const LoggerPort = createPort<'Logger', Logger>('Logger');

// Use the port
console.log(LoggerPort.__portName); // 'Logger'

// Use as type
type PortType = typeof LoggerPort;
// Port<Logger, 'Logger'>
```

**Multiple Ports for Same Interface:**

```typescript
interface Logger {
  log(message: string): void;
}

// Different ports for different implementations
const ConsoleLoggerPort = createPort<'ConsoleLogger', Logger>('ConsoleLogger');
const FileLoggerPort = createPort<'FileLogger', Logger>('FileLogger');

// These are type-incompatible despite same service interface
```

## Usage Patterns

### Basic Port Creation

```typescript
// 1. Define interface
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserDTO): Promise<User>;
}

// 2. Create port
const UserServicePort = createPort<'UserService', UserService>('UserService');
```

### Port Collections

```typescript
// Define all ports in one file
export const LoggerPort = createPort<'Logger', Logger>('Logger');
export const ConfigPort = createPort<'Config', Config>('Config');
export const DatabasePort = createPort<'Database', Database>('Database');

// Union type for all ports
export type AppPorts =
  | typeof LoggerPort
  | typeof ConfigPort
  | typeof DatabasePort;
```

### Type Extraction

```typescript
// Extract service type for type annotations
type LoggerType = InferService<typeof LoggerPort>;

function useLogger(): LoggerType {
  return container.resolve(LoggerPort);
}

// Extract name for logging/debugging
type LoggerName = InferPortName<typeof LoggerPort>;
// 'Logger'
```

## Best Practices

### 1. Naming Consistency

```typescript
// Good - name matches type parameter
const LoggerPort = createPort<'Logger', Logger>('Logger');

// Avoid - inconsistent naming
const LoggerPort = createPort<'Log', Logger>('Logger');
```

### 2. One Port per Interface

```typescript
// Good - clear 1:1 mapping
const UserServicePort = createPort<'UserService', UserService>('UserService');
const AuthServicePort = createPort<'AuthService', AuthService>('AuthService');
```

### 3. Export AppPorts Type

```typescript
export type AppPorts =
  | typeof LoggerPort
  | typeof ConfigPort
  | typeof UserServicePort;
```

### 4. Separate Interfaces from Ports

```typescript
// types.ts - Pure interfaces
export interface Logger { /* ... */ }

// ports.ts - Port definitions
import type { Logger } from './types';
export const LoggerPort = createPort<'Logger', Logger>('Logger');
```

## Re-exports

`@hex-di/ports` types are re-exported from `@hex-di/graph` and `@hex-di/runtime` for convenience:

```typescript
// Both work
import { createPort } from '@hex-di/ports';
import type { Port } from '@hex-di/runtime';
```
