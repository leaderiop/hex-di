# Vitest Testing Standards for HexDI

## Configuration

### Workspace Setup
- Root `vitest.config.ts` for shared configuration
- Per-package configs extend root
- Workspace mode for monorepo

### TypeScript Integration
- Use `vitest/config` for TypeScript support
- Match `tsconfig.json` paths
- Enable source maps for debugging

## Test Organization

### File Structure
- Tests co-located with source: `*.test.ts`
- Integration tests in `__tests__/` folder
- E2E tests in dedicated `e2e/` folder

### Naming Conventions
- `describe` blocks match module/class names
- `it` statements describe behavior, not implementation
- Use nested `describe` for related scenarios

## Test Categories

### Unit Tests
- Test individual functions/classes in isolation
- Mock external dependencies
- Fast execution (< 100ms per test)

### Integration Tests
- Test package interactions
- Use real implementations where practical
- Test graph composition scenarios

### Type Tests
- Dedicated files: `*.type-test.ts`
- Use `expectTypeOf` from vitest
- Test type inference and error cases

## Coverage

### Requirements
- Core packages: 90%+ line coverage
- Focus on branch coverage for complex logic
- Coverage reports in CI

### Exclusions
- Type-only files
- Index/barrel files
- Development utilities

## Mocking

### Principles
- Prefer dependency injection over mocking
- Mock at boundaries (external APIs, timers)
- Use `vi.fn()` for spy functionality

### Reset
- Clear mocks in `beforeEach`
- Use `vi.restoreAllMocks()` in global setup
- Avoid test pollution

## Assertions

### Style
- Use `expect` fluent API
- Prefer specific matchers over generic equality
- Custom matchers for domain concepts

### Async Testing
- Use async/await, not callbacks
- Test rejection cases explicitly
- Handle timeouts appropriately
