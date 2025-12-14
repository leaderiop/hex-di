# TypeScript Coding Standards for HexDI

## General Principles
- Prioritize type safety over convenience
- Make illegal states unrepresentable
- Prefer compile-time errors over runtime errors
- Design for inference - users should rarely need explicit type annotations

## Naming Conventions

### Types and Interfaces
- PascalCase for all type names
- Suffix `Port` for port interfaces (e.g., `LoggerPort`)
- Suffix `Adapter` for adapter types (e.g., `LoggerAdapter`)
- Prefix `I` is NOT used

### Generic Type Parameters
- `T` for single generic (service type)
- `TService`, `TDeps`, `TConfig` for multiple generics
- `TProvided`, `TRequired` for graph-related generics
- Descriptive names for complex generics

### Functions and Variables
- camelCase for functions and variables
- Prefix `create` for factory functions (e.g., `createPort`, `createAdapter`)
- Prefix `use` for React hooks (e.g., `usePort`, `useContainer`)
- Prefix `is` or `has` for boolean predicates

### Files and Folders
- kebab-case for file names
- One public export per file (main concept)
- `index.ts` for barrel exports only

## Module Boundaries

### Public API
- Export only what users need
- Use `index.ts` to define public surface
- Internal modules use `internal/` folder
- Mark internal with `@internal` JSDoc tag

### Import Rules
- No circular imports
- Inner packages never import outer packages
- Use package names for cross-package imports, not relative paths

## Type-Level Programming
- Document complex type computations
- Break complex types into named intermediate types
- Provide descriptive error messages using template literal types
- Test type inference with dedicated type tests
