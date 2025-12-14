# Type-Level Testing Standards for HexDI

## Purpose
HexDI relies heavily on TypeScript's type system for compile-time safety. Type tests verify that the type-level behavior is correct.

## Tools

### Vitest expectTypeOf
- Use `expectTypeOf` from vitest
- Integrated with test runner
- Good IDE support

### Alternative: tsd
- Standalone type testing
- For pure type-level tests
- Consider if vitest insufficient

## What to Test

### Type Inference
- Verify inferred types match expectations
- Test generic type parameter inference
- Ensure no unintended `any` types

### Type Errors
- Verify invalid code produces type errors
- Use `// @ts-expect-error` for error cases
- Document expected error in comment

### Conditional Types
- Test type narrowing
- Test discriminated unions
- Test template literal types

## Test Organization

### File Naming
- `*.type-test.ts` for type-only tests
- Co-locate with implementation
- Group related type tests

### Structure
- One `describe` per type/utility
- Clear test names describing type behavior
- Comment complex type assertions

## Patterns

### Testing Valid Types
```
expectTypeOf(result).toEqualTypeOf<ExpectedType>()
expectTypeOf(result).toMatchTypeOf<PartialType>()
```

### Testing Type Errors
- Use `// @ts-expect-error` directive
- Comment must describe expected error
- Test runner verifies error occurs

### Testing Inference
- Create value, check inferred type
- Don't annotate type explicitly
- Verify inference matches expectation

## Common Scenarios

### Port Types
- Port token carries correct service type
- Dependencies tracked at type level
- Invalid port usage caught

### Graph Types
- Provided ports accumulated correctly
- Missing dependencies detected
- Circular dependencies caught (if implemented)

### Container Types
- Resolve returns correct service type
- Invalid port resolution caught
- Scope types correct

## Success Criteria
- All public APIs have type tests
- Type errors are descriptive
- Refactoring that breaks types fails tests
- AI can understand type contracts from tests
