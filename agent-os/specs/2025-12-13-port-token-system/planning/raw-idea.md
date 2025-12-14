# Raw Idea: Port Token System

## Feature Description

Implement the Port Token System from the `@hex-di/ports` package as the foundational feature of HexDI.

## Core Requirements

- Implement `createPort<T>(name)` function that creates typed, branded port tokens
- These serve as compile-time contracts for service interfaces
- No runtime behavior, no factories, no lifetimes
- Inner layers import only this module
- Ports remain stable contracts

## Package Context: @hex-di/ports

From the HexDI PRD:

### Purpose
The most stable layer. Defines port tokens that serve as compile-time contracts for service interfaces. Inner layers depend only on this package.

### Key Characteristics
- Zero runtime behavior beyond token creation
- No dependencies on other HexDI packages
- Ports are just typed identifiers - no factories, no lifetimes, no metadata
- Application layers import only this to declare service contracts

### Core API

```typescript
createPort<T>(name: string): Port<T>
```

Creates a branded port token representing a service contract of type T.

**Example:**
```typescript
interface Logger {
  log(message: string): void;
}

export const LoggerPort = createPort<Logger>('Logger');
```

## Implementation Scope

This is a **Small (S)** sized feature according to the roadmap. It should:

1. Create typed, branded port tokens
2. Provide compile-time type safety
3. Have minimal runtime footprint
4. Be the foundation for all other HexDI packages

## Dependencies

- This is the first feature in the roadmap
- No dependencies on other HexDI features
- All subsequent features depend on this

## Success Criteria

- Port tokens can be created with `createPort<T>(name)`
- Type parameter `T` is preserved and enforced at compile-time
- Ports are branded types that prevent accidental mixing
- Clean, minimal implementation suitable for inner layers to import
- Full TypeScript type safety and inference
