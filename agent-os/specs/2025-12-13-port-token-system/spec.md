# Specification: Port Token System

## Goal
Implement `createPort<T>(name)` function that creates typed, branded port tokens serving as compile-time contracts for service interfaces. This is the foundational feature for the `@hex-di/ports` package - the innermost layer of HexDI with zero dependencies.

## User Stories
- As a developer, I want to create typed port tokens that represent service contracts so that my inner layers remain framework-agnostic and my architecture is explicit
- As a developer, I want compile-time errors when I accidentally use the wrong port so that architectural drift is prevented before runtime

## Specific Requirements

**Branded Port Type Definition**
- Define `Port<T, TName>` type with unique symbol branding for nominal typing
- Use phantom type parameter `T` to carry service interface type at compile-time only
- Capture port name `TName` at type level using `const` type parameter (TypeScript 5.0+)
- Brand structure: `{ readonly [__brand]: [T, TName]; readonly __portName: TName }`
- Zero runtime overhead - brand symbol is `undefined` at runtime

**createPort Function Implementation**
- Function signature: `createPort<const TName extends string, TService>(name: TName): Port<TService, TName>`
- Returns minimal runtime object with only `__portName` property exposed
- Name parameter preserved as literal string type for compile-time error messages
- Single import provides both runtime value and type (value + type duality pattern)

**Nominal Type Safety**
- Two ports with different names MUST be type-incompatible even if service interfaces are identical
- Example: `Port<Logger, "ConsoleLogger">` incompatible with `Port<Logger, "FileLogger">`
- Use `unique symbol` for branding to achieve nominal typing
- This is NON-NEGOTIABLE per requirements discussion

**Port Name Exposure**
- Expose `__portName: TName` property on port object for debugging and error messages
- Name is readonly and part of the type signature
- Introspection beyond name belongs in `@hex-di/devtools` package

**Value-Type Duality**
- Ports usable as both values and types: `const LoggerPort = createPort<Logger>('Logger')`
- Use as value for registration in graph/container
- Use `typeof LoggerPort` for type annotations
- Pattern aligns with how TypeScript classes work

**Package Constraints**
- Zero npm dependencies (innermost package principle)
- Pure TypeScript with strict mode enabled
- Works in both browser and Node.js environments
- Minimal bundle size - only port token declarations

## Existing Code to Leverage

**Effect Library Branded Types Pattern**
- External reference for branded type implementation approach
- Pattern: phantom type parameters with unique symbol branding
- Zero runtime overhead principle from Effect's design
- Greenfield implementation - no existing HexDI code to reference

**TypeScript 5.0+ const Type Parameter**
- Use `const` modifier on generic type parameter to preserve literal string types
- Enables `createPort<const TName>` to infer `"Logger"` instead of `string`
- Critical for readable compile-time error messages

## Out of Scope
- Factories and instance creation (belongs to `@hex-di/runtime`)
- Lifetime management and scoping (belongs to `@hex-di/runtime`)
- Dependency validation and completeness checking (belongs to `@hex-di/graph`)
- Adapter metadata and provides/requires declarations (belongs to `@hex-di/graph`)
- Decorators of any kind (not used in HexDI)
- Service locator pattern (architectural anti-pattern)
- Container logic and resolution (belongs to `@hex-di/runtime`)
- React integration and hooks (belongs to `@hex-di/react`)
- Test utilities and mocking helpers (belongs to `@hex-di/testing`)
- Primary/secondary port distinction (graph-level concern)
- Hierarchical or nested ports (keep flat)
- Port groups or categories (use semantic naming instead)
- Optional port encoding (express optionality at graph/adapter level with `Port<T | undefined>`)
