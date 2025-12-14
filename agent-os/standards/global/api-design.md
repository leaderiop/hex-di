# API Design Standards for HexDI

## Builder Pattern Guidelines

### Method Chaining
- Builder methods return `this` or new builder instance
- Methods are chainable in logical order
- Terminal methods (e.g., `build()`) end the chain
- Each step validates incrementally when possible

### Immutability
- Builders are immutable - each method returns new instance
- Prevents accidental mutation of shared builders
- Enables safe reuse of partial configurations

### Type Accumulation
- Builder tracks provided/required types as it builds
- Type errors appear at the point of violation
- Final `build()` validates completeness at type level

## Fluent API Guidelines

### Discoverability
- Method names are self-documenting
- IDE autocomplete guides usage
- Options objects for optional configuration

### Overloads
- Prefer overloads over union types for better inference
- Document each overload's use case
- Most common usage should be simplest

## Error Messages

### Compile-Time Errors
- Use template literal types for readable error messages
- Include the missing or conflicting type in message
- Guide user to the fix

### Runtime Errors
- Throw descriptive Error subclasses
- Include context (port name, adapter name)
- Never fail silently

## Type Inference Priorities
1. User code requires zero type annotations for happy path
2. Error cases surface at point of mistake
3. Complex types are hidden behind simple interfaces
4. Generic constraints guide correct usage

## Consistency
- Same patterns across all packages
- Predictable naming (`create*`, `use*`, etc.)
- Symmetric APIs (what can be done can be undone)
