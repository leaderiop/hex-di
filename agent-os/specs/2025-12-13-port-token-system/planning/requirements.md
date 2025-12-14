# Spec Requirements: Port Token System

## Initial Description
Implement `createPort<T>(name)` function that creates typed, branded port tokens serving as compile-time contracts for service interfaces. This is the foundational feature for the `@hex-di/ports` package - the innermost layer of HexDI with zero dependencies.

## Requirements Discussion

### First Round Questions

**Q1:** I assume `createPort<T>(name)` should return a branded token type that carries `T` as a phantom type parameter, making each port unique at the type level even if names collide. Is that correct, or would you prefer a different identity mechanism (e.g., symbols, unique nominal types)?
**Answer:** Use branded types with phantom type parameter `T`. Pattern: `type Port<T> = { readonly [__brand]: unique symbol; readonly __type: T }`. Zero runtime overhead - brand only exists at type level. Aligns with Effect's approach and DIP principle.

**Q2:** I'm thinking the port token should be a simple object like `{ __brand: unique symbol, _type: T, name: string }` where `_type` is never assigned at runtime (phantom type). Should we expose the `name` property for debugging, or keep the runtime structure completely opaque?
**Answer:** Minimal structure: `{ __brand, __portName: string }`. `name` exposed for error messages and debugging. Keep ports opaque otherwise - introspection belongs in `@hex-di/devtools`.

**Q3:** The PRD mentions "optional ports" as a capability. I assume optional ports should be a separate function like `createOptionalPort<T>(name)` that produces a distinct type (e.g., `OptionalPort<T>`), allowing the graph builder to differentiate required vs optional dependencies. Is that correct, or should optionality be expressed differently?
**Answer:** Ports should NOT encode optionality. Express optionality at Graph/Adapter level, NOT port level. Use no-op adapters instead of "optional ports". Optionality is an architectural decision at composition time. Alternative: If needed, `Port<T | undefined>` at port signature level.

**Q4:** I assume we want the branded type to prevent passing the wrong port token even when the service interfaces happen to be structurally identical. For example, `Port<Logger>` and `Port<Logger>` created with different names should be incompatible. Is that the level of strictness you want?
**Answer:** Nominal typing is NON-NEGOTIABLE. Two `Port<Logger>` with different names MUST be type-incompatible. This prevents architectural drift and enforces DIP. Use unique symbol branding to achieve nominal typing.

**Q5:** The PRD mentions "type-level dependency declaration." I assume this means adapters will declare their required ports via generic type parameters, and the `@hex-di/ports` package only needs to export the `Port` type - the actual requires/provides tracking happens in `@hex-di/graph`. Is that correct?
**Answer:** Correct. `@hex-di/ports` = tokens ONLY. `createPort<T>(name)` and `Port<T>` type only. NO dependency declaration utilities (those go in `@hex-di/graph`). Inner layers import only ports - keeps dependency graph clean.

**Q6:** I assume the port token should be usable as both a type and a value (similar to how TypeScript classes work). Developers would do `const LoggerPort = createPort<Logger>('Logger')` and then use `LoggerPort` as both the value and `typeof LoggerPort` for type annotations. Is that the ergonomics you want?
**Answer:** YES - this is the correct pattern. `const LoggerPort = createPort<Logger>('Logger')`. Use as value for registration, `typeof LoggerPort` for type annotations. Single import, both runtime value and type available.

**Q7:** For compile-time error messages, should the port's `name` parameter be captured at the type level (branded with the literal string type) to enable readable error messages, or is runtime-only name sufficient?
**Answer:** YES - capture for compile-time error messages. Use `const` type parameter to preserve literal string: `createPort<const TName extends string, T>(name: TName)`. Enables errors like `"Missing adapter for port: Logger"`. Name becomes part of type identity: `Port<Logger, "Logger">`.

**Q8:** Is there anything that should explicitly be excluded from this initial port token implementation?
**Answer:** The following are explicitly OUT of scope for `@hex-di/ports`:
- Factories / instance creation (goes to `@hex-di/runtime`)
- Lifetime management (goes to `@hex-di/runtime`)
- Dependency validation (goes to `@hex-di/graph`)
- Adapter metadata (goes to `@hex-di/graph`)
- Decorators (Not used in HexDI)
- Service locator pattern (Anti-pattern)
- Container logic (goes to `@hex-di/runtime`)
- React integration (goes to `@hex-di/react`)
- Test utilities (goes to `@hex-di/testing`)
- Primary/secondary port distinction (Graph-level concern)
- Hierarchical ports (Keep flat)
- Port groups (Use semantic naming instead)

### Existing Code to Reference
No similar existing features identified for reference. This is a greenfield implementation. The expert research referenced Effect's approach to branded types as an external pattern to emulate.

### Follow-up Questions
None required - expert research provided comprehensive answers to all questions.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A

## Requirements Summary

### Functional Requirements
- Create typed, branded port tokens via `createPort<T>(name)` function
- Port tokens carry service interface type `T` as phantom type parameter
- Port tokens carry name `TName` at the type level for compile-time error messages
- Expose `__portName` property for debugging and error messages
- Ports are nominally typed - different names produce incompatible types even with identical service interfaces
- Single export provides both runtime value and type (value + type duality)

### Recommended Implementation
```typescript
// @hex-di/ports/src/index.ts

declare const __brand: unique symbol;

type Port<T, TName extends string = string> = {
  readonly [__brand]: [T, TName];
  readonly __portName: TName;
};

function createPort<const TName extends string, TService>(
  name: TName
): Port<TService, TName> {
  return {
    [__brand]: undefined as any,
    __portName: name,
  };
}

export { createPort, type Port };
```

### Reusability Opportunities
- Pattern aligns with Effect library's branded types approach
- Type-level name capture pattern reusable for other HexDI packages

### Scope Boundaries
**In Scope:**
- `createPort<T>(name)` function
- `Port<T, TName>` type definition
- Branded type implementation for nominal typing
- Type-level name capture for compile-time error messages
- Minimal runtime structure with `__portName` for debugging

**Out of Scope:**
- Factories / instance creation
- Lifetime management
- Dependency validation
- Adapter metadata
- Decorators
- Service locator pattern
- Container logic
- React integration
- Test utilities
- Primary/secondary port distinction
- Hierarchical ports
- Port groups
- Optional port encoding (handled at graph/adapter level)

### Technical Considerations
- Zero npm dependencies (innermost package)
- Zero runtime overhead - brands erased at compile time
- TypeScript strict mode required
- Uses `const` type parameter (TypeScript 5.0+) for literal string preservation
- Uses `unique symbol` for nominal typing
- Phantom type parameter for service interface
- Must work in both browser and Node.js environments

### Key Principles Established
1. **Compile-time contracts** - Ports are type-level abstractions
2. **Nominal typing** - Different names = different types (NON-NEGOTIABLE)
3. **Zero runtime overhead** - Brands erased at compile time
4. **AI-friendly** - Explicit, inspectable, machine-readable
5. **Minimal API** - Only what inner layers need
6. **Hexagonal-native** - Maps to ports-and-adapters vocabulary
